package migration

import (
	"errors"
	"fmt"
	"io"
	"strconv"
	"strings"

	"github.com/sc-pos/backend/internal/models"
	"github.com/sc-pos/backend/internal/modules/product"
	serviceModule "github.com/sc-pos/backend/internal/modules/service"
	"github.com/xuri/excelize/v2"
)

var (
	ErrEmptyFile      = errors.New("file is empty")
	ErrInvalidHeader  = errors.New("excel header must contain: nama, jenis, harga, komisi")
	ErrInvalidRowType = errors.New("jenis must be one of: product, tindakan, barang habis pakai")
	ErrMissingName    = errors.New("nama is required")
	ErrInvalidPrice   = errors.New("harga must be a valid number")
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
	ImportExcel(file io.Reader, orgID, userID string) (*ImportResult, error)
}

type service struct {
	productSvc product.Service
	serviceSvc serviceModule.Service
}

func NewService(productSvc product.Service, serviceSvc serviceModule.Service) Service {
	if productSvc == nil {
		productSvc = product.NewService()
	}
	if serviceSvc == nil {
		serviceSvc = serviceModule.NewService()
	}
	return &service{
		productSvc: productSvc,
		serviceSvc: serviceSvc,
	}
}

func (s *service) ImportExcel(file io.Reader, orgID, userID string) (*ImportResult, error) {
	f, err := excelize.OpenReader(file)
	if err != nil {
		return nil, fmt.Errorf("failed to open excel file: %w", err)
	}
	defer f.Close()

	sheet := f.GetSheetName(0)
	if sheet == "" {
		return nil, ErrEmptyFile
	}

	rows, err := f.GetRows(sheet)
	if err != nil {
		return nil, fmt.Errorf("failed to read rows: %w", err)
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

		var created bool
		var upsertErr error
		switch jenis {
		case "product":
			created, upsertErr = s.upsertProduct(name, price, false, orgID, userID)
		case "tindakan":
			created, upsertErr = s.upsertService(name, price, commission, orgID, userID)
		case "barang habis pakai":
			created, upsertErr = s.upsertProduct(name, price, true, orgID, userID)
		default:
			upsertErr = ErrInvalidRowType
		}

		result.track(created, upsertErr, fmt.Sprintf("row %d (%s)", line, name))
	}

	return result, nil
}

func (s *service) upsertProduct(name string, price float64, isConsumable bool, orgID, userID string) (bool, error) {
	req := models.Product{
		Name:         name,
		SellingPrice: &price,
		IsConsumable: isConsumable,
		IsActive:     true,
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
	name, jenis, harga, komisi int
}

func mapHeader(header []string) (headerIndex, error) {
	idx := headerIndex{name: -1, jenis: -1, harga: -1, komisi: -1}
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
		}
	}
	if idx.name < 0 || idx.jenis < 0 || idx.harga < 0 || idx.komisi < 0 {
		return idx, ErrInvalidHeader
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
