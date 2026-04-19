import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, AlertTriangle, CheckCircle2, XCircle, Info, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, Shield, Calendar, Users, FileText, Target, Clock, BarChart3, Eye, Camera, ImageOff, Zap, ArrowRight, CircleDot, Sparkles } from "lucide-react";
import type { ProjectDetails, RevisionComparison, TimelineItem, ImageComparison, ImageComparisonArea, AnalysisSection } from "@/lib/analysis";
import { Button } from "@/components/ui/button";
import { getAnalysisById, type WPRAnalysis, type Warning, type ProgressItem, type RiskItem, type SelectionChange } from "@/lib/analysis";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";

export default function AnalysisReport() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [analysis, setAnalysis] = useState<WPRAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    getAnalysisById(id)
      .then(setAnalysis)
      .catch((err) => {
        toast({ title: "Failed to load report", description: err.message, variant: "destructive" });
        navigate("/projects");
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex items-center gap-3 text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse-dot" />
            <span>Loading analysis...</span>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!analysis) return null;

  const statusColor = analysis.overall_status === 'healthy' ? 'text-success' :
    analysis.overall_status === 'at_risk' ? 'text-warning' : 'text-critical';

  const criticalWarnings = (analysis.warnings || []).filter(w => w.severity === 'critical' || w.severity === 'high').length;
  const risksEscalated = (analysis.risk_register || []).filter(r => r.status_change === 'escalated' || r.status_change === 'new').length;
  const progressConcerns = (analysis.progress_comparison || []).filter(p => p.concern).length;
  const selectionsChanged = (analysis.selection_changes || []).filter(s => s.changed || s.regression).length;

  // Helper to find matching section analysis by name
  const findSection = (name: string): AnalysisSection | undefined => {
    if (!analysis.sections) return undefined;
    const lower = name.toLowerCase();
    return analysis.sections.find(s => {
      const sLower = s.name.toLowerCase();
      return sLower.includes(lower) || lower.includes(sLower) ||
        (lower.includes('progress') && sLower.includes('progress')) ||
        (lower.includes('risk') && sLower.includes('risk')) ||
        (lower.includes('selection') && sLower.includes('selection')) ||
        (lower.includes('design') && sLower.includes('design')) ||
        (lower.includes('revision') && sLower.includes('revision')) ||
        (lower.includes('timeline') && sLower.includes('timeline')) ||
        (lower.includes('project detail') && sLower.includes('project detail')) ||
        (lower.includes('floor plan') && sLower.includes('floor plan')) ||
        (lower.includes('photo') && sLower.includes('photo')) ||
        (lower.includes('image') && sLower.includes('photo'));
    });
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Back */}
        <button onClick={() => navigate(`/project/${encodeURIComponent(analysis.project_name)}`)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to {analysis.project_name}
        </button>

        {/* Header with Score */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-start justify-between flex-wrap gap-6">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold">{analysis.project_name}</h1>
                {analysis.week_number && (
                  <span className="text-xs font-bold uppercase px-3 py-1 rounded-full gradient-bg text-primary-foreground">
                    Week {analysis.week_number}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Comparing {analysis.wpr1_date} vs {analysis.wpr2_date}
              </p>
              {analysis.created_at && (
                <p className="text-xs text-muted-foreground/70 mt-1 flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  Analyzed on {new Date(analysis.created_at).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })} at {new Date(analysis.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>

            {/* Big Score Display */}
            <div className="flex items-center gap-4">
              <div className="relative w-20 h-20">
                <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="34" fill="none" stroke="hsl(var(--border))" strokeWidth="6" />
                  <circle
                    cx="40" cy="40" r="34" fill="none"
                    stroke={analysis.overall_status === 'healthy' ? 'hsl(var(--success))' : analysis.overall_status === 'at_risk' ? 'hsl(var(--warning))' : 'hsl(var(--critical))'}
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={`${(analysis.overall_score / 100) * 213.6} 213.6`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-xl font-bold ${statusColor}`}>{analysis.overall_score}</span>
                </div>
              </div>
              <div>
                <p className={`text-sm font-bold uppercase ${statusColor}`}>{analysis.overall_status.replace('_', ' ')}</p>
                <p className="text-xs text-muted-foreground">Overall Health</p>
              </div>
            </div>
          </div>

          {/* Score Legend */}
          <div className="mt-4 pt-4 border-t border-border/50">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Score Legend</p>
            <div className="flex flex-wrap gap-x-5 gap-y-1.5">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-success shrink-0" />
                <span className="text-xs text-muted-foreground"><span className="font-medium text-foreground">80–100</span> Healthy</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-warning shrink-0" />
                <span className="text-xs text-muted-foreground"><span className="font-medium text-foreground">50–79</span> At Risk</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-critical shrink-0" />
                <span className="text-xs text-muted-foreground"><span className="font-medium text-foreground">0–49</span> Critical</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* KPI Cards */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="kpi-card kpi-card-warning">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-warning" />
              <p className="text-xs font-medium text-muted-foreground uppercase">Critical Alerts</p>
            </div>
            <p className="text-3xl font-bold">{criticalWarnings}</p>
          </div>
          <div className="kpi-card kpi-card-primary">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-4 h-4 text-critical" />
              <p className="text-xs font-medium text-muted-foreground uppercase">Risk Escalations</p>
            </div>
            <p className="text-3xl font-bold">{risksEscalated}</p>
          </div>
          <div className="kpi-card kpi-card-info">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="w-4 h-4 text-info" />
              <p className="text-xs font-medium text-muted-foreground uppercase">Progress Concerns</p>
            </div>
            <p className="text-3xl font-bold">{progressConcerns}</p>
          </div>
          <div className="kpi-card kpi-card-success">
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-4 h-4 text-success" />
              <p className="text-xs font-medium text-muted-foreground uppercase">Selection Changes</p>
            </div>
            <p className="text-3xl font-bold">{selectionsChanged}</p>
          </div>
        </motion.div>

        {/* Summary */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card-elevated rounded-2xl p-6 mb-6">
          <h3 className="text-sm font-bold uppercase text-muted-foreground mb-2 tracking-wider">Executive Summary</h3>
          <p className="text-foreground leading-relaxed">{analysis.summary}</p>
        </motion.div>

        {/* Warnings */}
        {analysis.warnings && analysis.warnings.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <WarningsSection warnings={analysis.warnings} />
          </motion.div>
        )}

        {/* Project Details */}
        <ReportSection title="Project Details" icon={<Users className="w-4 h-4" />} delay={0.2} sectionAnalysis={findSection("Project Detail")}>
          <ProjectDetailsCard details={analysis.project_details} />
        </ReportSection>

        {/* Progress Comparison */}
        <ReportSection title="Weekly Progress Comparison" icon={<TrendingUp className="w-4 h-4" />} delay={0.25} sectionAnalysis={findSection("Progress")}>
          <ProgressComparisonSection items={analysis.progress_comparison} />
        </ReportSection>

        {/* Risk Register */}
        <ReportSection title="Risk Register & Critical Open Pointers" icon={<Shield className="w-4 h-4" />} delay={0.3} sectionAnalysis={findSection("Risk")}>
          <RiskRegisterSection items={analysis.risk_register} />
        </ReportSection>

        {/* Selection Changes */}
        <ReportSection title="Selection Schedule Changes" icon={<Target className="w-4 h-4" />} delay={0.35} sectionAnalysis={findSection("Selection")}>
          <SelectionChangesSection items={analysis.selection_changes} />
        </ReportSection>

        {/* Design Revisions */}
        <ReportSection title="Design Revisions" icon={<FileText className="w-4 h-4" />} delay={0.4} sectionAnalysis={findSection("Floor Plan") || findSection("Design") || findSection("Revision")}>
          <DesignRevisionsCard revisions={analysis.design_revisions} />
        </ReportSection>

        {/* Timeline */}
        <ReportSection title="Project Timeline" icon={<Calendar className="w-4 h-4" />} delay={0.45} sectionAnalysis={findSection("Timeline")}>
          <TimelineSection items={analysis.timeline_comparison} />
        </ReportSection>

        {/* Image Comparison */}
        {analysis.image_comparison && analysis.image_comparison.status !== 'insufficient_data' && (
          <ReportSection title="Site Photo Comparison" icon={<Camera className="w-4 h-4" />} delay={0.5} sectionAnalysis={findSection("Photo") || findSection("3D")}>
            <ImageComparisonSection comparison={analysis.image_comparison} />
          </ReportSection>
        )}

        {/* 3D vs Site Image Areas (fallback) */}
        {analysis.image_areas && analysis.image_areas.length > 0 && !analysis.image_comparison && (
          <ReportSection title="3D vs Actual Site Photos" icon={<Eye className="w-4 h-4" />} delay={0.5} sectionAnalysis={findSection("Photo") || findSection("3D")}>
            <ImageAreasSection areas={analysis.image_areas} />
          </ReportSection>
        )}
      </div>
    </DashboardLayout>
  );
}

/* Inline section analysis rendered at end of each section */
function SectionAnalysisInline({ section }: { section: AnalysisSection }) {
  const statusColors: Record<string, string> = {
    healthy: "bg-success/10 text-success border-success/20",
    at_risk: "bg-warning/10 text-warning border-warning/20",
    critical: "bg-critical/10 text-critical border-critical/20",
    unchanged: "bg-muted text-muted-foreground border-border",
  };
  const statusIcons: Record<string, React.ReactNode> = {
    healthy: <CheckCircle2 className="w-3.5 h-3.5 text-success" />,
    at_risk: <AlertTriangle className="w-3.5 h-3.5 text-warning" />,
    critical: <XCircle className="w-3.5 h-3.5 text-critical" />,
    unchanged: <Minus className="w-3.5 h-3.5 text-muted-foreground" />,
  };

  const borderColor: Record<string, string> = {
    healthy: "border-l-4 border-l-success/60 border border-success/15",
    at_risk: "border-l-4 border-l-warning/60 border border-warning/15",
    critical: "border-l-4 border-l-critical/60 border border-critical/15",
    unchanged: "border-l-4 border-l-muted-foreground/40 border border-border/50",
  };

  const bgColor: Record<string, string> = {
    healthy: "bg-success/5",
    at_risk: "bg-warning/5",
    critical: "bg-critical/5",
    unchanged: "bg-muted/20",
  };

  return (
    <div className={`mt-4 rounded-xl p-4 ${borderColor[section.status] || borderColor.unchanged} ${bgColor[section.status] || bgColor.unchanged}`}>
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <span className="text-xs font-bold uppercase text-muted-foreground tracking-wider">AI Analysis</span>
        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${statusColors[section.status] || statusColors.unchanged}`}>
          {section.status.replace('_', ' ')}
        </span>
      </div>
      <p className="text-sm text-muted-foreground mb-2">{section.summary}</p>
      {section.findings && section.findings.length > 0 && (
        <ul className="space-y-1.5">
          {section.findings.map((f, j) => (
            <li key={j} className="text-xs flex items-start gap-2">
              {statusIcons[section.status] || <CircleDot className="w-3 h-3 text-muted-foreground mt-0.5 flex-shrink-0" />}
              <span>{f}</span>
            </li>
          ))}
        </ul>
      )}
      {section.recommendations && section.recommendations.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border/50">
          <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider mb-1.5">Recommendations</p>
          <ul className="space-y-1">
            {section.recommendations.map((r, j) => (
              <li key={j} className="text-xs flex items-start gap-2">
                <ArrowRight className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ReportSection({ title, icon, delay, children, sectionAnalysis }: { title: string; icon: React.ReactNode; delay: number; children: React.ReactNode; sectionAnalysis?: AnalysisSection }) {
  const [open, setOpen] = useState(true);
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} className="mb-6">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-4 glass-card-elevated rounded-2xl hover:bg-muted/30 transition-colors">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center text-primary-foreground">{icon}</div>
          <h2 className="text-lg font-semibold">{title}</h2>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && (
        <div className="mt-3">
          {children}
          {sectionAnalysis && <SectionAnalysisInline section={sectionAnalysis} />}
        </div>
      )}
    </motion.div>
  );
}

function WarningsSection({ warnings }: { warnings: Warning[] }) {
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const sorted = [...warnings].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  const severityStyles: Record<string, { bg: string; border: string; icon: string; accent: string }> = {
    critical: { bg: "bg-critical/5", border: "border-critical/20", icon: "text-critical", accent: "bg-critical" },
    high: { bg: "bg-warning/5", border: "border-warning/20", icon: "text-warning", accent: "bg-warning" },
    medium: { bg: "bg-info/5", border: "border-info/20", icon: "text-info", accent: "bg-info" },
    low: { bg: "bg-muted", border: "border-border", icon: "text-muted-foreground", accent: "bg-muted-foreground" },
  };

  return (
    <div className="space-y-3 mb-6">
      <h2 className="flex items-center gap-2 text-lg font-semibold px-1">
        <AlertTriangle className="w-5 h-5 text-warning" />
        Warnings & Action Items
        <span className="text-xs font-bold bg-warning/10 text-warning px-2 py-0.5 rounded-full">{warnings.length}</span>
      </h2>
      {sorted.map((w, i) => {
        const s = severityStyles[w.severity] || severityStyles.low;
        return (
          <div key={i} className={`${s.bg} border ${s.border} rounded-xl p-4 relative overflow-hidden`}>
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${s.accent}`} />
            <div className="pl-3">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${s.bg} ${s.icon} border ${s.border}`}>{w.severity}</span>
                <span className="text-xs text-muted-foreground">{w.category}</span>
              </div>
              <p className="text-sm font-medium">{w.message}</p>
              {w.impact && (
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Zap className="w-3 h-3 flex-shrink-0" /> Impact: {w.impact}
                </p>
              )}
              {w.action_required && (
                <p className="text-xs font-medium text-primary mt-1 flex items-center gap-1">
                  <ArrowRight className="w-3 h-3 flex-shrink-0" /> {w.action_required}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ProjectDetailsCard({ details }: { details: ProjectDetails }) {
  if (!details) return null;
  return (
    <div className="glass-card-elevated rounded-2xl p-5 space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <DetailItem label="Client" value={details.client_name} />
        <DetailItem label="Created By" value={details.created_by} />
        <DetailItem label="Execution Team" value={details.execution_team} />
        <DetailItem label="Design Team" value={details.design_team} />
        <DetailItem label="Sales Team" value={details.sales_team} />
        <DetailItem label="Escalation Point" value={details.escalation_point} />
      </div>
      <div className="border-t border-border pt-4 space-y-2">
        <div className="flex items-center gap-2">
          {details.report_dates_different ? (
            <CheckCircle2 className="w-4 h-4 text-success" />
          ) : (
            <XCircle className="w-4 h-4 text-critical" />
          )}
          <span className="text-sm">Report dates: <strong>{details.wpr1_report_date}</strong> vs <strong>{details.wpr2_report_date}</strong>
            {details.report_dates_different ? (
              <span className="inline-flex items-center gap-1 ml-1"><CheckCircle2 className="w-3 h-3 text-success inline" /> Updated</span>
            ) : (
              <span className="inline-flex items-center gap-1 ml-1"><AlertTriangle className="w-3 h-3 text-warning inline" /> Same (issue!)</span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {details.end_dates_match ? (
            <CheckCircle2 className="w-4 h-4 text-success" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-warning" />
          )}
          <span className="text-sm">
            End date: <strong>{details.project_end_date_wpr1}</strong> vs <strong>{details.project_end_date_wpr2}</strong>
            {details.end_dates_match ? (
              <span className="inline-flex items-center gap-1 ml-1"><CheckCircle2 className="w-3 h-3 text-success inline" /> Consistent</span>
            ) : (
              <span className="inline-flex items-center gap-1 ml-1"><AlertTriangle className="w-3 h-3 text-warning inline" /> Changed</span>
            )}
          </span>
        </div>
        {!details.end_dates_match && details.end_date_discrepancy_reason && (
          <p className="text-xs text-warning ml-6">{details.end_date_discrepancy_reason}</p>
        )}
      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase font-medium text-muted-foreground tracking-wider">{label}</p>
      <p className="text-sm font-medium mt-0.5">{value || "—"}</p>
    </div>
  );
}

function ProgressComparisonSection({ items }: { items: ProgressItem[] }) {
  if (!items || items.length === 0) return <p className="text-sm text-muted-foreground">No progress data available</p>;

  return (
    <div className="glass-card-elevated rounded-2xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="text-left p-3 font-medium text-muted-foreground">Area</th>
            <th className="text-center p-3 font-medium text-muted-foreground">Previous</th>
            <th className="text-center p-3 font-medium text-muted-foreground">Current</th>
            <th className="text-center p-3 font-medium text-muted-foreground">Delta</th>
            <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i} className={`border-b border-border/50 ${item.concern ? 'bg-warning/5' : ''}`}>
              <td className="p-3 font-medium">{item.area}</td>
              <td className="p-3 text-center text-muted-foreground">{item.pct_wpr1}%</td>
              <td className="p-3 text-center font-medium">{item.pct_wpr2}%</td>
              <td className="p-3 text-center">
                <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
                  item.delta > 0 ? 'bg-success/10 text-success' : item.delta < 0 ? 'bg-critical/10 text-critical' : 'bg-muted text-muted-foreground'
                }`}>
                  {item.delta > 0 ? <TrendingUp className="w-3 h-3" /> : item.delta < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                  {item.delta > 0 ? '+' : ''}{item.delta}%
                </span>
              </td>
              <td className="p-3 text-xs text-muted-foreground">
                {item.reason || (item.concern ? (
                  <span className="inline-flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-warning" /> Needs attention</span>
                ) : (
                  <span className="inline-flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-success" /> OK</span>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RiskRegisterSection({ items }: { items: RiskItem[] }) {
  if (!items || items.length === 0) return <p className="text-sm text-muted-foreground">No risk items found</p>;

  const changeStyles: Record<string, { badge: string; accent: string }> = {
    resolved: { badge: "bg-success/10 text-success border-success/20", accent: "bg-success" },
    unchanged: { badge: "bg-warning/10 text-warning border-warning/20", accent: "bg-warning" },
    escalated: { badge: "bg-critical/10 text-critical border-critical/20", accent: "bg-critical" },
    new: { badge: "bg-info/10 text-info border-info/20", accent: "bg-info" },
  };

  return (
    <div className="space-y-3">
      {items.map((item, i) => {
        const cs = changeStyles[item.status_change] || changeStyles.unchanged;
        return (
          <div key={i} className="glass-card-elevated rounded-2xl p-4 relative overflow-hidden">
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${cs.accent}`} />
            <div className="pl-3">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <h3 className="font-semibold text-sm">{item.point}</h3>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${cs.badge}`}>
                  {item.status_change}
                </span>
                {item.weeks_open > 1 && (
                  <span className="text-[10px] text-warning font-medium flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {item.weeks_open}w open
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{item.details}</p>
              <p className="text-xs font-medium text-primary mt-1.5 flex items-center gap-1">
                <ArrowRight className="w-3 h-3" /> Action by: {item.action_by}
              </p>
              <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-border/50">
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground font-medium tracking-wider">Previous</p>
                  <p className="text-xs mt-0.5">{item.status_wpr1 || "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground font-medium tracking-wider">Current</p>
                  <p className="text-xs mt-0.5">{item.status_wpr2 || "—"}</p>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SelectionChangesSection({ items }: { items: SelectionChange[] }) {
  if (!items || items.length === 0) return <p className="text-sm text-muted-foreground">No selection changes detected</p>;

  const changed = items.filter(i => i.changed || i.regression);
  const unchanged = items.filter(i => !i.changed && !i.regression);

  return (
    <div className="space-y-4">
      {changed.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning" />
            Items with Changes ({changed.length})
          </h3>
          <div className="glass-card-elevated rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-3 font-medium text-muted-foreground">Category</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Item</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">Previous</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">Current</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {changed.map((item, i) => (
                  <tr key={i} className={`border-b border-border/50 ${item.regression ? 'bg-critical/5' : 'bg-warning/5'}`}>
                    <td className="p-3 text-xs text-muted-foreground">{item.category}</td>
                    <td className="p-3 font-medium">{item.item}</td>
                    <td className="p-3 text-center text-xs">{item.status_wpr1}</td>
                    <td className="p-3 text-center text-xs">{item.status_wpr2}</td>
                    <td className="p-3 text-xs text-muted-foreground">{item.remarks_wpr2 || item.remarks_wpr1 || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <p className="text-xs text-muted-foreground">{unchanged.length} items unchanged across both WPRs</p>
    </div>
  );
}

function DesignRevisionsCard({ revisions }: { revisions: RevisionComparison }) {
  if (!revisions) return null;
  return (
    <div className="glass-card-elevated rounded-2xl p-5 space-y-4">
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-xs font-bold uppercase text-muted-foreground mb-3 tracking-wider">Previous WPR</h3>
          {revisions.wpr1_revisions?.map((r, i) => (
            <div key={i} className="flex gap-3 mb-2">
              <span className="text-xs font-bold text-primary w-8">{r.revision}</span>
              <div>
                <p className="text-xs text-muted-foreground">{r.date}</p>
                <p className="text-sm">{r.remarks || "No remarks"}</p>
              </div>
            </div>
          ))}
        </div>
        <div>
          <h3 className="text-xs font-bold uppercase text-muted-foreground mb-3 tracking-wider">Current WPR</h3>
          {revisions.wpr2_revisions?.map((r, i) => (
            <div key={i} className="flex gap-3 mb-2">
              <span className="text-xs font-bold text-primary w-8">{r.revision}</span>
              <div>
                <p className="text-xs text-muted-foreground">{r.date}</p>
                <p className="text-sm">{r.remarks || "No remarks"}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-border pt-3">
        <div className="flex items-center gap-2">
          {revisions.new_revisions ? (
            <AlertTriangle className="w-4 h-4 text-warning" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-success" />
          )}
          <span className="text-sm">{revisions.comparison_notes}</span>
        </div>
      </div>
    </div>
  );
}

function TimelineSection({ items }: { items: TimelineItem[] }) {
  if (!items || items.length === 0) return <p className="text-sm text-muted-foreground">No timeline data available</p>;

  return (
    <div className="glass-card-elevated rounded-2xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="text-left p-3 font-medium text-muted-foreground">Activity</th>
            <th className="text-center p-3 font-medium text-muted-foreground">Start</th>
            <th className="text-center p-3 font-medium text-muted-foreground">End (Prev)</th>
            <th className="text-center p-3 font-medium text-muted-foreground">End (Curr)</th>
            <th className="text-left p-3 font-medium text-muted-foreground">Remarks</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i} className={`border-b border-border/50 ${item.date_changed ? 'bg-warning/5' : ''}`}>
              <td className="p-3 font-medium">{item.item}</td>
              <td className="p-3 text-center text-xs text-muted-foreground">{item.start_date}</td>
              <td className="p-3 text-center text-xs">{item.end_date_wpr1}</td>
              <td className="p-3 text-center text-xs font-medium">{item.end_date_wpr2}</td>
              <td className="p-3 text-xs text-muted-foreground">{item.critical_remarks || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ImageAreasSection({ areas }: { areas: string[] }) {
  return (
    <div className="glass-card-elevated rounded-2xl p-5">
      <p className="text-sm text-muted-foreground mb-3">
        Areas with 3D vs Actual Site photos — review for design fidelity and construction progress.
      </p>
      <div className="flex flex-wrap gap-2">
        {areas.map((area, i) => (
          <span key={i} className="text-xs bg-accent px-3 py-1.5 rounded-full font-medium text-accent-foreground">{area}</span>
        ))}
      </div>
    </div>
  );
}

function ImageComparisonSection({ comparison }: { comparison: ImageComparison }) {
  const severityStyles: Record<string, { bg: string; border: string; icon: React.ReactNode; text: string }> = {
    critical: { bg: "bg-critical/5", border: "border-critical/20", icon: <XCircle className="w-4 h-4 text-critical" />, text: "text-critical" },
    warning: { bg: "bg-warning/5", border: "border-warning/20", icon: <AlertTriangle className="w-4 h-4 text-warning" />, text: "text-warning" },
    ok: { bg: "bg-success/5", border: "border-success/20", icon: <CheckCircle2 className="w-4 h-4 text-success" />, text: "text-success" },
  };

  return (
    <div className="space-y-4">
      {comparison.recycled_photos_detected && (
        <div className="bg-critical/10 border border-critical/30 rounded-2xl p-4 flex items-start gap-3">
          <ImageOff className="w-6 h-6 text-critical flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-critical flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" /> Recycled Photos Detected
            </p>
            <p className="text-xs text-critical/80 mt-1">
              Some actual site photos appear identical between weeks. This suggests no new progress photos were captured, 
              which is unacceptable for client reporting and risks business reputation.
            </p>
            {comparison.confidence && (
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-critical/20 text-critical mt-2 inline-block">
                Confidence: {comparison.confidence}
              </span>
            )}
          </div>
        </div>
      )}

      {!comparison.recycled_photos_detected && (
        <div className="bg-success/10 border border-success/30 rounded-2xl p-4 flex items-start gap-3">
          <CheckCircle2 className="w-6 h-6 text-success flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-success flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Fresh Photos Confirmed
            </p>
            <p className="text-xs text-success/80 mt-1">
              Actual site photos show different content between weeks, indicating genuine progress documentation.
            </p>
          </div>
        </div>
      )}

      {comparison.areas_compared && comparison.areas_compared.length > 0 && (
        <div className="glass-card-elevated rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-3 font-medium text-muted-foreground">Area</th>
                <th className="text-center p-3 font-medium text-muted-foreground">Photos Status</th>
                <th className="text-center p-3 font-medium text-muted-foreground">Progress Visible</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {comparison.areas_compared.map((area, i) => {
                return (
                  <tr key={i} className={`border-b border-border/50 ${area.photos_identical ? 'bg-critical/5' : ''}`}>
                    <td className="p-3 font-medium">{area.area_name}</td>
                    <td className="p-3 text-center">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${
                        area.photos_identical 
                          ? 'bg-critical/10 text-critical border-critical/20' 
                          : 'bg-success/10 text-success border-success/20'
                      }`}>
                        {area.photos_identical ? <ImageOff className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                        {area.photos_identical ? 'Recycled' : 'Updated'}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      {area.progress_visible ? (
                        <span className="text-success text-xs font-medium flex items-center justify-center gap-1"><CheckCircle2 className="w-3 h-3" /> Yes</span>
                      ) : (
                        <span className="text-critical text-xs font-medium flex items-center justify-center gap-1"><XCircle className="w-3 h-3" /> No</span>
                      )}
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">{area.remarks}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {comparison.findings && comparison.findings.length > 0 && (
        <div className="glass-card-elevated rounded-2xl p-5">
          <h4 className="text-xs font-bold uppercase text-muted-foreground mb-3 tracking-wider">Key Findings</h4>
          <ul className="space-y-2">
            {comparison.findings.map((f, i) => (
              <li key={i} className="text-sm flex items-start gap-2">
                <Camera className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}

      {comparison.recommendation && (
        <div className="glass-card-elevated rounded-2xl p-4 border-l-4 border-primary">
          <p className="text-xs font-bold uppercase text-muted-foreground mb-1">Recommendation</p>
          <p className="text-sm">{comparison.recommendation}</p>
        </div>
      )}
    </div>
  );
}
