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

func (s *Service) Stats() (map[string]interface{}, error) {
	return s.repo.Stats()
}

func (s *Service) Revenue() ([]RevenueRow, error) {
	return s.repo.Revenue()
}

func (s *Service) TopServices() ([]TopItem, error) {
	return s.repo.TopServices()
}

func (s *Service) TopProducts() ([]TopItem, error) {
	return s.repo.TopProducts()
}

func (s *Service) AppointmentsToday() ([]AppointmentTodayRow, error) {
	return s.repo.AppointmentsToday()
}
