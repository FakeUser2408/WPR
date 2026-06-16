/** Shared prompts — split into 2 API calls to fit Supabase Edge memory/time limits. */

export const MAX_WPR_CHARS_PER_REPORT = 24000;

const DATA_SCHEMA = `{
  "project_name": "string",
  "wpr1_date": "string (work period from WPR1 header)",
  "wpr2_date": "string (work period from WPR2 header)",
  "project_details": {
    "client_name":"string","report_dates_different":boolean,
    "wpr1_report_date":"string","wpr2_report_date":"string",
    "created_by":"string","execution_team":"string","design_team":"string",
    "sales_team":"string","escalation_point":"string",
    "project_end_date_wpr1":"string","project_end_date_wpr2":"string",
    "end_dates_match":boolean,"end_date_discrepancy_reason":"string|null"
  },
  "progress_comparison": [
    {"area":"string","pct_wpr1":number,"pct_wpr2":number,"delta":number,
     "direction":"up"|"down"|"unchanged","concern":boolean,"reason":"string"}
  ],
  "selection_changes": [
    {"category":"string","item":"string","status_wpr1":"string","status_wpr2":"string",
     "changed":boolean,"regression":boolean,"remarks_wpr1":"string","remarks_wpr2":"string"}
  ],
  "timeline_comparison": [
    {"item":"string","start_date":"string","end_date_wpr1":"string","end_date_wpr2":"string",
     "date_changed":boolean,"critical_remarks":"string"}
  ],
  "risk_register": [
    {"point":"string","details":"string","action_by":"string",
     "status_wpr1":"string","status_wpr2":"string",
     "status_change":"resolved"|"unchanged"|"escalated"|"new","weeks_open":number}
  ],
  "design_revisions": {
    "wpr1_revisions":[{"revision":"string","date":"string","remarks":"string"}],
    "wpr2_revisions":[{"revision":"string","date":"string","remarks":"string"}],
    "new_revisions":boolean,"comparison_notes":"string"
  },
  "image_areas": ["string"]
}`;

const AUDIT_SCHEMA = `{
  "overall_score": number,
  "overall_status": "healthy"|"at_risk"|"critical",
  "summary": "string (4-6 sentences, cite project name, key %, dates, teams)",
  "warnings": [
    {"severity":"critical"|"high"|"medium"|"low","category":"string",
     "message":"string","impact":"string","action_required":"string"}
  ],
  "sections": [
    {"name":"Weekly Progress","status":"healthy"|"at_risk"|"critical"|"unchanged",
     "score":number,"summary":"string","findings":["string"],"recommendations":["string"]},
    {"name":"Risk Register & Critical Open Pointers", ...},
    {"name":"Selection Schedule", ...},
    {"name":"Project Timeline", ...},
    {"name":"Design Revisions", ...},
    {"name":"Photo Documentation", ...}
  ]
}`;

const TABLE_RULES = `
CRITICAL EXTRACTION RULES:
- Return ONLY one JSON object matching the schema. No markdown. No commentary.
- List EVERY table row from the WPRs — never summarize or skip rows.
- progress_comparison: EVERY work area row (typically 15–40+); copy exact area names and % from WPR tables.
- selection_changes: EVERY selection line; changed=false if status unchanged between weeks.
- timeline_comparison: EVERY timeline/milestone row from both WPRs.
- risk_register: EVERY risk/open pointer from both WPRs; use [] only if the WPR truly has zero risks.
- design_revisions: all revision rows from both WPRs.
- image_areas: area names listed under "3Ds Vs Actual Site Photos" only.
- project_details: copy exact client, team names, report dates, end dates from WPR headers.
- Use empty arrays [] when a section truly has no rows — never omit keys.
- "reason" max 100 chars per progress row.
- Valid JSON only: no trailing commas, all brackets closed.`;

const AUDIT_RULES = `
CRITICAL AUDIT RULES:
- Return ONLY one JSON object matching the schema. No markdown.
- Use ONLY facts from the structured JSON input — never invent generic audit issues.
- FORBIDDEN: vague phrases like "documentation discipline", "governance gaps", "stakeholder feedback loop".
- REQUIRED: cite exact work area names, percentages, dates, team/person names from the input data.
- warnings: minimum 6 items (8–15 on at-risk projects). Each warning MUST have:
  severity, category, message (what happened with evidence), impact (2 sentences), action_required (owner + deadline).
- sections: EXACTLY 6 sections with these names:
  1) "Weekly Progress"
  2) "Risk Register & Critical Open Pointers"
  3) "Selection Schedule"
  4) "Project Timeline"
  5) "Design Revisions"
  6) "Photo Documentation"
  Each section: score 0–100, status, summary, 4–8 findings, 3–5 recommendations (owner + deadline when issues exist).
- overall_score 0–100 reflecting worst dimension (not average).
- overall_status MUST match score: 80–100 healthy, 50–79 at_risk, 0–49 critical.
- Flag stalled progress (0% delta for 2 weeks), regressions, same report dates, selection regressions, timeline compression.
- Valid JSON only: no trailing commas, all brackets closed.`;

export function buildWprDataExtractionPrompt(sourceLabel: string): string {
  return `You are a WPR data extractor for construction/interior fit-out projects.
Input: ${sourceLabel} for WPR1 (previous week) and WPR2 (current week).

Your ONLY job is to extract structured data into JSON. Do NOT write an executive summary or warnings.

${DATA_SCHEMA}
${TABLE_RULES}`;
}

export function buildWprAuditSynthesisPrompt(): string {
  return `You are a WPR audit synthesizer for construction/interior fit-out projects.
Input: JSON already extracted from two WPRs (progress, selections, risks, timeline, etc.).

Your job is to produce the executive audit JSON (scores, warnings, sections) using ONLY the input data.

${AUDIT_SCHEMA}
${AUDIT_RULES}`;
}

export function buildWprUserPrompt(wpr1: string, wpr2: string): string {
  return `---WPR 1 (Previous Week)---\n${wpr1}\n\n---WPR 2 (Current Week)---\n${wpr2}`;
}
