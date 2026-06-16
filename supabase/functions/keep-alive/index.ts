/// <reference lib="deno.window" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Lightweight health check — keeps the Supabase project active when pinged daily.
 * Pair with .github/workflows/supabase-keep-alive.yml (GitHub Actions cron).
 */
serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const started = Date.now();

  try {
    const dbUrl = Deno.env.get("DB_URL");
    const serviceKey = Deno.env.get("SERVICE_ROLE_KEY");
    if (!dbUrl || !serviceKey) {
      return new Response(JSON.stringify({ ok: false, error: "DB_URL or SERVICE_ROLE_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(dbUrl, serviceKey);

    const { count, error } = await supabase
      .from("wpr_analyses")
      .select("id", { count: "exact", head: true });

    if (error) throw error;

    return new Response(
      JSON.stringify({
        ok: true,
        service: "wpr-audit",
        purpose: "keep-alive",
        analyses_count: count ?? 0,
        latency_ms: Date.now() - started,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("keep-alive error:", e);
    return new Response(
      JSON.stringify({
        ok: false,
        error: e instanceof Error ? e.message : "Unknown error",
        latency_ms: Date.now() - started,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
