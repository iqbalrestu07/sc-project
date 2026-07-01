package omnichannel

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"sync"

	"github.com/gin-gonic/gin"
	"github.com/coder/websocket"
)

// WSHub manages active websocket connections per organization
type WSHub struct {
	mu          sync.RWMutex
	connections map[string]map[*websocket.Conn]bool // map[orgID]map[conn]bool
}

var hub = &WSHub{
	connections: make(map[string]map[*websocket.Conn]bool),
}

// WebSocketHandler handles incoming WS connections
func WebSocketHandler(c *gin.Context) {
	orgID := c.GetString("org_id")
	if orgID == "" {
		// Read from query param if not in header
		orgID = c.Query("org_id")
	}
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "organization_id is required"})
		return
	}

	conn, err := websocket.Accept(c.Writer, c.Request, &websocket.AcceptOptions{
		InsecureSkipVerify: true, // Allow all origins for now
	})
	if err != nil {
		log.Printf("Omnichannel WS: Failed to accept connection: %v", err)
		return
	}

	hub.mu.Lock()
	if hub.connections[orgID] == nil {
		hub.connections[orgID] = make(map[*websocket.Conn]bool)
	}
	hub.connections[orgID][conn] = true
	hub.mu.Unlock()

	defer func() {
		hub.mu.Lock()
		if _, ok := hub.connections[orgID]; ok {
			delete(hub.connections[orgID], conn)
		}
		hub.mu.Unlock()
		conn.Close(websocket.StatusNormalClosure, "")
	}()

	// Keep connection alive, listen for ping/pong or close
	for {
		_, _, err := conn.Read(c.Request.Context())
		if err != nil {
			break
		}
	}
}

// BroadcastMessage sends a JSON event to all connected clients for an organization
func BroadcastMessage(orgID, eventType string, payload interface{}) {
	msg := map[string]interface{}{
		"type":    eventType,
		"payload": payload,
	}
	b, err := json.Marshal(msg)
	if err != nil {
		return
	}

	hub.mu.RLock()
	conns, ok := hub.connections[orgID]
	if !ok {
		hub.mu.RUnlock()
		return
	}
	
	// Create a copy of connections to avoid holding lock during write
	activeConns := make([]*websocket.Conn, 0, len(conns))
	for c := range conns {
		activeConns = append(activeConns, c)
	}
	hub.mu.RUnlock()

	for _, c := range activeConns {
		go func(c *websocket.Conn) {
			_ = c.Write(context.Background(), websocket.MessageText, b)
		}(c)
	}
}
