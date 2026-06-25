// Manual types aligned with Go backend models (not Supabase-generated)

export interface Transaction {
  id: string;
  transaction_code: string;
  appointment_id: string | null;
  patient_id: string | null;
  subtotal: number;
  discount_amount: number | null;
  discount_type: string | null;
  total_amount: number;
  tax_amount: number;
  payment_method: string | null;
  payment_status: string;
  notes: string | null;
  created_by: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TransactionItem {
  id: string;
  transaction_id: string;
  item_type: string;
  service_id: string | null;
  product_id: string | null;
  quantity: number;
  unit_price: number;
  discount_amount: number | null;
  total_price: number;
  doctor_id: string | null;
  therapist_id: string | null;
  created_at: string;
}

export interface Commission {
  id: string;
  staff_id: string;
  staff_role: string;
  transaction_id: string;
  transaction_item_id: string;
  base_amount: number;
  commission_type: string;
  commission_value: number;
  commission_amount: number;
  status: "pending" | "paid";
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TransactionWithRelations extends Transaction {
  patient?: { id: string; full_name: string; patient_code: string } | null;
  items?: (TransactionItem & {
    service?: { id: string; name: string } | null;
    product?: { id: string; name: string } | null;
    doctor?: { id: string; full_name: string } | null;
    therapist?: { id: string; full_name: string } | null;
  })[];
}

export type TransactionInsert = Omit<Transaction, "id" | "transaction_code" | "created_at" | "updated_at" | "paid_at">;
export type TransactionUpdate = Partial<Pick<Transaction, "payment_status" | "payment_method" | "paid_at" | "notes">>;
export type TransactionItemInsert = Omit<TransactionItem, "id" | "created_at">;

export const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "transfer", label: "Bank Transfer" },
  { value: "qris", label: "QRIS" },
  { value: "other", label: "Other" },
] as const;

export const PAYMENT_STATUSES = [
  { value: "pending", label: "Pending", color: "bg-yellow-100 text-yellow-800" },
  { value: "paid", label: "Paid", color: "bg-primary/20 text-primary" },
  { value: "partial", label: "Partial", color: "bg-orange-100 text-orange-800" },
  { value: "refunded", label: "Refunded", color: "bg-destructive/20 text-destructive" },
] as const;

export type PaymentMethod = typeof PAYMENT_METHODS[number]["value"];
export type PaymentStatus = typeof PAYMENT_STATUSES[number]["value"];

// Cart item for POS
export interface CartItem {
  id: string;
  type: "service" | "product";
  itemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  doctorId?: string;
  therapistId?: string;
  doctorName?: string;
  therapistName?: string;
}
