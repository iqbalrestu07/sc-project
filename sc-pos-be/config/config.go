package config

import (
	"fmt"
	"net/url"
	"os"
	"strconv"
)

type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
	JWT      JWTConfig
	Storage  StorageConfig
}

type ServerConfig struct {
	Host string
	Port string
}

type DatabaseConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	DBName   string
	SSLMode  string
}

type JWTConfig struct {
	SecretKey          string
	ExpiryHours        int
	RefreshExpiryHours int
}

// StorageConfig controls where uploaded files (CMS images, clinic logo/favicon)
// are persisted. Provider "local" (default) saves to disk; "supabase" uploads
// to Supabase S3-compatible storage.
type StorageConfig struct {
	Provider  string // "local" | "supabase"
	UploadDir string // local: root upload directory
	BaseURL   string // local: public base URL for constructing file URLs

	// S3 settings (used when Provider = "supabase")
	S3Bucket         string
	S3Endpoint       string // e.g. https://<ref>.storage.supabase.co/storage/v1/s3
	S3Region         string
	S3AccessKey      string
	S3SecretKey      string
	S3ForcePathStyle bool
}

func Load() *Config {
	return &Config{
		Server: ServerConfig{
			Host: getEnv("SERVER_HOST", "0.0.0.0"),
			Port: getEnv("SERVER_PORT", "8080"),
		},
		Database: DatabaseConfig{
			Host:     getEnv("DB_HOST", "localhost"),
			Port:     getEnv("DB_PORT", "5432"),
			User:     getEnv("DB_USER", "postgres"),
			Password: getEnv("DB_PASSWORD", ""),
			DBName:   getEnv("DB_NAME", "sc_pos"),
			SSLMode:  getEnv("DB_SSLMODE", "disable"),
		},
		JWT: JWTConfig{
			SecretKey:          getEnv("JWT_SECRET_KEY", "your-secret-key-change-in-production"),
			ExpiryHours:        getEnvInt("JWT_EXPIRY_HOURS", 24),
			RefreshExpiryHours: getEnvInt("JWT_REFRESH_EXPIRY_HOURS", 168),
		},
		Storage: StorageConfig{
			Provider:         getEnv("STORAGE_PROVIDER", "local"),
			UploadDir:        getEnv("UPLOAD_DIR", "uploads"),
			BaseURL:          getEnv("BASE_URL", ""),
			S3Bucket:         getEnv("S3_BUCKET", ""),
			S3Endpoint:       getEnv("S3_ENDPOINT", ""),
			S3Region:         getEnv("S3_REGION", "ap-southeast-1"),
			S3AccessKey:      getEnv("S3_ACCESS_KEY", ""),
			S3SecretKey:      getEnv("S3_SECRET_KEY", ""),
			S3ForcePathStyle: getEnvBool("S3_FORCE_PATH_STYLE", true),
		},
	}
}

func (c *DatabaseConfig) DSN() string {
	// URL-encode user and password so special characters like %, @, !, ?
	// in the password don't break the connection string parsing.
	return fmt.Sprintf(
		"postgres://%s:%s@%s:%s/%s?sslmode=%s",
		url.QueryEscape(c.User),
		url.QueryEscape(c.Password),
		c.Host,
		c.Port,
		c.DBName,
		c.SSLMode,
	)
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if parsed, err := strconv.Atoi(value); err == nil {
			return parsed
		}
	}
	return defaultValue
}

func getEnvBool(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		if parsed, err := strconv.ParseBool(value); err == nil {
			return parsed
		}
	}
	return defaultValue
}
