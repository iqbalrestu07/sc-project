-- Create patients table
CREATE TABLE public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_code TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  photo_url TEXT,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  phone TEXT,
  whatsapp TEXT,
  email TEXT,
  address TEXT,
  allergy_history TEXT,
  medical_conditions TEXT,
  skin_type TEXT CHECK (skin_type IN ('normal', 'dry', 'oily', 'combination', 'sensitive')),
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- Create index for faster searches
CREATE INDEX idx_patients_full_name ON public.patients USING gin(to_tsvector('english', full_name));
CREATE INDEX idx_patients_phone ON public.patients(phone);
CREATE INDEX idx_patients_patient_code ON public.patients(patient_code);

-- RLS Policies: Admin can do everything
CREATE POLICY "Admins can manage all patients"
ON public.patients
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Doctors can view and update patients
CREATE POLICY "Doctors can view patients"
ON public.patients
FOR SELECT
USING (public.has_role(auth.uid(), 'doctor'));

CREATE POLICY "Doctors can insert patients"
ON public.patients
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'doctor'));

CREATE POLICY "Doctors can update patients"
ON public.patients
FOR UPDATE
USING (public.has_role(auth.uid(), 'doctor'));

-- Therapists can view patients
CREATE POLICY "Therapists can view patients"
ON public.patients
FOR SELECT
USING (public.has_role(auth.uid(), 'therapist'));

-- Cashiers can view patients (for POS)
CREATE POLICY "Cashiers can view patients"
ON public.patients
FOR SELECT
USING (public.has_role(auth.uid(), 'cashier'));

-- Create trigger for updated_at
CREATE TRIGGER update_patients_updated_at
BEFORE UPDATE ON public.patients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to generate patient code
CREATE OR REPLACE FUNCTION public.generate_patient_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num INTEGER;
  year_prefix TEXT;
BEGIN
  year_prefix := to_char(CURRENT_DATE, 'YY');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(patient_code FROM 4) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.patients
  WHERE patient_code LIKE 'PT' || year_prefix || '%';
  
  NEW.patient_code := 'PT' || year_prefix || LPAD(next_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$;

-- Create trigger for auto-generating patient code
CREATE TRIGGER generate_patient_code_trigger
BEFORE INSERT ON public.patients
FOR EACH ROW
WHEN (NEW.patient_code IS NULL OR NEW.patient_code = '')
EXECUTE FUNCTION public.generate_patient_code();