package appointment

import (
	"fmt"
	"log"
	"time"

	"github.com/robfig/cron/v3"
	"github.com/sc-pos/backend/internal/database"
	"github.com/sc-pos/backend/internal/modules/whatsapp"
)

var reminderCron *cron.Cron

func StartReminderJob() {
	// Run every 15 minutes to catch appointments nearing their reminder window
	reminderCron = cron.New()
	_, err := reminderCron.AddFunc("*/15 * * * *", processReminders)
	if err != nil {
		log.Printf("Failed to start appointment reminder cron: %v\n", err)
		return
	}
	reminderCron.Start()
	log.Println("Appointment reminder cron job started")
}

func StopReminderJob() {
	if reminderCron != nil {
		reminderCron.Stop()
	}
}

func processReminders() {
	waService := whatsapp.NewService()
	now := time.Now()

	query := `
		SELECT a.id, a.scheduled_at, a.organization_id, p.full_name, p.whatsapp, 
		       cs.whatsapp_reminder_enabled, cs.appointment_reminders, cs.reminder_hours_before,
		       s.name AS service_name, cs.clinic_name
		FROM appointments a
		JOIN patients p ON a.patient_id = p.id
		JOIN services s ON a.service_id = s.id
		JOIN clinic_settings cs ON a.organization_id = cs.organization_id
		WHERE a.status = 'scheduled' 
		  AND a.reminder_sent_at IS NULL
		  AND p.reminder_opt_in = true
		  AND cs.appointment_reminders = true
		  AND cs.whatsapp_reminder_enabled = true
		  AND p.whatsapp IS NOT NULL
		  AND p.whatsapp != ''
	`

	rows, err := database.DB.Query(query)
	if err != nil {
		log.Printf("Error querying appointments for reminders: %v\n", err)
		return
	}
	defer rows.Close()

	for rows.Next() {
		var id, orgID, patientName, patientWhatsApp, serviceName string
		var clinicName *string
		var scheduledAt time.Time
		var waEnabled, apptReminders bool
		var reminderHoursBefore int

		if err := rows.Scan(&id, &scheduledAt, &orgID, &patientName, &patientWhatsApp, 
			&waEnabled, &apptReminders, &reminderHoursBefore, &serviceName, &clinicName); err != nil {
			log.Printf("Error scanning appointment reminder row: %v\n", err)
			continue
		}

		if reminderHoursBefore <= 0 {
			reminderHoursBefore = 24 // default fallback
		}

		// Calculate the time difference
		timeUntilAppt := scheduledAt.Sub(now)
		
		// If the appointment is within the reminder window (e.g. 24 hours away or less, but not in the past)
		// We add a small buffer (e.g. 15 minutes) because the cron runs every 15m.
		windowStart := time.Duration(reminderHoursBefore) * time.Hour
		
		if timeUntilAppt > 0 && timeUntilAppt <= windowStart {
			timeStr := scheduledAt.Format("15:04")
			dateStr := scheduledAt.Format("02 Jan 2006")
			
			clinicStr := "Klinik Kami"
			if clinicName != nil && *clinicName != "" {
				clinicStr = *clinicName
			}

			msg := fmt.Sprintf("Halo %s,\n\nIni adalah pengingat otomatis dari %s untuk jadwal appointment Anda:\n\nLayanan: %s\nTanggal: %s\nJam: %s\n\nMohon hadir tepat waktu. Terima kasih!",
				patientName, clinicStr, serviceName, dateStr, timeStr)

			// Try to get an active device for the organization
			devices, err := waService.GetDevices(orgID)
			if err != nil || len(devices) == 0 {
				log.Printf("No WhatsApp device for org %s, skipping reminder to %s\n", orgID, patientWhatsApp)
				continue
			}
			deviceID := devices[0].ID

			_, err = waService.Send(orgID, deviceID, patientWhatsApp, msg)
			if err != nil {
				log.Printf("Failed to send reminder to %s: %v\n", patientWhatsApp, err)
			} else {
				log.Printf("Successfully sent reminder to %s for appointment %s\n", patientWhatsApp, id)
				// Mark as sent
				_, _ = database.DB.Exec("UPDATE appointments SET reminder_sent_at = NOW() WHERE id = $1", id)
			}
		}
	}
}
