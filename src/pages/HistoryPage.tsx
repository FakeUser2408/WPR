import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Calendar, ArrowRight, AlertTriangle, CheckCircle2, XCircle, Filter } from "lucide-react";
import { getAnalysisHistory, getProjectList, type WPRAnalysis } from "@/lib/analysis";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function HistoryPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [analyses, setAnalyses] = useState<WPRAnalysis[]>([]);
  const [projects, setProjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [selectedWeek, setSelectedWeek] = useState<string>("all");

  useEffect(() => {
    Promise.all([getAnalysisHistory(), getProjectList()])
      .then(([data, projs]) => { setAnalyses(data); setProjects(projs); })
      .catch((err) => toast({ title: "Failed to load history", description: err.message, variant: "destructive" }))
      .finally(() => setLoading(false));
  }, []);

  const weekNumbers = useMemo(() => {
    const weeks = analyses
      .filter(a => a.week_number)
      .map(a => a.week_number!)
      .filter((v, i, arr) => arr.indexOf(v) === i)
      .sort((a, b) => b - a);
    return weeks;
  }, [analyses]);

  const filtered = useMemo(() => {
    return analyses.filter(a => {
      if (selectedProject !== "all" && a.project_name !== selectedProject) return false;
      if (selectedWeek !== "all" && String(a.week_number) !== selectedWeek) return false;
      return true;
    });
  }, [analyses, selectedProject, selectedWeek]);

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === 'healthy') return <CheckCircle2 className="w-4 h-4 text-success" />;
    if (status === 'at_risk') return <AlertTriangle className="w-4 h-4 text-warning" />;
    return <XCircle className="w-4 h-4 text-critical" />;
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-foreground mb-1">Analysis History</h1>
          <p className="text-muted-foreground mb-6">All previous WPR comparisons and their results.</p>
        </motion.div>

        {/* Filters */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="w-4 h-4" />
            <span>Filter:</span>
          </div>
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-[200px] h-9">
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map(p => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedWeek} onValueChange={setSelectedWeek}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="All Weeks" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Weeks</SelectItem>
              {weekNumbers.map(w => (
                <SelectItem key={w} value={String(w)}>Week {w}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(selectedProject !== "all" || selectedWeek !== "all") && (
            <button
              onClick={() => { setSelectedProject("all"); setSelectedWeek("all"); }}
              className="text-xs text-primary hover:underline"
            >
              Clear filters
            </button>
          )}
        </motion.div>

        {loading ? (
          <div className="flex items-center gap-3 text-muted-foreground py-12 justify-center">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse-dot" />
            Loading...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Calendar className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground">
              {analyses.length === 0 ? "No analyses yet. Upload two WPRs to get started." : "No results match your filters."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((a, i) => (
              <motion.button
                key={a.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => navigate(`/report/${a.id}`)}
                className="w-full glass-card rounded-xl p-4 hover:border-primary/30 hover:shadow-md transition-all text-left group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <StatusIcon status={a.overall_status} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-foreground">{a.project_name}</p>
                        {a.week_number && (
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                            W{a.week_number}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{a.wpr1_date} vs {a.wpr2_date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className={`text-lg font-bold ${
                        a.overall_status === 'healthy' ? 'text-success' :
                        a.overall_status === 'at_risk' ? 'text-warning' : 'text-critical'
                      }`}>{a.overall_score}/100</p>
                      <p className="text-[10px] text-muted-foreground">{a.created_at ? new Date(a.created_at).toLocaleDateString() : ''}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
