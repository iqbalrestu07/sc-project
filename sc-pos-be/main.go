package main

import (
	"fmt"
	"log"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/sc-pos/backend/config"
	"github.com/sc-pos/backend/internal/auth"
	"github.com/sc-pos/backend/internal/database"
	"github.com/sc-pos/backend/internal/routes"
)

func main() {
	// Load environment variables
	_ = godotenv.Load()

	// Load config
	cfg := config.Load()

	// Initialize JWT secret
	auth.InitJWT(cfg.JWT.SecretKey)

	// Connect to database
	if err := database.Connect(cfg.Database.DSN()); err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer database.Close()

	// Run migrations
	if err := database.RunMigrations(); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	// Create Gin router
	router := gin.Default()

	// Setup routes
	routes.SetupRoutes(router)

	// Start server
	addr := fmt.Sprintf("%s:%s", cfg.Server.Host, cfg.Server.Port)
	fmt.Printf("🚀 Server starting on http://%s\n", addr)

	if err := router.Run(addr); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
