// Visit Note (Medical Record) types
export interface VisitNote {
  id: string;
  patient_id: string;
  appointment_id?: string | null;
  visit_date: string;
  diagnosis?: string | null;
  patient_condition_before?: string | null;
  treatment_performed?: string | null;
  treatment_outcome?: string | null;
  follow_up_notes?: string | null;
  next_visit_recommended?: string | null;
  doctor_id?: string | null;
  organization_id: string;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface VisitNoteWithDetails extends VisitNote {
  patient_name?: string;
  doctor_name?: string | null;
  created_by_name?: string | null;
}

export interface VisitNoteInput {
  appointment_id?: string | null;
  visit_date?: string;
  diagnosis?: string | null;
  patient_condition_before?: string | null;
  treatment_performed?: string | null;
  treatment_outcome?: string | null;
  follow_up_notes?: string | null;
  next_visit_recommended?: string | null;
  doctor_id?: string | null;
}

// Queue group structure from GET /appointments/today
export interface TodayQueue {
  waiting: AppointmentQueueItem[];
  in_progress: AppointmentQueueItem[];
  completed: AppointmentQueueItem[];
  other: AppointmentQueueItem[];
}

// Re-export appointment type for queue (avoid circular import)
import type { AppointmentWithRelations } from "./appointment";
export type AppointmentQueueItem = AppointmentWithRelations;
