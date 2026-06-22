package cms

import "github.com/gin-gonic/gin"

func RegisterPublicRoutes(router gin.IRouter) {
	handler := NewModule()

	router.GET("/cms/pages", handler.ListPages)
	router.GET("/cms/pages/:pageId", handler.GetPage)
}

func RegisterRoutes(router gin.IRouter, admin gin.HandlerFunc) {
	handler := NewModule()

	router.POST("/cms/pages", admin, handler.CreatePage)
	router.PUT("/cms/pages/:pageId", admin, handler.UpdatePage)
	router.POST("/cms/upload-image", admin, handler.UploadImage)
}
