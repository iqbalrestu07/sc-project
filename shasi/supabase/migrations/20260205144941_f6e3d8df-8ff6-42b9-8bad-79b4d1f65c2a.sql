-- Staff members table (doctors, therapists)
CREATE TABLE public.staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('doctor', 'therapist')),
  phone TEXT,
  email TEXT,
  specialization TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Appointments table
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  doctor_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  therapist_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')),
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Transactions table (POS)
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_code TEXT NOT NULL UNIQUE,
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  discount_type TEXT CHECK (discount_type IN ('fixed', 'percentage')),
  tax_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT CHECK (payment_method IN ('cash', 'card', 'transfer', 'qris', 'other')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'partial', 'refunded')),
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Transaction items (services or products sold)
CREATE TABLE public.transaction_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('service', 'product')),
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  doctor_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  therapist_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL,
  discount_amount NUMERIC DEFAULT 0,
  total_price NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Commission records
CREATE TABLE public.commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  transaction_item_id UUID NOT NULL REFERENCES public.transaction_items(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  staff_role TEXT NOT NULL CHECK (staff_role IN ('doctor', 'therapist')),
  commission_type TEXT NOT NULL CHECK (commission_type IN ('fixed', 'percentage')),
  commission_value NUMERIC NOT NULL,
  base_amount NUMERIC NOT NULL,
  commission_amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;

-- Staff RLS policies
CREATE POLICY "Admins can manage staff" ON public.staff FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone authenticated can view staff" ON public.staff FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Appointments RLS policies
CREATE POLICY "Admins can manage appointments" ON public.appointments FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Doctors can view and update appointments" ON public.appointments FOR SELECT
  USING (has_role(auth.uid(), 'doctor'));

CREATE POLICY "Doctors can update their appointments" ON public.appointments FOR UPDATE
  USING (has_role(auth.uid(), 'doctor'));

CREATE POLICY "Therapists can view appointments" ON public.appointments FOR SELECT
  USING (has_role(auth.uid(), 'therapist'));

CREATE POLICY "Cashiers can view and create appointments" ON public.appointments FOR SELECT
  USING (has_role(auth.uid(), 'cashier'));

CREATE POLICY "Cashiers can insert appointments" ON public.appointments FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'cashier'));

-- Transactions RLS policies
CREATE POLICY "Admins can manage transactions" ON public.transactions FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Cashiers can view transactions" ON public.transactions FOR SELECT
  USING (has_role(auth.uid(), 'cashier'));

CREATE POLICY "Cashiers can create transactions" ON public.transactions FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'cashier'));

CREATE POLICY "Cashiers can update transactions" ON public.transactions FOR UPDATE
  USING (has_role(auth.uid(), 'cashier'));

-- Transaction items RLS policies
CREATE POLICY "Admins can manage transaction items" ON public.transaction_items FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Cashiers can view transaction items" ON public.transaction_items FOR SELECT
  USING (has_role(auth.uid(), 'cashier'));

CREATE POLICY "Cashiers can create transaction items" ON public.transaction_items FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'cashier'));

-- Commissions RLS policies
CREATE POLICY "Admins can manage commissions" ON public.commissions FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff can view own commissions" ON public.commissions FOR SELECT
  USING (auth.uid() IN (SELECT user_id FROM public.staff WHERE id = staff_id));

-- Create function to generate transaction code
CREATE OR REPLACE FUNCTION public.generate_transaction_code()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
  date_prefix TEXT;
BEGIN
  date_prefix := to_char(CURRENT_DATE, 'YYMMDD');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(transaction_code FROM 8) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.transactions
  WHERE transaction_code LIKE 'TX' || date_prefix || '%';
  
  NEW.transaction_code := 'TX' || date_prefix || LPAD(next_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for transaction code generation
CREATE TRIGGER generate_transaction_code_trigger
  BEFORE INSERT ON public.transactions
  FOR EACH ROW
  WHEN (NEW.transaction_code IS NULL OR NEW.transaction_code = '')
  EXECUTE FUNCTION public.generate_transaction_code();

-- Create function to auto-deduct stock when transaction is paid
CREATE OR REPLACE FUNCTION public.process_transaction_stock_deduction()
RETURNS TRIGGER AS $$
DECLARE
  item RECORD;
  consumable RECORD;
BEGIN
  -- Only process when payment_status changes to 'paid'
  IF NEW.payment_status = 'paid' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'paid') THEN
    -- Process each transaction item
    FOR item IN 
      SELECT ti.*, s.id as service_id_check 
      FROM public.transaction_items ti
      LEFT JOIN public.services s ON ti.service_id = s.id
      WHERE ti.transaction_id = NEW.id
    LOOP
      -- If it's a product, deduct stock directly
      IF item.item_type = 'product' AND item.product_id IS NOT NULL THEN
        UPDATE public.products
        SET current_stock = GREATEST(0, current_stock - item.quantity)
        WHERE id = item.product_id;
        
        INSERT INTO public.stock_movements (product_id, movement_type, quantity, reference_type, reference_id, reason, created_by)
        VALUES (item.product_id, 'out', item.quantity, 'transaction', NEW.id, 'POS Sale', NEW.created_by);
      END IF;
      
      -- If it's a service, deduct consumables
      IF item.item_type = 'service' AND item.service_id IS NOT NULL THEN
        FOR consumable IN
          SELECT sc.product_id, sc.quantity_used * item.quantity as total_qty
          FROM public.service_consumables sc
          WHERE sc.service_id = item.service_id
        LOOP
          UPDATE public.products
          SET current_stock = GREATEST(0, current_stock - consumable.total_qty)
          WHERE id = consumable.product_id;
          
          INSERT INTO public.stock_movements (product_id, movement_type, quantity, reference_type, reference_id, reason, created_by)
          VALUES (consumable.product_id, 'out', consumable.total_qty, 'service_usage', NEW.id, 'Service Consumable', NEW.created_by);
        END LOOP;
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for stock deduction
CREATE TRIGGER process_stock_deduction_trigger
  AFTER UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.process_transaction_stock_deduction();

-- Create function to auto-generate commissions
CREATE OR REPLACE FUNCTION public.generate_commissions()
RETURNS TRIGGER AS $$
DECLARE
  item RECORD;
  service RECORD;
BEGIN
  -- Only process when payment_status changes to 'paid'
  IF NEW.payment_status = 'paid' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'paid') THEN
    FOR item IN
      SELECT ti.* FROM public.transaction_items ti
      WHERE ti.transaction_id = NEW.id AND ti.item_type = 'service'
    LOOP
      -- Get service commission settings
      SELECT * INTO service FROM public.services WHERE id = item.service_id;
      
      IF service IS NOT NULL THEN
        -- Doctor commission
        IF item.doctor_id IS NOT NULL AND service.doctor_commission_value > 0 THEN
          INSERT INTO public.commissions (
            transaction_id, transaction_item_id, staff_id, staff_role,
            commission_type, commission_value, base_amount, commission_amount
          )
          VALUES (
            NEW.id, item.id, item.doctor_id, 'doctor',
            COALESCE(service.doctor_commission_type, 'percentage'),
            service.doctor_commission_value,
            item.total_price,
            CASE 
              WHEN service.doctor_commission_type = 'fixed' THEN service.doctor_commission_value
              ELSE (item.total_price * service.doctor_commission_value / 100)
            END
          );
        END IF;
        
        -- Therapist commission
        IF item.therapist_id IS NOT NULL AND service.therapist_commission_value > 0 THEN
          INSERT INTO public.commissions (
            transaction_id, transaction_item_id, staff_id, staff_role,
            commission_type, commission_value, base_amount, commission_amount
          )
          VALUES (
            NEW.id, item.id, item.therapist_id, 'therapist',
            COALESCE(service.therapist_commission_type, 'percentage'),
            service.therapist_commission_value,
            item.total_price,
            CASE 
              WHEN service.therapist_commission_type = 'fixed' THEN service.therapist_commission_value
              ELSE (item.total_price * service.therapist_commission_value / 100)
            END
          );
        END IF;
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for commission generation
CREATE TRIGGER generate_commissions_trigger
  AFTER UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_commissions();

-- Add updated_at triggers
CREATE TRIGGER update_staff_updated_at BEFORE UPDATE ON public.staff
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();