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
	// Run every day at 08:00 AM
	reminderCron = cron.New()
	_, err := reminderCron.AddFunc("0 8 * * *", processReminders)
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
	// Target appointments scheduled for tomorrow
	startOfTomorrow := time.Date(now.Year(), now.Month(), now.Day()+1, 0, 0, 0, 0, now.Location())
	endOfTomorrow := startOfTomorrow.Add(24 * time.Hour)

	query := `
		SELECT a.id, a.scheduled_at, a.organization_id, p.full_name, p.whatsapp, cs.whatsapp_reminder_enabled
		FROM appointments a
		JOIN patients p ON a.patient_id = p.id
		JOIN clinic_settings cs ON a.organization_id = cs.organization_id
		WHERE a.status = 'scheduled' 
		  AND a.scheduled_at >= $1 
		  AND a.scheduled_at < $2
		  AND p.reminder_opt_in = true
		  AND cs.whatsapp_reminder_enabled = true
		  AND p.whatsapp IS NOT NULL
		  AND p.whatsapp != ''
	`

	rows, err := database.DB.Query(query, startOfTomorrow, endOfTomorrow)
	if err != nil {
		log.Printf("Error querying appointments for reminders: %v\n", err)
		return
	}
	defer rows.Close()

	for rows.Next() {
		var id, orgID, patientName, patientWhatsApp string
		var scheduledAt time.Time
		var enabled bool
		if err := rows.Scan(&id, &scheduledAt, &orgID, &patientName, &patientWhatsApp, &enabled); err != nil {
			log.Printf("Error scanning appointment reminder row: %v\n", err)
			continue
		}

		if !enabled {
			continue
		}

		// Use a fixed reminder format or fetch a template. For now, hardcode a friendly format.
		// A full implementation would let users configure the template in clinic_settings.
		timeStr := scheduledAt.Format("15:04")
		dateStr := scheduledAt.Format("02 Jan 2006")

		msg := fmt.Sprintf("Halo %s,\n\nIni adalah pengingat otomatis untuk jadwal appointment Anda pada:\nTanggal: %s\nJam: %s\n\nMohon hadir tepat waktu. Terima kasih!",
			patientName, dateStr, timeStr)

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
		}
	}
}
