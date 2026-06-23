package organization

import "github.com/gin-gonic/gin"

func RegisterRoutes(router gin.IRouter, orgAdmin gin.HandlerFunc) {
	h := NewModule()

	// All authenticated users can view their own orgs
	router.GET("/organizations/my", h.MyOrganizations)

	// Create a new additional organization (any authenticated user)
	router.POST("/organizations", h.CreateOrg)

	// Org-scoped actions — org admin required
	orgs := router.Group("/organizations/:id")
	{
		orgs.GET("", h.GetOrg)
		orgs.PUT("", orgAdmin, h.UpdateOrg)
		orgs.DELETE("", orgAdmin, h.DeleteOrg)

		orgs.GET("/members", h.ListMembers)
		orgs.POST("/members", orgAdmin, h.AddMember)
		orgs.PUT("/members/:userId", orgAdmin, h.UpdateMemberRole)
		orgs.DELETE("/members/:userId", orgAdmin, h.RemoveMember)
	}
}
