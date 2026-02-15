import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function getClients(req: Request) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authHeader = req.headers.get("Authorization");

  const serviceClient = createClient(supabaseUrl, serviceKey);

  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader || "" } },
  });

  const { data: { user }, error } = await userClient.auth.getUser();
  if (error || !user) throw new Error("Unauthorized");

  const { data: roles } = await serviceClient
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin");

  return { serviceClient, user, isAdmin: (roles && roles.length > 0) };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { serviceClient, user, isAdmin } = await getClients(req);

    // GET — list all stock items
    if (req.method === "GET") {
      const { data, error } = await serviceClient
        .from("stock_items")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      return new Response(JSON.stringify({ items: data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST — add or deduct stock (admin only)
    if (req.method === "POST") {
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Admin access required" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const body = await req.json();
      const { items, action } = body;

      if (!Array.isArray(items)) {
        return new Response(JSON.stringify({ error: "items must be an array" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const today = new Date().toISOString().slice(0, 10);

      const rows = items.map((item: any) => ({
        date: item.date || today,
        item: String(item.item || "").trim(),
        description: String(item.description || "").trim(),
        qty: action === "deduct" ? -Math.abs(Number(item.qty || 0)) : Number(item.qty || 0),
        unit: String(item.unit || "").trim(),
        category: item.category ? String(item.category).trim() : null,
        created_by: user.id,
      }));

      const { error: insertError } = await serviceClient
        .from("stock_items")
        .insert(rows);

      if (insertError) throw insertError;

      // Return full list
      const { data, error: fetchError } = await serviceClient
        .from("stock_items")
        .select("*")
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      return new Response(JSON.stringify({ items: data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[stock-api] Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: error.message === "Unauthorized" ? 401 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
