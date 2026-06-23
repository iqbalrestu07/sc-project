package service

import "github.com/gin-gonic/gin"

func RegisterRoutes(
	router gin.IRouter,
	canRead, canWrite, canDelete gin.HandlerFunc,
	canReadCat, canWriteCat, canDeleteCat gin.HandlerFunc,
) {
	handler := NewModule()

	router.GET("/services", canRead, handler.List)
	router.POST("/services", canWrite, handler.Create)
	router.GET("/services/:id", canRead, handler.Get)
	router.PUT("/services/:id", canWrite, handler.Update)
	router.DELETE("/services/:id", canDelete, handler.Delete)

	router.GET("/service-categories", canReadCat, handler.ListCategories)
	router.POST("/service-categories", canWriteCat, handler.CreateCategory)
	router.PUT("/service-categories/:id", canWriteCat, handler.UpdateCategory)
	router.DELETE("/service-categories/:id", canDeleteCat, handler.DeleteCategory)
}
