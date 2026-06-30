package commission

import staffmodule "github.com/sc-pos/backend/internal/modules/staff"

// Service is the public contract for commission business logic.
type Service interface {
	List(orgID, userRole, userID string) ([]CommissionWithRelations, error)
	ListByStaff(orgID, staffID string) ([]CommissionWithRelations, error)
	UpdateStatus(ids []string, status, userID string) error
}

type service struct {
	repo     *Repository
	staffSvc staffmodule.Service
}

func NewService(repo ...*Repository) Service {
	staffSvc := staffmodule.NewService()
	if len(repo) > 0 {
		return &service{repo: repo[0], staffSvc: staffSvc}
	}
	return &service{repo: NewRepository(), staffSvc: staffSvc}
}

func (s *service) List(orgID, userRole, userID string) ([]CommissionWithRelations, error) {
	if userRole == "admin" {
		return s.repo.List(orgID, "")
	}

	staff, err := s.staffSvc.GetByUserID(userID)
	if err != nil {
		return nil, err
	}
	if staff == nil {
		return []CommissionWithRelations{}, nil
	}

	return s.repo.List(orgID, staff.ID)
}

func (s *service) ListByStaff(orgID, staffID string) ([]CommissionWithRelations, error) {
	return s.repo.List(orgID, staffID)
}

func (s *service) UpdateStatus(ids []string, status, userID string) error {
	if status == "" {
		status = "paid"
	}
	return s.repo.UpdateStatus(ids, status, userID)
}
