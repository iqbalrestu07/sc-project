package storage

import (
	"context"
	"fmt"

	"github.com/sc-pos/backend/config"
)

// NewFromConfig picks the right Storage implementation based on cfg.Provider.
// "supabase" → S3Storage, anything else (including "local") → LocalStorage.
func NewFromConfig(ctx context.Context, cfg config.StorageConfig) (Storage, error) {
	switch cfg.Provider {
	case "supabase":
		if cfg.S3Bucket == "" || cfg.S3Endpoint == "" ||
			cfg.S3AccessKey == "" || cfg.S3SecretKey == "" {
			return nil, fmt.Errorf("supabase storage requires S3_BUCKET, S3_ENDPOINT, S3_ACCESS_KEY, and S3_SECRET_KEY")
		}
		return NewS3Storage(ctx, cfg.S3Endpoint, cfg.S3Region,
			cfg.S3Bucket, cfg.S3AccessKey, cfg.S3SecretKey, cfg.S3ForcePathStyle)
	default:
		baseURL := cfg.BaseURL
		if baseURL == "" {
			baseURL = "http://localhost:8080"
		}
		return NewLocalStorage(cfg.UploadDir, baseURL), nil
	}
}
