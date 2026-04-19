/// <reference lib="deno.window" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function cleanText(raw: string): string {
  return raw
    .replace(/!\[.*?\]\(https?:\/\/[^\)]+\)/g, "")  // remove all markdown images
    .replace(/<br\s*\/?>/gi, " ")                     // replace <br> tags with space
    .replace(/[ \t]{3,}/g, "  ")                      // collapse excessive whitespace
    .replace(/\n{4,}/g, "\n\n\n")                     // collapse excessive blank lines
    .trim()
    .substring(0, 60000);                             // hard cap to prevent OOM
}

async function fetchWprText(supabase: ReturnType<typeof createClient>, safeName: string, weekNum: number): Promise<string | null> {
  const { data: mdData } = await supabase.storage.from("wpr-uploads").download(`${safeName}/week_${weekNum}/extracted.md`);
  if (mdData) return cleanText(await mdData.text());
  const { data: txtData } = await supabase.storage.from("wpr-uploads").download(`${safeName}/week_${weekNum}/extracted.txt`);
  if (txtData) return cleanText(await txtData.text());
  return null;
}

const SCHEMA = `{
  "project_name": "string",
  "wpr1_date": "string",
  "wpr2_date": "string",
  "overall_score": "number 0-100",
  "overall_status": "healthy | at_risk | critical",
  "summary": "2-3 sentence executive summary comparing both WPRs",
  "project_details": {
    "client_name": "string",
    "report_dates_different": "boolean",
    "wpr1_report_date": "string",
    "wpr2_report_date": "string",
    "created_by": "string",
    "execution_team": "string",
    "design_team": "string",
    "sales_team": "string",
    "escalation_point": "string",
    "project_end_date_wpr1": "string",
    "project_end_date_wpr2": "string",
    "end_dates_match": "boolean",
    "end_date_discrepancy_reason": "string or null"
  },
  "sections": [
    { "name": "string", "status": "healthy | at_risk | critical | unchanged", "score": "number 0-100", "summary": "string", "findings": ["string"], "recommendations": ["string"] }
  ],
  "warnings": [
    { "severity": "critical | high | medium | low", "category": "string", "message": "string", "impact": "string", "action_required": "string" }
  ],
  "risk_register": [
    { "point": "string", "details": "string", "action_by": "string", "status_wpr1": "string", "status_wpr2": "string", "status_change": "resolved | unchanged | escalated | new", "weeks_open": "number" }
  ],
  "progress_comparison": [
    { "area": "string", "pct_wpr1": "number", "pct_wpr2": "number", "delta": "number", "direction": "up | down | unchanged", "concern": "boolean", "reason": "string" }
  ],
  "selection_changes": [
    { "category": "string", "item": "string", "status_wpr1": "string", "status_wpr2": "string", "changed": "boolean", "regression": "boolean", "remarks_wpr1": "string", "remarks_wpr2": "string" }
  ],
  "design_revisions": {
    "wpr1_revisions": [{ "revision": "string", "date": "string", "remarks": "string" }],
    "wpr2_revisions": [{ "revision": "string", "date": "string", "remarks": "string" }],
    "new_revisions": "boolean",
    "comparison_notes": "string"
  },
  "timeline_comparison": [
    { "item": "string", "start_date": "string", "end_date_wpr1": "string", "end_date_wpr2": "string", "date_changed": "boolean", "critical_remarks": "string" }
  ],
  "image_areas": ["area names from the '3Ds Vs Actual Site Photos' section only"]
}`;

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
        return new Response(JSON.stringify({ error: `Missing WPR files for week_${body.week1} or week_${body.week2}` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      wpr1_text = t1;
      wpr2_text = t2;
    } else if (body.wpr1_text && body.wpr2_text) {
      wpr1_text = cleanText(body.wpr1_text);
      wpr2_text = cleanText(body.wpr2_text);
    } else {
      return new Response(JSON.stringify({ error: "Provide {project_name, week1, week2} or {wpr1_text, wpr2_text}" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (wpr1_text.length < 50 || wpr2_text.length < 50) {
      return new Response(JSON.stringify({ error: "WPR text too short" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

    const prompt = `You are a WPR (Weekly Progress Report) analyst for construction/interior projects. Compare two WPRs and return ONLY valid JSON matching this exact structure (no markdown, no extra text):

${SCHEMA}

Rules:
- report_dates_different=true if both WPRs have the same report date
- concern=true for any progress area where % went down; explain in "reason"
- regression=true for any selection item that was Done in WPR1 but not Done in WPR2
- weeks_open = consecutive weeks a risk has appeared
- image_areas: ONLY area names from the "3Ds Vs Actual Site Photos" section
- overall_score reflects true project health (delays, regressions, open risks lower it)

---WPR 1 (Previous Week)---
${wpr1_text}

---WPR 2 (Current Week)---
${wpr2_text}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.1,
            maxOutputTokens: 16000,
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini error:", response.status, errText);
      return new Response(JSON.stringify({ error: `Gemini API error: ${response.status}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const text: string | undefined = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      console.error("No text in Gemini response:", JSON.stringify(data).substring(0, 500));
      return new Response(JSON.stringify({ error: "No response from Gemini" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let analysis;
    try {
      analysis = JSON.parse(text);
    } catch {
      // Fallback: extract JSON between first { and last }
      const s = text.indexOf("{"), e = text.lastIndexOf("}");
      if (s === -1 || e === -1) throw new Error("No JSON in response");
      analysis = JSON.parse(text.substring(s, e + 1));
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
