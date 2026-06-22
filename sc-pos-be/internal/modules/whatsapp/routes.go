package whatsapp

import "github.com/gin-gonic/gin"

func RegisterRoutes(router gin.IRouter) {
	handler := NewModule()

	router.POST("/whatsapp/send", handler.Send)
	router.GET("/whatsapp/templates", handler.Templates)
}
