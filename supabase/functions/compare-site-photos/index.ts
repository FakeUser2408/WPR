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
    const { project_name, week_number } = await req.json();
    if (!project_name || !week_number) {
      return new Response(JSON.stringify({ error: "project_name and week_number required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("DB_URL")!,
      Deno.env.get("SERVICE_ROLE_KEY")!
    );

    const safeName = project_name.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
    const currWeek = week_number;
    const prevWeek = week_number - 1;

    async function getWeekImages(weekNum: number): Promise<string[]> {
      const prefix = `${safeName}/week_${weekNum}`;
      const { data: files } = await supabase.storage.from("wpr-uploads").list(prefix, { limit: 50 });
      if (!files) return [];

      const imageFiles = files
        .filter((f: { name: string }) => f.name.endsWith(".jpg") && f.name.startsWith("page_"))
        .sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name));

      const images: string[] = [];
      for (const f of imageFiles) {
        const { data } = await supabase.storage.from("wpr-uploads").download(`${prefix}/${f.name}`);
        if (data) {
          const arrayBuffer = await data.arrayBuffer();
          const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
          images.push(base64);
        }
      }
      return images;
    }

    const [prevImages, currImages] = await Promise.all([
      getWeekImages(prevWeek),
      getWeekImages(currWeek),
    ]);

    if (prevImages.length === 0 || currImages.length === 0) {
      return new Response(JSON.stringify({
        image_comparison: {
          status: "insufficient_data",
          message: `Missing page images. Previous week: ${prevImages.length}, Current week: ${currImages.length}.`,
          findings: [], recycled_photos_detected: false, areas_compared: [],
        }
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

    const maxPages = 6;
    const prevSlice = prevImages.slice(0, maxPages);
    const currSlice = currImages.slice(0, maxPages);

    // Build Gemini parts: text + inline images
    const parts: any[] = [
      { text: `Compare site photos from Week ${prevWeek} (previous) vs Week ${currWeek} (current). Each page has rows of 4 images: 1st=3D render (ignore), 2nd=actual site photo (compare), 3rd=3D render (ignore), 4th=actual site photo (compare). Detect recycled/identical photos between weeks and note real progress.\n\n--- Week ${prevWeek} (Previous) ---` }
    ];

    for (let i = 0; i < prevSlice.length; i++) {
      parts.push({ text: `Previous Week Page ${i + 1}:` });
      parts.push({ inlineData: { mimeType: "image/jpeg", data: prevSlice[i] } });
    }

    parts.push({ text: `--- Week ${currWeek} (Current) ---` });

    for (let i = 0; i < currSlice.length; i++) {
      parts.push({ text: `Current Week Page ${i + 1}:` });
      parts.push({ inlineData: { mimeType: "image/jpeg", data: currSlice[i] } });
    }

    const systemInstruction = `You analyze construction WPR site photo pages. Only look at the 2nd and 4th images in each row (actual site photos). Ignore 3D renders (1st and 4th images). Return JSON only.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents: [{ role: "user", parts }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.1,
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini Vision error:", response.status, errText);
      return new Response(JSON.stringify({
        image_comparison: {
          status: "error", message: `Vision analysis failed: ${response.status}`,
          findings: [], recycled_photos_detected: false, areas_compared: [],
        }
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiData = await response.json();
    const text = aiData.candidates?.[0]?.content?.parts?.[0]?.text;

    let comparison;
    try {
      comparison = JSON.parse(text);
    } catch {
      const s = text?.indexOf("{"), e = text?.lastIndexOf("}");
      if (s !== -1 && e !== -1) {
        comparison = JSON.parse(text.substring(s, e + 1));
      } else {
        comparison = {
          status: "error", message: "Failed to parse vision response",
          findings: [text?.substring(0, 300) || "No response"],
          recycled_photos_detected: false, areas_compared: [],
        };
      }
    }

    return new Response(JSON.stringify({ image_comparison: comparison }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
