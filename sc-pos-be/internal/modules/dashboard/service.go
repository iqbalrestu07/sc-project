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

func (s *Service) Stats(dr DateRange) (map[string]interface{}, error) {
	return s.repo.Stats(dr)
}

func (s *Service) Revenue(dr DateRange) ([]RevenueRow, error) {
	return s.repo.Revenue(dr)
}

func (s *Service) TopServices(dr DateRange) ([]TopItem, error) {
	return s.repo.TopServices(dr)
}

func (s *Service) TopProducts(dr DateRange) ([]TopItem, error) {
	return s.repo.TopProducts(dr)
}

func (s *Service) AppointmentsToday() ([]AppointmentTodayRow, error) {
	return s.repo.AppointmentsToday()
}
