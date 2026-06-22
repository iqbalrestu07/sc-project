package commission

import "github.com/gin-gonic/gin"

func RegisterRoutes(router gin.IRouter, allowedRoles gin.HandlerFunc, admin gin.HandlerFunc) {
	handler := NewModule()

	router.GET("/commissions", allowedRoles, handler.List)
	router.GET("/commissions/staff/:staffId", admin, handler.ListByStaff)
	router.POST("/commissions/update-status", admin, handler.UpdateStatus)
}
