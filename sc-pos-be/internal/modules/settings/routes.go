package settings

import "github.com/gin-gonic/gin"

func RegisterRoutes(router gin.IRouter, admin gin.HandlerFunc) {
	handler := NewModule()

	router.GET("/settings/clinic", handler.GetClinic)
	router.PUT("/settings/clinic", admin, handler.UpdateClinic)
	router.POST("/settings/clinic/logo", admin, handler.UploadLogo)
}

// RegisterPublicRoutes mounts unauthenticated endpoints for public-facing pages.
func RegisterPublicRoutes(router gin.IRouter) {
	handler := NewModule()
	router.GET("/public/clinic-info", handler.PublicClinicInfo)
}
