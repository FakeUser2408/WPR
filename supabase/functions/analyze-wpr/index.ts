/// <reference lib="deno.window" />
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function cleanText(raw: string): string {
  return raw
    .replace(/!\[.*?\]\(https?:\/\/[^\)]+\)/g, "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/https?:\/\/\S{20,}/g, "")
    .replace(/[ \t]{3,}/g, "  ")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim()
    .substring(0, 40000);
}

async function fetchWprText(supabase: ReturnType<typeof createClient>, safeName: string, weekNum: number): Promise<string | null> {
  const { data: mdData } = await supabase.storage.from("wpr-uploads").download(`${safeName}/week_${weekNum}/extracted.md`);
  if (mdData) return cleanText(await mdData.text());
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
      return new Response(JSON.stringify({ error: "Both WPR texts are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

    const systemPrompt = `You are a WPR (Weekly Progress Report) analysis expert for construction/interior projects.

You will receive the extracted text content of two consecutive WPRs (Weekly Progress Reports). The text is extracted from PDFs and contains structured data — read it carefully:
- Progress percentages per area (e.g. "Area: 75%", completion tables)
- Selection schedule status (items with Done/Pending/In Progress status)
- Critical open points / risk register (risks with details and action owners)
- Project timeline with start/end dates per activity
- Project details (client name, report date, team members)
- 3Ds Vs Actual Site Photos section listing area names

Analyze both WPRs by reading all tables and return a JSON object with this EXACT structure:

{
  "project_name": "string - project name from the report",
  "wpr1_date": "string - date range of WPR 1",
  "wpr2_date": "string - date range of WPR 2",
  "overall_score": number 0-100,
  "overall_status": "healthy" | "at_risk" | "critical",
  "summary": "string - 2-3 sentence executive summary",
  "sections": [
    {
      "name": "string - section name",
      "status": "healthy" | "at_risk" | "critical" | "unchanged",
      "score": number 0-100,
      "summary": "string - what happened in this section",
      "findings": ["string array of key findings"],
      "recommendations": ["string array of recommendations"]
    }
  ],
  "warnings": [
    {
      "severity": "critical" | "high" | "medium" | "low",
      "category": "string",
      "message": "string - clear description",
      "impact": "string - what could go wrong",
      "action_required": "string - what needs to happen"
    }
  ],
  "risk_register": [
    {
      "point": "string - risk title",
      "details": "string - full details comparing both WPRs",
      "action_by": "string",
      "status_wpr1": "string - status/text in WPR1",
      "status_wpr2": "string - status/text in WPR2",
      "status_change": "resolved" | "unchanged" | "escalated" | "new",
      "weeks_open": number
    }
  ],
  "progress_comparison": [
    {
      "area": "string",
      "pct_wpr1": number,
      "pct_wpr2": number,
      "delta": number,
      "direction": "up" | "down" | "unchanged",
      "concern": boolean,
      "reason": "string - explain if percentage went down or stayed at 0"
    }
  ],
  "selection_changes": [
    {
      "category": "string - e.g. Modular Furniture, Flooring",
      "item": "string",
      "status_wpr1": "string",
      "status_wpr2": "string",
      "changed": boolean,
      "regression": boolean,
      "remarks_wpr1": "string",
      "remarks_wpr2": "string"
    }
  ],
  "design_revisions": {
    "wpr1_revisions": [{"revision": "R1", "date": "string", "remarks": "string"}],
    "wpr2_revisions": [{"revision": "R1", "date": "string", "remarks": "string"}],
    "new_revisions": boolean,
    "comparison_notes": "string"
  },
  "project_details": {
    "client_name": "string",
    "report_dates_different": boolean,
    "wpr1_report_date": "string",
    "wpr2_report_date": "string",
    "created_by": "string",
    "execution_team": "string",
    "design_team": "string",
    "sales_team": "string",
    "escalation_point": "string",
    "project_end_date_wpr1": "string",
    "project_end_date_wpr2": "string",
    "end_dates_match": boolean,
    "end_date_discrepancy_reason": "string or null"
  },
  "timeline_comparison": [
    {
      "item": "string",
      "start_date": "string",
      "end_date_wpr1": "string",
      "end_date_wpr2": "string",
      "date_changed": boolean,
      "critical_remarks": "string"
    }
  ],
  "image_areas": ["string array of area names that have 3D vs Actual Site Photos in the 3Ds Vs Actual Site Photos section ONLY"]
}

CRITICAL ANALYSIS RULES:
1. Report dates MUST be different between WPRs - flag if same
2. Project end date in Project Details MUST match timeline end date - verify and flag discrepancy
3. Risk Register: Compare ALL risk items between both WPRs. If a risk appears in both, it's "unchanged". If text changed/expanded it may be "escalated". Count consecutive weeks it's been open.
4. Progress: If any percentage went DOWN, mark concern=true and explain why
5. Selection: Flag any item that regressed (was Done, now not Done)
6. Design Revisions: Compare revision lists - flag if new revisions appeared
7. 3D vs Site Photos: ONLY list area names from the "3Ds Vs Actual Site Photos" section, not from other sections
8. Warnings: Generate accountability warnings - if something is delayed, what downstream activities are affected
9. Be thorough - check every section, every number, every status change
10. For sections analysis, provide a summary for EACH major section of the WPR`;

    const userPrompt = `---WPR 1 (Previous Week)---\n${wpr1_text}\n\n---WPR 2 (Current Week)---\n${wpr2_text}\n\nRead all data carefully. Return ONLY the JSON object, no markdown fences.`;

    let response: Response | null = null;
    const maxRetries = 3;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (LOVABLE_API_KEY) {
        response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            response_format: { type: "json_object" },
          }),
        });
      } else if (GEMINI_API_KEY) {
        response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
              generationConfig: { temperature: 0.1, maxOutputTokens: 16000, responseMimeType: "application/json" },
            }),
          }
        );
      } else {
        throw new Error("No AI API key configured. Set LOVABLE_API_KEY or GEMINI_API_KEY.");
      }

      if (response.ok) break;

      if (response.status === 429) {
        await response.text();
        return new Response(JSON.stringify({ error: "Gemini rate limit reached. Please wait 30 seconds and try again.", retryable: true }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const isRetryable = response.status === 503;
      if (!isRetryable || attempt === maxRetries) {
        const errText = await response.text();
        console.error(`AI API error (attempt ${attempt + 1}):`, response.status, errText);
        return new Response(JSON.stringify({ error: `AI API error: ${response.status}` }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await response.text();
      const delay = Math.min(1000 * Math.pow(2, attempt), 8000) + Math.random() * 1000;
      console.log(`AI returned ${response.status}, retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise(r => setTimeout(r, delay));
    }

    const responseData = await response!.json();

    let text: string | undefined;
    if (responseData.choices?.[0]?.message?.content) {
      text = responseData.choices[0].message.content;
    } else if (responseData.candidates?.[0]?.content?.parts?.[0]?.text) {
      text = responseData.candidates[0].content.parts[0].text;
    }

    if (!text) {
      console.error("No text in AI response:", JSON.stringify(responseData).substring(0, 500));
      return new Response(JSON.stringify({ error: "No response from AI" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let analysis;
    try {
      const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
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
