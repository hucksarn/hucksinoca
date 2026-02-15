import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BUCKET = "stock-data";
const FILE = "stock.json";

async function getStorageClient(req: Request) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authHeader = req.headers.get("Authorization");

  // Service client for storage operations
  const serviceClient = createClient(supabaseUrl, serviceKey);

  // User client for auth verification
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader || "" } },
  });

  const { data: { user }, error } = await userClient.auth.getUser();
  if (error || !user) throw new Error("Unauthorized");

  // Check admin role
  const { data: roles } = await serviceClient
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin");

  return { serviceClient, user, isAdmin: (roles && roles.length > 0) };
}

async function readStock(serviceClient: any): Promise<any[]> {
  const { data, error } = await serviceClient.storage
    .from(BUCKET)
    .download(FILE);

  if (error) {
    // File doesn't exist yet, return empty
    console.log("No stock file found, returning empty array");
    return [];
  }

  const text = await data.text();
  try {
    return JSON.parse(text);
  } catch {
    return [];
  }
}

async function writeStock(serviceClient: any, items: any[]) {
  const blob = new Blob([JSON.stringify(items, null, 2)], { type: "application/json" });

  // Try update first, then create
  const { error: updateError } = await serviceClient.storage
    .from(BUCKET)
    .update(FILE, blob, { contentType: "application/json", upsert: true });

  if (updateError) {
    const { error: uploadError } = await serviceClient.storage
      .from(BUCKET)
      .upload(FILE, blob, { contentType: "application/json" });

    if (uploadError) throw uploadError;
  }
}

function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { serviceClient, isAdmin } = await getStorageClient(req);
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "list";

    if (req.method === "GET" || action === "list") {
      const stock = await readStock(serviceClient);
      return new Response(JSON.stringify({ items: stock }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST") {
      const body = await req.json();
      const { items, action: bodyAction } = body;

      if (!Array.isArray(items)) {
        return new Response(JSON.stringify({ error: "items must be an array" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const stock = await readStock(serviceClient);
      const today = new Date().toISOString().slice(0, 10);

      if (bodyAction === "deduct") {
        const deductions = items.map((item: any) => ({
          id: createId("stock"),
          date: item.date || today,
          item: String(item.item || "").trim(),
          description: String(item.description || "").trim(),
          qty: -Math.abs(Number(item.qty || 0)),
          unit: String(item.unit || "").trim(),
        }));
        const next = [...deductions, ...stock];
        await writeStock(serviceClient, next);
        return new Response(JSON.stringify({ items: next }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Default: add items
      const normalized = items.map((item: any) => ({
        id: createId("stock"),
        date: item.date || today,
        item: item.item || "",
        description: item.description || "",
        qty: Number(item.qty) || 0,
        unit: item.unit || "",
      }));

      const next = [...normalized, ...stock];
      await writeStock(serviceClient, next);
      return new Response(JSON.stringify({ items: next }), {
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
