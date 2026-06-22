/**
 * API Client
 * Centralized HTTP client with interceptors, auth, and error handling
 */

import axios, { AxiosInstance, AxiosError } from "axios";
import { ApiError, JwtPayload } from "./types";

export interface ApiClientConfig {
    baseURL: string;
    timeout?: number;
    withCredentials?: boolean;
}

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";
const API_TIMEOUT = import.meta.env.VITE_API_TIMEOUT
    ? parseInt(import.meta.env.VITE_API_TIMEOUT)
    : 30000;

// Token management
const TOKEN_STORAGE_KEY = "access_token";
const REFRESH_TOKEN_STORAGE_KEY = "refresh_token";

class ApiClient {
    private client: AxiosInstance;
    private isRefreshing = false;
    private failedQueue: Array<{
        onSuccess: (token: string) => void;
        onFail: (error: ApiError) => void;
    }> = [];

    constructor(config: ApiClientConfig = { baseURL: API_BASE_URL }) {
        this.client = axios.create({
            baseURL: config.baseURL,
            timeout: config.timeout || API_TIMEOUT,
            withCredentials: config.withCredentials ?? true,
            headers: {
                "Content-Type": "application/json",
            },
        });

        this.setupInterceptors();
    }

    private setupInterceptors() {
        // Request interceptor - attach token
        this.client.interceptors.request.use(
            (config) => {
                const token = this.getAccessToken();
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
                return config;
            },
            (error) => Promise.reject(error)
        );

        // Response interceptor - handle errors and token refresh
        this.client.interceptors.response.use(
            (response) => response,
            async (error: AxiosError) => {
                const originalRequest = error.config as any;

                // Handle 401 Unauthorized - try to refresh token
                if (error.response?.status === 401 && !originalRequest._retry) {
                    if (this.isRefreshing) {
                        // Queue request while refreshing
                        return new Promise((onSuccess, onFail) => {
                            this.failedQueue.push({ onSuccess, onFail });
                        });
                    }

                    originalRequest._retry = true;
                    this.isRefreshing = true;

                    try {
                        const refreshToken = this.getRefreshToken();
                        if (!refreshToken) {
                            throw new ApiError(401, "No refresh token available");
                        }

                        const response = await this.client.post("/auth/refresh", {
                            refresh_token: refreshToken,
                        });

                        const { data } = response;
                        this.setAccessToken(data.access_token);
                        if (data.refresh_token) {
                            this.setRefreshToken(data.refresh_token);
                        }

                        // Retry original request with new token
                        originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
                        this.processQueue(null, data.access_token);

                        return this.client(originalRequest);
                    } catch (refreshError) {
                        this.clearTokens();
                        this.processQueue(refreshError as ApiError, null);

                        // Redirect to login
                        window.location.href = "/admin/login";
                        return Promise.reject(refreshError);
                    } finally {
                        this.isRefreshing = false;
                    }
                }

                // Transform error to ApiError
                const statusCode = error.response?.status || 500;
                const errorMessage =
                    (error.response?.data as any)?.error ||
                    (error.response?.data as any)?.message ||
                    error.message ||
                    "An error occurred";

                return Promise.reject(
                    new ApiError(statusCode, errorMessage, error.response?.data)
                );
            }
        );
    }

    private processQueue(
        error: ApiError | null,
        token: string | null
    ) {
        this.failedQueue.forEach((prom) => {
            if (error) {
                prom.onFail(error);
            } else if (token) {
                prom.onSuccess(token);
            }
        });

        this.failedQueue = [];
    }

    // Token management methods
    public setAccessToken(token: string) {
        localStorage.setItem(TOKEN_STORAGE_KEY, token);
    }

    public getAccessToken(): string | null {
        return localStorage.getItem(TOKEN_STORAGE_KEY);
    }

    public setRefreshToken(token: string) {
        localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, token);
    }

    public getRefreshToken(): string | null {
        return localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
    }

    public clearTokens() {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    }

    public getDecodedToken(): JwtPayload | null {
        const token = this.getAccessToken();
        if (!token) return null;

        try {
            const parts = token.split(".");
            const payload = JSON.parse(atob(parts[1]));
            return payload;
        } catch {
            return null;
        }
    }

    public isTokenExpired(): boolean {
        const payload = this.getDecodedToken();
        if (!payload) return true;

        const expirationTime = payload.exp * 1000;
        return Date.now() >= expirationTime;
    }

    public isLoggedIn(): boolean {
        const token = this.getAccessToken();
        return !!token && !this.isTokenExpired();
    }

    // HTTP methods
    public async get<T = unknown>(url: string, params?: any) {
        const response = await this.client.get<T>(url, { params });
        return response.data;
    }

    public async post<T = unknown>(url: string, data?: any) {
        const response = await this.client.post<T>(url, data);
        return response.data;
    }

    public async put<T = unknown>(url: string, data?: any) {
        const response = await this.client.put<T>(url, data);
        return response.data;
    }

    public async patch<T = unknown>(url: string, data?: any) {
        const response = await this.client.patch<T>(url, data);
        return response.data;
    }

    public async delete<T = unknown>(url: string) {
        const response = await this.client.delete<T>(url);
        return response.data;
    }
}

// Singleton instance
export const apiClient = new ApiClient();
