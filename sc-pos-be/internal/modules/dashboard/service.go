package dashboard

type Service struct {
	repo *Repository
}

func NewService(repo ...*Repository) *Service {
	if len(repo) > 0 {
		return &Service{repo: repo[0]}
	}
	return &Service{repo: NewRepository()}
}

func (s *Service) Stats(dr DateRange, orgID string) (map[string]interface{}, error) {
	return s.repo.Stats(dr, orgID)
}

func (s *Service) Revenue(dr DateRange, orgID string) ([]RevenueRow, error) {
	return s.repo.Revenue(dr, orgID)
}

func (s *Service) TopServices(dr DateRange, orgID string) ([]TopItem, error) {
	return s.repo.TopServices(dr, orgID)
}

func (s *Service) TopProducts(dr DateRange, orgID string) ([]TopItem, error) {
	return s.repo.TopProducts(dr, orgID)
}

func (s *Service) AppointmentsToday(orgID string) ([]AppointmentTodayRow, error) {
	return s.repo.AppointmentsToday(orgID)
}
