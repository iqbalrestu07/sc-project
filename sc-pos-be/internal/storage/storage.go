package storage

import (
	"context"
	"fmt"
	"io"
	"path/filepath"
	"strings"
	"time"

	"github.com/sc-pos/backend/internal/utils"
)

// Storage abstracts file persistence so handlers don't care whether files
// land on local disk or in Supabase S3-compatible storage.
type Storage interface {
	// Upload saves a file under the given folder (e.g. "cms", "brand") and
	// returns the public URL for accessing it.
	Upload(ctx context.Context, folder, filename string, reader io.Reader, contentType string) (string, error)

	// DeleteByURL removes the file that was previously uploaded and is
	// referenced by the given public URL. It is a no-op if the URL does not
	// belong to this storage provider (e.g. external URL).
	DeleteByURL(ctx context.Context, publicURL string) error
}

// GenerateFilename produces a unique filename using a timestamp + short UUID.
// ext should include the leading dot (e.g. ".jpg").
func GenerateFilename(ext string) string {
	if ext == "" {
		ext = ".jpg"
	}
	return fmt.Sprintf("%d-%s%s", time.Now().UnixMilli(), utils.NewUUID()[:8], ext)
}

// SanitizeFolder cleans a user-supplied folder path and rejects traversal.
// Returns the cleaned relative folder or an error.
func SanitizeFolder(folder string) (string, error) {
	if folder == "" {
		return "", nil
	}
	clean := filepath.Clean(folder)
	if filepath.IsAbs(clean) || clean == ".." || strings.HasPrefix(clean, ".."+string(filepath.Separator)) {
		return "", fmt.Errorf("invalid upload folder")
	}
	return clean, nil
}
