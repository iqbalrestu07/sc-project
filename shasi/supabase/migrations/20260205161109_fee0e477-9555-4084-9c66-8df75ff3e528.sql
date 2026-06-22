-- Create clinic settings table
CREATE TABLE public.clinic_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_name TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  tax_rate NUMERIC DEFAULT 11,
  tax_inclusive BOOLEAN DEFAULT false,
  low_stock_alerts BOOLEAN DEFAULT true,
  appointment_reminders BOOLEAN DEFAULT true,
  expiry_warnings BOOLEAN DEFAULT true,
  reminder_hours_before INTEGER DEFAULT 24,
  whatsapp_reminder_enabled BOOLEAN DEFAULT false,
  email_reminder_enabled BOOLEAN DEFAULT false,
  whatsapp_business_phone_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.clinic_settings ENABLE ROW LEVEL SECURITY;

-- Only authenticated users can read settings
CREATE POLICY "Authenticated users can read settings"
ON public.clinic_settings
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Only admin users can update settings
CREATE POLICY "Admin users can update settings"
ON public.clinic_settings
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Only admin users can insert settings
CREATE POLICY "Admin users can insert settings"
ON public.clinic_settings
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_clinic_settings_updated_at
BEFORE UPDATE ON public.clinic_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default settings row
INSERT INTO public.clinic_settings (clinic_name) VALUES ('My Aesthetic Clinic');

-- Add whatsapp field to patients if not exists
ALTER TABLE public.patients 
ADD COLUMN IF NOT EXISTS reminder_opt_in BOOLEAN DEFAULT true;