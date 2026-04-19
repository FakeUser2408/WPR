/// <reference lib="deno.window" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { project_filter } = await req.json().catch(() => ({}));

    const supabase = createClient(
      Deno.env.get("DB_URL")!,
      Deno.env.get("SERVICE_ROLE_KEY")!
    );

    const supabaseUrl = Deno.env.get("DB_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // List all project folders
    const { data: folders, error: listError } = await supabase.storage
      .from("wpr-uploads")
      .list("", { limit: 100 });

    if (listError) throw listError;

    // Map sanitized folder names back to display names
    const { data: allProjects } = await supabase.from("projects").select("name");
    const projectNameMap: Record<string, string> = {};
    for (const p of allProjects || []) {
      const sanitized = p.name.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
      projectNameMap[sanitized] = p.name;
    }

    const results: Array<{ project: string; status: string; detail?: string }> = [];

    for (const folder of folders || []) {
      if (!folder.name || folder.id) continue;
      const folderName = folder.name;
      const displayName = projectNameMap[folderName] || folderName;

      if (project_filter && folderName !== project_filter) continue;

      // List week folders
      const { data: weekFolders } = await supabase.storage
        .from("wpr-uploads")
        .list(folderName, { limit: 100 });

      const sortedWeeks = (weekFolders || [])
        .filter((w: { name: string }) => w.name.startsWith("week_"))
        .sort((a: { name: string }, b: { name: string }) => {
          const numA = parseInt(a.name.replace("week_", ""));
          const numB = parseInt(b.name.replace("week_", ""));
          return numA - numB;
        });

      if (sortedWeeks.length < 2) {
        results.push({ project: folderName, status: "skipped", detail: "Need at least 2 weeks" });
        continue;
      }

      const prevWeek = sortedWeeks[sortedWeeks.length - 2];
      const currWeek = sortedWeeks[sortedWeeks.length - 1];
      const prevWeekNum = parseInt(prevWeek.name.replace("week_", ""));
      const currWeekNum = parseInt(currWeek.name.replace("week_", ""));

      // Check if already analyzed
      const { data: existing } = await supabase
        .from("wpr_analyses")
        .select("id")
        .eq("project_name", displayName)
        .eq("week_number", currWeekNum)
        .limit(1);

      if (existing && existing.length > 0) {
        results.push({ project: folderName, status: "already_done", detail: `Week ${currWeekNum} already analyzed` });
        continue;
      }

      // analyze-wpr fetches the WPR files from Supabase itself — no need to download here
      const analyzeRes = await fetch(`${supabaseUrl}/functions/v1/analyze-wpr`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${anonKey}`,
        },
        body: JSON.stringify({
          project_name: folderName,
          week1: prevWeekNum,
          week2: currWeekNum,
        }),
      });

      if (!analyzeRes.ok) {
        const errBody = await analyzeRes.text();
        results.push({ project: folderName, status: "error", detail: `Analysis failed: ${errBody.substring(0, 200)}` });
        continue;
      }

      const analysis = await analyzeRes.json();
      if (analysis.error) {
        results.push({ project: folderName, status: "error", detail: analysis.error });
        continue;
      }

      // Save — always use display name, not AI-extracted name
      const { error: saveError } = await supabase.from("wpr_analyses").insert({
        project_name: displayName,
        wpr1_date: analysis.wpr1_date || "",
        wpr2_date: analysis.wpr2_date || "",
        overall_score: analysis.overall_score || 0,
        overall_status: analysis.overall_status || "critical",
        summary: analysis.summary || "",
        analysis_data: analysis,
        week_number: currWeekNum,
      });

      if (saveError) {
        results.push({ project: folderName, status: "error", detail: `Save failed: ${saveError.message}` });
      } else {
        results.push({ project: folderName, status: "analyzed", detail: `Week ${currWeekNum} analysis saved` });
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
