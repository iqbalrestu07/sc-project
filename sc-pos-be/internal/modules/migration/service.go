package migration

import (
	"encoding/csv"
	"errors"
	"fmt"
	"io"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"

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

// batchSize is the number of rows processed before yielding to GC.
// Tuned for a 1GB RAM server — small enough to keep memory footprint low,
// large enough to avoid excessive GC pauses.
const batchSize = 50

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

	result := &ImportResult{}
	rowNum := 1 // header is row 1
	processedInBatch := 0

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

		var created bool
		var upsertErr error
		switch jenis {
		case "product":
			created, upsertErr = s.upsertProduct(name, price, modal, false, orgID, userID)
		case "tindakan":
			created, upsertErr = s.upsertService(name, price, commission, hargaTambahan, komisiTambahan, orgID, userID)
		case "barang habis pakai":
			created, upsertErr = s.upsertProduct(name, price, modal, true, orgID, userID)
		default:
			upsertErr = ErrInvalidRowType
		}

		result.track(created, upsertErr, fmt.Sprintf("row %d (%s)", rowNum, name))

		// Batch boundary: hint GC to release intermediate memory.
		// On a 1GB server this prevents memory from accumulating across
		// thousands of rows (each upsert allocates DB query buffers, etc).
		processedInBatch++
		if processedInBatch >= batchSize {
			runtime.GC()
			processedInBatch = 0
		}
	}

	return result, nil
}

func (s *service) upsertProduct(name string, price, purchasePrice float64, isConsumable bool, orgID, userID string) (bool, error) {
	req := models.Product{
		Name:         name,
		SellingPrice: &price,
		IsConsumable: isConsumable,
		IsActive:     true,
	}
	if purchasePrice > 0 {
		req.PurchasePrice = &purchasePrice
	}
	existing, err := s.productSvc.GetByName(name, orgID)
	if err != nil {
		return false, err
	}
	if existing != nil {
		req.ID = existing.ID
		req.CreatedAt = existing.CreatedAt
		req.Sku = existing.Sku
		req.Unit = existing.Unit
		req.CurrentStock = existing.CurrentStock
		req.MinimumStock = existing.MinimumStock
		_, err = s.productSvc.Update(existing.ID, req, orgID, userID)
		return false, err
	}
	_, err = s.productSvc.Create(req, orgID, userID)
	return err == nil, err
}

func (s *service) upsertService(name string, price, commission, hargaTambahan, komisiTambahan float64, orgID, userID string) (bool, error) {
	req := models.Service{
		Name:                     name,
		BasePrice:                price,
		DoctorCommissionType:     "fixed",
		DoctorCommissionValue:    commission,
		TherapistCommissionType:  "fixed",
		TherapistCommissionValue: commission,
		DurationMinutes:          30,
		IsActive:                 true,
	}
	// Offering price: harga situasional saat pasien menerima penawaran offering.
	// Hanya set jika hargaTambahan > 0.
	if hargaTambahan > 0 {
		req.OfferingPrice = &hargaTambahan
	}
	// Offering commission: komisi tambahan saat staff menawarkan dan pasien setuju.
	// Hanya set jika komisiTambahan > 0. Type = "fixed".
	if komisiTambahan > 0 {
		offType := "fixed"
		req.DoctorOfferingCommissionType = &offType
		req.DoctorOfferingCommissionValue = &komisiTambahan
		req.TherapistOfferingCommissionType = &offType
		req.TherapistOfferingCommissionValue = &komisiTambahan
	}
	existing, err := s.serviceSvc.GetByName(name, orgID)
	if err != nil {
		return false, err
	}
	if existing != nil {
		req.ID = existing.ID
		req.CreatedAt = existing.CreatedAt
		_, err = s.serviceSvc.Update(existing.ID, req, orgID, userID)
		return false, err
	}
	_, err = s.serviceSvc.Create(req, orgID, userID)
	return err == nil, err
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

// patientCache is a lightweight in-memory index for duplicate checking.
// Instead of loading full Patient objects (which can be large with many fields),
// we only store name→id and phone→id mappings — enough to detect duplicates
// without re-querying the DB for every row.
type patientCache struct {
	byName  map[string]string // lower(name) → patient ID
	byPhone map[string]string // phone → patient ID
}

func newPatientCache() *patientCache {
	return &patientCache{
		byName:  make(map[string]string),
		byPhone: make(map[string]string),
	}
}

// loadBatch fetches a batch of patients from DB and adds them to the cache.
// This avoids loading ALL patients at once — we only load what we need
// in chunks of batchSize.
func (c *patientCache) loadBatch(svc patient.Service, orgID string, page int) error {
	patients, _, _, err := svc.List(orgID, "", page, batchSize, false)
	if err != nil {
		return err
	}
	for _, p := range patients {
		c.byName[strings.ToLower(p.FullName)] = p.ID
		if p.Phone != nil && *p.Phone != "" {
			c.byPhone[*p.Phone] = p.ID
		}
	}
	return nil
}

// lookup checks if a patient with the given name or phone already exists.
// Returns the patient ID if found, empty string otherwise.
func (c *patientCache) lookup(name, phone string) string {
	if id, ok := c.byName[strings.ToLower(name)]; ok {
		return id
	}
	if phone != "" {
		if id, ok := c.byPhone[phone]; ok {
			return id
		}
	}
	return ""
}

// add records a newly created patient in the cache so subsequent rows
// in the same import can detect it as a duplicate.
func (c *patientCache) add(id, name, phone string) {
	c.byName[strings.ToLower(name)] = id
	if phone != "" {
		c.byPhone[phone] = id
	}
}

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

	// Pre-load first batch of existing patients into lightweight cache.
	// Additional batches are loaded on-demand when a lookup misses.
	cache := newPatientCache()
	if err := cache.loadBatch(s.patientSvc, orgID, 1); err != nil {
		return nil, fmt.Errorf("failed to fetch existing patients: %w", err)
	}

	result := &ImportResult{}
	rowNum := 1
	processedInBatch := 0
	cachePage := 1

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

		// Check cache for duplicate
		existingID := cache.lookup(name, phone)

		// If not found in cache, try loading next batch from DB
		if existingID == "" {
			cachePage++
			if err := cache.loadBatch(s.patientSvc, orgID, cachePage); err != nil {
				// Non-fatal: continue without this batch
				result.Errors = append(result.Errors, fmt.Sprintf("row %d: warning: could not load patient batch: %v", rowNum, err))
			} else {
				existingID = cache.lookup(name, phone)
			}
		}

		created, upsertErr := s.upsertPatientWithCache(name, phone, address, orgID, userID, existingID, cache)
		result.track(created, upsertErr, fmt.Sprintf("row %d (%s)", rowNum, name))

		// Batch boundary: hint GC
		processedInBatch++
		if processedInBatch >= batchSize {
			runtime.GC()
			processedInBatch = 0
		}
	}

	return result, nil
}

func (s *service) upsertPatientWithCache(name, phone, address, orgID, userID, existingID string, cache *patientCache) (bool, error) {
	req := models.Patient{
		FullName: name,
	}
	if phone != "" {
		req.Phone = &phone
		req.WhatsApp = &phone
	}
	if address != "" {
		req.Address = &address
	}

	if existingID != "" {
		// Update existing patient
		req.ID = existingID
		_, err := s.patientSvc.Update(existingID, req, userID, orgID)
		return false, err
	}

	// Create new patient
	created, err := s.patientSvc.Create(req, userID, orgID)
	if err != nil {
		return false, err
	}
	if created != nil {
		cache.add(created.ID, name, phone)
	}
	return true, nil
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
