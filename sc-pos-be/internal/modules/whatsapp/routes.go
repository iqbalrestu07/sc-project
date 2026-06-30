package whatsapp

import (
	"github.com/gin-gonic/gin"
)

func RegisterRoutes(r *gin.RouterGroup, middlewares ...gin.HandlerFunc) {
	handler := NewModule()
	wa := r.Group("/whatsapp")
	wa.Use(middlewares...)

	wa.GET("/status", handler.Status)
	wa.GET("/login", handler.LoginQR)
	wa.POST("/logout", handler.Logout)

	wa.POST("/send", handler.Send)
	wa.POST("/send-bulk", handler.SendBulk)
	wa.POST("/blast", handler.SendBlast)

	wa.GET("/templates", handler.Templates)
	wa.POST("/templates", handler.CreateTemplate)
}
