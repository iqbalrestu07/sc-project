// Re-export product types to avoid duplication
export type { Product, ProductCategory, ProductFormData } from "./product";

export type CommissionType = 'fixed' | 'percentage';

export interface ServiceCategory {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  name: string;
  category_id: string | null;
  description: string | null;
  duration_minutes: number;
  base_price: number;
  // Handling commission: earned when staff is PIC / mengerjakan tindakan (always)
  doctor_commission_type: CommissionType;
  doctor_commission_value: number;
  therapist_commission_type: CommissionType;
  therapist_commission_value: number;
  // Offering commission: earned only when staff offers the service and patient agrees
  doctor_offering_commission_type?: CommissionType | null;
  doctor_offering_commission_value?: number | null;
  therapist_offering_commission_type?: CommissionType | null;
  therapist_offering_commission_value?: number | null;
  is_active: boolean;
  requires_doctor: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  category?: ServiceCategory;
}

export interface ServiceFormData {
  name: string;
  category_id?: string;
  description?: string;
  duration_minutes?: number;
  base_price: number;
  // Handling commission
  doctor_commission_type?: CommissionType;
  doctor_commission_value?: number;
  therapist_commission_type?: CommissionType;
  therapist_commission_value?: number;
  // Offering commission
  doctor_offering_commission_type?: CommissionType | null;
  doctor_offering_commission_value?: number | null;
  therapist_offering_commission_type?: CommissionType | null;
  therapist_offering_commission_value?: number | null;
  requires_doctor?: boolean;
}

export interface ServiceConsumable {
  id: string;
  service_id: string;
  product_id: string;
  quantity_used: number;
  created_at: string;
}

export interface StockMovement {
  id: string;
  product_id: string;
  movement_type: 'in' | 'out' | 'adjustment';
  quantity: number;
  reason: string | null;
  reference_id: string | null;
  reference_type: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}
