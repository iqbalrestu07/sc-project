package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/sc-pos/backend/internal/middleware"
	"github.com/sc-pos/backend/internal/modules/appointment"
	authModule "github.com/sc-pos/backend/internal/modules/auth"
	"github.com/sc-pos/backend/internal/modules/cms"
	"github.com/sc-pos/backend/internal/modules/commission"
	"github.com/sc-pos/backend/internal/modules/consumable"
	"github.com/sc-pos/backend/internal/modules/dashboard"
	"github.com/sc-pos/backend/internal/modules/patient"
	"github.com/sc-pos/backend/internal/modules/product"
	serviceModule "github.com/sc-pos/backend/internal/modules/service"
	"github.com/sc-pos/backend/internal/modules/settings"
	"github.com/sc-pos/backend/internal/modules/staff"
	"github.com/sc-pos/backend/internal/modules/stock"
	"github.com/sc-pos/backend/internal/modules/transaction"
	"github.com/sc-pos/backend/internal/modules/whatsapp"
)

func SetupRoutes(router *gin.Engine) {
	// Apply CORS middleware globally
	router.Use(middleware.CORSMiddleware())

	// Health check (no auth)
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// Public API routes
	api := router.Group("/api")
	{
		authModule.RegisterPublicRoutes(api)
		cms.RegisterPublicRoutes(api)
	}

	// Protected API routes (require authentication)
	protectedAPI := router.Group("/api")
	protectedAPI.Use(middleware.AuthMiddleware())
	{
		adminOnly := middleware.RequireRole("admin")
		staffAndDoctors := middleware.RequireRole("admin", "doctor", "therapist")

		patient.RegisterRoutes(protectedAPI)
		serviceModule.RegisterRoutes(protectedAPI, adminOnly)
		product.RegisterRoutes(protectedAPI, adminOnly)
		staff.RegisterRoutes(protectedAPI, adminOnly)
		appointment.RegisterRoutes(protectedAPI)
		transaction.RegisterRoutes(protectedAPI)
		commission.RegisterRoutes(protectedAPI, staffAndDoctors, adminOnly)
		settings.RegisterRoutes(protectedAPI, adminOnly)
		dashboard.RegisterRoutes(protectedAPI)
		cms.RegisterRoutes(protectedAPI, adminOnly)
		stock.RegisterRoutes(protectedAPI, adminOnly)
		consumable.RegisterRoutes(protectedAPI, adminOnly)
		whatsapp.RegisterRoutes(protectedAPI)
		authModule.RegisterProtectedRoutes(protectedAPI)
	}
}
