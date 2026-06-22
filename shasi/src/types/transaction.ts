import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Transaction = Tables<"transactions">;
export type TransactionInsert = TablesInsert<"transactions">;
export type TransactionUpdate = TablesUpdate<"transactions">;

export type TransactionItem = Tables<"transaction_items">;
export type TransactionItemInsert = TablesInsert<"transaction_items">;

export type Commission = Tables<"commissions">;

export type TransactionWithRelations = Transaction & {
  patient?: { id: string; full_name: string; patient_code: string } | null;
  items?: (TransactionItem & {
    service?: { id: string; name: string } | null;
    product?: { id: string; name: string } | null;
    doctor?: { id: string; full_name: string } | null;
    therapist?: { id: string; full_name: string } | null;
  })[];
};

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
