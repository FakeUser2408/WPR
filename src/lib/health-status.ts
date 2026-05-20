export type OverallHealthStatus = "healthy" | "at_risk" | "critical";

/** Score legend: 80–100 Healthy, 50–79 At Risk, 0–49 Critical */
export function scoreToOverallStatus(score: number): OverallHealthStatus {
  const s = Math.round(Number.isFinite(score) ? score : 0);
  if (s >= 80) return "healthy";
  if (s >= 50) return "at_risk";
  return "critical";
}

export function normalizeOverallHealth<T extends { overall_score?: number; overall_status?: string }>(
  analysis: T,
): T & { overall_status: OverallHealthStatus } {
  const score = typeof analysis.overall_score === "number" ? analysis.overall_score : 0;
  return { ...analysis, overall_status: scoreToOverallStatus(score) };
}
