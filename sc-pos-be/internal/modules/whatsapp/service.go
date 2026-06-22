package whatsapp

type Service struct {
	repo *Repository
}

func NewService(repo ...*Repository) *Service {
	if len(repo) > 0 {
		return &Service{repo: repo[0]}
	}
	return &Service{repo: NewRepository()}
}

func (s *Service) Send() error {
	return nil
}

func (s *Service) Templates() []Template {
	return s.repo.Templates()
}
