package omnichannel

import (
	"github.com/gin-gonic/gin"
)

func RegisterRoutes(r *gin.RouterGroup, middlewares ...gin.HandlerFunc) {
	handler := NewModule()
	omni := r.Group("/omni")
	
	// WS Endpoint
	omni.GET("/ws", WebSocketHandler)

	omni.Use(middlewares...)
	omni.GET("/conversations", handler.GetConversations)
	omni.GET("/conversations/:id/messages", handler.GetMessages)
	omni.POST("/conversations/:id/messages", handler.SendMessage)
	omni.POST("/conversations/:id/read", handler.MarkAsRead)
}
