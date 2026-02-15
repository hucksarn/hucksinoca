
-- Create stock_items table
CREATE TABLE public.stock_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date TEXT DEFAULT '',
  item TEXT DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  qty NUMERIC NOT NULL DEFAULT 0,
  unit TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.stock_items ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view stock
CREATE POLICY "Authenticated users can view stock"
  ON public.stock_items FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only admins can insert stock
CREATE POLICY "Admins can insert stock"
  ON public.stock_items FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Only admins can update stock
CREATE POLICY "Admins can update stock"
  ON public.stock_items FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Only admins can delete stock
CREATE POLICY "Admins can delete stock"
  ON public.stock_items FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );
