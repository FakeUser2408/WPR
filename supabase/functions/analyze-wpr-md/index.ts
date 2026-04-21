/// <reference lib="deno.window" />
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function cleanMarkdown(raw: string): string {
  // Strip the "3Ds Vs Actual Site Photos" section and everything after it
  const sectionIdx = raw.search(/#+\s*3Ds?\s+Vs\.?\s+Actual\s+Site\s+Photos/i);
  if (sectionIdx !== -1) {
    raw = raw.substring(0, sectionIdx);
  }

  return raw
    .replace(/!\[.*?\]\([^\)]*\)/g, "")               // Remove all markdown images
    .replace(/https?:\/\/\S+/g, "")                   // Remove all URLs
    .replace(/^\|[-:\s|]+\|$/gm, "")                  // Remove table separator rows (| --- | --- |)
    .replace(/\|(\s*)\|/g, "|")                       // Collapse empty table cells
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/[ \t]{3,}/g, "  ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .substring(0, 20000);                             // Tighter limit — tables are dense, 20k is plenty
}

async function fetchWprText(supabase: ReturnType<typeof createClient>, safeName: string, weekNum: number): Promise<string | null> {
  const { data } = await supabase.storage.from("wpr-uploads").download(`${safeName}/week_${weekNum}/extracted.md`);
  if (data) return cleanMarkdown(await data.text());
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
        return new Response(JSON.stringify({ error: `Missing WPR markdown for week_${body.week1} or week_${body.week2}` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      wpr1_text = t1;
      wpr2_text = t2;
    } else if (body.wpr1_text && body.wpr2_text) {
      wpr1_text = cleanMarkdown(body.wpr1_text);
      wpr2_text = cleanMarkdown(body.wpr2_text);
    } else {
      return new Response(JSON.stringify({ error: "Both WPR texts are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const CLAUDE_API_KEY = Deno.env.get("CLAUDE_API_KEY");
    if (!CLAUDE_API_KEY) throw new Error("CLAUDE_API_KEY not configured");

    const systemPrompt = `You are a WPR (Weekly Progress Report) analyzer for construction/interior projects. You receive markdown-formatted text from two consecutive weekly reports exported from ClickUp. The markdown contains structured tables — read them carefully.

Return ONLY the JSON object below — no explanation, no markdown, no extra text.

{
  "project_name": "string",
  "wpr1_date": "string",
  "wpr2_date": "string",
  "overall_score": number,
  "overall_status": "healthy"|"at_risk"|"critical",
  "summary": "2-3 sentence executive summary",
  "sections": [{"name":"string","status":"healthy"|"at_risk"|"critical"|"unchanged","score":number,"summary":"string","findings":["string"],"recommendations":["string"]}],
  "warnings": [{"severity":"critical"|"high"|"medium"|"low","category":"string","message":"string","impact":"string","action_required":"string"}],
  "risk_register": [{"point":"string","details":"string","action_by":"string","status_wpr1":"string","status_wpr2":"string","status_change":"resolved"|"unchanged"|"escalated"|"new","weeks_open":number}],
  "progress_comparison": [{"area":"string","pct_wpr1":number,"pct_wpr2":number,"delta":number,"direction":"up"|"down"|"unchanged","concern":boolean,"reason":"string"}],
  "selection_changes": [{"category":"string","item":"string","status_wpr1":"string","status_wpr2":"string","changed":boolean,"regression":boolean,"remarks_wpr1":"string","remarks_wpr2":"string"}],
  "design_revisions": {"wpr1_revisions":[{"revision":"string","date":"string","remarks":"string"}],"wpr2_revisions":[{"revision":"string","date":"string","remarks":"string"}],"new_revisions":boolean,"comparison_notes":"string"},
  "project_details": {"client_name":"string","report_dates_different":boolean,"wpr1_report_date":"string","wpr2_report_date":"string","created_by":"string","execution_team":"string","design_team":"string","sales_team":"string","escalation_point":"string","project_end_date_wpr1":"string","project_end_date_wpr2":"string","end_dates_match":boolean,"end_date_discrepancy_reason":"string|null"},
  "timeline_comparison": [{"item":"string","start_date":"string","end_date_wpr1":"string","end_date_wpr2":"string","date_changed":boolean,"critical_remarks":"string"}],
  "image_areas": ["area names from 3Ds Vs Actual Site Photos section only"]
}

Rules:
- Flag if report dates are the same between WPRs
- Flag if project end date in details differs from timeline end date
- Risk items appearing in both WPRs = "unchanged"; expanded text = "escalated"
- Progress percentage decrease = concern:true with reason
- Selection regression = item was Done, now not Done
- image_areas: list area names mentioned under the 3Ds Vs Actual Site Photos section heading only`;

    const userPrompt = `---WPR 1 (Previous Week)---\n${wpr1_text}\n\n---WPR 2 (Current Week)---\n${wpr2_text}`;

    let response: Response | null = null;
    for (let attempt = 0; attempt <= 2; attempt++) {
      response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": CLAUDE_API_KEY,
          "anthropic-version": "2023-06-01",
          "anthropic-beta": "output-128k-2025-02-19",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 32000,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        }),
      });

      if (response.ok) break;

      if (response.status === 529) {
        await response.text();
        const delay = Math.min(1000 * Math.pow(2, attempt), 8000);
        console.log(`Claude overloaded, retrying in ${delay}ms (attempt ${attempt + 1})`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }

      const errText = await response.text();
      console.error(`Claude API error ${response.status}:`, errText);
      return new Response(JSON.stringify({ error: `AI API error: ${response.status}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const responseData = await response!.json();
    const text: string = responseData.content?.[0]?.text;

    if (!text) {
      console.error("No text in Claude response:", JSON.stringify(responseData).substring(0, 500));
      return new Response(JSON.stringify({ error: "No response from AI" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let analysis;
    try {
      const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      analysis = JSON.parse(cleaned);
    } catch {
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
