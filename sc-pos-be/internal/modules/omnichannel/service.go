package omnichannel

import (
	"strings"
	"time"

	"github.com/sc-pos/backend/internal/models"
)

type Service interface {
	HandleIncomingMessage(orgID, platform, deviceID, identifier, customerName, contentType, content, mediaURL string, timestamp time.Time) error
	GetConversations(orgID string, limit, offset int) ([]models.OmniConversation, error)
	GetMessages(convID, orgID string, limit, offset int) ([]models.OmniMessage, error)
	SaveOutboundMessage(convID, orgID, senderUserID, contentType, content, mediaURL string) (*models.OmniMessage, error)
	MarkAsRead(convID, orgID string) error
}

type service struct {
	repo Repository
}

func NewService(repo Repository) Service {
	return &service{repo: repo}
}

func (s *service) HandleIncomingMessage(orgID, platform, deviceID, identifier, customerName, contentType, content, mediaURL string, timestamp time.Time) error {
	// 1. Find or create conversation
	conv, err := s.repo.GetConversationByCustomer(orgID, platform, identifier)
	if err != nil {
		return err
	}

	if conv == nil {
		conv = &models.OmniConversation{
			OrganizationID:     orgID,
			Platform:           platform,
			DeviceID:           deviceID,
			CustomerIdentifier: identifier,
			CustomerName:       customerName,
			Status:             "open",
			UnreadCount:        1,
			LastMessageContent: content,
			LastMessageAt:      timestamp,
		}
		if contentType == "image" {
			conv.LastMessageContent = "📷 Image"
		} else if contentType == "document" {
			conv.LastMessageContent = "📄 Document"
		} else if contentType == "video" || contentType == "audio" {
			conv.LastMessageContent = "🎵 Media"
		}
		if err := s.repo.CreateConversation(conv); err != nil {
			return err
		}
	} else {
		// Update existing
		if customerName != "" && conv.CustomerName == "" {
			conv.CustomerName = customerName
		}
		conv.UnreadCount += 1
		conv.LastMessageContent = content
		if contentType == "image" {
			conv.LastMessageContent = "📷 Image"
		} else if contentType == "document" {
			conv.LastMessageContent = "📄 Document"
		} else if contentType == "video" || contentType == "audio" {
			conv.LastMessageContent = "🎵 Media"
		}
		conv.LastMessageAt = timestamp
		conv.Status = "open"
		if err := s.repo.UpdateConversation(conv); err != nil {
			return err
		}
	}

	// 2. Save Message
	msg := &models.OmniMessage{
		ConversationID: conv.ID,
		Direction:      "inbound",
		Status:         "delivered",
		ContentType:    contentType,
		Content:        content,
		MediaURL:       mediaURL,
		Timestamp:      timestamp,
	}
	if err := s.repo.SaveMessage(msg); err != nil {
		return err
	}

	return nil
}

func (s *service) GetConversations(orgID string, limit, offset int) ([]models.OmniConversation, error) {
	if limit <= 0 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}
	return s.repo.GetConversations(orgID, limit, offset)
}

func (s *service) GetMessages(convID, orgID string, limit, offset int) ([]models.OmniMessage, error) {
	// verify ownership
	c, err := s.repo.GetConversationByID(convID, orgID)
	if err != nil {
		return nil, err
	}
	if c == nil {
		return nil, nil
	}

	if limit <= 0 {
		limit = 50
	}
	return s.repo.GetMessages(convID, limit, offset)
}

func (s *service) SaveOutboundMessage(convID, orgID, senderUserID, contentType, content, mediaURL string) (*models.OmniMessage, error) {
	// verify ownership
	conv, err := s.repo.GetConversationByID(convID, orgID)
	if err != nil {
		return nil, err
	}
	if conv == nil {
		return nil, nil // not found
	}

	timestamp := time.Now()
	msg := &models.OmniMessage{
		ConversationID: conv.ID,
		Direction:      "outbound",
		Status:         "sent",
		ContentType:    contentType,
		Content:        content,
		MediaURL:       mediaURL,
		SenderUserID:   &senderUserID,
		Timestamp:      timestamp,
	}
	if err := s.repo.SaveMessage(msg); err != nil {
		return nil, err
	}

	// update conversation
	conv.LastMessageContent = content
	if contentType != "text" {
		conv.LastMessageContent = strings.Title(contentType)
	}
	conv.LastMessageAt = timestamp
	if err := s.repo.UpdateConversation(conv); err != nil {
		return nil, err
	}

	return msg, nil
}

func (s *service) MarkAsRead(convID, orgID string) error {
	c, err := s.repo.GetConversationByID(convID, orgID)
	if err != nil || c == nil {
		return err
	}
	return s.repo.MarkMessagesAsRead(convID)
}
