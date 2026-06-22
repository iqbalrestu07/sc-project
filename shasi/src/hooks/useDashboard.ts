import { useQuery } from "@tanstack/react-query";
import { apiClient, API_ENDPOINTS } from "@/integrations/api";

export interface DashboardStats {
  patients: number;
  appointments_today: number;
  paid_transactions_today: number;
  revenue_today: number;
  low_stock_products: number;
}

export interface RevenuePoint {
  date: string;
  revenue: number;
}

export interface TopServiceItem {
  id: string;
  name: string;
  quantity: number;
  revenue: number;
}

export interface TopProductItem {
  id: string;
  name: string;
  quantity: number;
  revenue: number;
}

export interface AppointmentTodayItem {
  id: string;
  scheduled_at: string;
  status: string;
  patient_name: string;
  service_name: string;
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async (): Promise<DashboardStats> => {
      const data = await apiClient.get<{ data: DashboardStats }>(
        API_ENDPOINTS.DASHBOARD.STATS
      );
      return data.data;
    },
    refetchInterval: 60_000, // auto-refresh every 60s
  });
}

export function useDashboardRevenue() {
  return useQuery({
    queryKey: ["dashboard-revenue"],
    queryFn: async (): Promise<RevenuePoint[]> => {
      const data = await apiClient.get<{ data: RevenuePoint[] }>(
        API_ENDPOINTS.DASHBOARD.REVENUE
      );
      return data.data || [];
    },
  });
}

export function useDashboardTopServices() {
  return useQuery({
    queryKey: ["dashboard-top-services"],
    queryFn: async (): Promise<TopServiceItem[]> => {
      const data = await apiClient.get<{ data: TopServiceItem[] }>(
        API_ENDPOINTS.DASHBOARD.TOP_SERVICES
      );
      return data.data || [];
    },
  });
}

export function useDashboardTopProducts() {
  return useQuery({
    queryKey: ["dashboard-top-products"],
    queryFn: async (): Promise<TopProductItem[]> => {
      const data = await apiClient.get<{ data: TopProductItem[] }>(
        API_ENDPOINTS.DASHBOARD.TOP_PRODUCTS
      );
      return data.data || [];
    },
  });
}

export function useDashboardAppointmentsToday() {
  return useQuery({
    queryKey: ["dashboard-appointments-today"],
    queryFn: async (): Promise<AppointmentTodayItem[]> => {
      const data = await apiClient.get<{ data: AppointmentTodayItem[] }>(
        API_ENDPOINTS.DASHBOARD.APPOINTMENTS_TODAY
      );
      return data.data || [];
    },
    refetchInterval: 30_000,
  });
}
