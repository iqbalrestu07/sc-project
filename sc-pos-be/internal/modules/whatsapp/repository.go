package whatsapp

type Repository struct{}

func NewRepository() *Repository {
	return &Repository{}
}

func (r *Repository) Templates() []Template {
	return []Template{
		{ID: "appointment_reminder", Name: "Appointment Reminder"},
		{ID: "payment_followup", Name: "Payment Follow Up"},
	}
}

type Template struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}
