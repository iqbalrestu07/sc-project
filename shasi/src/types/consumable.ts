// Consumable item types — aligned with backend consumable_item module

export type UsagePurpose = 'treatment' | 'appointment' | 'waste' | 'internal' | 'other';

export const USAGE_PURPOSES: { value: UsagePurpose; label: string; description: string }[] = [
  { value: 'treatment', label: 'Treatment / Layanan', description: 'Digunakan dalam treatment atau layanan klinik' },
  { value: 'appointment', label: 'Appointment Pasien', description: 'Digunakan untuk pasien dalam appointment tertentu' },
  { value: 'waste', label: 'Pembuangan / Waste', description: 'Produk dibuang karena kadaluarsa atau rusak' },
  { value: 'internal', label: 'Pemakaian Internal', description: 'Digunakan untuk keperluan internal klinik' },
  { value: 'other', label: 'Lainnya', description: 'Keperluan lain yang tidak termasuk kategori di atas' },
];

export const CONSUMABLE_CATEGORIES: { value: string; label: string }[] = [
  { value: 'treatment_supply', label: 'Perlengkapan Treatment' },
  { value: 'lab_supply',       label: 'Perlengkapan Lab' },
  { value: 'disposable',       label: 'Bahan Sekali Pakai' },
  { value: 'medication',       label: 'Obat-obatan' },
  { value: 'other',            label: 'Lainnya' },
];

export interface ConsumableUsageLog {
  id: string;
  product_id: string;
  quantity: number;
  usage_purpose: UsagePurpose;
  reference_id?: string | null;
  reference_type?: string | null;
  patient_name?: string | null;
  service_name?: string | null;
  notes?: string | null;
  organization_id?: string | null;
  created_by?: string | null;
  created_at: string;
  // enriched by backend JOIN
  product_name: string;
  product_unit: string;
  current_stock: number;
}

export interface ConsumableUsageInsert {
  product_id: string;
  quantity: number;
  usage_purpose: UsagePurpose;
  patient_name?: string;
  service_name?: string;
  notes?: string;
  reference_id?: string;
  reference_type?: string;
}

export interface ConsumableUsageFilters {
  productId?: string;
  purpose?: UsagePurpose | '';
  from?: string; // YYYY-MM-DD
  to?: string;   // YYYY-MM-DD
}

export interface MarkConsumablePayload {
  is_consumable: boolean;
  consumable_category?: string | null;
}
