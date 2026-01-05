import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Check if admin already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const adminExists = existingUsers?.users?.some(
      (u) => u.email === "admin@buildflow.com"
    );

    if (adminExists) {
      return new Response(
        JSON.stringify({ message: "Admin user already exists", created: false }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create default admin user
    const { data: user, error: createError } = await supabase.auth.admin.createUser({
      email: "admin@buildflow.com",
      password: "admin",
      email_confirm: true,
      user_metadata: {
        full_name: "System Admin",
        designation: "Procurement Manager",
        role: "admin",
        must_change_password: true,
      },
    });

    if (createError) {
      throw createError;
    }

    // Update the profile to set must_change_password
    if (user?.user) {
      await supabase
        .from("profiles")
        .update({ must_change_password: true })
        .eq("user_id", user.user.id);
    }

    return new Response(
      JSON.stringify({ 
        message: "Default admin created successfully", 
        created: true,
        email: "admin@buildflow.com",
        password: "admin (must change on first login)"
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error creating admin:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
