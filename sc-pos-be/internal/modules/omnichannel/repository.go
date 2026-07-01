package omnichannel

import (
	"database/sql"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/sc-pos/backend/internal/database"
	"github.com/sc-pos/backend/internal/models"
)

type Repository interface {
	GetConversations(orgID string, limit, offset int) ([]models.OmniConversation, error)
	GetConversationByID(convID, orgID string) (*models.OmniConversation, error)
	GetConversationByCustomer(orgID, platform, identifier string) (*models.OmniConversation, error)
	CreateConversation(conv *models.OmniConversation) error
	UpdateConversation(conv *models.OmniConversation) error
	GetMessages(convID string, limit, offset int) ([]models.OmniMessage, error)
	SaveMessage(msg *models.OmniMessage) error
	MarkMessagesAsRead(convID string) error
}

type repository struct {
	db *sql.DB
}

func NewRepository() Repository {
	return &repository{db: database.DB}
}

func (r *repository) GetConversations(orgID string, limit, offset int) ([]models.OmniConversation, error) {
	query := `
		SELECT id, organization_id, platform, device_id, customer_identifier, customer_name,
		       last_message_content, last_message_at, unread_count, status, created_at, updated_at
		FROM omni_conversations
		WHERE organization_id = $1
		ORDER BY last_message_at DESC
		LIMIT $2 OFFSET $3
	`
	rows, err := r.db.Query(query, orgID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var convs []models.OmniConversation
	for rows.Next() {
		var c models.OmniConversation
		var deviceID, name, content sql.NullString
		if err := rows.Scan(
			&c.ID, &c.OrganizationID, &c.Platform, &deviceID, &c.CustomerIdentifier,
			&name, &content, &c.LastMessageAt, &c.UnreadCount, &c.Status,
			&c.CreatedAt, &c.UpdatedAt,
		); err != nil {
			return nil, err
		}
		c.DeviceID = deviceID.String
		c.CustomerName = name.String
		c.LastMessageContent = content.String
		convs = append(convs, c)
	}
	return convs, nil
}

func (r *repository) GetConversationByID(convID, orgID string) (*models.OmniConversation, error) {
	query := `
		SELECT id, organization_id, platform, device_id, customer_identifier, customer_name,
		       last_message_content, last_message_at, unread_count, status, created_at, updated_at
		FROM omni_conversations
		WHERE id = $1 AND organization_id = $2
	`
	var c models.OmniConversation
	var deviceID, name, content sql.NullString
	err := r.db.QueryRow(query, convID, orgID).Scan(
		&c.ID, &c.OrganizationID, &c.Platform, &deviceID, &c.CustomerIdentifier,
		&name, &content, &c.LastMessageAt, &c.UnreadCount, &c.Status,
		&c.CreatedAt, &c.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	c.DeviceID = deviceID.String
	c.CustomerName = name.String
	c.LastMessageContent = content.String
	return &c, nil
}

func (r *repository) GetConversationByCustomer(orgID, platform, identifier string) (*models.OmniConversation, error) {
	query := `
		SELECT id, organization_id, platform, device_id, customer_identifier, customer_name,
		       last_message_content, last_message_at, unread_count, status, created_at, updated_at
		FROM omni_conversations
		WHERE organization_id = $1 AND platform = $2 AND customer_identifier = $3
	`
	var c models.OmniConversation
	var deviceID, name, content sql.NullString
	err := r.db.QueryRow(query, orgID, platform, identifier).Scan(
		&c.ID, &c.OrganizationID, &c.Platform, &deviceID, &c.CustomerIdentifier,
		&name, &content, &c.LastMessageAt, &c.UnreadCount, &c.Status,
		&c.CreatedAt, &c.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	c.DeviceID = deviceID.String
	c.CustomerName = name.String
	c.LastMessageContent = content.String
	return &c, nil
}

func (r *repository) CreateConversation(conv *models.OmniConversation) error {
	if conv.ID == "" {
		conv.ID = uuid.New().String()
	}
	now := time.Now()
	if conv.CreatedAt.IsZero() {
		conv.CreatedAt = now
	}
	conv.UpdatedAt = now
	if conv.Status == "" {
		conv.Status = "open"
	}

	query := `
		INSERT INTO omni_conversations (
			id, organization_id, platform, device_id, customer_identifier,
			customer_name, last_message_content, last_message_at, unread_count,
			status, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
	`
	_, err := r.db.Exec(query,
		conv.ID, conv.OrganizationID, conv.Platform, conv.DeviceID, conv.CustomerIdentifier,
		conv.CustomerName, conv.LastMessageContent, conv.LastMessageAt, conv.UnreadCount,
		conv.Status, conv.CreatedAt, conv.UpdatedAt,
	)
	return err
}

func (r *repository) UpdateConversation(conv *models.OmniConversation) error {
	conv.UpdatedAt = time.Now()
	query := `
		UPDATE omni_conversations SET
			customer_name = $1,
			last_message_content = $2,
			last_message_at = $3,
			unread_count = $4,
			status = $5,
			updated_at = $6
		WHERE id = $7
	`
	_, err := r.db.Exec(query,
		conv.CustomerName, conv.LastMessageContent, conv.LastMessageAt,
		conv.UnreadCount, conv.Status, conv.UpdatedAt, conv.ID,
	)
	return err
}

func (r *repository) GetMessages(convID string, limit, offset int) ([]models.OmniMessage, error) {
	query := `
		SELECT id, conversation_id, direction, status, content_type, content, media_url, sender_user_id, timestamp
		FROM omni_messages
		WHERE conversation_id = $1
		ORDER BY timestamp DESC
		LIMIT $2 OFFSET $3
	`
	rows, err := r.db.Query(query, convID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var msgs []models.OmniMessage
	for rows.Next() {
		var m models.OmniMessage
		var content, media, sender sql.NullString
		if err := rows.Scan(
			&m.ID, &m.ConversationID, &m.Direction, &m.Status, &m.ContentType,
			&content, &media, &sender, &m.Timestamp,
		); err != nil {
			return nil, err
		}
		m.Content = content.String
		m.MediaURL = media.String
		if sender.Valid {
			s := sender.String
			m.SenderUserID = &s
		}
		msgs = append(msgs, m)
	}
	return msgs, nil
}

func (r *repository) SaveMessage(msg *models.OmniMessage) error {
	if msg.ID == "" {
		msg.ID = uuid.New().String()
	}
	if msg.Timestamp.IsZero() {
		msg.Timestamp = time.Now()
	}

	query := `
		INSERT INTO omni_messages (
			id, conversation_id, direction, status, content_type,
			content, media_url, sender_user_id, timestamp
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`
	_, err := r.db.Exec(query,
		msg.ID, msg.ConversationID, msg.Direction, msg.Status, msg.ContentType,
		msg.Content, msg.MediaURL, msg.SenderUserID, msg.Timestamp,
	)
	return err
}

func (r *repository) MarkMessagesAsRead(convID string) error {
	query := `UPDATE omni_conversations SET unread_count = 0 WHERE id = $1`
	_, err := r.db.Exec(query, convID)
	return err
}
