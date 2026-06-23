package transaction

import "github.com/gin-gonic/gin"

func RegisterRoutes(router gin.IRouter, canRead, canWrite, canDelete gin.HandlerFunc) {
	handler := NewModule()

	router.GET("/transactions", canRead, handler.List)
	router.POST("/transactions", canWrite, handler.Create)
	router.GET("/transactions/:id/items", canRead, handler.Items)
	router.GET("/transactions/:id", canRead, handler.Get)
	router.PUT("/transactions/:id", canWrite, handler.Update)
	router.DELETE("/transactions/:id", canDelete, handler.Delete)
}
