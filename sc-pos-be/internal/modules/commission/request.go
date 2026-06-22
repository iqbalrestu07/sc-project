package commission

// UpdateStatusRequest represents the payload for updating the status of commissions
type UpdateStatusRequest struct {
	IDs    []string `json:"ids"`
	Status string   `json:"status"`
}
