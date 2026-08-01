package appointment

import "github.com/gin-gonic/gin"

func RegisterRoutes(router gin.IRouter, admin gin.HandlerFunc) {
	handler := NewModule()

	router.GET("/appointments", handler.List)
	router.POST("/appointments", handler.Create)
	router.GET("/appointments/calendar", handler.Calendar)
	router.GET("/appointments/today", handler.TodayQueue)
	router.GET("/appointments/available-slots", handler.AvailableSlots)
	router.PATCH("/appointments/:id/status", handler.UpdateStatus)
	router.GET("/appointments/:id", handler.Get)
	router.PUT("/appointments/:id", handler.Update)
	router.DELETE("/appointments/:id", admin, handler.Delete)
}
