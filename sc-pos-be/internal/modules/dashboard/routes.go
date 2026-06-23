package dashboard

import "github.com/gin-gonic/gin"

// RegisterRoutes mendaftarkan semua route dashboard.
// admin: hanya admin yang boleh melihat statistik keuangan & operasional klinik
func RegisterRoutes(router gin.IRouter, admin gin.HandlerFunc) {
	handler := NewModule()

	router.GET("/dashboard/stats", admin, handler.Stats)
	router.GET("/dashboard/revenue", admin, handler.Revenue)
	router.GET("/dashboard/top-services", admin, handler.TopServices)
	router.GET("/dashboard/top-products", admin, handler.TopProducts)
	router.GET("/dashboard/appointments-today", admin, handler.AppointmentsToday)
}

