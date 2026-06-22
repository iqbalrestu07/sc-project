-- Create service categories table
CREATE TABLE public.service_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for service_categories
CREATE POLICY "Anyone authenticated can view categories"
ON public.service_categories
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage categories"
ON public.service_categories
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_service_categories_updated_at
BEFORE UPDATE ON public.service_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create services/treatments table
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category_id UUID REFERENCES public.service_categories(id) ON DELETE SET NULL,
  description TEXT,
  duration_minutes INTEGER DEFAULT 30,
  base_price DECIMAL(15, 2) NOT NULL DEFAULT 0,
  -- Commission settings for doctor
  doctor_commission_type TEXT CHECK (doctor_commission_type IN ('fixed', 'percentage')) DEFAULT 'percentage',
  doctor_commission_value DECIMAL(15, 2) DEFAULT 0,
  -- Commission settings for therapist
  therapist_commission_type TEXT CHECK (therapist_commission_type IN ('fixed', 'percentage')) DEFAULT 'percentage',
  therapist_commission_value DECIMAL(15, 2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  requires_doctor BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- RLS Policies for services - everyone authenticated can view
CREATE POLICY "Anyone authenticated can view services"
ON public.services
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Only admins can manage services
CREATE POLICY "Admins can manage services"
ON public.services
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create index for faster queries
CREATE INDEX idx_services_category ON public.services(category_id);
CREATE INDEX idx_services_active ON public.services(is_active);

-- Create trigger for updated_at
CREATE TRIGGER update_services_updated_at
BEFORE UPDATE ON public.services
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create products table (for inventory)
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT CHECK (category IN ('skincare', 'consumable', 'equipment', 'other')) DEFAULT 'other',
  sku TEXT UNIQUE,
  supplier TEXT,
  purchase_price DECIMAL(15, 2) DEFAULT 0,
  selling_price DECIMAL(15, 2) DEFAULT 0,
  current_stock INTEGER DEFAULT 0,
  minimum_stock INTEGER DEFAULT 5,
  unit TEXT DEFAULT 'pcs',
  expiry_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- RLS Policies for products
CREATE POLICY "Anyone authenticated can view products"
ON public.products
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage products"
ON public.products
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create index for faster queries
CREATE INDEX idx_products_category ON public.products(category);
CREATE INDEX idx_products_sku ON public.products(sku);
CREATE INDEX idx_products_low_stock ON public.products(current_stock, minimum_stock);

-- Create trigger for updated_at
CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create service_consumables table (links services to products for auto stock deduction)
CREATE TABLE public.service_consumables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity_used DECIMAL(10, 2) NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(service_id, product_id)
);

-- Enable RLS
ALTER TABLE public.service_consumables ENABLE ROW LEVEL SECURITY;

-- RLS Policies for service_consumables
CREATE POLICY "Anyone authenticated can view consumables"
ON public.service_consumables
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage consumables"
ON public.service_consumables
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create indexes
CREATE INDEX idx_service_consumables_service ON public.service_consumables(service_id);
CREATE INDEX idx_service_consumables_product ON public.service_consumables(product_id);

-- Create stock_movements table for tracking inventory changes
CREATE TABLE public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('in', 'out', 'adjustment')),
  quantity INTEGER NOT NULL,
  reason TEXT,
  reference_id UUID, -- Can reference transaction_id or other sources
  reference_type TEXT, -- 'sale', 'treatment', 'adjustment', 'purchase'
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stock_movements
CREATE POLICY "Anyone authenticated can view movements"
ON public.stock_movements
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage movements"
ON public.stock_movements
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create index
CREATE INDEX idx_stock_movements_product ON public.stock_movements(product_id);
CREATE INDEX idx_stock_movements_type ON public.stock_movements(movement_type);
CREATE INDEX idx_stock_movements_created ON public.stock_movements(created_at DESC);

-- Insert default service categories
INSERT INTO public.service_categories (name, description) VALUES
  ('Facial', 'Facial treatments and skincare services'),
  ('Laser', 'Laser treatments and procedures'),
  ('Injection', 'Injectable treatments like filler and botox'),
  ('Body Treatment', 'Body contouring and wellness treatments'),
  ('Consultation', 'Medical consultations and skin analysis');