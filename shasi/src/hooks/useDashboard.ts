import { useQuery } from "@tanstack/react-query";
import { apiClient, API_ENDPOINTS } from "@/integrations/api";
import { format } from "date-fns";

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

export interface TopCustomerItem {
  patient_id: string;
  patient_code: string;
  full_name: string;
  total_spend: number;
  tx_count: number;
}

export interface AppointmentTodayItem {
  id: string;
  scheduled_at: string;
  status: string;
  patient_name: string;
  service_name: string;
}

export interface DateRangeParams {
  from?: Date;
  to?: Date;
  page?: number;
  limit?: number;
}

function buildDateParams(dr?: DateRangeParams): Record<string, string> {
  const params: Record<string, string> = {};
  if (dr?.from && dr?.to) {
    params.from = format(dr.from, "yyyy-MM-dd");
    params.to = format(dr.to, "yyyy-MM-dd");
  }
  if (dr?.page) params.page = dr.page.toString();
  if (dr?.limit) params.limit = dr.limit.toString();
  return params;
}

export function useDashboardStats(dr?: DateRangeParams) {
  return useQuery({
    queryKey: ["dashboard-stats", dr?.from?.toISOString(), dr?.to?.toISOString()],
    queryFn: async (): Promise<DashboardStats> => {
      const data = await apiClient.get<{ data: DashboardStats }>(
        API_ENDPOINTS.DASHBOARD.STATS,
        buildDateParams(dr)
      );
      return data.data;
    },
    refetchInterval: 60_000,
  });
}

export function useDashboardRevenue(dr?: DateRangeParams) {
  return useQuery({
    queryKey: ["dashboard-revenue", dr?.from?.toISOString(), dr?.to?.toISOString()],
    queryFn: async (): Promise<RevenuePoint[]> => {
      const data = await apiClient.get<{ data: RevenuePoint[] }>(
        API_ENDPOINTS.DASHBOARD.REVENUE,
        buildDateParams(dr)
      );
      return data.data || [];
    },
  });
}

export function useDashboardTopServices(dr?: DateRangeParams) {
  return useQuery({
    queryKey: ["dashboard-top-services", dr?.from?.toISOString(), dr?.to?.toISOString(), dr?.page, dr?.limit],
    queryFn: async () => {
      const data = await apiClient.get<{ data: TopServiceItem[], has_next?: boolean }>(
        API_ENDPOINTS.DASHBOARD.TOP_SERVICES,
        buildDateParams(dr)
      );
      return {
        data: data.data || [],
        has_next: data.has_next || false,
      };
    },
  });
}

export function useDashboardTopProducts(dr?: DateRangeParams) {
  return useQuery({
    queryKey: ["dashboard-top-products", dr?.from?.toISOString(), dr?.to?.toISOString(), dr?.page, dr?.limit],
    queryFn: async () => {
      const data = await apiClient.get<{ data: TopProductItem[], has_next?: boolean }>(
        API_ENDPOINTS.DASHBOARD.TOP_PRODUCTS,
        buildDateParams(dr)
      );
      return {
        data: data.data || [],
        has_next: data.has_next || false,
      };
    },
  });
}

export function useDashboardTopCustomers(dr?: DateRangeParams) {
  return useQuery({
    queryKey: ["dashboard-top-customers", dr?.from?.toISOString(), dr?.to?.toISOString()],
    queryFn: async (): Promise<TopCustomerItem[]> => {
      const data = await apiClient.get<{ data: TopCustomerItem[] }>(
        API_ENDPOINTS.DASHBOARD.TOP_CUSTOMERS,
        buildDateParams(dr)
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
