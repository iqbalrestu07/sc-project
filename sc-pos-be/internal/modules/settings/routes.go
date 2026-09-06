package settings

import (
	"github.com/gin-gonic/gin"
	"github.com/sc-pos/backend/internal/storage"
)

func RegisterRoutes(router gin.IRouter, admin gin.HandlerFunc, store storage.Storage) {
	handler := NewModule(store)

	router.GET("/settings/clinic", handler.GetClinic)
	router.PUT("/settings/clinic", admin, handler.UpdateClinic)
	// UploadLogo handles both logo and favicon via the `type` form field.
	// Two routes are exposed for clarity; both call the same handler.
	router.POST("/settings/clinic/logo", admin, handler.UploadLogo)
	router.POST("/settings/clinic/favicon", admin, handler.UploadLogo)
}

// RegisterPublicRoutes mounts unauthenticated endpoints for public-facing pages.
func RegisterPublicRoutes(router gin.IRouter) {
	handler := NewModule(nil)
	router.GET("/public/clinic-info", handler.PublicClinicInfo)
	router.GET("/seo-render", handler.SEORender)
}
