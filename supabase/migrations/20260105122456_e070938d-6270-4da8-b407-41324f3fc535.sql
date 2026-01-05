-- 1. Add RLS policy for users to delete their own draft/submitted requests
CREATE POLICY "Users can delete their own draft or submitted requests" 
ON public.material_requests 
FOR DELETE 
USING (requester_id = auth.uid() AND status IN ('draft', 'submitted'));

-- 2. Create material_categories table for admin-managed categories
CREATE TABLE public.material_categories (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.material_categories ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view categories
CREATE POLICY "All authenticated users can view categories" 
ON public.material_categories 
FOR SELECT 
USING (true);

-- Only admins can manage categories
CREATE POLICY "Admins can manage categories" 
ON public.material_categories 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default categories
INSERT INTO public.material_categories (name, slug) VALUES 
('Cement', 'cement'),
('Steel', 'steel'),
('Block', 'block'),
('Electrical', 'electrical'),
('Plumbing', 'plumbing'),
('Finishing', 'finishing'),
('Other', 'other');