package transaction

import "github.com/gin-gonic/gin"

func RegisterRoutes(router gin.IRouter) {
	handler := NewModule()

	router.GET("/transactions", handler.List)
	router.POST("/transactions", handler.Create)
	router.GET("/transactions/:id/items", handler.Items)
	router.GET("/transactions/:id", handler.Get)
	router.PUT("/transactions/:id", handler.Update)
	router.DELETE("/transactions/:id", handler.Delete)
}
