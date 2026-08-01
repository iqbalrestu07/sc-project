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

	// Batch ON CONFLICT upsert: multiple rows per query to minimize round-trips.
	// Catalog import mixes products and services, so we buffer rows and flush
	// per-type when batchSize is reached or at end of file.
	//
	// All batches are wrapped in a single transaction (1 WAL fsync at COMMIT).
	result := &ImportResult{}
	rowNum := 1
	var productBatch []models.Product
	var serviceBatch []models.Service

	flushBatches := func(tx *sql.Tx) error {
		if len(productBatch) > 0 {
			created, updated, err := s.productSvc.BatchUpsertTx(tx, productBatch, orgID, userID)
			if err != nil {
				// Fallback to per-row for granular error tracking
				for _, req := range productBatch {
					_, rowErr := s.productSvc.UpsertTx(tx, req, orgID, userID)
					result.track(rowErr == nil, rowErr, req.Name)
				}
			} else {
				result.Processed += created + updated
				result.Created += created
				result.Updated += updated
			}
			productBatch = productBatch[:0]
		}
		if len(serviceBatch) > 0 {
			created, updated, err := s.serviceSvc.BatchUpsertTx(tx, serviceBatch, orgID, userID)
			if err != nil {
				for _, req := range serviceBatch {
					_, rowErr := s.serviceSvc.UpsertTx(tx, req, orgID, userID)
					result.track(rowErr == nil, rowErr, req.Name)
				}
			} else {
				result.Processed += created + updated
				result.Created += created
				result.Updated += updated
			}
			serviceBatch = serviceBatch[:0]
		}
		return nil
	}

	err = database.WithTx(func(tx *sql.Tx) error {
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

			switch jenis {
			case "product":
				req := models.Product{
					Name:         name,
					SellingPrice: &price,
					IsConsumable: false,
					IsActive:     true,
				}
				if modal > 0 {
					req.PurchasePrice = &modal
				}
				productBatch = append(productBatch, req)
			case "barang habis pakai":
				req := models.Product{
					Name:         name,
					SellingPrice: &price,
					IsConsumable: true,
					IsActive:     true,
				}
				if modal > 0 {
					req.PurchasePrice = &modal
				}
				productBatch = append(productBatch, req)
			case "tindakan":
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
				if hargaTambahan > 0 {
					req.OfferingPrice = &hargaTambahan
				}
				if komisiTambahan > 0 {
					offType := "fixed"
					req.DoctorOfferingCommissionType = &offType
					req.DoctorOfferingCommissionValue = &komisiTambahan
					req.TherapistOfferingCommissionType = &offType
					req.TherapistOfferingCommissionValue = &komisiTambahan
				}
				serviceBatch = append(serviceBatch, req)
			default:
				result.Failed++
				result.Errors = append(result.Errors, fmt.Sprintf("row %d (%s): %v", rowNum, name, ErrInvalidRowType))
				continue
			}

			// Flush when either batch is full
			if len(productBatch) >= batchSize || len(serviceBatch) >= batchSize {
				if e := flushBatches(tx); e != nil {
					return e
				}
				runtime.GC()
			}
		}
		return flushBatches(tx) // flush remaining
	})
	if err != nil {
		return nil, err
	}

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

	// Batch ON CONFLICT upsert: multiple rows per query to minimize round-trips.
	// With SSH tunnel latency of ~179ms, this is critical:
	//   277 rows × 1 round-trip each = 277 round-trips = ~50 seconds
	//   277 rows ÷ 50 per batch   = 6 round-trips   = ~1 second
	//
	// All batches are wrapped in a single transaction (1 WAL fsync at COMMIT).
	// Streaming: rows are collected in chunks of batchSize, then sent as 1 query.
	result := &ImportResult{}
	rowNum := 1
	var batch []models.Patient

	flushBatch := func(tx *sql.Tx) error {
		if len(batch) == 0 {
			return nil
		}
		created, updated, err := s.patientSvc.BatchUpsertTx(tx, batch, userID, orgID)
		if err != nil {
			// On batch error, fall back to per-row to get per-row error tracking
			for _, req := range batch {
				_, rowErr := s.patientSvc.UpsertTx(tx, req, userID, orgID)
				result.track(rowErr == nil, rowErr, req.FullName)
			}
			batch = batch[:0]
			return nil
		}
		result.Processed += created + updated
		result.Created += created
		result.Updated += updated
		batch = batch[:0]
		return nil
	}

	err = database.WithTx(func(tx *sql.Tx) error {
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

			batch = append(batch, req)
			if len(batch) >= batchSize {
				if e := flushBatch(tx); e != nil {
					return e
				}
				runtime.GC()
			}
		}
		return flushBatch(tx) // flush remaining
	})
	if err != nil {
		return nil, err
	}

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
