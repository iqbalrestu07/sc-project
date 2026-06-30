package migration

import "github.com/gin-gonic/gin"

func RegisterRoutes(router gin.IRouter, adminOnly gin.HandlerFunc) {
	handler := NewModule()

	router.POST("/migration/import", adminOnly, handler.ImportExcel)
}
