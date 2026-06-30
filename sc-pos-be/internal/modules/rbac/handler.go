package rbac

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/sc-pos/backend/internal/models"
	"github.com/sc-pos/backend/internal/utils"
)

type Handler struct {
	service Service
}

func NewHandler(service Service) *Handler {
	return &Handler{service: service}
}

func NewModule() *Handler {
	return NewHandler(NewService(NewRepository()))
}

// ListPermissions godoc — GET /rbac/permissions
func (h *Handler) ListPermissions(c *gin.Context) {
	perms, err := h.service.ListAllPermissions()
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	if perms == nil {
		perms = []models.Permission{}
	}
	utils.SuccessResponse(c, http.StatusOK, perms)
}

// GetAllRolePermissions godoc — GET /rbac/role-permissions
func (h *Handler) GetAllRolePermissions(c *gin.Context) {
	result, err := h.service.GetAllRolePermissions()
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, result)
}

// GetRolePermissions godoc — GET /rbac/role-permissions/:role
func (h *Handler) GetRolePermissions(c *gin.Context) {
	role := c.Param("role")
	perms, err := h.service.GetRolePermissions(role)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}
	if perms == nil {
		perms = []string{}
	}
	utils.SuccessResponse(c, http.StatusOK, gin.H{"role": role, "permissions": perms})
}

// SetRolePermissions godoc — PUT /rbac/role-permissions/:role
func (h *Handler) SetRolePermissions(c *gin.Context) {
	role := c.Param("role")
	var req struct {
		Permissions []string `json:"permissions" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	if err := h.service.SetRolePermissions(role, req.Permissions); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}
	utils.SuccessResponseWithMessage(c, http.StatusOK, "role permissions updated", nil)
}

// GetUserExtraPermissions godoc — GET /rbac/user-permissions/:userId
func (h *Handler) GetUserExtraPermissions(c *gin.Context) {
	userID := c.Param("userId")
	orgID, _ := c.Get("org_id")

	perms, err := h.service.GetUserExtraPermissions(userID, orgID.(string))
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	if perms == nil {
		perms = []models.UserPermission{}
	}
	utils.SuccessResponse(c, http.StatusOK, perms)
}

// GrantUserPermission godoc — POST /rbac/user-permissions/:userId
func (h *Handler) GrantUserPermission(c *gin.Context) {
	userID := c.Param("userId")
	orgID, _ := c.Get("org_id")
	grantedBy, _ := c.Get("user_id")

	var req struct {
		PermissionID string `json:"permission_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	if err := h.service.GrantUserPermission(userID, orgID.(string), req.PermissionID, grantedBy.(string)); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.SuccessResponseWithMessage(c, http.StatusOK, "permission granted", nil)
}

// RevokeUserPermission godoc — DELETE /rbac/user-permissions/:userId/:permissionId
func (h *Handler) RevokeUserPermission(c *gin.Context) {
	userID := c.Param("userId")
	permissionID := c.Param("permissionId")
	orgID, _ := c.Get("org_id")

	if err := h.service.RevokeUserPermission(userID, orgID.(string), permissionID); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.SuccessResponseWithMessage(c, http.StatusOK, "permission revoked", nil)
}

// GetMyEffectivePermissions godoc — GET /rbac/my-permissions
func (h *Handler) GetMyEffectivePermissions(c *gin.Context) {
	userID, _ := c.Get("user_id")
	orgID, _ := c.Get("org_id")
	orgRole, _ := c.Get("org_role")

	perms, err := h.service.GetEffectivePermissions(userID.(string), orgID.(string), orgRole.(string))
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	if perms == nil {
		perms = []string{}
	}
	utils.SuccessResponse(c, http.StatusOK, gin.H{
		"user_id":     userID,
		"org_id":      orgID,
		"role":        orgRole,
		"permissions": perms,
	})
}
