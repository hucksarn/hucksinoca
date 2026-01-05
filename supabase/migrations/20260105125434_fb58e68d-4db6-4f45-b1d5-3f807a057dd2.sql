-- Update the status check constraint to include 'approved' and 'rejected'
ALTER TABLE public.material_requests DROP CONSTRAINT material_requests_status_check;
ALTER TABLE public.material_requests ADD CONSTRAINT material_requests_status_check 
  CHECK (status = ANY (ARRAY['draft', 'submitted', 'approved', 'rejected', 'closed']));