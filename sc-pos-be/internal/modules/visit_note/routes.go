package visit_note

import "github.com/gin-gonic/gin"

func RegisterRoutes(router gin.IRouter, canRead, canWrite, canDelete gin.HandlerFunc) {
	handler := NewModule()

	// Nested under patient for list/create (patient context)
	router.GET("/patients/:id/visit-notes", canRead, handler.List)
	router.POST("/patients/:id/visit-notes", canWrite, handler.Create)

	// Top-level for get/update/delete by note ID
	router.GET("/visit-notes/:id", canRead, handler.Get)
	router.PUT("/visit-notes/:id", canWrite, handler.Update)
	router.DELETE("/visit-notes/:id", canDelete, handler.Delete)
}
