package rbac

import "github.com/gin-gonic/gin"

func RegisterRoutes(router gin.IRouter, adminOnly gin.HandlerFunc) {
	h := NewModule()

	// Any authenticated + org member can view permissions and their own effective perms
	router.GET("/rbac/permissions", h.ListPermissions)
	router.GET("/rbac/my-permissions", h.GetMyEffectivePermissions)

	// Role permission management — rbac:read / rbac:write
	router.GET("/rbac/role-permissions", h.GetAllRolePermissions)
	router.GET("/rbac/role-permissions/:role", h.GetRolePermissions)
	router.PUT("/rbac/role-permissions/:role", adminOnly, h.SetRolePermissions)

	// User extra permission management — admin only
	router.GET("/rbac/user-permissions/:userId", h.GetUserExtraPermissions)
	router.POST("/rbac/user-permissions/:userId", adminOnly, h.GrantUserPermission)
	router.DELETE("/rbac/user-permissions/:userId/:permissionId", adminOnly, h.RevokeUserPermission)
}
