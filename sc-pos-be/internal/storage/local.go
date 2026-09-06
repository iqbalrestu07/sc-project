package storage

import (
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
)

// LocalStorage saves files to a local directory and builds public URLs
// using baseURL as the prefix.
type LocalStorage struct {
	rootDir string // e.g. "uploads"
	baseURL string // e.g. "http://localhost:8080"
}

// NewLocalStorage creates a LocalStorage. rootDir is the on-disk directory,
// baseURL is the public URL prefix for constructing file URLs.
func NewLocalStorage(rootDir, baseURL string) *LocalStorage {
	return &LocalStorage{rootDir: rootDir, baseURL: baseURL}
}

func (s *LocalStorage) Upload(_ context.Context, folder, filename string, reader io.Reader, _ string) (string, error) {
	dir := s.rootDir
	if folder != "" {
		dir = filepath.Join(dir, folder)
	}
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", fmt.Errorf("failed to create upload directory: %w", err)
	}

	dest := filepath.Join(dir, filename)
	out, err := os.Create(dest)
	if err != nil {
		return "", fmt.Errorf("failed to save file: %w", err)
	}
	defer out.Close()

	if _, err := io.Copy(out, reader); err != nil {
		return "", fmt.Errorf("failed to write file: %w", err)
	}

	// Build public URL: <baseURL>/<rootDir>/<folder>/<filename>
	relPath := filepath.Join(s.rootDir, folder, filename)
	publicURL := fmt.Sprintf("%s/%s", strings.TrimRight(s.baseURL, "/"), filepath.ToSlash(relPath))
	return publicURL, nil
}

// DeleteByURL removes a file from local disk by parsing its public URL.
// Returns nil if the URL doesn't match this storage provider's baseURL.
func (s *LocalStorage) DeleteByURL(_ context.Context, publicURL string) error {
	prefix := strings.TrimRight(s.baseURL, "/") + "/"
	if !strings.HasPrefix(publicURL, prefix) {
		return nil
	}

	relPath := strings.TrimPrefix(publicURL, prefix)
	absPath := filepath.FromSlash(relPath)

	if err := os.Remove(absPath); err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("failed to delete file: %w", err)
	}
	return nil
}
