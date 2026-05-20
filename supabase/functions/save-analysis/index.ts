/// <reference lib="deno.window" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { normalizeOverallHealth } from "../_shared/health-status.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { analysis, week_number, project_name } = await req.json();
    if (!analysis) {
      return new Response(JSON.stringify({ error: "Analysis data required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("DB_URL")!,
      Deno.env.get("SERVICE_ROLE_KEY")!
    );

    const normalized = normalizeOverallHealth(analysis);

    const { data, error } = await supabase.from("wpr_analyses").insert({
      project_name: project_name || normalized.project_name || "Unknown Project",
      wpr1_date: normalized.wpr1_date || "",
      wpr2_date: normalized.wpr2_date || "",
      overall_score: normalized.overall_score || 0,
      overall_status: normalized.overall_status,
      summary: normalized.summary || "",
      analysis_data: normalized,
      week_number: week_number || null,
    }).select("id").single();

    if (error) throw error;

    return new Response(JSON.stringify({ id: data.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
