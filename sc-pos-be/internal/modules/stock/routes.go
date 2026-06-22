package stock

import "github.com/gin-gonic/gin"

func RegisterRoutes(router gin.IRouter, admin gin.HandlerFunc) {
	handler := NewModule()

	router.GET("/stock-movements", handler.List)
	router.POST("/stock-movements", admin, handler.Create)
}
