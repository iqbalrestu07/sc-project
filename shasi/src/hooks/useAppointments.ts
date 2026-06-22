import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, API_ENDPOINTS } from "@/integrations/api";
import type {
  AppointmentInsert,
  AppointmentUpdate,
  AppointmentWithRelations,
  AppointmentStatus
} from "@/types/appointment";
import { toast } from "sonner";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";

interface UseAppointmentsOptions {
  date?: Date;
  view?: "day" | "week" | "month";
}

export function useAppointments(options?: UseAppointmentsOptions) {
  const queryClient = useQueryClient();
  const { date = new Date(), view = "day" } = options || {};

  // Calculate date range based on view
  const getDateRange = () => {
    switch (view) {
      case "week":
        return { start: startOfWeek(date, { weekStartsOn: 1 }), end: endOfWeek(date, { weekStartsOn: 1 }) };
      case "month":
        return { start: startOfMonth(date), end: endOfMonth(date) };
      default:
        return { start: startOfDay(date), end: endOfDay(date) };
    }
  };

  const { start, end } = getDateRange();

  const appointmentsQuery = useQuery({
    queryKey: ["appointments", start.toISOString(), end.toISOString()],
    queryFn: async (): Promise<AppointmentWithRelations[]> => {
      try {
        const data = await apiClient.get<{ data: AppointmentWithRelations[] }>(
          API_ENDPOINTS.APPOINTMENTS.CALENDAR,
          {
            start_date: start.toISOString(),
            end_date: end.toISOString(),
          }
        );
        return data.data || [];
      } catch (error) {
        console.error("Error fetching appointments:", error);
        throw error;
      }
    },
  });

  const createAppointment = useMutation({
    mutationFn: async (appointment: AppointmentInsert) => {
      try {
        const data = await apiClient.post<{ data: AppointmentWithRelations }>(
          API_ENDPOINTS.APPOINTMENTS.CREATE,
          appointment
        );
        return data.data;
      } catch (error) {
        console.error("Error creating appointment:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Appointment created successfully");
    },
    onError: (error) => {
      toast.error(`Failed to create appointment: ${(error as Error).message}`);
    },
  });

  const updateAppointment = useMutation({
    mutationFn: async ({ id, ...updates }: AppointmentUpdate & { id: string }) => {
      try {
        const data = await apiClient.put<{ data: AppointmentWithRelations }>(
          API_ENDPOINTS.APPOINTMENTS.UPDATE(id),
          updates
        );
        return data.data;
      } catch (error) {
        console.error("Error updating appointment:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Appointment updated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to update appointment: ${(error as Error).message}`);
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: AppointmentStatus }) => {
      try {
        const data = await apiClient.put<{ data: AppointmentWithRelations }>(
          API_ENDPOINTS.APPOINTMENTS.UPDATE(id),
          { status }
        );
        return data.data;
      } catch (error) {
        console.error("Error updating appointment status:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Appointment status updated");
    },
    onError: (error) => {
      toast.error(`Failed to update status: ${(error as Error).message}`);
    },
  });

  return {
    appointments: appointmentsQuery.data || [],
    isLoading: appointmentsQuery.isLoading,
    error: appointmentsQuery.error,
    createAppointment,
    updateAppointment,
    updateStatus,
  };
}
