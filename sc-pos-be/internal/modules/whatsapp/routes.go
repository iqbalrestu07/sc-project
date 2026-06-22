package whatsapp

import "github.com/gin-gonic/gin"

func RegisterRoutes(router gin.IRouter) {
	handler := NewModule()

	router.POST("/whatsapp/send", handler.Send)
	router.POST("/whatsapp/send-bulk", handler.SendBulk)
	router.GET("/whatsapp/templates", handler.Templates)
}
