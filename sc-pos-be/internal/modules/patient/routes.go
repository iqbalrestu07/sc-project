package patient

import "github.com/gin-gonic/gin"

func RegisterRoutes(router gin.IRouter, canRead, canWrite, canDelete gin.HandlerFunc) {
	handler := NewModule()

	router.GET("/patients", canRead, handler.List)
	router.GET("/patients/search", canRead, handler.Search)
	router.POST("/patients", canWrite, handler.Create)
	router.GET("/patients/:id", canRead, handler.Get)
	router.PUT("/patients/:id", canWrite, handler.Update)
	router.DELETE("/patients/:id", canDelete, handler.Delete)
	router.GET("/patients/:id/visits", canRead, handler.Visits)
	router.GET("/patients/:id/transactions", canRead, handler.Transactions)
}
