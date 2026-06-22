
ALTER TABLE public.clinic_settings
ADD COLUMN IF NOT EXISTS invoice_header_title TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS invoice_header_description TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS invoice_footer_text TEXT DEFAULT NULL;
