package authmodule

import "github.com/gin-gonic/gin"

func RegisterPublicRoutes(router gin.IRouter) {
	handler := NewModule()

	router.POST("/auth/login", handler.Login)
	router.POST("/auth/register", handler.Register)
	router.POST("/auth/refresh", handler.Refresh)
}

func RegisterProtectedRoutes(router gin.IRouter) {
	handler := NewModule()

	router.GET("/auth/me", handler.Me)
	router.POST("/auth/logout", handler.Logout)
}
