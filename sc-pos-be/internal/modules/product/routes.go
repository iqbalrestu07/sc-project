package product

import "github.com/gin-gonic/gin"

func RegisterRoutes(
	router gin.IRouter,
	canRead, canWrite, canDelete gin.HandlerFunc,
	canReadCat, canWriteCat, canDeleteCat gin.HandlerFunc,
) {
	handler := NewModule()

	router.GET("/products", canRead, handler.List)
	router.POST("/products", canWrite, handler.Create)
	router.GET("/products/:id", canRead, handler.Get)
	router.PUT("/products/:id", canWrite, handler.Update)
	router.DELETE("/products/:id", canDelete, handler.Delete)

	router.GET("/product-categories", canReadCat, handler.ListCategories)
	router.POST("/product-categories", canWriteCat, handler.CreateCategory)
	router.PUT("/product-categories/:id", canWriteCat, handler.UpdateCategory)
	router.DELETE("/product-categories/:id", canDeleteCat, handler.DeleteCategory)
}
