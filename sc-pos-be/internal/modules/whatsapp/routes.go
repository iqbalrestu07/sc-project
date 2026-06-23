package whatsapp

import "github.com/gin-gonic/gin"

// RegisterRoutes mendaftarkan semua route WhatsApp.
// cashierAndAdmin: admin, cashier — pengiriman WA adalah tugas operasional kasir/admin
func RegisterRoutes(router gin.IRouter, cashierAndAdmin gin.HandlerFunc) {
	handler := NewModule()

	router.POST("/whatsapp/send", cashierAndAdmin, handler.Send)
	router.POST("/whatsapp/send-bulk", cashierAndAdmin, handler.SendBulk)
	router.GET("/whatsapp/templates", cashierAndAdmin, handler.Templates)
}

