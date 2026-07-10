package service_package

import "github.com/gin-gonic/gin"

// RegisterRoutes mounts the consumable-group endpoints onto the router.
//
// Note: the wildcard segment for service routes must be :id (not :serviceId) because
// Gin disallows two different wildcard names on the same path prefix — /services/:id
// is already registered by the service module.
//
//	GET    /services/:id/consumable-groups             — list groups + items (all staff)
//	POST   /services/:id/consumable-groups             — create group (admin)
//	PUT    /consumable-groups/:groupId                 — update group (admin)
//	DELETE /consumable-groups/:groupId                 — delete group (admin)
//	POST   /consumable-groups/:groupId/items           — add alternative product (admin)
//	DELETE /consumable-group-items/:itemId             — remove alternative product (admin)
func RegisterRoutes(router gin.IRouter, canRead, canWrite gin.HandlerFunc) {
	h := NewModule()

	// Read — any authenticated staff can fetch groups (needed in POS)
	router.GET("/services/:id/consumable-groups", canRead, h.ListGroups)

	// Write — admin only
	router.POST("/services/:id/consumable-groups", canWrite, h.CreateGroup)
	router.PUT("/consumable-groups/:groupId", canWrite, h.UpdateGroup)
	router.DELETE("/consumable-groups/:groupId", canWrite, h.DeleteGroup)
	router.POST("/consumable-groups/:groupId/items", canWrite, h.AddGroupItem)
	router.DELETE("/consumable-group-items/:itemId", canWrite, h.DeleteGroupItem)
}
