package transaction

import (
	"database/sql"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/sc-pos/backend/internal/models"
)

var ErrNotFound = errors.New("transaction not found")

type Service struct {
	repo *Repository
}

func NewService(repo ...*Repository) *Service {
	if len(repo) > 0 {
		return &Service{repo: repo[0]}
	}
	return &Service{repo: NewRepository()}
}

func (s *Service) List(orgID string) ([]TransactionWithRelations, error) {
	return s.repo.List(orgID)
}

func (s *Service) Get(id, orgID string) (*TransactionWithRelations, error) {
	transaction, err := s.repo.Get(id, orgID)
	if err != nil {
		return nil, err
	}
	if transaction == nil {
		return nil, ErrNotFound
	}
	return transaction, nil
}

func (s *Service) Create(req CreateRequest, userID *string, orgID string) (*TransactionWithRelations, error) {
	now := time.Now()
	req.Transaction.ID = uuid.New().String()
	req.Transaction.TransactionCode = nextTransactionCode(now)
	req.Transaction.CreatedBy = userID
	req.Transaction.CreatedAt = now
	req.Transaction.UpdatedAt = now
	if req.Transaction.PaymentStatus == "" {
		req.Transaction.PaymentStatus = "pending"
	}
	if req.Transaction.Subtotal == 0 {
		for _, item := range req.Items {
			req.Transaction.Subtotal += item.TotalPrice
		}
	}
	if req.Transaction.TotalAmount == 0 {
		req.Transaction.TotalAmount = req.Transaction.Subtotal + req.Transaction.TaxAmount
		if req.Transaction.DiscountAmount != nil {
			req.Transaction.TotalAmount -= *req.Transaction.DiscountAmount
		}
	}
	for i := range req.Items {
		req.Items[i].ID = uuid.New().String()
		req.Items[i].TransactionID = req.Transaction.ID
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
		if req.Items[i].TotalPrice == 0 {
			req.Items[i].TotalPrice = req.Items[i].UnitPrice * float64(req.Items[i].Quantity)
		}
	}
	return s.repo.Create(req, orgID)
}

func (s *Service) Update(id, orgID string, req models.Transaction) (*TransactionWithRelations, error) {
	current, err := s.Get(id, orgID)
	if err != nil {
		return nil, err
	}
	wasPaid := current.PaymentStatus == "paid"
	if req.PaymentStatus == "" {
		req.PaymentStatus = current.PaymentStatus
	}
	if err := s.repo.Update(id, req); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	if req.PaymentStatus == "paid" && !wasPaid {
		if err := s.repo.MarkPaidEffects(id); err != nil {
			return nil, err
		}
	}
	return s.Get(id, orgID)
}

func (s *Service) Delete(id string) error {
	if err := s.repo.Delete(id); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrNotFound
		}
		return err
	}
	return nil
}

func (s *Service) Items(id string) ([]TransactionItemWithRelations, error) {
	return s.repo.Items(id)
}
