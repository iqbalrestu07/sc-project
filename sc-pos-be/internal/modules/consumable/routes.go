package consumable

import "github.com/gin-gonic/gin"

func RegisterRoutes(router gin.IRouter, admin gin.HandlerFunc) {
	handler := NewModule()

	router.GET("/services/:serviceId/consumables", handler.ListByService)
	router.POST("/services/:serviceId/consumables", admin, handler.Upsert)
	router.DELETE("/service-consumables/:id", admin, handler.Delete)
}
