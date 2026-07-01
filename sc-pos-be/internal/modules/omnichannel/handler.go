package omnichannel

import (
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/sc-pos/backend/internal/modules/whatsapp"
	"github.com/sc-pos/backend/internal/utils"
	"go.mau.fi/whatsmeow/types/events"
)

type Handler struct {
	service Service
}

func NewModule() *Handler {
	repo := NewRepository()
	svc := NewService(repo)

	// Hook into WhatsApp ClientManager to listen for incoming messages
	cm := whatsapp.GetClientManager()
	if cm != nil {
		cm.OnMessage = func(receiverJID, senderJID, customerName, contentType, content, mediaURL string, timestamp time.Time) {
			waRepo := whatsapp.NewRepository()
			device, err := waRepo.GetDeviceByJID(receiverJID)
			if err != nil || device == nil {
				log.Printf("Omnichannel: Warning: received message for unknown JID %s", receiverJID)
				return
			}

			err = svc.HandleIncomingMessage(
				device.OrganizationID,
				"whatsapp",
				device.ID,
				senderJID,
				customerName,
				contentType,
				content,
				mediaURL,
				timestamp,
			)
			if err != nil {
				log.Printf("Omnichannel: Failed to save incoming message: %v", err)
			}
			
			BroadcastMessage(device.OrganizationID, "new_message", nil)
		}

		cm.OnHistorySync = func(receiverJID string, evt *events.HistorySync) {
			go func() {
				waRepo := whatsapp.NewRepository()
				device, err := waRepo.GetDeviceByJID(receiverJID)
				if err != nil || device == nil {
					return
				}

				// Only process INITIAL_BOOTSTRAP or RECENT syncs to avoid overloading
				if evt.Data.GetSyncType() != 0 && evt.Data.GetSyncType() != 1 {
					return
				}

				for _, conv := range evt.Data.GetConversations() {
					// We only care about normal chats, ignore broadcasts/status
					if conv.GetID() == "" || conv.GetID() == "status@broadcast" {
						continue
					}

					contactName := conv.GetName()
					if contactName == "" {
						contactName = conv.GetID()
					}
					
					for _, msg := range conv.GetMessages() {
						webMsg := msg.GetMessage()
						if webMsg == nil || webMsg.GetMessage() == nil {
							continue
						}
						
						// Skip protocol messages, reactions, etc for now to keep it simple
						if webMsg.GetMessage().GetProtocolMessage() != nil || webMsg.GetMessage().GetReactionMessage() != nil {
							continue
						}

						content := ""
						contentType := "text"
						
						m := webMsg.GetMessage()
						if m.GetConversation() != "" {
							content = m.GetConversation()
						} else if m.GetExtendedTextMessage() != nil {
							content = m.GetExtendedTextMessage().GetText()
						} else if m.GetImageMessage() != nil {
							contentType = "image"
							content = m.GetImageMessage().GetCaption()
						} else if m.GetDocumentMessage() != nil {
							contentType = "document"
							content = m.GetDocumentMessage().GetTitle()
						} else if m.GetVideoMessage() != nil {
							contentType = "video"
							content = m.GetVideoMessage().GetCaption()
						} else if m.GetAudioMessage() != nil {
							contentType = "audio"
						}

						if content == "" && contentType == "text" {
							continue
						}

						// Skip messages sent by me (outbound) to avoid inflating unread count
						if webMsg.GetKey().GetFromMe() {
							continue
						}

						timestamp := time.Now()
						if webMsg.GetMessageTimestamp() > 0 {
							timestamp = time.Unix(int64(webMsg.GetMessageTimestamp()), 0)
						}

						svc.HandleIncomingMessage(
							device.OrganizationID,
							"whatsapp",
							device.ID,
							conv.GetID(), // Identifier is the conversation JID
							contactName,
							contentType,
							content,
							"",
							timestamp,
						)
					}
				}
				
				log.Printf("Omnichannel: HistorySync processed for device %s", receiverJID)
			}()
		}
	}

	return &Handler{service: svc}
}

func (h *Handler) GetConversations(c *gin.Context) {
	orgID := c.GetString("org_id")
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	convs, err := h.service.GetConversations(orgID, limit, offset)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, convs)
}

func (h *Handler) GetMessages(c *gin.Context) {
	orgID := c.GetString("org_id")
	convID := c.Param("id")
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	msgs, err := h.service.GetMessages(convID, orgID, limit, offset)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, msgs)
}

type SendMessageReq struct {
	Content     string `json:"content" binding:"required"`
	ContentType string `json:"content_type"`
	MediaURL    string `json:"media_url"`
}

func (h *Handler) SendMessage(c *gin.Context) {
	orgID := c.GetString("org_id")
	convID := c.Param("id")
	senderID := c.GetString("user_id")

	var req SendMessageReq
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}
	if req.ContentType == "" {
		req.ContentType = "text"
	}

	repo := NewRepository()
	conv, err := repo.GetConversationByID(convID, orgID)
	if err != nil || conv == nil {
		utils.ErrorResponse(c, http.StatusNotFound, "conversation not found")
		return
	}

	if conv.Platform == "whatsapp" {
		waSvc := whatsapp.NewService()
		res, err := waSvc.Send(orgID, conv.DeviceID, conv.CustomerIdentifier, req.Content)
		if err != nil || (res != nil && !res.Success) {
			utils.ErrorResponse(c, http.StatusInternalServerError, "failed to send whatsapp message")
			return
		}
	}

	msg, err := h.service.SaveOutboundMessage(convID, orgID, senderID, req.ContentType, req.Content, req.MediaURL)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	
	BroadcastMessage(orgID, "new_message", msg)

	utils.SuccessResponse(c, http.StatusOK, msg)
}

func (h *Handler) MarkAsRead(c *gin.Context) {
	orgID := c.GetString("org_id")
	convID := c.Param("id")
	
	if err := h.service.MarkAsRead(convID, orgID); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, gin.H{"status": "ok"})
}
