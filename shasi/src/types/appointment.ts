import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Staff = Tables<"staff">;
export type StaffInsert = TablesInsert<"staff">;
export type StaffUpdate = TablesUpdate<"staff">;

export type Appointment = Tables<"appointments">;
export type AppointmentInsert = TablesInsert<"appointments">;
export type AppointmentUpdate = TablesUpdate<"appointments">;

export type AppointmentWithRelations = Appointment & {
  patient?: { id: string; full_name: string; patient_code: string; phone?: string | null; whatsapp?: string | null } | null;
  service?: { id: string; name: string; base_price: number; duration_minutes: number | null } | null;
  doctor?: { id: string; full_name: string } | null;
  therapist?: { id: string; full_name: string } | null;
};

export const APPOINTMENT_STATUSES = [
  { value: "scheduled", label: "Scheduled", color: "bg-blue-100 text-blue-800" },
  { value: "confirmed", label: "Confirmed", color: "bg-green-100 text-green-800" },
  { value: "in_progress", label: "In Progress", color: "bg-yellow-100 text-yellow-800" },
  { value: "completed", label: "Completed", color: "bg-primary/20 text-primary" },
  { value: "cancelled", label: "Cancelled", color: "bg-destructive/20 text-destructive" },
  { value: "no_show", label: "No Show", color: "bg-muted text-muted-foreground" },
] as const;

export type AppointmentStatus = typeof APPOINTMENT_STATUSES[number]["value"];
