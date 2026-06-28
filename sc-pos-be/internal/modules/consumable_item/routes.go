package consumable_item

import (
	"github.com/gin-gonic/gin"
)

// RegisterRoutes mounts the consumable-items endpoints on the provided router group.
// canRead  → consumables:read permission
// canWrite → consumables:write permission
func RegisterRoutes(rg *gin.RouterGroup, canRead, canWrite gin.HandlerFunc) {
	h := NewModule()

	items := rg.Group("/consumable-items")
	{
		items.GET("", canRead, h.ListProducts)
		items.GET("/usage", canRead, h.ListUsageLogs)
		items.POST("/usage", canWrite, h.CreateUsageLog)
	}

	// Mark/unmark a product as consumable (reuses product ID, separate endpoint for clarity)
	rg.PUT("/products/:id/mark-consumable", canWrite, h.MarkConsumable)
}
