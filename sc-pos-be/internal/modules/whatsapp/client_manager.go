package whatsapp

import (
	"context"
	"encoding/base64"
	"fmt"
	"sync"

	_ "github.com/lib/pq"
	"github.com/skip2/go-qrcode"
	"go.mau.fi/whatsmeow"
	"go.mau.fi/whatsmeow/store/sqlstore"
	"go.mau.fi/whatsmeow/types"
	"go.mau.fi/whatsmeow/types/events"
	waLog "go.mau.fi/whatsmeow/util/log"
	"time"
)

func init() {
	// For whatsmeow to support PostgreSQL array types with lib/pq
	// But it actually doesn't use this config directly anymore. Let's just avoid it if possible.
	// We'll trust sqlstore handles it.
}

type ClientManager struct {
	container *sqlstore.Container
	clients   map[string]*whatsmeow.Client // map JID string to Client
	mu        sync.RWMutex
	log       waLog.Logger
	OnMessage func(receiverJID, senderJID, customerName, contentType, content, mediaURL string, timestamp time.Time)
	OnHistorySync func(receiverJID string, evt *events.HistorySync)
}

var managerInstance *ClientManager
var managerOnce sync.Once

// InitClientManager initializes the singleton WhatsApp client manager using the DB DSN
func InitClientManager(dbDSN string) (*ClientManager, error) {
	var err error
	managerOnce.Do(func() {
		dbLog := waLog.Stdout("Database", "WARN", true)
		container, e := sqlstore.New(context.Background(), "postgres", dbDSN, dbLog)
		if e != nil {
			err = fmt.Errorf("failed to connect whatsapp store: %w", e)
			return
		}
		
		managerInstance = &ClientManager{
			container: container,
			clients:   make(map[string]*whatsmeow.Client),
			log:       waLog.Stdout("WhatsAppClient", "INFO", true),
		}
	})
	return managerInstance, err
}

// GetClientManager returns the singleton instance
func GetClientManager() *ClientManager {
	return managerInstance
}

// GetClient retrieves the connected whatsmeow.Client for a given JID.
// If the device exists in store but isn't loaded, it loads and connects it.
func (cm *ClientManager) GetClient(jidStr string) (*whatsmeow.Client, error) {
	cm.mu.RLock()
	client, ok := cm.clients[jidStr]
	cm.mu.RUnlock()
	
	if ok {
		return client, nil
	}

	cm.mu.Lock()
	defer cm.mu.Unlock()
	
	// Double-check
	client, ok = cm.clients[jidStr]
	if ok {
		return client, nil
	}

	jid, err := types.ParseJID(jidStr)
	if err != nil {
		return nil, fmt.Errorf("invalid jid: %v", err)
	}

	device, err := cm.container.GetDevice(context.Background(), jid)
	if err != nil || device == nil {
		// Device not found directly, maybe it has AD device specifier (e.g., :47).
		// Let's get all devices and find the one that matches ToNonAD().
		devices, getErr := cm.container.GetAllDevices(context.Background())
		if getErr == nil {
			for _, d := range devices {
				if d.ID.ToNonAD().String() == jid.ToNonAD().String() {
					device = d
					break
				}
			}
		}
	}
	
	if device == nil {
		return nil, fmt.Errorf("no device for JID %s", jidStr)
	}

	newClient := whatsmeow.NewClient(device, cm.log)
	
	newClient.AddEventHandler(func(evt interface{}) {
		switch v := evt.(type) {
		case *events.Message:
			if cm.OnMessage != nil {
				// We need to look up orgID and deviceID for this jid
				jidStr := newClient.Store.ID.ToNonAD().String()
				
				// Wait, doing this lookup asynchronously or passing it directly?
				// Since we are in the handler, let's just pass the jidStr
				// and let OnMessage handle it, OR we look it up here.
				
				content := ""
				contentType := "text"
				mediaURL := "" // WhatsApp doesn't provide mediaURL directly, usually you download it.
				
				msg := v.Message
				if msg.GetConversation() != "" {
					content = msg.GetConversation()
				} else if msg.GetExtendedTextMessage() != nil {
					content = msg.GetExtendedTextMessage().GetText()
				} else if msg.GetImageMessage() != nil {
					contentType = "image"
					content = msg.GetImageMessage().GetCaption()
				} else if msg.GetDocumentMessage() != nil {
					contentType = "document"
					content = msg.GetDocumentMessage().GetTitle()
				} else if msg.GetVideoMessage() != nil {
					contentType = "video"
					content = msg.GetVideoMessage().GetCaption()
				} else if msg.GetAudioMessage() != nil {
					contentType = "audio"
				}

				if content == "" && contentType == "text" {
					return // Ignore unsupported or empty messages
				}

				sender := v.Info.Sender.ToNonAD().String()
				pushName := v.Info.PushName
				
				// Call OnMessage with the device's JID (receiver) and sender info
				cm.OnMessage(jidStr, sender, pushName, contentType, content, mediaURL, v.Info.Timestamp)
			}
			
		case *events.HistorySync:
			if cm.OnHistorySync != nil {
				jidStr := newClient.Store.ID.ToNonAD().String()
				cm.OnHistorySync(jidStr, v)
			}
		}
	})

	err = newClient.Connect()
	if err != nil {
		return nil, fmt.Errorf("failed to connect client: %w", err)
	}

	cm.clients[jidStr] = newClient
	return newClient, nil
}

// Disconnect removes the client from memory and disconnects it
func (cm *ClientManager) Disconnect(jidStr string) {
	cm.mu.Lock()
	defer cm.mu.Unlock()
	
	if client, ok := cm.clients[jidStr]; ok {
		client.Disconnect()
		delete(cm.clients, jidStr)
	}
}

// StartNewSession creates a new device in store and returns a channel to receive the QR code string (base64 PNG)
// Once paired, the channel will close and the client will be connected.
func (cm *ClientManager) StartNewSession(ctx context.Context, onPaired func(jid string)) (<-chan string, error) {
	device := cm.container.NewDevice()
	client := whatsmeow.NewClient(device, cm.log)

	if client.Store.ID != nil {
		return nil, fmt.Errorf("device already has an ID")
	}

	qrChan, err := client.GetQRChannel(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get QR channel: %w", err)
	}

	err = client.Connect()
	if err != nil {
		return nil, fmt.Errorf("failed to connect to WhatsApp servers: %w", err)
	}

	outChan := make(chan string)

	go func() {
		defer close(outChan)
		for evt := range qrChan {
			if evt.Event == "code" {
				// Convert text QR to base64 PNG
				png, err := qrcode.Encode(evt.Code, qrcode.Medium, 256)
				if err != nil {
					cm.log.Errorf("failed to generate QR png: %v", err)
					continue
				}
				b64 := base64.StdEncoding.EncodeToString(png)
				outChan <- "data:image/png;base64," + b64
			} else if evt.Event == "success" {
				// Pairing successful
				cm.mu.Lock()
				jid := client.Store.ID.ToNonAD().String()
				cm.clients[jid] = client
				cm.mu.Unlock()
				if onPaired != nil {
					onPaired(jid)
				}
				return
			}
		}
	}()

	return outChan, nil
}

// DeleteSession logs out and removes a session from store
func (cm *ClientManager) DeleteSession(jidStr string) error {
	ctx := context.Background()
	cm.mu.Lock()
	client, ok := cm.clients[jidStr]
	cm.mu.Unlock()

	if ok {
		client.Logout(ctx)
		cm.mu.Lock()
		delete(cm.clients, jidStr)
		cm.mu.Unlock()
	} else {
		// Attempt to load and logout
		jid, err := types.ParseJID(jidStr)
		if err == nil {
			device, err := cm.container.GetDevice(ctx, jid)
			if err != nil || device == nil {
				devices, getErr := cm.container.GetAllDevices(ctx)
				if getErr == nil {
					for _, d := range devices {
						if d.ID.ToNonAD().String() == jid.ToNonAD().String() {
							device = d
							break
						}
					}
				}
			}
			
			if device != nil {
				client := whatsmeow.NewClient(device, cm.log)
				
				// CRITICAL: We must be connected to send the logout stanza to WhatsApp servers
				if !client.IsConnected() {
					err = client.Connect()
					if err == nil {
						// Small wait to ensure connection is ready before sending logout stanza
						time.Sleep(1 * time.Second)
					}
				}
				
				client.Logout(ctx)
			}
		}
	}
	return nil
}
