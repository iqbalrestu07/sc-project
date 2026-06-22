package dashboard

import "github.com/gin-gonic/gin"

func RegisterRoutes(router gin.IRouter) {
	handler := NewModule()

	router.GET("/dashboard/stats", handler.Stats)
	router.GET("/dashboard/revenue", handler.Revenue)
	router.GET("/dashboard/top-services", handler.TopServices)
	router.GET("/dashboard/top-products", handler.TopProducts)
	router.GET("/dashboard/appointments-today", handler.AppointmentsToday)
}
