-- CMS: Landing page content tables

-- Hero section
CREATE TABLE public.cms_hero (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tagline TEXT NOT NULL DEFAULT 'Your Beauty, Our Passion',
  description TEXT NOT NULL DEFAULT 'Experience premium aesthetic treatments with our expert team.',
  cta_primary_text TEXT NOT NULL DEFAULT 'Book Appointment',
  cta_secondary_text TEXT NOT NULL DEFAULT 'Chat via WhatsApp',
  whatsapp_url TEXT NOT NULL DEFAULT 'https://wa.me/6282123523139',
  background_image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- About section
CREATE TABLE public.cms_about (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL DEFAULT 'About Shasi Beauty Care',
  introduction TEXT NOT NULL DEFAULT 'We are a premium aesthetic clinic dedicated to enhancing your natural beauty.',
  vision TEXT,
  mission TEXT,
  why_choose_us TEXT[],
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Services overview (marketing, not booking)
CREATE TABLE public.cms_services_overview (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  short_description TEXT NOT NULL,
  image_url TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Monthly promotions
CREATE TABLE public.cms_promotions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  banner_image_url TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  terms_conditions TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Before & After gallery
CREATE TABLE public.cms_gallery (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  before_image_url TEXT NOT NULL,
  after_image_url TEXT NOT NULL,
  caption TEXT,
  category TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Testimonials
CREATE TABLE public.cms_testimonials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_name TEXT NOT NULL,
  testimonial_text TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  patient_photo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- CTA section
CREATE TABLE public.cms_cta (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  headline TEXT NOT NULL DEFAULT 'Ready to Transform Your Beauty?',
  subtext TEXT NOT NULL DEFAULT 'Book your consultation today and start your beauty journey.',
  cta_primary_text TEXT NOT NULL DEFAULT 'Make Appointment',
  cta_secondary_text TEXT NOT NULL DEFAULT 'Chat via WhatsApp',
  whatsapp_url TEXT NOT NULL DEFAULT 'https://wa.me/6282123523139',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Contact information
CREATE TABLE public.cms_contact (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  address TEXT,
  whatsapp_number TEXT NOT NULL DEFAULT '6282123523139',
  email TEXT,
  instagram_url TEXT,
  facebook_url TEXT,
  tiktok_url TEXT,
  google_maps_embed TEXT,
  business_hours JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all CMS tables
ALTER TABLE public.cms_hero ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_about ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_services_overview ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_cta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_contact ENABLE ROW LEVEL SECURITY;

-- Public read access for landing page (no auth required)
CREATE POLICY "Public can read hero" ON public.cms_hero FOR SELECT USING (is_active = true);
CREATE POLICY "Public can read about" ON public.cms_about FOR SELECT USING (is_active = true);
CREATE POLICY "Public can read services overview" ON public.cms_services_overview FOR SELECT USING (is_active = true);
CREATE POLICY "Public can read active promotions" ON public.cms_promotions FOR SELECT USING (is_active = true AND start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE);
CREATE POLICY "Public can read gallery" ON public.cms_gallery FOR SELECT USING (is_active = true);
CREATE POLICY "Public can read testimonials" ON public.cms_testimonials FOR SELECT USING (is_active = true);
CREATE POLICY "Public can read cta" ON public.cms_cta FOR SELECT USING (is_active = true);
CREATE POLICY "Public can read contact" ON public.cms_contact FOR SELECT USING (is_active = true);

-- Admin full access for all CMS tables
CREATE POLICY "Admins manage hero" ON public.cms_hero FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage about" ON public.cms_about FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage services overview" ON public.cms_services_overview FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage promotions" ON public.cms_promotions FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage gallery" ON public.cms_gallery FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage testimonials" ON public.cms_testimonials FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage cta" ON public.cms_cta FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage contact" ON public.cms_contact FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert default data
INSERT INTO public.cms_hero (tagline, description) VALUES ('Your Beauty, Our Passion', 'Experience premium aesthetic treatments with our expert team at Shasi Beauty Care.');
INSERT INTO public.cms_about (title, introduction, vision, mission, why_choose_us) VALUES (
  'About Shasi Beauty Care',
  'Shasi Beauty Care is a premium aesthetic clinic dedicated to enhancing your natural beauty through advanced treatments and personalized care.',
  'To be the leading aesthetic clinic that transforms lives through innovative beauty solutions.',
  'To provide exceptional aesthetic services with the highest standards of safety, quality, and customer satisfaction.',
  ARRAY['Expert team of certified professionals', 'State-of-the-art technology', 'Personalized treatment plans', 'Premium quality products', 'Comfortable and luxurious environment']
);
INSERT INTO public.cms_cta (headline, subtext) VALUES ('Ready to Transform Your Beauty?', 'Book your consultation today and let our experts create a personalized beauty plan just for you.');
INSERT INTO public.cms_contact (address, whatsapp_number) VALUES ('Jl. Beauty Street No. 123, Jakarta', '6282123523139');

-- Create timestamp update trigger for CMS tables
CREATE OR REPLACE FUNCTION update_cms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_cms_hero_updated_at BEFORE UPDATE ON public.cms_hero FOR EACH ROW EXECUTE FUNCTION update_cms_updated_at();
CREATE TRIGGER update_cms_about_updated_at BEFORE UPDATE ON public.cms_about FOR EACH ROW EXECUTE FUNCTION update_cms_updated_at();
CREATE TRIGGER update_cms_services_overview_updated_at BEFORE UPDATE ON public.cms_services_overview FOR EACH ROW EXECUTE FUNCTION update_cms_updated_at();
CREATE TRIGGER update_cms_promotions_updated_at BEFORE UPDATE ON public.cms_promotions FOR EACH ROW EXECUTE FUNCTION update_cms_updated_at();
CREATE TRIGGER update_cms_gallery_updated_at BEFORE UPDATE ON public.cms_gallery FOR EACH ROW EXECUTE FUNCTION update_cms_updated_at();
CREATE TRIGGER update_cms_testimonials_updated_at BEFORE UPDATE ON public.cms_testimonials FOR EACH ROW EXECUTE FUNCTION update_cms_updated_at();
CREATE TRIGGER update_cms_cta_updated_at BEFORE UPDATE ON public.cms_cta FOR EACH ROW EXECUTE FUNCTION update_cms_updated_at();
CREATE TRIGGER update_cms_contact_updated_at BEFORE UPDATE ON public.cms_contact FOR EACH ROW EXECUTE FUNCTION update_cms_updated_at();