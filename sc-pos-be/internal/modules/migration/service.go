package migration

import (
	"encoding/csv"
	"errors"
	"fmt"
	"io"
	"path/filepath"
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

func parseRows(file io.Reader, filename string) ([][]string, error) {
	ext := strings.ToLower(filepath.Ext(filename))
	if ext == ".csv" {
		reader := csv.NewReader(file)
		// Disable fields per record check in case of jagged CSVs
		reader.FieldsPerRecord = -1
		return reader.ReadAll()
	} else if ext == ".xlsx" {
		f, err := excelize.OpenReader(file)
		if err != nil {
			return nil, fmt.Errorf("failed to open excel file: %w", err)
		}
		defer f.Close()

		sheet := f.GetSheetName(0)
		if sheet == "" {
			return nil, ErrEmptyFile
		}
		return f.GetRows(sheet)
	}
	return nil, ErrUnsupportedExt
}

func (s *service) ImportCatalogExcel(file io.Reader, filename, orgID, userID string) (*ImportResult, error) {
	rows, err := parseRows(file, filename)
	if err != nil {
		return nil, err
	}
	if len(rows) < 2 {
		return nil, ErrEmptyFile
	}

	idx, err := mapHeader(rows[0])
	if err != nil {
		return nil, err
	}

	result := &ImportResult{}
	for i, row := range rows[1:] {
		line := i + 2 // human-readable row number (1-based header + 1)
		if len(row) == 0 || allEmpty(row) {
			continue
		}

		name := strings.TrimSpace(getCell(row, idx.name))
		if name == "" {
			result.Failed++
			result.Errors = append(result.Errors, fmt.Sprintf("row %d: %v", line, ErrMissingName))
			continue
		}

		jenis := strings.TrimSpace(strings.ToLower(getCell(row, idx.jenis)))
		price, err := parsePrice(getCell(row, idx.harga))
		if err != nil {
			result.Failed++
			result.Errors = append(result.Errors, fmt.Sprintf("row %d: %v", line, err))
			continue
		}

		commission, _ := parsePrice(getCell(row, idx.komisi))
		modal, _ := parsePrice(getCell(row, idx.modal))

		var created bool
		var upsertErr error
		switch jenis {
		case "product":
			created, upsertErr = s.upsertProduct(name, price, modal, false, orgID, userID)
		case "tindakan":
			created, upsertErr = s.upsertService(name, price, commission, orgID, userID)
		case "barang habis pakai":
			created, upsertErr = s.upsertProduct(name, price, modal, true, orgID, userID)
		default:
			upsertErr = ErrInvalidRowType
		}

		result.track(created, upsertErr, fmt.Sprintf("row %d (%s)", line, name))
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

func (s *service) upsertService(name string, price, commission float64, orgID, userID string) (bool, error) {
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
	name, jenis, harga, komisi, modal int
}

func mapHeader(header []string) (headerIndex, error) {
	idx := headerIndex{name: -1, jenis: -1, harga: -1, komisi: -1, modal: -1}
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
		}
	}
	// nama, jenis, harga are required; komisi and modal are optional
	if idx.name < 0 || idx.jenis < 0 || idx.harga < 0 {
		return idx, ErrInvalidHeader
	}
	return idx, nil
}

// ---- PATIENT IMPORT ----

func (s *service) ImportPatientsExcel(file io.Reader, filename, orgID, userID string) (*ImportResult, error) {
	rows, err := parseRows(file, filename)
	if err != nil {
		return nil, err
	}
	if len(rows) < 2 {
		return nil, ErrEmptyFile
	}

	idx, err := mapPatientHeader(rows[0])
	if err != nil {
		return nil, err
	}

	// Fetch all patients for duplicate checking (by name or phone)
	patients, err := s.patientSvc.ListAll(orgID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch existing patients: %w", err)
	}

	result := &ImportResult{}
	for i, row := range rows[1:] {
		line := i + 2 // human-readable row number (1-based header + 1)
		if len(row) == 0 || allEmpty(row) {
			continue
		}

		name := strings.TrimSpace(getCell(row, idx.name))
		if name == "" {
			result.Failed++
			result.Errors = append(result.Errors, fmt.Sprintf("row %d: %v", line, ErrMissingName))
			continue
		}

		phone := strings.TrimSpace(getCell(row, idx.phone))
		address := strings.TrimSpace(getCell(row, idx.address))

		created, upsertErr := s.upsertPatient(name, phone, address, orgID, userID, patients)
		result.track(created, upsertErr, fmt.Sprintf("row %d (%s)", line, name))
	}

	return result, nil
}

func (s *service) upsertPatient(name, phone, address, orgID, userID string, existingPatients []models.Patient) (bool, error) {
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

	// Find match
	var matched *models.Patient
	for _, p := range existingPatients {
		if strings.EqualFold(p.FullName, name) || (phone != "" && p.Phone != nil && *p.Phone == phone) {
			matched = &p
			break
		}
	}

	if matched != nil {
		// Update
		req.ID = matched.ID
		req.PatientCode = matched.PatientCode
		req.CreatedAt = matched.CreatedAt
		req.PhotoURL = matched.PhotoURL
		req.DateOfBirth = matched.DateOfBirth
		req.Gender = matched.Gender
		req.Email = matched.Email
		req.AllergyHistory = matched.AllergyHistory
		req.MedicalConditions = matched.MedicalConditions
		req.SkinType = matched.SkinType
		req.Notes = matched.Notes
		req.Tags = matched.Tags

		_, err := s.patientSvc.Update(matched.ID, req, userID, orgID)
		return false, err
	}

	// Create
	_, err := s.patientSvc.Create(req, userID, orgID)
	return true, err
}

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
		case "no_hp":
			idx.phone = i
		case "alamat":
			idx.address = i
		}
	}

	// nama is required
	if idx.name < 0 {
		return idx, ErrInvalidPatientHeader
	}
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
