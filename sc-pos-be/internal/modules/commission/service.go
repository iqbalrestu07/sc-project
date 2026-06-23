package commission

import staffmodule "github.com/sc-pos/backend/internal/modules/staff"

type Service struct {
	repo      *Repository
	staffRepo *staffmodule.Repository
}

func NewService(repo ...*Repository) *Service {
	staffRepo := staffmodule.NewRepository()
	if len(repo) > 0 {
		return &Service{repo: repo[0], staffRepo: staffRepo}
	}
	return &Service{repo: NewRepository(), staffRepo: staffRepo}
}

func (s *Service) List(orgID, userRole, userID string) ([]CommissionWithRelations, error) {
	if userRole == "admin" {
		return s.repo.List(orgID, "")
	}

	staff, err := s.staffRepo.GetByUserID(userID)
	if err != nil {
		return nil, err
	}
	if staff == nil {
		return []CommissionWithRelations{}, nil
	}

	return s.repo.List(orgID, staff.ID)
}

func (s *Service) ListByStaff(orgID, staffID string) ([]CommissionWithRelations, error) {
	return s.repo.List(orgID, staffID)
}

func (s *Service) UpdateStatus(ids []string, status string) error {
	if status == "" {
		status = "paid"
	}
	return s.repo.UpdateStatus(ids, status)
}
