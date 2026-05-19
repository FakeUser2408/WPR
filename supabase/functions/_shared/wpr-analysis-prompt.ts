/** Shared prompts — split into 2 API calls to fit Supabase Edge memory/time limits. */

export const MAX_WPR_CHARS_PER_REPORT = 24000;

const DATA_SCHEMA = `{
  "project_name": "string",
  "wpr1_date": "string",
  "wpr2_date": "string",
  "project_details": {"client_name":"string","report_dates_different":boolean,"wpr1_report_date":"string","wpr2_report_date":"string","created_by":"string","execution_team":"string","design_team":"string","sales_team":"string","escalation_point":"string","project_end_date_wpr1":"string","project_end_date_wpr2":"string","end_dates_match":boolean,"end_date_discrepancy_reason":"string|null"},
  "progress_comparison": [{"area":"string","pct_wpr1":number,"pct_wpr2":number,"delta":number,"direction":"up"|"down"|"unchanged","concern":boolean,"reason":"string"}],
  "selection_changes": [{"category":"string","item":"string","status_wpr1":"string","status_wpr2":"string","changed":boolean,"regression":boolean,"remarks_wpr1":"string","remarks_wpr2":"string"}],
  "timeline_comparison": [{"item":"string","start_date":"string","end_date_wpr1":"string","end_date_wpr2":"string","date_changed":boolean,"critical_remarks":"string"}],
  "risk_register": [{"point":"string","details":"string","action_by":"string","status_wpr1":"string","status_wpr2":"string","status_change":"resolved"|"unchanged"|"escalated"|"new","weeks_open":number}],
  "design_revisions": {"wpr1_revisions":[{"revision":"string","date":"string","remarks":"string"}],"wpr2_revisions":[{"revision":"string","date":"string","remarks":"string"}],"new_revisions":boolean,"comparison_notes":"string"},
  "image_areas": ["strings"]
}`;

const AUDIT_SCHEMA = `{
  "overall_score": number,
  "overall_status": "healthy"|"at_risk"|"critical",
  "summary": "string (4-6 sentences)",
  "warnings": [{"severity":"critical"|"high"|"medium"|"low","category":"string","message":"string","impact":"string","action_required":"string"}],
  "sections": [{"name":"string","status":"healthy"|"at_risk"|"critical"|"unchanged","score":number,"summary":"string","findings":["string"],"recommendations":["string"]}]
}`;

const TABLE_RULES = `
List EVERY table row — do not summarize. progress_comparison: every work area from either WPR (15–40+ rows on large projects); detailed "reason" per row. selection_changes: every selection line (changed=false if same status). timeline_comparison: every timeline activity. risk_register: every risk from both WPRs. design_revisions: all revision rows. image_areas: names under "3Ds Vs Actual Site Photos" only.`;

const AUDIT_RULES = `
Using the structured JSON provided, produce executive audit output. warnings: 6–15+ items on complex/at-risk projects with specific message, 2-sentence impact, action with owner/deadline. sections: 6 sections named with substrings "Weekly Progress", "Risk Register", "Selection Schedule", "Project Timeline", "Design Revisions", "Photo Documentation" — each with 4–8 findings and 3–5 recommendations when issues exist. overall_score 0–100 weighted to worst dimension. Flag same report dates and selection regressions in warnings.`;

export function buildWprDataExtractionPrompt(sourceLabel: string): string {
  return `WPR data extractor. Input: ${sourceLabel} for WPR1 (previous) and WPR2 (current). Return ONLY JSON:

${DATA_SCHEMA}
${TABLE_RULES}`;
}

export function buildWprAuditSynthesisPrompt(): string {
  return `WPR audit synthesizer. Input: JSON extracted from two WPRs. Return ONLY JSON:

${AUDIT_SCHEMA}
${AUDIT_RULES}`;
}

export function buildWprUserPrompt(wpr1: string, wpr2: string): string {
  return `---WPR 1 (Previous Week)---\n${wpr1}\n\n---WPR 2 (Current Week)---\n${wpr2}`;
}
