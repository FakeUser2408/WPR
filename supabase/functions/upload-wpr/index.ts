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
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const projectName = formData.get("project_name") as string;
    const weekNumber = parseInt(formData.get("week_number") as string);

    if (!file || !projectName || !weekNumber) {
      return new Response(JSON.stringify({ error: "file, project_name, and week_number are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("DB_URL")!,
      Deno.env.get("SERVICE_ROLE_KEY")!
    );

    const safeName = projectName.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
    const saveAsName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = `${safeName}/week_${weekNumber}/${saveAsName}`;

    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from("wpr-uploads")
      .upload(filePath, arrayBuffer, {
        contentType: file.type || "application/pdf",
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from("wpr-uploads")
      .getPublicUrl(filePath);

    return new Response(JSON.stringify({
      path: filePath,
      url: publicUrl,
      project_name: projectName,
      week_number: weekNumber,
      type: "file",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
