-- Allow admins to also create requests (for testing or on behalf of users)
CREATE POLICY "Admins can create requests" 
ON public.material_requests 
FOR INSERT 
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));