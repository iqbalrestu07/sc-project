package staff

import "github.com/gin-gonic/gin"

func RegisterRoutes(router gin.IRouter, admin gin.HandlerFunc) {
	handler := NewModule()

	router.GET("/staff", handler.List)
	router.POST("/staff", admin, handler.Create)
	router.GET("/staff/:id", handler.Get)
	router.PUT("/staff/:id", admin, handler.Update)
	router.DELETE("/staff/:id", admin, handler.Delete)
}
