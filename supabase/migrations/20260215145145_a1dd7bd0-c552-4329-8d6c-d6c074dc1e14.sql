
-- Create a storage bucket for stock JSON data
INSERT INTO storage.buckets (id, name, public)
VALUES ('stock-data', 'stock-data', false);

-- Only admins can read/write the stock data bucket
CREATE POLICY "Admins can read stock data"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'stock-data' AND EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Admins can insert stock data"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'stock-data' AND EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Admins can update stock data"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'stock-data' AND EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Authenticated users can read stock data"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'stock-data' AND auth.uid() IS NOT NULL);
