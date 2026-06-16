import { normalizeOverallHealth } from "./health-status.ts";

/** Section titles the UI matches by substring — keep these stable. */
export const REQUIRED_SECTION_TITLES = [
  "Weekly Progress",
  "Risk Register & Critical Open Pointers",
  "Selection Schedule",
  "Project Timeline",
  "Design Revisions",
  "Photo Documentation",
] as const;

const EMPTY_PROJECT_DETAILS = {
  client_name: "",
  report_dates_different: false,
  wpr1_report_date: "",
  wpr2_report_date: "",
  created_by: "",
  execution_team: "",
  design_team: "",
  sales_team: "",
  escalation_point: "",
  project_end_date_wpr1: "",
  project_end_date_wpr2: "",
  end_dates_match: true,
  end_date_discrepancy_reason: null as string | null,
};

const EMPTY_DESIGN_REVISIONS = {
  wpr1_revisions: [] as { revision: string; date: string; remarks: string }[],
  wpr2_revisions: [] as { revision: string; date: string; remarks: string }[],
  new_revisions: false,
  comparison_notes: "",
};

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function asBool(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeWarning(raw: unknown): Record<string, string> {
  const w = asObject(raw);
  return {
    severity: asString(w.severity, "medium"),
    category: asString(w.category, "General"),
    message: asString(w.message),
    impact: asString(w.impact),
    action_required: asString(w.action_required),
  };
}

function sectionMatchesTitle(name: string, required: string): boolean {
  const n = name.toLowerCase();
  const r = required.toLowerCase();
  if (n.includes(r) || r.includes(n)) return true;
  if (required.includes("Risk") && n.includes("risk")) return true;
  if (required.includes("Photo") && (n.includes("photo") || n.includes("3d"))) return true;
  if (required.includes("Weekly Progress") && n.includes("progress")) return true;
  if (required.includes("Selection") && n.includes("selection")) return true;
  if (required.includes("Timeline") && n.includes("timeline")) return true;
  if (required.includes("Design") && n.includes("design")) return true;
  return false;
}

function normalizeSection(raw: unknown, fallbackTitle: string): Record<string, unknown> {
  const s = asObject(raw);
  return {
    name: asString(s.name, fallbackTitle),
    status: asString(s.status, "unchanged"),
    score: asNumber(s.score, 50),
    summary: asString(s.summary),
    findings: asArray<string>(s.findings).map((f) => asString(f)).filter(Boolean),
    recommendations: asArray<string>(s.recommendations).map((r) => asString(r)).filter(Boolean),
  };
}

function ensureSections(rawSections: unknown): Record<string, unknown>[] {
  const sections = asArray<unknown>(rawSections).map((s) => normalizeSection(s, ""));
  const result: Record<string, unknown>[] = [];

  for (const title of REQUIRED_SECTION_TITLES) {
    const existing = sections.find((s) => sectionMatchesTitle(asString(s.name), title));
    result.push(existing ? { ...existing, name: title } : {
      name: title,
      status: "unchanged",
      score: 50,
      summary: "",
      findings: [],
      recommendations: [],
    });
  }

  return result;
}

function normalizeProgressItem(raw: unknown): Record<string, unknown> {
  const p = asObject(raw);
  const pct1 = asNumber(p.pct_wpr1);
  const pct2 = asNumber(p.pct_wpr2);
  const delta = asNumber(p.delta, pct2 - pct1);
  let direction = asString(p.direction, "unchanged");
  if (!["up", "down", "unchanged"].includes(direction)) {
    direction = delta > 0 ? "up" : delta < 0 ? "down" : "unchanged";
  }
  return {
    area: asString(p.area),
    pct_wpr1: pct1,
    pct_wpr2: pct2,
    delta,
    direction,
    concern: asBool(p.concern),
    reason: asString(p.reason),
  };
}

/** Coerce any model output into the canonical WPR analysis shape expected by the UI. */
export function normalizeWprAnalysis(raw: Record<string, unknown>): Record<string, unknown> {
  const pd = asObject(raw.project_details);
  const dr = asObject(raw.design_revisions);

  const normalized: Record<string, unknown> = {
    project_name: asString(raw.project_name, "Unknown Project"),
    wpr1_date: asString(raw.wpr1_date),
    wpr2_date: asString(raw.wpr2_date),
    overall_score: asNumber(raw.overall_score, 0),
    overall_status: asString(raw.overall_status, "critical"),
    summary: asString(raw.summary),
    warnings: asArray<unknown>(raw.warnings).map(normalizeWarning),
    sections: ensureSections(raw.sections),
    progress_comparison: asArray<unknown>(raw.progress_comparison).map(normalizeProgressItem),
    selection_changes: asArray<unknown>(raw.selection_changes).map((item) => {
      const s = asObject(item);
      return {
        category: asString(s.category),
        item: asString(s.item),
        status_wpr1: asString(s.status_wpr1),
        status_wpr2: asString(s.status_wpr2),
        changed: asBool(s.changed),
        regression: asBool(s.regression),
        remarks_wpr1: asString(s.remarks_wpr1),
        remarks_wpr2: asString(s.remarks_wpr2),
      };
    }),
    timeline_comparison: asArray<unknown>(raw.timeline_comparison).map((item) => {
      const t = asObject(item);
      return {
        item: asString(t.item),
        start_date: asString(t.start_date),
        end_date_wpr1: asString(t.end_date_wpr1),
        end_date_wpr2: asString(t.end_date_wpr2),
        date_changed: asBool(t.date_changed),
        critical_remarks: asString(t.critical_remarks),
      };
    }),
    risk_register: asArray<unknown>(raw.risk_register).map((item) => {
      const r = asObject(item);
      return {
        point: asString(r.point),
        details: asString(r.details),
        action_by: asString(r.action_by),
        status_wpr1: asString(r.status_wpr1),
        status_wpr2: asString(r.status_wpr2),
        status_change: asString(r.status_change, "unchanged"),
        weeks_open: asNumber(r.weeks_open),
      };
    }),
    design_revisions: {
      wpr1_revisions: asArray<unknown>(dr.wpr1_revisions).map((rev) => {
        const r = asObject(rev);
        return {
          revision: asString(r.revision),
          date: asString(r.date),
          remarks: asString(r.remarks),
        };
      }),
      wpr2_revisions: asArray<unknown>(dr.wpr2_revisions).map((rev) => {
        const r = asObject(rev);
        return {
          revision: asString(r.revision),
          date: asString(r.date),
          remarks: asString(r.remarks),
        };
      }),
      new_revisions: asBool(dr.new_revisions),
      comparison_notes: asString(dr.comparison_notes),
    },
    image_areas: asArray<unknown>(raw.image_areas).map((a) => asString(a)).filter(Boolean),
    project_details: {
      ...EMPTY_PROJECT_DETAILS,
      client_name: asString(pd.client_name),
      report_dates_different: asBool(pd.report_dates_different),
      wpr1_report_date: asString(pd.wpr1_report_date),
      wpr2_report_date: asString(pd.wpr2_report_date),
      created_by: asString(pd.created_by),
      execution_team: asString(pd.execution_team),
      design_team: asString(pd.design_team),
      sales_team: asString(pd.sales_team),
      escalation_point: asString(pd.escalation_point),
      project_end_date_wpr1: asString(pd.project_end_date_wpr1),
      project_end_date_wpr2: asString(pd.project_end_date_wpr2),
      end_dates_match: asBool(pd.end_dates_match, true),
      end_date_discrepancy_reason: pd.end_date_discrepancy_reason == null
        ? null
        : asString(pd.end_date_discrepancy_reason),
    },
  };

  if (asArray(dr.wpr1_revisions).length === 0 && asArray(dr.wpr2_revisions).length === 0) {
    normalized.design_revisions = { ...EMPTY_DESIGN_REVISIONS, ...normalized.design_revisions as object };
  }

  return normalizeOverallHealth(normalized);
}
