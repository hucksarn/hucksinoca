-- Create a sequence for request numbers
CREATE SEQUENCE IF NOT EXISTS request_number_seq START WITH 3;

-- Update the function to use the sequence
CREATE OR REPLACE FUNCTION public.generate_request_number()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    NEW.request_number := 'REQ-' || LPAD(nextval('request_number_seq')::TEXT, 6, '0');
    RETURN NEW;
END;
$function$;