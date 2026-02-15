
-- Add request_id column to stock_items to link deductions to material requests
ALTER TABLE public.stock_items ADD COLUMN request_id uuid REFERENCES public.material_requests(id);
