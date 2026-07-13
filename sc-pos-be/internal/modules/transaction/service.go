package transaction

import (
	"database/sql"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/sc-pos/backend/internal/models"
	"github.com/sc-pos/backend/internal/modules/whatsapp"
)

var ErrNotFound = errors.New("transaction not found")

// Service is the public interface for the transaction module business logic.
type Service interface {
	List(orgID string, page, limit int) ([]TransactionWithRelations, bool, error)
	Get(id, orgID string) (*TransactionWithRelations, error)
	Create(req CreateRequest, userID *string, orgID string) (*TransactionWithRelations, error)
	Update(id, orgID, userID string, req models.Transaction, sendWhatsApp *bool) (*TransactionWithRelations, error)
	Delete(id, orgID, userID string) error
	Items(id string) ([]TransactionItemWithRelations, error)
}

type service struct {
	repo *Repository
}

func NewService(repo ...*Repository) Service {
	if len(repo) > 0 {
		return &service{repo: repo[0]}
	}
	return &service{repo: NewRepository()}
}

func (s *service) List(orgID string, page, limit int) ([]TransactionWithRelations, bool, error) {
	return s.repo.List(orgID, page, limit)
}

func (s *service) Get(id, orgID string) (*TransactionWithRelations, error) {
	transaction, err := s.repo.Get(id, orgID)
	if err != nil {
		return nil, err
	}
	if transaction == nil {
		return nil, ErrNotFound
	}
	return transaction, nil
}

func (s *service) Create(req CreateRequest, userID *string, orgID string) (*TransactionWithRelations, error) {
	now := time.Now()
	req.Transaction.ID = uuid.New().String()
	req.Transaction.TransactionCode = nextTransactionCode(now)
	req.Transaction.CreatedBy = userID
	req.Transaction.CreatedAt = now
	req.Transaction.UpdatedAt = now
	if req.Transaction.PaymentStatus == "" {
		req.Transaction.PaymentStatus = "pending"
	}
	// Set up items: assign IDs, resolve types, and compute item-level totals
	for i := range req.Items {
		req.Items[i].ID = uuid.New().String()
		req.Items[i].TransactionID = req.Transaction.ID
		req.Items[i].CreatedBy = userID
		req.Items[i].CreatedAt = now
		if req.Items[i].Quantity == 0 {
			req.Items[i].Quantity = 1
		}
		if req.Items[i].ItemType == "" {
			if req.Items[i].ProductID != nil {
				req.Items[i].ItemType = "product"
			} else {
				req.Items[i].ItemType = "service"
			}
		}
		// commission_eligible defaults (nil → true) are applied in the repository
		// when inserting. Nothing to do here.
		// Recalculate item total_price honoring item-level discount
		lineGross := req.Items[i].UnitPrice * float64(req.Items[i].Quantity)
		if req.Items[i].DiscountAmount != nil && *req.Items[i].DiscountAmount > 0 {
			switch {
			case req.Items[i].DiscountType != nil && *req.Items[i].DiscountType == "percentage":
				discValue := *req.Items[i].DiscountAmount
				if discValue > 100 {
					discValue = 100
				}
				req.Items[i].TotalPrice = lineGross * (1 - discValue/100)
			default: // "fixed" or unset
				disc := *req.Items[i].DiscountAmount
				if disc > lineGross {
					disc = lineGross
				}
				req.Items[i].TotalPrice = lineGross - disc
			}
		} else {
			req.Items[i].TotalPrice = lineGross
		}
	}

	// Subtotal = sum of item totals (after item discounts)
	if req.Transaction.Subtotal == 0 {
		for _, item := range req.Items {
			req.Transaction.Subtotal += item.TotalPrice
		}
	}

	// Order-level discount then tax → grand total
	if req.Transaction.TotalAmount == 0 {
		orderDisc := 0.0
		if req.Transaction.DiscountAmount != nil && *req.Transaction.DiscountAmount > 0 {
			switch {
			case req.Transaction.DiscountType != nil && *req.Transaction.DiscountType == "percentage":
				pct := *req.Transaction.DiscountAmount
				if pct > 100 {
					pct = 100
				}
				orderDisc = req.Transaction.Subtotal * pct / 100
				// Store resolved absolute value so receipt is unambiguous
				req.Transaction.DiscountAmount = &orderDisc
			default: // "fixed"
				orderDisc = *req.Transaction.DiscountAmount
				if orderDisc > req.Transaction.Subtotal {
					orderDisc = req.Transaction.Subtotal
					req.Transaction.DiscountAmount = &orderDisc
				}
			}
		}
		req.Transaction.TotalAmount = req.Transaction.Subtotal + req.Transaction.TaxAmount - orderDisc
		if req.Transaction.TotalAmount < 0 {
			req.Transaction.TotalAmount = 0
		}
	}

	if req.Transaction.PaymentStatus == "paid" && req.Transaction.PaidAt == nil {
		req.Transaction.PaidAt = &now
	}

	result, err := s.repo.Create(req, orgID)
	if err != nil {
		return nil, err
	}

	if req.Transaction.PaymentStatus == "paid" {
		createdBy := ""
		if userID != nil {
			createdBy = *userID
		}
		if err := s.repo.MarkPaidEffects(req.Transaction.ID, createdBy, orgID); err != nil {
			return nil, err
		}

		createdTx, _ := s.Get(req.Transaction.ID, orgID)
		if createdTx != nil {
			go s.sendWhatsappInvoice(createdTx, orgID)
		}
		return createdTx, nil
	}

	return result, nil
}

func (s *service) Update(id, orgID, userID string, req models.Transaction, sendWhatsApp *bool) (*TransactionWithRelations, error) {
	current, err := s.Get(id, orgID)
	if err != nil {
		return nil, err
	}
	wasPaid := current.PaymentStatus == "paid"
	if req.PaymentStatus == "" {
		req.PaymentStatus = current.PaymentStatus
	}
	if err := s.repo.Update(id, orgID, userID, req); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	if req.PaymentStatus == "paid" && !wasPaid {
		if err := s.repo.MarkPaidEffects(id, userID, orgID); err != nil {
			return nil, err
		}

		updatedTx, _ := s.Get(id, orgID)
		if updatedTx != nil && (sendWhatsApp == nil || *sendWhatsApp) {
			go s.sendWhatsappInvoice(updatedTx, orgID)
		}
		return updatedTx, nil
	}

	return s.Get(id, orgID)
}

func (s *service) Delete(id, orgID, userID string) error {
	if err := s.repo.Delete(id, orgID, userID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrNotFound
		}
		return err
	}
	return nil
}

func (s *service) Items(id string) ([]TransactionItemWithRelations, error) {
	return s.repo.Items(id)
}

func (s *service) sendWhatsappInvoice(tx *TransactionWithRelations, orgID string) {
	if tx.Patient == nil || tx.Patient.WhatsApp == nil || *tx.Patient.WhatsApp == "" {
		return
	}

	invoice := whatsapp.InvoiceData{
		PatientWhatsApp: *tx.Patient.WhatsApp,
		PatientName:     tx.Patient.FullName,
		TransactionCode: tx.TransactionCode,
		TotalAmount:     tx.TotalAmount,
	}

	for _, item := range tx.Items {
		name := ""
		if item.Product != nil {
			name = item.Product.Name
		} else if item.Service != nil {
			name = item.Service.Name
		}
		invoice.Items = append(invoice.Items, whatsapp.InvoiceItem{
			Name:       name,
			Quantity:   item.Quantity,
			TotalPrice: item.TotalPrice,
		})
	}

	waService := whatsapp.NewService()
	// Fire and forget whatsapp invoice, passing empty deviceID to use the first connected device
	_ = waService.SendInvoice(orgID, "", invoice)
}
