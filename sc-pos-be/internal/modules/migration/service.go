package migration

import (
	"database/sql"
	"encoding/csv"
	"errors"
	"fmt"
	"io"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"

	"github.com/sc-pos/backend/internal/database"
	"github.com/sc-pos/backend/internal/models"
	"github.com/sc-pos/backend/internal/modules/patient"
	"github.com/sc-pos/backend/internal/modules/product"
	serviceModule "github.com/sc-pos/backend/internal/modules/service"
	"github.com/xuri/excelize/v2"
)

var (
	ErrEmptyFile            = errors.New("file is empty")
	ErrUnsupportedExt       = errors.New("format file tidak didukung, harap gunakan .xlsx atau .csv")
	ErrInvalidHeader        = errors.New("excel header must contain: nama, jenis, harga")
	ErrInvalidPatientHeader = errors.New("excel header must contain: nama, no_hp, alamat")
	ErrInvalidRowType       = errors.New("jenis must be one of: product, tindakan, barang habis pakai")
	ErrMissingName          = errors.New("nama is required")
	ErrInvalidPrice         = errors.New("harga must be a valid number")
)

// batchSize is the number of rows per SQL query (multi-row INSERT).
// Tuned for a 1GB RAM server — small enough to keep memory footprint low,
// large enough to minimize round-trips over high-latency SSH tunnel.
const batchSize = 50

// chunkSize is the number of rows per transaction.
// Each chunk is committed independently, so a failure in one chunk
// doesn't roll back already-committed chunks. If a chunk fails, we
// retry its rows individually to identify the bad ones.
// 500 rows × ~500B = ~250KB per chunk buffer — safe for 1GB RAM.
const chunkSize = 500

// ImportResult reports the outcome of an Excel migration.
type ImportResult struct {
	Processed int      `json:"processed"`
	Created   int      `json:"created"`
	Updated   int      `json:"updated"`
	Failed    int      `json:"failed"`
	Errors    []string `json:"errors,omitempty"`
}

func (r *ImportResult) track(created bool, err error, name string) {
	if err != nil {
		r.Failed++
		r.Errors = append(r.Errors, fmt.Sprintf("%s: %v", name, err))
		return
	}
	r.Processed++
	if created {
		r.Created++
	} else {
		r.Updated++
	}
}

// Service is the public contract for migration business logic.
type Service interface {
	ImportCatalogExcel(file io.Reader, filename, orgID, userID string) (*ImportResult, error)
	ImportPatientsExcel(file io.Reader, filename, orgID, userID string) (*ImportResult, error)
}

type service struct {
	productSvc product.Service
	serviceSvc serviceModule.Service
	patientSvc patient.Service
}

func NewService(productSvc product.Service, serviceSvc serviceModule.Service, patientSvc patient.Service) Service {
	if productSvc == nil {
		productSvc = product.NewService()
	}
	if serviceSvc == nil {
		serviceSvc = serviceModule.NewService()
	}
	if patientSvc == nil {
		patientSvc = patient.NewService(patient.NewRepository())
	}
	return &service{
		productSvc: productSvc,
		serviceSvc: serviceSvc,
		patientSvc: patientSvc,
	}
}

// ─── Streaming row reader ─────────────────────────────────────────────────────
// RowReader provides a streaming interface to read rows one at a time,
// avoiding loading the entire file into memory at once.
// This is critical for a 1GB RAM server where large Excel/CSV files
// could exhaust memory if loaded all at once.

type RowReader interface {
	// Read returns the next row, or io.EOF when done.
	Read() ([]string, error)
	// Close releases resources (e.g. Excel file handle).
	Close() error
}

type csvRowReader struct {
	reader *csv.Reader
}

func (r *csvRowReader) Read() ([]string, error) {
	return r.reader.Read()
}

func (r *csvRowReader) Close() error { return nil }

type excelRowReader struct {
	rows  *excelize.Rows
	file  *excelize.File
	sheet string
}

func (r *excelRowReader) Read() ([]string, error) {
	if !r.rows.Next() {
		return nil, io.EOF
	}
	return r.rows.Columns()
}

func (r *excelRowReader) Close() error {
	if err := r.rows.Close(); err != nil {
		r.file.Close()
		return err
	}
	return r.file.Close()
}

// newRowReader creates a streaming row reader based on file extension.
func newRowReader(file io.Reader, filename string) (RowReader, error) {
	ext := strings.ToLower(filepath.Ext(filename))
	if ext == ".csv" {
		reader := csv.NewReader(file)
		reader.FieldsPerRecord = -1
		return &csvRowReader{reader: reader}, nil
	}
	if ext == ".xlsx" {
		f, err := excelize.OpenReader(file)
		if err != nil {
			return nil, fmt.Errorf("failed to open excel file: %w", err)
		}
		sheet := f.GetSheetName(0)
		if sheet == "" {
			f.Close()
			return nil, ErrEmptyFile
		}
		rows, err := f.Rows(sheet)
		if err != nil {
			f.Close()
			return nil, fmt.Errorf("failed to read excel rows: %w", err)
		}
		return &excelRowReader{rows: rows, file: f, sheet: sheet}, nil
	}
	return nil, ErrUnsupportedExt
}

// ─── Catalog import (streaming + batched) ─────────────────────────────────────

func (s *service) ImportCatalogExcel(file io.Reader, filename, orgID, userID string) (*ImportResult, error) {
	reader, err := newRowReader(file, filename)
	if err != nil {
		return nil, err
	}
	defer reader.Close()

	// Read header row
	header, err := reader.Read()
	if err == io.EOF || len(header) == 0 {
		return nil, ErrEmptyFile
	}
	if err != nil {
		return nil, fmt.Errorf("failed to read header: %w", err)
	}

	idx, err := mapHeader(header)
	if err != nil {
		return nil, err
	}

	// Chunked transaction strategy (same as patient import):
	// Rows are collected in chunks of chunkSize (500). Each chunk is committed
	// in its own transaction. Within a chunk, products and services are sent
	// as separate multi-row INSERT ... ON CONFLICT batches of batchSize (50).
	//
	// IMPORTANT: Before sending to PostgreSQL, we deduplicate rows within
	// each chunk by conflict key (LOWER(name)). Without this, a multi-row
	// INSERT with two rows that map to the same existing row raises
	// "ON CONFLICT DO UPDATE command cannot affect row a second time".
	//
	// If a chunk still fails, retry per-row to identify bad rows.
	//
	// catalogItem holds a parsed row that can be either a product or service.
	result := &ImportResult{}
	rowNum := 1

	type catalogItem struct {
		isProduct bool
		product   models.Product
		service   models.Service
	}
	var chunk []catalogItem

	flushChunk := func() {
		if len(chunk) == 0 {
			return
		}

		chunkStartRow := rowNum - len(chunk)

		// Deduplicate by conflict key: (LOWER(name)).
		// Products and services have separate unique indexes, so we dedup
		// within each type. Last occurrence wins.
		seenProduct := make(map[string]int)
		seenService := make(map[string]int)
		for i, item := range chunk {
			if item.isProduct {
				seenProduct[strings.ToLower(item.product.Name)] = i
			} else {
				seenService[strings.ToLower(item.service.Name)] = i
			}
		}
		var deduped []catalogItem
		for i, item := range chunk {
			if item.isProduct {
				if seenProduct[strings.ToLower(item.product.Name)] == i {
					deduped = append(deduped, item)
				}
			} else {
				if seenService[strings.ToLower(item.service.Name)] == i {
					deduped = append(deduped, item)
				}
			}
		}
		chunk = deduped

		// Split chunk into products and services
		var products []models.Product
		var services []models.Service
		for _, item := range chunk {
			if item.isProduct {
				products = append(products, item.product)
			} else {
				services = append(services, item.service)
			}
		}

		// Fast path: batch upsert in 1 transaction
		var chunkCreated, chunkUpdated int
		txErr := database.WithTx(func(tx *sql.Tx) error {
			// Upsert products in batches of 50
			for i := 0; i < len(products); i += batchSize {
				end := i + batchSize
				if end > len(products) {
					end = len(products)
				}
				created, updated, err := s.productSvc.BatchUpsertTx(tx, products[i:end], orgID, userID)
				if err != nil {
					return err
				}
				chunkCreated += created
				chunkUpdated += updated
			}
			// Upsert services in batches of 50
			for i := 0; i < len(services); i += batchSize {
				end := i + batchSize
				if end > len(services) {
					end = len(services)
				}
				created, updated, err := s.serviceSvc.BatchUpsertTx(tx, services[i:end], orgID, userID)
				if err != nil {
					return err
				}
				chunkCreated += created
				chunkUpdated += updated
			}
			return nil
		})

		if txErr == nil {
			result.Processed += chunkCreated + chunkUpdated
			result.Created += chunkCreated
			result.Updated += chunkUpdated
			chunk = chunk[:0]
			return
		}

		// Slow path: retry per-row to identify bad rows
		for i, item := range chunk {
			var created bool
			var rowErr error
			if item.isProduct {
				created, rowErr = s.productSvc.Upsert(item.product, orgID, userID)
			} else {
				created, rowErr = s.serviceSvc.Upsert(item.service, orgID, userID)
			}
			name := item.product.Name
			if !item.isProduct {
				name = item.service.Name
			}
			result.track(created, rowErr, fmt.Sprintf("row %d (%s)", chunkStartRow+i, name))
		}
		chunk = chunk[:0]
	}

	for {
		row, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			result.Failed++
			result.Errors = append(result.Errors, fmt.Sprintf("row %d: read error: %v", rowNum+1, err))
			rowNum++
			continue
		}
		rowNum++
		if len(row) == 0 || allEmpty(row) {
			continue
		}

		name := strings.TrimSpace(getCell(row, idx.name))
		if name == "" {
			result.Failed++
			result.Errors = append(result.Errors, fmt.Sprintf("row %d: %v", rowNum, ErrMissingName))
			continue
		}

		jenis := strings.TrimSpace(strings.ToLower(getCell(row, idx.jenis)))
		price, err := parsePrice(getCell(row, idx.harga))
		if err != nil {
			result.Failed++
			result.Errors = append(result.Errors, fmt.Sprintf("row %d: %v", rowNum, err))
			continue
		}

		commission, _ := parsePrice(getCell(row, idx.komisi))
		modal, _ := parsePrice(getCell(row, idx.modal))
		hargaTambahan, _ := parsePrice(getCell(row, idx.hargaTambahan))
		komisiTambahan, _ := parsePrice(getCell(row, idx.komisiTambahan))

		var item catalogItem
		switch jenis {
		case "product":
			item.isProduct = true
			item.product = models.Product{
				Name:         name,
				SellingPrice: &price,
				IsConsumable: false,
				IsActive:     true,
			}
			if modal > 0 {
				item.product.PurchasePrice = &modal
			}
		case "barang habis pakai":
			item.isProduct = true
			item.product = models.Product{
				Name:         name,
				SellingPrice: &price,
				IsConsumable: true,
				IsActive:     true,
			}
			if modal > 0 {
				item.product.PurchasePrice = &modal
			}
		case "tindakan":
			item.isProduct = false
			item.service = models.Service{
				Name:                     name,
				BasePrice:                price,
				DoctorCommissionType:     "fixed",
				DoctorCommissionValue:    commission,
				TherapistCommissionType:  "fixed",
				TherapistCommissionValue: commission,
				DurationMinutes:          30,
				IsActive:                 true,
			}
			if hargaTambahan > 0 {
				item.service.OfferingPrice = &hargaTambahan
			}
			if komisiTambahan > 0 {
				offType := "fixed"
				item.service.DoctorOfferingCommissionType = &offType
				item.service.DoctorOfferingCommissionValue = &komisiTambahan
				item.service.TherapistOfferingCommissionType = &offType
				item.service.TherapistOfferingCommissionValue = &komisiTambahan
			}
		default:
			result.Failed++
			result.Errors = append(result.Errors, fmt.Sprintf("row %d (%s): %v", rowNum, name, ErrInvalidRowType))
			continue
		}

		chunk = append(chunk, item)
		if len(chunk) >= chunkSize {
			flushChunk()
			runtime.GC()
		}
	}
	flushChunk() // flush remaining

	return result, nil
}

type headerIndex struct {
	name, jenis, harga, komisi, modal, hargaTambahan, komisiTambahan int
}

func mapHeader(header []string) (headerIndex, error) {
	idx := headerIndex{name: -1, jenis: -1, harga: -1, komisi: -1, modal: -1, hargaTambahan: -1, komisiTambahan: -1}
	for i, h := range header {
		col := strings.TrimSpace(strings.ToLower(h))
		switch col {
		case "nama":
			idx.name = i
		case "jenis":
			idx.jenis = i
		case "harga":
			idx.harga = i
		case "komisi":
			idx.komisi = i
		case "modal":
			idx.modal = i
		case "harga tambahan", "harga_tambahan":
			idx.hargaTambahan = i
		case "komisi tambahan", "komisi_tambahan":
			idx.komisiTambahan = i
		}
	}
	// nama, jenis, harga are required; komisi, modal, harga tambahan, komisi tambahan are optional
	if idx.name < 0 || idx.jenis < 0 || idx.harga < 0 {
		return idx, ErrInvalidHeader
	}
	return idx, nil
}

// ─── Patient import (streaming + lightweight cache) ───────────────────────────

func (s *service) ImportPatientsExcel(file io.Reader, filename, orgID, userID string) (*ImportResult, error) {
	reader, err := newRowReader(file, filename)
	if err != nil {
		return nil, err
	}
	defer reader.Close()

	// Read header row
	header, err := reader.Read()
	if err == io.EOF || len(header) == 0 {
		return nil, ErrEmptyFile
	}
	if err != nil {
		return nil, fmt.Errorf("failed to read header: %w", err)
	}

	idx, err := mapPatientHeader(header)
	if err != nil {
		return nil, err
	}

	// Chunked transaction strategy:
	//
	// Rows are processed in chunks of chunkSize (500). Each chunk is committed
	// in its own transaction, so a failure in one chunk doesn't roll back
	// already-committed chunks. Within a chunk, rows are sent in batches of
	// batchSize (50) as multi-row INSERT ... ON CONFLICT queries.
	//
	// IMPORTANT: Before sending to PostgreSQL, we deduplicate rows within
	// each chunk by conflict key (LOWER(name), COALESCE(phone,'')). Without
	// this, a multi-row INSERT with two rows that map to the same existing
	// row raises "ON CONFLICT DO UPDATE command cannot affect row a second
	// time" — which causes the entire batch to fail and triggers slow
	// per-row retry.
	//
	// If a chunk's transaction still fails (e.g. other constraint), we retry
	// each row individually to identify the bad rows.
	//
	// Memory: chunk buffer = 500 × ~500B = ~250KB (constant, GC'd after each chunk).
	// Speed: 2000 rows = 4 chunks × 10 batches = 40 queries + 4 COMMITs = ~8 seconds.
	result := &ImportResult{}
	rowNum := 1
	var chunk []models.Patient

	// flushChunk attempts to upsert all rows in the chunk in a single
	// transaction. If the transaction fails, it retries per-row.
	flushChunk := func() {
		if len(chunk) == 0 {
			return
		}

		chunkStartRow := rowNum - len(chunk)

		// Deduplicate by conflict key: (LOWER(name), COALESCE(phone,'')).
		// Last occurrence wins (later row overwrites earlier duplicate).
		// This prevents "cannot affect row a second time" error in multi-row INSERT.
		seen := make(map[string]int, len(chunk))
		for i, req := range chunk {
			key := strings.ToLower(req.FullName) + "\x00"
			if req.Phone != nil && *req.Phone != "" {
				key += *req.Phone
			}
			seen[key] = i // last occurrence wins
		}
		var deduped []models.Patient
		for i, req := range chunk {
			key := strings.ToLower(req.FullName) + "\x00"
			if req.Phone != nil && *req.Phone != "" {
				key += *req.Phone
			}
			if seen[key] == i {
				deduped = append(deduped, req)
			}
		}
		chunk = deduped

		// Fast path: batch upsert in 1 transaction
		var chunkCreated, chunkUpdated int
		txErr := database.WithTx(func(tx *sql.Tx) error {
			for i := 0; i < len(chunk); i += batchSize {
				end := i + batchSize
				if end > len(chunk) {
					end = len(chunk)
				}
				batch := chunk[i:end]
				created, updated, err := s.patientSvc.BatchUpsertTx(tx, batch, userID, orgID)
				if err != nil {
					return err
				}
				chunkCreated += created
				chunkUpdated += updated
			}
			return nil
		})

		if txErr == nil {
			// Chunk succeeded — add to global result
			result.Processed += chunkCreated + chunkUpdated
			result.Created += chunkCreated
			result.Updated += chunkUpdated
			chunk = chunk[:0]
			return
		}

		// Slow path: chunk failed, retry per-row to identify bad rows.
		// Each row gets its own auto-commit transaction (via Upsert, not UpsertTx)
		// so one bad row doesn't poison the rest.
		for i, req := range chunk {
			created, rowErr := s.patientSvc.Upsert(req, userID, orgID)
			result.track(created, rowErr, fmt.Sprintf("row %d (%s)", chunkStartRow+i, req.FullName))
		}
		chunk = chunk[:0]
	}

	for {
		row, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			result.Failed++
			result.Errors = append(result.Errors, fmt.Sprintf("row %d: read error: %v", rowNum+1, err))
			rowNum++
			continue
		}
		rowNum++
		if len(row) == 0 || allEmpty(row) {
			continue
		}

		name := strings.TrimSpace(getCell(row, idx.name))
		if name == "" {
			result.Failed++
			result.Errors = append(result.Errors, fmt.Sprintf("row %d: %v", rowNum, ErrMissingName))
			continue
		}

		phone := strings.TrimSpace(getCell(row, idx.phone))
		address := strings.TrimSpace(getCell(row, idx.address))

		req := models.Patient{
			FullName: name,
		}
		if phone != "" {
			phoneVal := phone
			req.Phone = &phoneVal
			req.WhatsApp = &phoneVal
		}
		if address != "" {
			addrVal := address
			req.Address = &addrVal
		}

		chunk = append(chunk, req)
		if len(chunk) >= chunkSize {
			flushChunk()
			runtime.GC()
		}
	}
	flushChunk() // flush remaining

	return result, nil
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

type patientHeaderIndex struct {
	name, phone, address int
}

func mapPatientHeader(header []string) (patientHeaderIndex, error) {
	idx := patientHeaderIndex{name: -1, phone: -1, address: -1}
	for i, h := range header {
		col := strings.TrimSpace(strings.ToLower(h))
		switch col {
		case "nama":
			idx.name = i
		case "no_hp", "phone", "telepon":
			idx.phone = i
		case "alamat", "address":
			idx.address = i
		}
	}
	if idx.name < 0 {
		return idx, ErrInvalidPatientHeader
	}
	// phone and address are optional
	return idx, nil
}

func getCell(row []string, idx int) string {
	if idx < 0 || idx >= len(row) {
		return ""
	}
	return row[idx]
}

func allEmpty(row []string) bool {
	for _, cell := range row {
		if strings.TrimSpace(cell) != "" {
			return false
		}
	}
	return true
}

func parsePrice(raw string) (float64, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return 0, nil
	}
	// Strip common Indonesian currency formatting.
	raw = strings.ReplaceAll(raw, "Rp", "")
	raw = strings.ReplaceAll(raw, ".", "")
	raw = strings.ReplaceAll(raw, ",", ".")
	raw = strings.ReplaceAll(raw, " ", "")
	raw = strings.ReplaceAll(raw, "-", "")
	val, err := strconv.ParseFloat(raw, 64)
	if err != nil {
		return 0, ErrInvalidPrice
	}
	return val, nil
}
