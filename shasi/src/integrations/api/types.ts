/**
 * API Response Types
 * Standard response format untuk semua API calls
 */

export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

export interface ApiListResponse<T = unknown> {
    success: boolean;
    data: T[];
    total?: number;
    page?: number;
    limit?: number;
}

export interface ApiErrorResponse {
    success: false;
    error: string;
    message?: string;
    statusCode?: number;
}

export interface AuthResponse {
    success: boolean;
    data?: {
        access_token: string;
        refresh_token: string;
        user: {
            id: string;
            email: string;
            role: string;
        };
    };
    access_token?: string;
    refresh_token?: string;
    user?: {
        id: string;
        email: string;
        role: string;
    };
    error?: string;
}

export interface JwtPayload {
    sub: string; // user id
    email: string;
    role: string;
    iat: number;
    exp: number;
}

export class ApiError extends Error {
    constructor(
        public statusCode: number,
        public message: string,
        public data?: any
    ) {
        super(message);
        this.name = "ApiError";
    }
}
