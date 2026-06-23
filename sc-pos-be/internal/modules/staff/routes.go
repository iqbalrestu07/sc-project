package staff

import "github.com/gin-gonic/gin"

func RegisterRoutes(router gin.IRouter, canRead, canWrite, canDelete gin.HandlerFunc) {
	handler := NewModule()

	router.GET("/staff", canRead, handler.List)
	router.POST("/staff", canWrite, handler.Create)
	router.GET("/staff/:id", canRead, handler.Get)
	router.PUT("/staff/:id", canWrite, handler.Update)
	router.DELETE("/staff/:id", canDelete, handler.Delete)
}
