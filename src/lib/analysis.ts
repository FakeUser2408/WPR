import { supabase } from "@/integrations/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WPRAnalysis {
  id?: string;
  project_name: string;
  created_at?: string;
  week_number?: number;
  wpr1_date: string;
  wpr2_date: string;
  overall_score: number;
  overall_status: "healthy" | "at_risk" | "critical";
  summary: string;
  sections: AnalysisSection[];
  warnings: Warning[];
  risk_register: RiskItem[];
  progress_comparison: ProgressItem[];
  selection_changes: SelectionChange[];
  design_revisions: RevisionComparison;
  project_details: ProjectDetails;
  timeline_comparison: TimelineItem[];
  image_areas: string[];
  image_comparison?: ImageComparison;
}

export interface ImageComparison {
  status: "completed" | "insufficient_data" | "error";
  message?: string;
  recycled_photos_detected: boolean;
  confidence?: "high" | "medium" | "low";
  areas_compared: ImageComparisonArea[];
  findings: string[];
  recommendation?: string;
}

export interface ImageComparisonArea {
  area_name: string;
  photos_identical: boolean;
  progress_visible: boolean;
  remarks: string;
  severity: "critical" | "warning" | "ok";
}

export interface ProjectDetails {
  client_name: string;
  report_dates_different: boolean;
  wpr1_report_date: string;
  wpr2_report_date: string;
  created_by: string;
  execution_team: string;
  design_team: string;
  sales_team: string;
  escalation_point: string;
  project_end_date_wpr1: string;
  project_end_date_wpr2: string;
  end_dates_match: boolean;
  end_date_discrepancy_reason?: string;
}

export interface AnalysisSection {
  name: string;
  status: "healthy" | "at_risk" | "critical" | "unchanged";
  score: number;
  summary: string;
  findings: string[];
  recommendations: string[];
}

export interface Warning {
  severity: "critical" | "high" | "medium" | "low";
  category: string;
  message: string;
  impact: string;
  action_required: string;
}

export interface RiskItem {
  point: string;
  details: string;
  action_by: string;
  status_wpr1: string;
  status_wpr2: string;
  status_change: "resolved" | "unchanged" | "escalated" | "new";
  weeks_open: number;
}

export interface ProgressItem {
  area: string;
  pct_wpr1: number;
  pct_wpr2: number;
  delta: number;
  direction: "up" | "down" | "unchanged";
  concern: boolean;
  reason?: string;
}

export interface SelectionChange {
  category: string;
  item: string;
  status_wpr1: string;
  status_wpr2: string;
  changed: boolean;
  regression: boolean;
  remarks_wpr1?: string;
  remarks_wpr2?: string;
}

export interface RevisionComparison {
  wpr1_revisions: { revision: string; date: string; remarks: string }[];
  wpr2_revisions: { revision: string; date: string; remarks: string }[];
  new_revisions: boolean;
  comparison_notes: string;
}

export interface TimelineItem {
  item: string;
  start_date: string;
  end_date_wpr1: string;
  end_date_wpr2: string;
  date_changed: boolean;
  critical_remarks: string;
}

// ─── AI Analysis Functions ────────────────────────────────────────────────────

/**
 * Analyze two WPR texts via the analyze-wpr edge function.
 */
export async function analyzeWPRs(wpr1Text: string, wpr2Text: string): Promise<WPRAnalysis> {
  try {
    // Call the Supabase edge function (no auth header - functions are public)
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-wpr`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          wpr1_text: wpr1Text,
          wpr2_text: wpr2Text,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return data as WPRAnalysis;
  } catch (err: any) {
    if (err.message?.includes("429") || err.message?.includes("RESOURCE_EXHAUSTED")) {
      throw new Error("The AI service is experiencing high demand. Please wait a moment and try again.");
    }
    throw new Error(err.message || "Analysis failed");
  }
}

// ─── Database Operations (direct Supabase client) ─────────────────────────────

/**
 * Save analysis to the database directly.
 */
export async function saveAnalysis(analysis: WPRAnalysis, weekNumber?: number): Promise<string> {
  const { data, error } = await supabase
    .from("wpr_analyses")
    .insert({
      project_name: analysis.project_name,
      wpr1_date: analysis.wpr1_date || "",
      wpr2_date: analysis.wpr2_date || "",
      overall_score: analysis.overall_score || 0,
      overall_status: analysis.overall_status || "critical",
      summary: analysis.summary || "",
      analysis_data: analysis as any,
      week_number: weekNumber ?? analysis.week_number ?? null,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message || "Failed to save analysis");
  return data.id;
}

/**
 * Get all analysis history from the database.
 */
export async function getAnalysisHistory(): Promise<WPRAnalysis[]> {
  const { data, error } = await supabase
    .from("wpr_analyses")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message || "Failed to load history");

  return (data || []).map((row) => {
    const analysis = (row.analysis_data as any) || {};
    return {
      ...analysis,
      id: row.id,
      project_name: row.project_name,
      wpr1_date: row.wpr1_date,
      wpr2_date: row.wpr2_date,
      overall_score: row.overall_score,
      overall_status: row.overall_status as any,
      summary: row.summary || analysis.summary || "",
      week_number: row.week_number,
      created_at: row.created_at,
    } as WPRAnalysis;
  });
}

/**
 * Get a single analysis by ID.
 */
export async function getAnalysisById(id: string): Promise<WPRAnalysis> {
  const { data, error } = await supabase
    .from("wpr_analyses")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw new Error(error.message || "Failed to load analysis");

  const analysis = (data.analysis_data as any) || {};
  return {
    ...analysis,
    id: data.id,
    project_name: data.project_name,
    wpr1_date: data.wpr1_date,
    wpr2_date: data.wpr2_date,
    overall_score: data.overall_score,
    overall_status: data.overall_status as any,
    summary: data.summary || analysis.summary || "",
    week_number: data.week_number,
    created_at: data.created_at,
  } as WPRAnalysis;
}

/**
 * Get unique project names from analyses.
 */
export async function getProjectList(): Promise<string[]> {
  const { data, error } = await supabase
    .from("wpr_analyses")
    .select("project_name")
    .order("project_name");

  if (error) throw new Error(error.message);
  const unique = [...new Set((data || []).map((d) => d.project_name))];
  return unique;
}
