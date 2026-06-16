/// <reference lib="deno.window" />
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { runFullWprAnalysis, trimWprInput } from "../_shared/openrouter-ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function cleanText(raw: string): string {
  return trimWprInput(
    raw
      .replace(/!\[.*?\]\(https?:\/\/[^\)]+\)/g, "")
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/https?:\/\/\S{20,}/g, "")
      .replace(/[ \t]{3,}/g, "  ")
      .replace(/\n{4,}/g, "\n\n\n")
      .trim(),
  );
}

async function fetchWprText(supabase: ReturnType<typeof createClient>, safeName: string, weekNum: number): Promise<string | null> {
  const { data: txtData } = await supabase.storage.from("wpr-uploads").download(`${safeName}/week_${weekNum}/extracted.txt`);
  if (txtData) return cleanText(await txtData.text());
  return null;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    let wpr1_text: string;
    let wpr2_text: string;

    if (body.project_name && body.week1 !== undefined && body.week2 !== undefined) {
      const supabase = createClient(Deno.env.get("DB_URL")!, Deno.env.get("SERVICE_ROLE_KEY")!);
      const safeName = (body.project_name as string).replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
      const [t1, t2] = await Promise.all([
        fetchWprText(supabase, safeName, body.week1),
        fetchWprText(supabase, safeName, body.week2),
      ]);
      if (!t1 || !t2) {
        return new Response(JSON.stringify({ error: `Missing WPR text for week_${body.week1} or week_${body.week2}` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      wpr1_text = t1;
      wpr2_text = t2;
    } else if (body.wpr1_text && body.wpr2_text) {
      wpr1_text = cleanText(body.wpr1_text);
      wpr2_text = cleanText(body.wpr2_text);
    } else {
      return new Response(JSON.stringify({ error: "Both WPR texts are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let analysis: Record<string, unknown>;
    const model = typeof body.model === "string" ? body.model : undefined;
    try {
      analysis = await runFullWprAnalysis("extracted PDF text", wpr1_text, wpr2_text, { model });
    } catch (e) {
      const message = e instanceof Error ? e.message : "AI API error";
      return new Response(JSON.stringify({ error: message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
