package patient

import "github.com/gin-gonic/gin"

func RegisterRoutes(router gin.IRouter) {
	handler := NewModule()

	router.GET("/patients", handler.List)
	router.GET("/patients/search", handler.Search)
	router.POST("/patients", handler.Create)
	router.GET("/patients/:id", handler.Get)
	router.PUT("/patients/:id", handler.Update)
	router.DELETE("/patients/:id", handler.Delete)
	router.GET("/patients/:id/visits", handler.Visits)
	router.GET("/patients/:id/transactions", handler.Transactions)
}
