/**
 * API Endpoints
 * Centralized endpoint definitions
 */

export const API_ENDPOINTS = {
    // Auth
    AUTH: {
        LOGIN: "/auth/login",
        REGISTER: "/auth/register",
        REFRESH: "/auth/refresh",
        LOGOUT: "/auth/logout",
        ME: "/auth/me",
        USERS: "/auth/users", // ?email=... (admin only)
        ADMIN_REGISTER: "/auth/admin/register", // admin only
    },

    // Patients
    PATIENTS: {
        LIST: "/patients",
        CREATE: "/patients",
        DETAIL: (id: string) => `/patients/${id}`,
        UPDATE: (id: string) => `/patients/${id}`,
        DELETE: (id: string) => `/patients/${id}`,
        SEARCH: "/patients/search",
        VISITS: (id: string) => `/patients/${id}/visits`,
        TRANSACTIONS: (id: string) => `/patients/${id}/transactions`,
    },

    // Services
    SERVICES: {
        LIST: "/services",
        CREATE: "/services",
        DETAIL: (id: string) => `/services/${id}`,
        UPDATE: (id: string) => `/services/${id}`,
        DELETE: (id: string) => `/services/${id}`,
        CATEGORIES: "/service-categories",
        CATEGORY_CREATE: "/service-categories",
        CATEGORY_UPDATE: (id: string) => `/service-categories/${id}`,
        CATEGORY_DELETE: (id: string) => `/service-categories/${id}`,
    },

    // Products
    PRODUCTS: {
        LIST: "/products",
        CREATE: "/products",
        DETAIL: (id: string) => `/products/${id}`,
        UPDATE: (id: string) => `/products/${id}`,
        DELETE: (id: string) => `/products/${id}`,
        CATEGORIES: "/product-categories",
        CATEGORY_CREATE: "/product-categories",
        CATEGORY_UPDATE: (id: string) => `/product-categories/${id}`,
        CATEGORY_DELETE: (id: string) => `/product-categories/${id}`,
    },

    // Appointments
    APPOINTMENTS: {
        LIST: "/appointments",
        CREATE: "/appointments",
        DETAIL: (id: string) => `/appointments/${id}`,
        UPDATE: (id: string) => `/appointments/${id}`,
        DELETE: (id: string) => `/appointments/${id}`,
        CALENDAR: "/appointments/calendar",
        AVAILABLE_SLOTS: "/appointments/available-slots",
    },

    // Transactions
    TRANSACTIONS: {
        LIST: "/transactions",
        CREATE: "/transactions",
        DETAIL: (id: string) => `/transactions/${id}`,
        UPDATE: (id: string) => `/transactions/${id}`,
        DELETE: (id: string) => `/transactions/${id}`,
        ITEMS: (id: string) => `/transactions/${id}/items`,
    },

    // Staff
    STAFF: {
        LIST: "/staff",
        CREATE: "/staff",
        DETAIL: (id: string) => `/staff/${id}`,
        UPDATE: (id: string) => `/staff/${id}`,
        DELETE: (id: string) => `/staff/${id}`,
    },

    // Commissions
    COMMISSIONS: {
        LIST: "/commissions",
        STAFF: (staffId: string) => `/commissions/staff/${staffId}`,
        UPDATE_STATUS: "/commissions/update-status",
    },

    // Dashboard
    DASHBOARD: {
        STATS: "/dashboard/stats",
        REVENUE: "/dashboard/revenue",
        TOP_SERVICES: "/dashboard/top-services",
        TOP_PRODUCTS: "/dashboard/top-products",
        TOP_CUSTOMERS: "/dashboard/top-customers",
        APPOINTMENTS_TODAY: "/dashboard/appointments-today",
    },

    // CMS
    CMS: {
        PAGES: "/cms/pages",
        PAGE_DETAIL: (pageId: string) => `/cms/pages/${pageId}`,
        PAGE_UPDATE: (pageId: string) => `/cms/pages/${pageId}`,
        UPLOAD_IMAGE: "/cms/upload-image",
    },

    // Settings
    SETTINGS: {
        CLINIC: "/settings/clinic",
        CLINIC_UPDATE: "/settings/clinic",
        CLINIC_LOGO: "/settings/clinic/logo",
        PUBLIC_CLINIC_INFO: "/public/clinic-info",
    },

    // Stock Movements
    STOCK_MOVEMENTS: {
        LIST: "/stock-movements",
        CREATE: "/stock-movements",
    },

    // Consumable Items (produk habis pakai)
    CONSUMABLE_ITEMS: {
        LIST: "/consumable-items",
        USAGE_LIST: "/consumable-items/usage",
        USAGE_CREATE: "/consumable-items/usage",
        MARK_CONSUMABLE: (id: string) => `/products/${id}/mark-consumable`,
    },

    // Service Consumables (legacy)
    SERVICE_CONSUMABLES: {
        LIST: "/service-consumables",                         // ?service_id=uuid
        UPSERT: "/service-consumables",                       // body: { service_id, product_id, quantity_used }
        DELETE: (id: string) => `/service-consumables/${id}`,
    },

    // Service Consumable Groups (alternative products system)
    // Note: uses :id (not :serviceId) to match the existing Gin wildcard on /services/:id
    CONSUMABLE_GROUPS: {
        LIST:         (serviceId: string) => `/services/${serviceId}/consumable-groups`,
        CREATE:       (serviceId: string) => `/services/${serviceId}/consumable-groups`,
        UPDATE:       (groupId: string)   => `/consumable-groups/${groupId}`,
        DELETE:       (groupId: string)   => `/consumable-groups/${groupId}`,
        ADD_ITEM:     (groupId: string)   => `/consumable-groups/${groupId}/items`,
        DELETE_ITEM:  (itemId: string)    => `/consumable-group-items/${itemId}`,
    },

    // WhatsApp
    WHATSAPP: {
        DEVICES: "/whatsapp/devices",
        LOGOUT: "/whatsapp/logout",
        SEND_MESSAGE: "/whatsapp/send",
        SEND_BULK: "/whatsapp/send-bulk",
        BLAST: "/whatsapp/blast",
        TEMPLATES: "/whatsapp/templates",
    },

    // Organizations
    ORGANIZATIONS: {
        MY:           "/organizations/my",
        CREATE:       "/organizations",
        DETAIL:       (id: string) => `/organizations/${id}`,
        UPDATE:       (id: string) => `/organizations/${id}`,
        DELETE:       (id: string) => `/organizations/${id}`,
        MEMBERS:      (id: string) => `/organizations/${id}/members`,
        ADD_MEMBER:   (id: string) => `/organizations/${id}/members`,
        UPDATE_MEMBER:(id: string, userId: string) => `/organizations/${id}/members/${userId}`,
        REMOVE_MEMBER:(id: string, userId: string) => `/organizations/${id}/members/${userId}`,
    },

    // RBAC
    RBAC: {
        PERMISSIONS:          "/rbac/permissions",
        MY_PERMISSIONS:       "/rbac/my-permissions",
        ALL_ROLE_PERMISSIONS: "/rbac/role-permissions",
        ROLE_PERMISSIONS:     (role: string) => `/rbac/role-permissions/${role}`,
        USER_PERMISSIONS:     (userId: string) => `/rbac/user-permissions/${userId}`,
        GRANT_PERMISSION:     (userId: string) => `/rbac/user-permissions/${userId}`,
        REVOKE_PERMISSION:    (userId: string, permId: string) => `/rbac/user-permissions/${userId}/${permId}`,
    },

    // Data Import / Migration
    MIGRATION: {
        IMPORT_EXCEL: "/migration/import",
    },

    // Omnichannel
    OMNI: {
        CONVERSATIONS: "/omni/conversations",
        MESSAGES: (id: string) => `/omni/conversations/${id}/messages`,
        SEND_MESSAGE: (id: string) => `/omni/conversations/${id}/messages`,
        MARK_AS_READ: (id: string) => `/omni/conversations/${id}/read`,
        WS: (orgId: string) => `/omni/ws?org_id=${orgId}`,
    },
};
