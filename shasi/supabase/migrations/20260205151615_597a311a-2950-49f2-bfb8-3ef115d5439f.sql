-- Create trigger for commission generation
CREATE TRIGGER trigger_generate_commissions
AFTER UPDATE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.generate_commissions();

-- Create trigger for stock deduction
CREATE TRIGGER trigger_process_stock_deduction
AFTER UPDATE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.process_transaction_stock_deduction();

-- Update Lisa Maria's role to therapist
UPDATE public.staff
SET role = 'therapist'
WHERE id = 'ea8110a5-d00f-4457-b80c-6f2efc9d5b2d';