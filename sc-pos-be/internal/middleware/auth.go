package middleware

import (
	"database/sql"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/sc-pos/backend/internal/auth"
	"github.com/sc-pos/backend/internal/database"
	"github.com/sc-pos/backend/internal/utils"
)

// Role constants — gunakan ini agar tidak ada typo
const (
	RoleAdmin     = "admin"
	RoleDoctor    = "doctor"
	RoleTherapist = "therapist"
	RoleCashier   = "cashier"
)

// validRoles adalah kumpulan semua role yang diizinkan
var validRoles = map[string]bool{
	RoleAdmin:     true,
	RoleDoctor:    true,
	RoleTherapist: true,
	RoleCashier:   true,
}

// IsValidRole memeriksa apakah role adalah role yang valid
func IsValidRole(role string) bool {
	return validRoles[role]
}

// AuthMiddleware validates JWT token
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			utils.ErrorResponse(c, http.StatusUnauthorized, "missing authorization header")
			c.Abort()
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			utils.ErrorResponse(c, http.StatusUnauthorized, "invalid authorization format")
			c.Abort()
			return
		}

		token := parts[1]
		claims, err := auth.VerifyToken(token)
		if err != nil {
			utils.ErrorResponse(c, http.StatusUnauthorized, "invalid token")
			c.Abort()
			return
		}

		// Ensure the user still exists in the database. A valid JWT from a
		// dropped/reset database (or a deleted user) should not be accepted.
		var exists bool
		err = database.DB.QueryRow(`SELECT EXISTS (SELECT 1 FROM users WHERE id = $1)`, claims.UserID).Scan(&exists)
		if err != nil {
			utils.ErrorResponse(c, http.StatusInternalServerError, "failed to verify user")
			c.Abort()
			return
		}
		if !exists {
			utils.ErrorResponse(c, http.StatusUnauthorized, "invalid token: user not found")
			c.Abort()
			return
		}

		c.Set("user_id", claims.UserID)
		c.Set("email", claims.Email)
		c.Set("role", claims.Role)

		c.Next()
	}
}

// OrgMiddleware reads X-Organization-ID header, validates user membership, and
// sets org_id + org_role into the Gin context for downstream handlers.
// This middleware must run AFTER AuthMiddleware.
func OrgMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		orgID := c.GetHeader("X-Organization-ID")
		if orgID == "" {
			// Org context is optional for some routes; only block if required downstream
			c.Next()
			return
		}

		userID, exists := c.Get("user_id")
		if !exists {
			utils.ErrorResponse(c, http.StatusUnauthorized, "missing user context")
			c.Abort()
			return
		}

		// Validate user is an active member of this org (and not soft-deleted)
		var role string
		err := database.DB.QueryRow(`
			SELECT role FROM organization_members
			WHERE org_id = $1 AND user_id = $2 AND is_active = true AND deleted_at IS NULL`,
			orgID, userID.(string),
		).Scan(&role)

		if err == sql.ErrNoRows {
			utils.ErrorResponse(c, http.StatusForbidden, "you are not a member of this organization")
			c.Abort()
			return
		}
		if err != nil {
			utils.ErrorResponse(c, http.StatusInternalServerError, "failed to verify org membership")
			c.Abort()
			return
		}

		c.Set("org_id", orgID)
		c.Set("org_role", role)

		c.Next()
	}
}

// RequireOrg aborts the request if no org context is present (X-Organization-ID header not sent or invalid)
func RequireOrg() gin.HandlerFunc {
	return func(c *gin.Context) {
		orgID, exists := c.Get("org_id")
		if !exists || orgID == "" {
			utils.ErrorResponse(c, http.StatusBadRequest, "X-Organization-ID header is required")
			c.Abort()
			return
		}
		c.Next()
	}
}

// RequireRole checks if user has required role (uses org_role when available, falls back to global role)
func RequireRole(allowedRoles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Prefer org_role (effective role in org) over global JWT role
		roleVal, exists := c.Get("org_role")
		if !exists || roleVal == "" {
			roleVal, exists = c.Get("role")
		}
		if !exists {
			utils.ErrorResponse(c, http.StatusUnauthorized, "role not found")
			c.Abort()
			return
		}

		role := roleVal.(string)
		for _, r := range allowedRoles {
			if role == r {
				c.Next()
				return
			}
		}

		utils.ErrorResponse(c, http.StatusForbidden, "insufficient permissions")
		c.Abort()
	}
}

// RequirePermission checks if the user has a specific permission (resource:action) in the active org.
// Permission = union of role_permissions for the user's org_role + user_permissions for this user+org.
func RequirePermission(permissionID string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, _ := c.Get("user_id")
		orgID, _ := c.Get("org_id")
		orgRole, _ := c.Get("org_role")

		if orgID == nil || orgID == "" {
			utils.ErrorResponse(c, http.StatusBadRequest, "organization context required")
			c.Abort()
			return
		}

		allowed, err := checkPermission(userID.(string), orgID.(string), orgRole.(string), permissionID)
		if err != nil {
			utils.ErrorResponse(c, http.StatusInternalServerError, "permission check failed")
			c.Abort()
			return
		}
		if !allowed {
			utils.ErrorResponse(c, http.StatusForbidden, "permission denied: "+permissionID)
			c.Abort()
			return
		}

		c.Next()
	}
}

// checkPermission queries role_permissions + user_permissions for a specific permission.
// user_permissions are also soft-deleted (deleted_at IS NULL).
func checkPermission(userID, orgID, role, permissionID string) (bool, error) {
	var exists bool
	err := database.DB.QueryRow(`
		SELECT EXISTS (
			SELECT 1 FROM role_permissions WHERE role = $1 AND permission_id = $4
			UNION ALL
			SELECT 1 FROM user_permissions
			WHERE user_id = $2 AND org_id = $3 AND permission_id = $4 AND deleted_at IS NULL
		)`, role, userID, orgID, permissionID,
	).Scan(&exists)
	return exists, err
}

// CORSMiddleware handles CORS — includes X-Organization-ID header
func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		if origin == "" {
			origin = "*"
		}

		c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With, X-Organization-ID")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE, PATCH")
		c.Writer.Header().Set("Vary", "Origin")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}
