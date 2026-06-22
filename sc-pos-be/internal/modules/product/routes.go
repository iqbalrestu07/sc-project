package product

import "github.com/gin-gonic/gin"

func RegisterRoutes(router gin.IRouter, admin gin.HandlerFunc) {
	handler := NewModule()

	router.GET("/products", handler.List)
	router.POST("/products", admin, handler.Create)
	router.GET("/products/:id", handler.Get)
	router.PUT("/products/:id", admin, handler.Update)
	router.DELETE("/products/:id", admin, handler.Delete)

	router.GET("/product-categories", handler.ListCategories)
	router.POST("/product-categories", admin, handler.CreateCategory)
	router.PUT("/product-categories/:id", admin, handler.UpdateCategory)
	router.DELETE("/product-categories/:id", admin, handler.DeleteCategory)
}
