package dashboard

import "github.com/gin-gonic/gin"

// RegisterRoutes mendaftarkan semua route dashboard.
// reports:read: user dengan permission reports:read boleh melihat statistik keuangan & operasional klinik
func RegisterRoutes(router gin.IRouter, canReadReports gin.HandlerFunc) {
	handler := NewModule()

	router.GET("/dashboard/stats", canReadReports, handler.Stats)
	router.GET("/dashboard/revenue", canReadReports, handler.Revenue)
	router.GET("/dashboard/top-services", canReadReports, handler.TopServices)
	router.GET("/dashboard/top-products", canReadReports, handler.TopProducts)
	router.GET("/dashboard/appointments-today", canReadReports, handler.AppointmentsToday)
}
