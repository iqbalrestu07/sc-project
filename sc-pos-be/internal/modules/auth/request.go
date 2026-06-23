package authmodule

// LoginRequest represents the payload for authentication login
type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// RegisterRequest represents the payload for public user registration + first org creation.
// The registering user automatically becomes admin of the new organization.
type RegisterRequest struct {
	Email            string `json:"email" binding:"required,email"`
	Password         string `json:"password" binding:"required,min=6"`
	FullName         string `json:"full_name"`
	OrganizationName string `json:"organization_name" binding:"required"`
}

// AdminRegisterRequest represents the payload for admin-created user accounts.
// Admin can specify any valid role (admin, doctor, therapist, cashier).
type AdminRegisterRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
	Role     string `json:"role" binding:"required"`
}

// RefreshRequest represents the payload for token refresh
type RefreshRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}
