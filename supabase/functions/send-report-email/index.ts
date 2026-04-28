/// <reference lib="deno.window" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { to, subject, body } = await req.json();
    if (!to || !subject || !body) {
      return new Response(JSON.stringify({ error: "to, subject, and body are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const EMAIL_FROM = Deno.env.get("EMAIL_FROM") || "WPR Audit <noreply@wpraudit.com>";
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    // Convert plain text to clean HTML for email clients
    const htmlBody = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: Arial, sans-serif; font-size: 14px; color: #1a1a1a; background: #ffffff; margin: 0; padding: 0; }
  .container { max-width: 680px; margin: 0 auto; padding: 32px 24px; }
  .header { background: #0f172a; color: #ffffff; padding: 24px; border-radius: 8px; margin-bottom: 24px; }
  .header h1 { margin: 0 0 4px 0; font-size: 18px; }
  .header p { margin: 0; font-size: 13px; color: #94a3b8; }
  .score-badge { display: inline-block; background: #1e293b; color: #fff; padding: 8px 16px; border-radius: 6px; font-size: 15px; font-weight: bold; margin: 16px 0; }
  .divider { border: none; border-top: 1px solid #e2e8f0; margin: 20px 0; }
  .section-title { font-size: 13px; font-weight: bold; letter-spacing: 0.05em; padding: 8px 12px; border-radius: 4px; margin: 20px 0 12px 0; }
  .critical { background: #fef2f2; color: #dc2626; }
  .high { background: #fffbeb; color: #d97706; }
  .medium { background: #eff6ff; color: #2563eb; }
  .low { background: #f0fdf4; color: #16a34a; }
  .finding { border-left: 3px solid #e2e8f0; padding: 12px 16px; margin-bottom: 12px; background: #f8fafc; border-radius: 0 6px 6px 0; }
  .finding.critical { border-left-color: #dc2626; }
  .finding.high { border-left-color: #d97706; }
  .finding.medium { border-left-color: #2563eb; }
  .finding.low { border-left-color: #16a34a; }
  .finding-title { font-weight: bold; font-size: 13px; margin-bottom: 6px; }
  .finding-body { font-size: 13px; color: #374151; margin-bottom: 6px; }
  .action { font-size: 13px; color: #1d4ed8; font-weight: 500; }
  .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #6b7280; }
</style></head>
<body>
<div class="container">
${body
  .split("\n")
  .map(line => {
    if (line.startsWith("Subject:")) return "";
    if (line.match(/^─+$/)) return '<hr class="divider">';
    if (line.includes("CRITICAL FINDINGS")) return `<div class="section-title critical">🔴 ${line.trim()}</div>`;
    if (line.includes("HIGH PRIORITY")) return `<div class="section-title high">🟠 ${line.trim()}</div>`;
    if (line.includes("MEDIUM PRIORITY")) return `<div class="section-title medium">🟡 ${line.trim()}</div>`;
    if (line.includes("LOW PRIORITY")) return `<div class="section-title low">🔵 ${line.trim()}</div>`;
    if (line.startsWith("• Action Required:")) return `<p class="action">→ ${line.replace("• Action Required:", "Action Required:").trim()}</p>`;
    if (line.trim() === "") return "<br>";
    return `<p style="margin:4px 0">${line}</p>`;
  })
  .join("\n")}
</div>
</body>
</html>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: EMAIL_FROM, to: [to], subject, html: htmlBody, text: body }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Resend error:", err);
      throw new Error(`Email send failed: ${res.status}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
