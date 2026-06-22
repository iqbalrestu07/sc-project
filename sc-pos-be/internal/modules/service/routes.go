package service

import "github.com/gin-gonic/gin"

func RegisterRoutes(router gin.IRouter, admin gin.HandlerFunc) {
	handler := NewModule()

	router.GET("/services", handler.List)
	router.POST("/services", admin, handler.Create)
	router.GET("/services/:id", handler.Get)
	router.PUT("/services/:id", admin, handler.Update)
	router.DELETE("/services/:id", admin, handler.Delete)
	router.GET("/service-categories", handler.ListCategories)
	router.POST("/service-categories", admin, handler.CreateCategory)
	router.PUT("/service-categories/:id", admin, handler.UpdateCategory)
	router.DELETE("/service-categories/:id", admin, handler.DeleteCategory)
}
