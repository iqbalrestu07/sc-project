package commission

import "github.com/gin-gonic/gin"

func RegisterRoutes(router gin.IRouter, canRead, canWrite gin.HandlerFunc) {
	handler := NewModule()

	router.GET("/commissions", canRead, handler.List)
	router.GET("/commissions/staff/:staffId", canRead, handler.ListByStaff)
	router.POST("/commissions/update-status", canWrite, handler.UpdateStatus)
}
