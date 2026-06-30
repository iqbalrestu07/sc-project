package cms

// Service is the public interface for the cms module business logic.
type Service interface {
	ListPages(orgID string) ([]Page, error)
	GetPage(pageID, orgID string) (interface{}, error)
	UpsertPage(pageID, orgID string, data interface{}, userID string) (interface{}, error)
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

func (s *service) ListPages(orgID string) ([]Page, error) {
	return s.repo.ListPages(orgID)
}

func (s *service) GetPage(pageID, orgID string) (interface{}, error) {
	page, err := s.repo.GetPage(pageID, orgID)
	if err != nil {
		return nil, err
	}
	if page == nil {
		return defaultPageData(pageID), nil
	}
	return page.Data, nil
}

func (s *service) UpsertPage(pageID, orgID string, data interface{}, userID string) (interface{}, error) {
	page, err := s.repo.UpsertPage(pageID, orgID, data, userID)
	if err != nil {
		return nil, err
	}
	return page.Data, nil
}

func defaultPageData(pageID string) interface{} {
	switch pageID {
	case "services-overview", "promotions", "gallery", "testimonials":
		return []interface{}{}
	case "hero":
		return map[string]interface{}{
			"tagline":            "Your Beauty, Our Passion",
			"description":        "Experience premium aesthetic treatments.",
			"cta_primary_text":   "Book Appointment",
			"cta_secondary_text": "Chat via WhatsApp",
			"whatsapp_url":       "https://wa.me/6282123523139",
			"is_active":          true,
		}
	case "cta":
		return map[string]interface{}{
			"headline":           "Ready to glow?",
			"subtext":            "Book your consultation today.",
			"cta_primary_text":   "Book Appointment",
			"cta_secondary_text": "Chat via WhatsApp",
			"whatsapp_url":       "https://wa.me/6282123523139",
			"is_active":          true,
		}
	default:
		return map[string]interface{}{"is_active": true}
	}
}
