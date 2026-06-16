/// <reference lib="deno.window" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Lightweight health check — keeps the Supabase project active when pinged daily.
 * Always returns HTTP 200 so GitHub Actions does not fail; optional DB ping if secrets exist.
 */
serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const started = Date.now();
  let dbOk = false;
  let analysesCount: number | null = null;
  let dbError: string | null = null;

  const dbUrl = Deno.env.get("DB_URL") ?? Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (dbUrl && serviceKey) {
    try {
      const supabase = createClient(dbUrl, serviceKey);
      const { count, error } = await supabase
        .from("wpr_analyses")
        .select("id", { count: "exact", head: true });

      if (error) {
        dbError = error.message;
      } else {
        dbOk = true;
        analysesCount = count;
      }
    } catch (e) {
      dbError = e instanceof Error ? e.message : String(e);
    }
  } else {
    dbError = "DB_URL or SERVICE_ROLE_KEY not set on edge function (ping still counts as activity)";
  }

  return new Response(
    JSON.stringify({
      ok: true,
      service: "wpr-audit",
      purpose: "keep-alive",
      db_ok: dbOk,
      analyses_count: analysesCount,
      db_error: dbError,
      latency_ms: Date.now() - started,
      timestamp: new Date().toISOString(),
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
