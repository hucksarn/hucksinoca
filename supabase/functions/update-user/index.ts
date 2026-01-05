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

    // Verify the caller is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !caller) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if caller is admin
    const { data: callerRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .single();

    if (callerRole?.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Only admins can update users" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const body = await req.json();
    const { userId, email, password, fullName, designation, role } = body;

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "User ID is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if target is System Admin (only System Admin can edit themselves)
    const { data: targetProfile } = await supabase
      .from("profiles")
      .select("designation, user_id")
      .eq("user_id", userId)
      .single();

    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("designation")
      .eq("user_id", caller.id)
      .single();

    if (targetProfile?.designation === "System Admin" && callerProfile?.designation !== "System Admin") {
      return new Response(
        JSON.stringify({ error: "Only System Admin can edit System Admin" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Build update object for auth user
    const authUpdate: Record<string, any> = {};
    if (email) authUpdate.email = email;
    if (password) {
      if (password.length < 6) {
        return new Response(
          JSON.stringify({ error: "Password must be at least 6 characters" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      authUpdate.password = password;
    }

    // Update auth user if there are auth changes
    if (Object.keys(authUpdate).length > 0) {
      const { error: updateAuthError } = await supabase.auth.admin.updateUserById(userId, authUpdate);
      if (updateAuthError) {
        throw updateAuthError;
      }
    }

    // Update profile if there are profile changes
    if (fullName || designation) {
      const profileUpdate: Record<string, any> = {};
      if (fullName) profileUpdate.full_name = fullName;
      if (designation) profileUpdate.designation = designation;

      // If password was changed, set must_change_password
      if (password) {
        profileUpdate.must_change_password = true;
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update(profileUpdate)
        .eq("user_id", userId);

      if (profileError) {
        throw profileError;
      }
    }

    // Update role if provided and different
    if (role) {
      const { data: currentRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .single();

      if (currentRole?.role !== role) {
        const { error: roleError } = await supabase
          .from("user_roles")
          .update({ role })
          .eq("user_id", userId);

        if (roleError) {
          throw roleError;
        }
      }
    }

    console.log(`User ${userId} updated by admin ${caller.id}`);

    return new Response(
      JSON.stringify({ message: "User updated successfully" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error updating user:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
