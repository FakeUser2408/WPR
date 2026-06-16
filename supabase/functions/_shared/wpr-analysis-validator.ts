import { REQUIRED_SECTION_TITLES } from "./wpr-response-normalizer.ts";

export interface ValidationIssue {
  field: string;
  message: string;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Detect vague/generic audit text that ignores project-specific data. */
const GENERIC_PHRASES = [
  "same report dates observed across multiple wprs",
  "selection criteria are inconsistently applied",
  "frequent design changes are not documented",
  "timeline shows a 12% drift",
  "governance",
  "documentation discipline",
  "standardized selection matrix",
  "version control",
  "stakeholder feedback loop",
];

function looksGeneric(text: string): boolean {
  const lower = text.toLowerCase();
  return GENERIC_PHRASES.some((p) => lower.includes(p));
}

export function validateWprExtraction(data: Record<string, unknown>): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!asString(data.project_name)) {
    issues.push({ field: "project_name", message: "project_name is missing" });
  }

  const progress = asArray(data.progress_comparison);
  if (progress.length < 3) {
    issues.push({
      field: "progress_comparison",
      message: `progress_comparison has ${progress.length} rows; need EVERY work area row from both WPRs (typically 15–40+).`,
    });
  }

  const selections = asArray(data.selection_changes);
  if (selections.length < 1) {
    issues.push({
      field: "selection_changes",
      message: "selection_changes is empty; list every selection line from both WPRs.",
    });
  }

  if (!asObject(data.project_details).client_name && !asObject(data.project_details).execution_team) {
    issues.push({
      field: "project_details",
      message: "project_details missing client_name, teams, and dates from WPR headers.",
    });
  }

  return issues;
}

export function validateWprAudit(audit: Record<string, unknown>, extracted: Record<string, unknown>): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const summary = asString(audit.summary);
  if (summary.length < 80) {
    issues.push({ field: "summary", message: "summary must be 4–6 sentences with specific project facts." });
  }

  const warnings = asArray(audit.warnings);
  if (warnings.length < 6) {
    issues.push({
      field: "warnings",
      message: `warnings has ${warnings.length} items; need at least 6 with severity, category, message, impact, action_required.`,
    });
  }

  for (let i = 0; i < warnings.length; i++) {
    const w = warnings[i] as Record<string, unknown>;
    for (const key of ["severity", "category", "message", "impact", "action_required"]) {
      if (!asString(w[key])) {
        issues.push({ field: `warnings[${i}].${key}`, message: `warning ${i + 1} missing ${key}` });
      }
    }
    const msg = asString(w.message) + " " + asString(w.impact);
    if (looksGeneric(msg)) {
      issues.push({
        field: `warnings[${i}]`,
        message: "warning uses generic audit language; cite exact work areas, %, dates, and names from the extracted JSON.",
      });
    }
  }

  const sections = asArray(audit.sections);
  if (sections.length < 6) {
    issues.push({
      field: "sections",
      message: `sections has ${sections.length} items; need exactly 6 sections: ${REQUIRED_SECTION_TITLES.join(", ")}.`,
    });
  }

  for (const title of REQUIRED_SECTION_TITLES) {
    const section = sections.find((s) => {
      const name = asString((s as Record<string, unknown>).name).toLowerCase();
      return name.includes(title.toLowerCase().split(" ")[0]!) ||
        title.toLowerCase().includes(name.split(" ")[0] ?? "");
    }) as Record<string, unknown> | undefined;

    if (!section) {
      issues.push({ field: "sections", message: `missing section for "${title}"` });
      continue;
    }

    if (asArray(section.findings).length < 3) {
      issues.push({
        field: `sections.${title}`,
        message: `section "${title}" needs at least 3 findings from the WPR data.`,
      });
    }
    if (asArray(section.recommendations).length < 2) {
      issues.push({
        field: `sections.${title}`,
        message: `section "${title}" needs at least 2 recommendations with owner and deadline.`,
      });
    }
  }

  const projectName = asString(extracted.project_name);
  if (projectName && summary && !summary.toLowerCase().includes(projectName.toLowerCase().split(" ")[0]!)) {
    // Soft check — only if project name is distinctive (3+ chars)
    if (projectName.length >= 4) {
      issues.push({
        field: "summary",
        message: `summary should mention the project "${projectName}" and specific metrics from the WPR.`,
      });
    }
  }

  return issues;
}

export function formatValidationFeedback(phase: string, issues: ValidationIssue[]): string {
  const lines = issues.map((i) => `- ${i.field}: ${i.message}`);
  return (
    `Your ${phase} JSON failed validation. Fix ALL issues and return ONLY valid JSON:\n` +
    lines.join("\n") +
    "\nUse ONLY facts from the WPR input. No generic placeholder audit text."
  );
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
