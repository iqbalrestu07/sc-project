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
	waLog "go.mau.fi/whatsmeow/util/log"
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
	if err != nil {
		return nil, fmt.Errorf("device not found in store: %v", err)
	}
	if device == nil {
		return nil, fmt.Errorf("no device for JID %s", jidStr)
	}

	newClient := whatsmeow.NewClient(device, cm.log)
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
			dev, err := cm.container.GetDevice(ctx, jid)
			if err == nil && dev != nil {
				client := whatsmeow.NewClient(dev, cm.log)
				client.Logout(ctx)
			}
		}
	}
	return nil
}
