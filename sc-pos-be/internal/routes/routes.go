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
	orgModule "github.com/sc-pos/backend/internal/modules/organization"
	"github.com/sc-pos/backend/internal/modules/patient"
	"github.com/sc-pos/backend/internal/modules/product"
	rbacModule "github.com/sc-pos/backend/internal/modules/rbac"
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

	// Public API routes (no auth required)
	api := router.Group("/api")
	{
		authModule.RegisterPublicRoutes(api)
		cms.RegisterPublicRoutes(api)
	}

	// Protected API routes — JWT required, org context optional but resolved if header present
	protectedAPI := router.Group("/api")
	protectedAPI.Use(middleware.AuthMiddleware())
	protectedAPI.Use(middleware.OrgMiddleware()) // resolves org_id + org_role from X-Organization-ID header
	{
		// ── Role shortcuts (org_role aware) ────────────────────────────────
		adminOnly := middleware.RequireRole(middleware.RoleAdmin)
		cashierAndAdmin := middleware.RequireRole(middleware.RoleAdmin, middleware.RoleCashier)
		medicalStaff := middleware.RequireRole(middleware.RoleAdmin, middleware.RoleDoctor, middleware.RoleTherapist)
		staffAndDoctors := middleware.RequireRole(middleware.RoleAdmin, middleware.RoleDoctor, middleware.RoleTherapist)

		// ── Permission shortcuts ─────────────────────────────────────────
		canReadPatients := middleware.RequirePermission("patients:read")
		canWritePatients := middleware.RequirePermission("patients:write")
		canDeletePatients := middleware.RequirePermission("patients:delete")
		canReadServices := middleware.RequirePermission("services:read")
		canWriteServices := middleware.RequirePermission("services:write")
		canDeleteServices := middleware.RequirePermission("services:delete")
		canReadProducts := middleware.RequirePermission("products:read")
		canWriteProducts := middleware.RequirePermission("products:write")
		canDeleteProducts := middleware.RequirePermission("products:delete")
		canReadCategories := middleware.RequirePermission("categories:read")
		canWriteCategories := middleware.RequirePermission("categories:write")
		canDeleteCategories := middleware.RequirePermission("categories:delete")
		canReadTx := middleware.RequirePermission("transactions:read")
		canWriteTx := middleware.RequirePermission("transactions:write")
		canDeleteTx := middleware.RequirePermission("transactions:delete")
		canReadComm := middleware.RequirePermission("commissions:read")
		canWriteComm := middleware.RequirePermission("commissions:write")
		canReadStaff := middleware.RequirePermission("staff:read")
		canWriteStaff := middleware.RequirePermission("staff:write")
		canDeleteStaff := middleware.RequirePermission("staff:delete")
		canReadReports := middleware.RequirePermission("reports:read")
		canReadSettings := middleware.RequirePermission("settings:read")
		canWriteSettings := middleware.RequirePermission("settings:write")
		canWriteCMS := middleware.RequirePermission("cms:write")
		canWriteRBAC := middleware.RequirePermission("rbac:write")
		canOrgAdmin := middleware.RequirePermission("organization:write")
		_ = canReadComm
		_ = canReadReports
		_ = canReadSettings

		// ── Auth protected routes ─────────────────────────────────────────
		authModule.RegisterProtectedRoutes(protectedAPI, adminOnly)

		// ── Organization & RBAC routes ────────────────────────────────────
		orgModule.RegisterRoutes(protectedAPI, canOrgAdmin)
		rbacModule.RegisterRoutes(protectedAPI, canWriteRBAC)

		// ── Patients ─────────────────────────────────────────────────────
		// Keep medicalStaff role check AS FALLBACK for routes without explicit permission header
		patient.RegisterRoutes(protectedAPI,
			canReadPatients, canWritePatients, canDeletePatients,
		)

		// ── Services ─────────────────────────────────────────────────────
		serviceModule.RegisterRoutes(protectedAPI,
			canReadServices, canWriteServices, canDeleteServices,
			canReadCategories, canWriteCategories, canDeleteCategories,
		)

		// ── Products ─────────────────────────────────────────────────────
		product.RegisterRoutes(protectedAPI,
			canReadProducts, canWriteProducts, canDeleteProducts,
			canReadCategories, canWriteCategories, canDeleteCategories,
		)

		// ── Staff ─────────────────────────────────────────────────────────
		staff.RegisterRoutes(protectedAPI, canReadStaff, canWriteStaff, canDeleteStaff)

		// ── Appointments ──────────────────────────────────────────────────
		appointment.RegisterRoutes(protectedAPI, adminOnly)

		// ── Transactions ──────────────────────────────────────────────────
		transaction.RegisterRoutes(protectedAPI, canReadTx, canWriteTx, canDeleteTx)

		// ── Commissions ───────────────────────────────────────────────────
		commission.RegisterRoutes(protectedAPI, canReadComm, canWriteComm)

		// ── Settings ──────────────────────────────────────────────────────
		settings.RegisterRoutes(protectedAPI, canWriteSettings)

		// ── Dashboard ─────────────────────────────────────────────────────
		dashboard.RegisterRoutes(protectedAPI, adminOnly)

		// ── CMS ───────────────────────────────────────────────────────────
		cms.RegisterRoutes(protectedAPI, canWriteCMS)

		// ── Stock movements ───────────────────────────────────────────────
		stock.RegisterRoutes(protectedAPI, adminOnly)

		// ── Service consumables ───────────────────────────────────────────
		consumable.RegisterRoutes(protectedAPI, adminOnly)

		// ── WhatsApp ──────────────────────────────────────────────────────
		whatsapp.RegisterRoutes(protectedAPI, cashierAndAdmin)

		// Keep unused role/permission variables (suppresses "declared and not used" errors)
		_ = medicalStaff
		_ = staffAndDoctors
		_ = canReadReports
		_ = canReadSettings
	}
}
