package authmodule

import (
	"github.com/gin-gonic/gin"
)

func RegisterPublicRoutes(router gin.IRouter) {
	handler := NewModule()

	router.POST("/auth/login", handler.Login)
	// Public register: selalu menghasilkan user dengan role "cashier"
	router.POST("/auth/register", handler.Register)
	router.POST("/auth/refresh", handler.Refresh)
}

func RegisterProtectedRoutes(router gin.IRouter, admin gin.HandlerFunc) {
	handler := NewModule()

	router.GET("/auth/me", handler.Me)
	router.POST("/auth/logout", handler.Logout)
	// Admin-only: membuat user dengan role tertentu (admin, doctor, therapist, cashier)
	router.POST("/auth/admin/register", admin, handler.AdminRegister)
	// Admin-only: cari user berdasarkan email untuk invite ke organisasi
	router.GET("/auth/users", admin, handler.SearchUserByEmail)
}
