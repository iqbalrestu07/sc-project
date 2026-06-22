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
    },

    // Stock Movements
    STOCK_MOVEMENTS: {
        LIST: "/stock-movements",
        CREATE: "/stock-movements",
    },

    // Service Consumables
    SERVICE_CONSUMABLES: {
        LIST: "/service-consumables",                         // ?service_id=uuid
        UPSERT: "/service-consumables",                       // body: { service_id, product_id, quantity_used }
        DELETE: (id: string) => `/service-consumables/${id}`,
    },

    // WhatsApp
    WHATSAPP: {
        SEND_MESSAGE: "/whatsapp/send",
        SEND_BULK: "/whatsapp/send-bulk",
        TEMPLATES: "/whatsapp/templates",
    },
};
