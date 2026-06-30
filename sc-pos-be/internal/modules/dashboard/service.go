package dashboard

// Service is the public interface for the dashboard module business logic.
type Service interface {
	Stats(dr DateRange, orgID string) (map[string]interface{}, error)
	Revenue(dr DateRange, orgID string) ([]RevenueRow, error)
	TopServices(dr DateRange, orgID string) ([]TopItem, error)
	TopProducts(dr DateRange, orgID string) ([]TopItem, error)
	TopCustomers(dr DateRange, orgID string, limit int) ([]TopCustomerRow, error)
	AppointmentsToday(orgID string) ([]AppointmentTodayRow, error)
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

func (s *service) Stats(dr DateRange, orgID string) (map[string]interface{}, error) {
	return s.repo.Stats(dr, orgID)
}

func (s *service) Revenue(dr DateRange, orgID string) ([]RevenueRow, error) {
	return s.repo.Revenue(dr, orgID)
}

func (s *service) TopServices(dr DateRange, orgID string) ([]TopItem, error) {
	return s.repo.TopServices(dr, orgID)
}

func (s *service) TopProducts(dr DateRange, orgID string) ([]TopItem, error) {
	return s.repo.TopProducts(dr, orgID)
}

func (s *service) TopCustomers(dr DateRange, orgID string, limit int) ([]TopCustomerRow, error) {
	return s.repo.TopCustomers(dr, orgID, limit)
}

func (s *service) AppointmentsToday(orgID string) ([]AppointmentTodayRow, error) {
	return s.repo.AppointmentsToday(orgID)
}
