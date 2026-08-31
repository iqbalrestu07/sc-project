package cms

import (
	"github.com/gin-gonic/gin"
	"github.com/sc-pos/backend/internal/storage"
)

func RegisterPublicRoutes(router gin.IRouter) {
	handler := NewModule(nil)

	router.GET("/cms/pages", handler.ListPages)
	router.GET("/cms/pages/:pageId", handler.GetPage)
}

func RegisterRoutes(router gin.IRouter, admin gin.HandlerFunc, store storage.Storage) {
	handler := NewModule(store)

	router.POST("/cms/pages", admin, handler.CreatePage)
	router.PUT("/cms/pages/:pageId", admin, handler.UpdatePage)
	router.POST("/cms/upload-image", admin, handler.UploadImage)
}
