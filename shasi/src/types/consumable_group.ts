// Types for service consumable groups — the "alternative products" system.
// A service can have multiple consumable groups (e.g. "Masker", "Serum").
// Each group has alternative products that can fulfil the requirement.

export interface ConsumableGroupItem {
  id: string;
  group_id: string;
  product_id: string;
  priority: number;
  created_at: string;
  // Denormalized from JOIN
  product_name?: string | null;
  product_unit?: string | null;
  current_stock?: number | null;
  selling_price?: number | null;
}

export interface ConsumableGroup {
  id: string;
  service_id: string;
  name: string;
  quantity_used: number;
  created_at: string;
  updated_at: string;
  items: ConsumableGroupItem[];
}

// Used in POS cart to record which consumable was selected for a service item
export interface CartConsumableSelection {
  group_id: string;
  group_name: string;
  product_id: string;
  product_name: string;
  quantity_used: number; // total = group.quantity_used * item.quantity
}
