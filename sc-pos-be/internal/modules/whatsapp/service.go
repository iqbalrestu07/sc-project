package whatsapp

import (
	"context"
	"errors"
	"fmt"
	"math/rand"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/sc-pos/backend/internal/models"
	"github.com/sc-pos/backend/internal/modules/settings"
	"go.mau.fi/whatsmeow/proto/waE2E"
	"go.mau.fi/whatsmeow/types"
	"google.golang.org/protobuf/proto"
)

// Service is the public interface for the whatsapp module business logic.
type Service interface {
	Send(orgID, deviceID, to, message string) (*SendResult, error)
	SendBulk(orgID, deviceID string, recipients []Recipient, templateID, customMessage string) BulkSendResult
	SendBlast(orgID string, req BlastRequest) BlastResult
	Templates(orgID string) ([]Template, error)
	CreateTemplate(orgID, name, content string) (*Template, error)
	UpdateTemplate(id, orgID, name, content string) error
	DeleteTemplate(id, orgID string) error
	GetDevices(orgID string) ([]WhatsappDevice, error)
	GetLoginQR(ctx context.Context, orgID, deviceName string) (<-chan string, error)
	Logout(orgID, deviceID string) error
	SendInvoice(orgID, deviceID string, data InvoiceData) error
	SendLowStockAlert(orgID, itemName string, currentStock, minStock int) error
}

type InvoiceData struct {
	PatientWhatsApp string
	PatientName     string
	TransactionCode string
	TotalAmount     float64
	Items           []InvoiceItem
}

type InvoiceItem struct {
	Name       string
	Quantity   int
	TotalPrice float64
}

type service struct {
	repo          *Repository
	clientManager *ClientManager
}

func NewService(repo ...*Repository) Service {
	r := NewRepository()
	if len(repo) > 0 {
		r = repo[0]
	}
	return &service{
		repo:          r,
		clientManager: GetClientManager(),
	}
}

type SendResult struct {
	Success bool   `json:"success"`
	To      string `json:"to"`
	Message string `json:"message,omitempty"`
}

type BulkSendResult struct {
	Total   int          `json:"total"`
	Success int          `json:"success"`
	Failed  int          `json:"failed"`
	Results []SendResult `json:"results"`
}

type BlastResult struct {
	TotalAttempted int `json:"total_attempted"`
	Success        int `json:"success"`
}

type BlastRequest struct {
	TemplateID string      `json:"template_id"`
	DeviceIDs  []string    `json:"device_ids"`
	Recipients []Recipient `json:"recipients"`  // Optional predefined recipients
	MaxBlast   int         `json:"max_blast"`   // Max random successful messages
	RegionCode string      `json:"region_code"` // e.g. "+628"
}

// ── Sending Messages ────────────────────────────────────────────────────────

func (s *service) Send(orgID, deviceID, to, message string) (*SendResult, error) {
	if s.clientManager == nil {
		return nil, errors.New("whatsapp client manager not initialized")
	}

	jidStr, err := s.repo.GetDeviceJID(orgID, deviceID)
	if err != nil {
		return nil, err
	}
	if jidStr == "" {
		return nil, errors.New("organization not logged in to WhatsApp")
	}

	client, err := s.clientManager.GetClient(jidStr)
	if err != nil {
		return nil, fmt.Errorf("failed to get whatsapp client: %v", err)
	}

	// Clean up phone number format
	to = strings.TrimSpace(to)
	to = strings.TrimPrefix(to, "+")
	if strings.HasPrefix(to, "0") {
		// Convert Indonesian 08xx to 628xx
		to = "62" + strings.TrimPrefix(to, "0")
	}
	if !strings.Contains(to, "@") {
		to = to + "@s.whatsapp.net"
	}
	targetJID, err := types.ParseJID(to)
	if err != nil {
		return nil, fmt.Errorf("invalid recipient JID: %v", err)
	}

	msg := &waE2E.Message{
		Conversation: proto.String(message),
	}

	_, err = client.SendMessage(context.Background(), targetJID, msg)
	if err != nil {
		return &SendResult{Success: false, To: to, Message: err.Error()}, err
	}

	return &SendResult{
		Success: true,
		To:      to,
		Message: "Message sent successfully",
	}, nil
}

func (s *service) SendBulk(orgID, deviceID string, recipients []Recipient, templateID, customMessage string) BulkSendResult {
	result := BulkSendResult{
		Total:   len(recipients),
		Results: make([]SendResult, 0, len(recipients)),
	}

	_, err := s.repo.GetDeviceJID(orgID, deviceID)
	if err != nil {
		result.Failed = len(recipients)
		return result
	}

	var baseContent string
	if customMessage != "" {
		baseContent = customMessage
	} else if templateID != "" {
		template, err := s.repo.GetTemplateByID(templateID, orgID)
		if err != nil || template == nil {
			result.Failed = len(recipients)
			return result
		}
		baseContent = template.Content
	} else {
		result.Failed = len(recipients)
		return result
	}

	for _, r := range recipients {
		content := baseContent
		if r.PatientName != "" {
			content = strings.ReplaceAll(content, "{{name}}", r.PatientName)
		}
		res, err := s.Send(orgID, deviceID, r.To, content)
		if err != nil || res == nil || !res.Success {
			result.Failed++
			errMsg := "Failed"
			if err != nil {
				errMsg = err.Error()
			} else if res != nil {
				errMsg = res.Message
			}
			result.Results = append(result.Results, SendResult{Success: false, To: r.To, Message: errMsg})
		} else {
			result.Success++
			result.Results = append(result.Results, *res)
		}
	}

	return result
}

func (s *service) SendBlast(orgID string, req BlastRequest) BlastResult {
	result := BlastResult{}

	template, err := s.repo.GetTemplateByID(req.TemplateID, orgID)
	if err != nil || template == nil {
		return result // Template not found
	}

	if len(req.DeviceIDs) == 0 {
		return result
	}

	var validDeviceIDs []string
	for _, id := range req.DeviceIDs {
		jidStr, _ := s.repo.GetDeviceJID(orgID, id)
		if jidStr != "" {
			c, _ := s.clientManager.GetClient(jidStr)
			if c != nil {
				validDeviceIDs = append(validDeviceIDs, id)
			}
		}
	}

	if len(validDeviceIDs) == 0 {
		return result
	}

	deviceCount := len(validDeviceIDs)
	currentDeviceIdx := 0

	getNextDeviceID := func() string {
		id := validDeviceIDs[currentDeviceIdx]
		currentDeviceIdx = (currentDeviceIdx + 1) % deviceCount
		return id
	}

	// 1. Send to predefined recipients if any
	for _, r := range req.Recipients {
		if result.Success >= req.MaxBlast && req.MaxBlast > 0 {
			break
		}
		result.TotalAttempted++
		content := template.Content
		if r.PatientName != "" {
			content = strings.ReplaceAll(content, "{{name}}", r.PatientName)
		}
		senderDeviceID := getNextDeviceID()
		res, _ := s.Send(orgID, senderDeviceID, r.To, content)
		if res != nil && res.Success {
			result.Success++
		}
	}

	// 2. Generate random numbers until max_blast is reached
	rand.Seed(time.Now().UnixNano())
	ctx := context.Background()

	// E.g. "+62812", "+628" etc. We strip the plus for IsOnWhatsApp
	basePrefix := strings.TrimPrefix(req.RegionCode, "+")
	if basePrefix == "" {
		basePrefix = "628" // default Indonesia
	}

	maxAttempts := req.MaxBlast * 10 // Prevent infinite loops
	if req.MaxBlast <= 0 {
		return result
	}

	for i := 0; i < maxAttempts && result.Success < req.MaxBlast; i++ {
		// Generate random 8 to 11 digits to append
		length := rand.Intn(4) + 8 // 8, 9, 10, 11
		suffix := ""
		for j := 0; j < length; j++ {
			suffix += fmt.Sprintf("%d", rand.Intn(10))
		}

		phone := "+" + basePrefix + suffix
		result.TotalAttempted++

		// Validate using IsOnWhatsApp
		// Need a client for IsOnWhatsApp check. We can just use the first valid one
		// Wait, if we use the first valid one, it should work for the IsOnWhatsApp check.
		jidStr, _ := s.repo.GetDeviceJID(orgID, validDeviceIDs[0])
		client, _ := s.clientManager.GetClient(jidStr)
		if client == nil {
			continue
		}

		checkRes, err := client.IsOnWhatsApp(ctx, []string{phone})
		if err != nil || len(checkRes) == 0 {
			continue
		}

		if checkRes[0].IsIn {
			// Found valid number, send
			senderDeviceID := getNextDeviceID()
			res, _ := s.Send(orgID, senderDeviceID, phone, template.Content)
			if res != nil && res.Success {
				result.Success++
			}
		}
	}

	return result
}

// ── Device / Session Management ─────────────────────────────────────────────

func (s *service) GetDevices(orgID string) ([]WhatsappDevice, error) {
	devices, err := s.repo.GetDevices(orgID)
	if err != nil {
		return nil, err
	}

	for i := range devices {
		devices[i].Status = "disconnected"
		client, err := s.clientManager.GetClient(devices[i].JID)
		if err == nil && client != nil && client.Store != nil && client.Store.ID != nil {
			devices[i].Status = "connected"
		}
	}

	return devices, nil
}

func (s *service) GetLoginQR(ctx context.Context, orgID, deviceName string) (<-chan string, error) {
	return s.clientManager.StartNewSession(ctx, func(newJid string) {
		d := &WhatsappDevice{
			ID:             uuid.New().String(),
			OrganizationID: orgID,
			Name:           deviceName,
			JID:            newJid,
		}
		s.repo.SaveDevice(d)
	})
}

func (s *service) Logout(orgID, deviceID string) error {
	jidStr, err := s.repo.GetDeviceJID(orgID, deviceID)
	if err != nil {
		return err
	}
	if jidStr != "" {
		s.clientManager.DeleteSession(jidStr)
		return s.repo.DeleteDevice(orgID, deviceID)
	}
	return nil
}

// ── Templates ───────────────────────────────────────────────────────────────

func (s *service) Templates(orgID string) ([]Template, error) {
	return s.repo.GetTemplates(orgID)
}

func (s *service) CreateTemplate(orgID, name, content string) (*Template, error) {
	t := &Template{
		Name:           name,
		Content:        content,
		OrganizationID: orgID,
	}
	if err := s.repo.CreateTemplate(t); err != nil {
		return nil, err
	}
	return t, nil
}

func (s *service) UpdateTemplate(id, orgID, name, content string) error {
	return s.repo.UpdateTemplate(id, orgID, name, content)
}

func (s *service) DeleteTemplate(id, orgID string) error {
	return s.repo.DeleteTemplate(id, orgID)
}

// ── Integrations ────────────────────────────────────────────────────────────

func (s *service) SendLowStockAlert(orgID, itemName string, currentStock, minStock int) error {
	settingsRepo := settings.NewRepository()
	var clinic *models.ClinicSettings
	if orgID != "" {
		clinic, _ = settingsRepo.GetClinic(orgID)
	} else {
		clinic, _ = settingsRepo.GetFirstClinic()
	}

	if clinic == nil || clinic.LowStockAlerts == nil || !*clinic.LowStockAlerts {
		return nil // Alert not enabled
	}

	if clinic.WhatsAppBusinessPhoneID == nil || *clinic.WhatsAppBusinessPhoneID == "" {
		return nil // No admin number specified
	}

	msg := fmt.Sprintf("⚠️ *SYSTEM ALERT - LOW STOCK* ⚠️\n\nStok untuk item *%s* saat ini telah mencapai batas minimum.\n\nSisa Stok: %d\nBatas Minimum: %d\n\nMohon segera lakukan restock untuk menghindari kehabisan stok.", itemName, currentStock, minStock)

	devices, err := s.GetDevices(orgID)
	if err != nil || len(devices) == 0 {
		return fmt.Errorf("no active whatsapp device to send alert")
	}

	_, err = s.Send(orgID, devices[0].ID, *clinic.WhatsAppBusinessPhoneID, msg)
	return err
}

func (s *service) SendInvoice(orgID, deviceID string, data InvoiceData) error {
	if data.PatientWhatsApp == "" {
		return nil // Cannot send if no WhatsApp number
	}

	settingsRepo := settings.NewRepository()
	var clinic *models.ClinicSettings
	if orgID != "" {
		clinic, _ = settingsRepo.GetClinic(orgID)
	} else {
		clinic, _ = settingsRepo.GetFirstClinic()
	}

	headerTitle := "INVOICE TRANSAKSI"
	headerDesc := fmt.Sprintf("Halo %s,\nTerima kasih atas kunjungan Anda.", data.PatientName)
	patientGreeting := fmt.Sprintf("Halo %s,\nTerima kasih atas kunjungan Anda.", data.PatientName)
	footerText := "Terima kasih!"

	if clinic != nil {
		if clinic.WaInvoiceHeaderTitle != nil && *clinic.WaInvoiceHeaderTitle != "" {
			headerTitle = *clinic.WaInvoiceHeaderTitle
		}
		if clinic.WaInvoiceHeaderDescription != nil && *clinic.WaInvoiceHeaderDescription != "" {
			headerDesc = strings.ReplaceAll(*clinic.WaInvoiceHeaderDescription, "{{name}}", data.PatientName)
		}
		if clinic.WaInvoiceFooterText != nil && *clinic.WaInvoiceFooterText != "" {
			footerText = *clinic.WaInvoiceFooterText
		}
	}

	msg := fmt.Sprintf("%s\n\n*%s*\n\n%s\n\n*Kode Transaksi:* %s\n\n*Detail Transaksi:*\n", patientGreeting, headerTitle, headerDesc, data.TransactionCode)

	for _, item := range data.Items {
		msg += fmt.Sprintf("- %s (x%d): Rp %.2f\n", item.Name, item.Quantity, item.TotalPrice)
	}

	msg += fmt.Sprintf("\n*Total: Rp %.2f*\n\n%s", data.TotalAmount, footerText)

	_, err := s.Send(orgID, deviceID, data.PatientWhatsApp, msg)
	return err
}
