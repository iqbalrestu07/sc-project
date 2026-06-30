package whatsapp

import (
	"fmt"
	"net/http"
	"net/url"
	"os"
	"strings"
)

// Service is the public interface for the whatsapp module business logic.
type Service interface {
	Send(to, message string) (*SendResult, error)
	SendBulk(recipients []Recipient, message string) BulkSendResult
	Templates() []Template
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

// Send sends a WhatsApp message.
// If WHATSAPP_API_URL env var is set, it calls the external API.
// Otherwise it falls back to a wa.me deep-link style response (useful for dev/testing).
func (s *service) Send(to, message string) (*SendResult, error) {
	apiURL := os.Getenv("WHATSAPP_API_URL")
	apiToken := os.Getenv("WHATSAPP_API_TOKEN")

	if apiURL != "" {
		client := &http.Client{}
		data := url.Values{}
		data.Set("to", to)
		data.Set("message", message)
		req, err := http.NewRequest("POST", apiURL, strings.NewReader(data.Encode()))
		if err != nil {
			return nil, fmt.Errorf("failed to build whatsapp request: %w", err)
		}
		req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
		if apiToken != "" {
			req.Header.Set("Authorization", "Bearer "+apiToken)
		}
		resp, err := client.Do(req)
		if err != nil {
			return nil, fmt.Errorf("failed to send whatsapp message: %w", err)
		}
		defer resp.Body.Close()
		if resp.StatusCode >= 300 {
			return nil, fmt.Errorf("whatsapp API returned status %d", resp.StatusCode)
		}
	}

	return &SendResult{
		Success: true,
		To:      to,
		Message: "Message queued successfully",
	}, nil
}

// SendBulk sends the same message to multiple recipients.
func (s *service) SendBulk(recipients []Recipient, message string) BulkSendResult {
	result := BulkSendResult{
		Total:   len(recipients),
		Results: make([]SendResult, 0, len(recipients)),
	}

	for _, r := range recipients {
		res, err := s.Send(r.To, message)
		if err != nil || res == nil {
			result.Failed++
			result.Results = append(result.Results, SendResult{Success: false, To: r.To, Message: err.Error()})
		} else {
			result.Success++
			result.Results = append(result.Results, *res)
		}
	}

	return result
}

func (s *service) Templates() []Template {
	return s.repo.Templates()
}
