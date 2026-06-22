package cms

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/sc-pos/backend/internal/database"
)

type Repository struct {
	db *sql.DB
}

type Page struct {
	ID        string      `json:"id"`
	PageID    string      `json:"page_id"`
	Data      interface{} `json:"data"`
	CreatedAt time.Time   `json:"created_at"`
	UpdatedAt time.Time   `json:"updated_at"`
}

func NewRepository() *Repository {
	return &Repository{db: database.DB}
}

func (r *Repository) ListPages() ([]Page, error) {
	rows, err := r.db.Query(`SELECT id, page_id, data, created_at, updated_at FROM cms_pages ORDER BY page_id ASC`)
	if err != nil {
		return nil, fmt.Errorf("failed to query cms pages: %w", err)
	}
	defer rows.Close()

	var pages []Page
	for rows.Next() {
		page, err := scanPage(rows)
		if err != nil {
			return nil, err
		}
		pages = append(pages, page)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed to read cms pages: %w", err)
	}
	if pages == nil {
		pages = []Page{}
	}
	return pages, nil
}

func (r *Repository) GetPage(pageID string) (*Page, error) {
	row := r.db.QueryRow(`SELECT id, page_id, data, created_at, updated_at FROM cms_pages WHERE page_id = $1`, pageID)
	page, err := scanPage(row)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &page, nil
}

func (r *Repository) UpsertPage(pageID string, data interface{}) (*Page, error) {
	payload, err := json.Marshal(data)
	if err != nil {
		return nil, fmt.Errorf("failed to encode cms page: %w", err)
	}
	_, err = r.db.Exec(`
		INSERT INTO cms_pages (id, page_id, data, created_at, updated_at)
		VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
		ON CONFLICT (page_id)
		DO UPDATE SET data = EXCLUDED.data, updated_at = CURRENT_TIMESTAMP
	`, uuid.New().String(), pageID, string(payload))
	if err != nil {
		return nil, fmt.Errorf("failed to upsert cms page: %w", err)
	}
	return r.GetPage(pageID)
}

type pageScanner interface {
	Scan(dest ...interface{}) error
}

func scanPage(scanner pageScanner) (Page, error) {
	var page Page
	var raw []byte
	if err := scanner.Scan(&page.ID, &page.PageID, &raw, &page.CreatedAt, &page.UpdatedAt); err != nil {
		return Page{}, err
	}
	if len(raw) == 0 {
		page.Data = nil
		return page, nil
	}
	if err := json.Unmarshal(raw, &page.Data); err != nil {
		return Page{}, fmt.Errorf("failed to decode cms page: %w", err)
	}
	if m, ok := page.Data.(map[string]interface{}); ok {
		if m == nil {
			m = map[string]interface{}{}
		}
		m["id"] = page.ID
		m["created_at"] = page.CreatedAt
		m["updated_at"] = page.UpdatedAt
		page.Data = m
	}
	return page, nil
}
