-- Add must_change_password flag to profiles
ALTER TABLE public.profiles ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT false;

-- Create the default admin user function (will be called manually)
-- First, let's insert a default admin directly via auth.users
-- Note: We'll need to create this via edge function or manually

-- Update the handle_new_user function to not auto-create users (admins will create them)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (user_id, full_name, designation, must_change_password)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'New User'),
        COALESCE(NEW.raw_user_meta_data ->> 'designation', 'Site Supervisor'),
        COALESCE((NEW.raw_user_meta_data ->> 'must_change_password')::boolean, false)
    );
    
    -- Check if this should be an admin
    IF (NEW.raw_user_meta_data ->> 'role') = 'admin' THEN
        INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.id, 'admin');
    ELSE
        INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.id, 'user');
    END IF;
    
    RETURN NEW;
END;
$$;