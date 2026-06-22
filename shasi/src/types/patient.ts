export type Gender = 'male' | 'female' | 'other';
export type SkinType = 'normal' | 'dry' | 'oily' | 'combination' | 'sensitive';

export interface Patient {
  id: string;
  patient_code: string;
  full_name: string;
  photo_url: string | null;
  date_of_birth: string | null;
  gender: Gender | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  allergy_history: string | null;
  medical_conditions: string | null;
  skin_type: SkinType | null;
  notes: string | null;
  tags: string[];
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PatientFormData {
  full_name: string;
  date_of_birth?: string;
  gender?: Gender;
  phone?: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  allergy_history?: string;
  medical_conditions?: string;
  skin_type?: SkinType;
  notes?: string;
  tags?: string[];
}
