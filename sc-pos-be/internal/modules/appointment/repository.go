package appointment

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/sc-pos/backend/internal/database"
	"github.com/sc-pos/backend/internal/models"
)

type Repository struct {
	db *sql.DB
}

type AppointmentWithRelations struct {
	models.Appointment
	Patient   *PatientSummary `json:"patient,omitempty"`
	Service   *ServiceSummary `json:"service,omitempty"`
	Doctor    *StaffSummary   `json:"doctor,omitempty"`
	Therapist *StaffSummary   `json:"therapist,omitempty"`
}

type PatientSummary struct {
	ID          string  `json:"id"`
	FullName    string  `json:"full_name"`
	PatientCode string  `json:"patient_code"`
	Phone       *string `json:"phone,omitempty"`
	WhatsApp    *string `json:"whatsapp,omitempty"`
}

type ServiceSummary struct {
	ID              string  `json:"id"`
	Name            string  `json:"name"`
	BasePrice       float64 `json:"base_price"`
	DurationMinutes *int    `json:"duration_minutes,omitempty"`
}

type StaffSummary struct {
	ID       string `json:"id"`
	FullName string `json:"full_name"`
}

func NewRepository() *Repository {
	return &Repository{db: database.DB}
}

func (r *Repository) List(start, end *time.Time) ([]AppointmentWithRelations, error) {
	query := `
		SELECT a.id, a.patient_id, a.service_id, a.doctor_id, a.therapist_id,
		       a.scheduled_at, a.duration_minutes, a.status, a.notes, a.created_by,
		       a.created_at, a.updated_at,
		       p.id, p.full_name, p.patient_code, p.phone, p.whatsapp,
		       s.id, s.name, s.base_price, s.duration_minutes,
		       d.id, d.full_name,
		       t.id, t.full_name
		FROM appointments a
		LEFT JOIN patients p ON p.id = a.patient_id
		LEFT JOIN services s ON s.id = a.service_id
		LEFT JOIN staff d ON d.id = a.doctor_id
		LEFT JOIN staff t ON t.id = a.therapist_id
		WHERE ($1::timestamp IS NULL OR a.scheduled_at >= $1)
		  AND ($2::timestamp IS NULL OR a.scheduled_at <= $2)
		ORDER BY a.scheduled_at ASC
	`
	rows, err := r.db.Query(query, start, end)
	if err != nil {
		return nil, fmt.Errorf("failed to query appointments: %w", err)
	}
	defer rows.Close()

	var appointments []AppointmentWithRelations
	for rows.Next() {
		appointment, err := scanAppointmentWithRelations(rows)
		if err != nil {
			return nil, err
		}
		appointments = append(appointments, appointment)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed to read appointments: %w", err)
	}
	if appointments == nil {
		appointments = []AppointmentWithRelations{}
	}
	return appointments, nil
}

func (r *Repository) Get(id string) (*AppointmentWithRelations, error) {
	row := r.db.QueryRow(`
		SELECT a.id, a.patient_id, a.service_id, a.doctor_id, a.therapist_id,
		       a.scheduled_at, a.duration_minutes, a.status, a.notes, a.created_by,
		       a.created_at, a.updated_at,
		       p.id, p.full_name, p.patient_code, p.phone, p.whatsapp,
		       s.id, s.name, s.base_price, s.duration_minutes,
		       d.id, d.full_name,
		       t.id, t.full_name
		FROM appointments a
		LEFT JOIN patients p ON p.id = a.patient_id
		LEFT JOIN services s ON s.id = a.service_id
		LEFT JOIN staff d ON d.id = a.doctor_id
		LEFT JOIN staff t ON t.id = a.therapist_id
		WHERE a.id = $1
	`, id)
	appointment, err := scanAppointmentWithRelations(row)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &appointment, nil
}

func (r *Repository) Create(appointment *models.Appointment) error {
	_, err := r.db.Exec(`
		INSERT INTO appointments (
			id, patient_id, service_id, doctor_id, therapist_id, scheduled_at,
			duration_minutes, status, notes, created_by, created_at, updated_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
	`, appointment.ID, appointment.PatientID, appointment.ServiceID, appointment.DoctorID,
		appointment.TherapistID, appointment.ScheduledAt, appointment.DurationMinutes,
		appointment.Status, appointment.Notes, appointment.CreatedBy, appointment.CreatedAt,
		appointment.UpdatedAt)
	if err != nil {
		return fmt.Errorf("failed to create appointment: %w", err)
	}
	return nil
}

func (r *Repository) Update(id string, appointment *models.Appointment) error {
	result, err := r.db.Exec(`
		UPDATE appointments
		SET patient_id = COALESCE(NULLIF($1, ''), patient_id),
		    service_id = COALESCE(NULLIF($2, ''), service_id),
		    doctor_id = $3,
		    therapist_id = $4,
		    scheduled_at = COALESCE($5, scheduled_at),
		    duration_minutes = $6,
		    status = COALESCE(NULLIF($7, ''), status),
		    notes = $8,
		    updated_at = CURRENT_TIMESTAMP
		WHERE id = $9
	`, appointment.PatientID, appointment.ServiceID, appointment.DoctorID,
		appointment.TherapistID, appointment.ScheduledAt, appointment.DurationMinutes,
		appointment.Status, appointment.Notes, id)
	if err != nil {
		return fmt.Errorf("failed to update appointment: %w", err)
	}
	return checkRows(result)
}

func (r *Repository) Delete(id string) error {
	result, err := r.db.Exec(`DELETE FROM appointments WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("failed to delete appointment: %w", err)
	}
	return checkRows(result)
}

type appointmentScanner interface {
	Scan(dest ...interface{}) error
}

func scanAppointmentWithRelations(scanner appointmentScanner) (AppointmentWithRelations, error) {
	var result AppointmentWithRelations
	var patientID, patientName, patientCode sql.NullString
	var patientPhone, patientWhatsApp sql.NullString
	var serviceID, serviceName sql.NullString
	var servicePrice sql.NullFloat64
	var serviceDuration sql.NullInt64
	var doctorID, doctorName sql.NullString
	var therapistID, therapistName sql.NullString

	err := scanner.Scan(
		&result.ID, &result.PatientID, &result.ServiceID, &result.DoctorID,
		&result.TherapistID, &result.ScheduledAt, &result.DurationMinutes,
		&result.Status, &result.Notes, &result.CreatedBy, &result.CreatedAt,
		&result.UpdatedAt, &patientID, &patientName, &patientCode, &patientPhone,
		&patientWhatsApp, &serviceID, &serviceName, &servicePrice, &serviceDuration,
		&doctorID, &doctorName, &therapistID, &therapistName,
	)
	if err != nil {
		return AppointmentWithRelations{}, err
	}

	if patientID.Valid {
		result.Patient = &PatientSummary{ID: patientID.String, FullName: patientName.String, PatientCode: patientCode.String}
		if patientPhone.Valid {
			result.Patient.Phone = &patientPhone.String
		}
		if patientWhatsApp.Valid {
			result.Patient.WhatsApp = &patientWhatsApp.String
		}
	}
	if serviceID.Valid {
		result.Service = &ServiceSummary{ID: serviceID.String, Name: serviceName.String, BasePrice: servicePrice.Float64}
		if serviceDuration.Valid {
			duration := int(serviceDuration.Int64)
			result.Service.DurationMinutes = &duration
		}
	}
	if doctorID.Valid {
		result.Doctor = &StaffSummary{ID: doctorID.String, FullName: doctorName.String}
	}
	if therapistID.Valid {
		result.Therapist = &StaffSummary{ID: therapistID.String, FullName: therapistName.String}
	}

	return result, nil
}

func checkRows(result sql.Result) error {
	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}
	if rows == 0 {
		return sql.ErrNoRows
	}
	return nil
}
