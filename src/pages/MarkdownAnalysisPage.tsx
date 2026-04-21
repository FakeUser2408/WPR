import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Upload, ArrowRight, FileCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { analyzeWPRsMD, saveAnalysis } from "@/lib/analysis";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";

type UploadState = { file: File | null; text: string; name: string };

const MarkdownAnalysisPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [wpr1, setWpr1] = useState<UploadState>({ file: null, text: "", name: "" });
  const [wpr2, setWpr2] = useState<UploadState>({ file: null, text: "", name: "" });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const [weekNumber, setWeekNumber] = useState<string>("");

  const handleFileDrop = useCallback(async (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (s: UploadState) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".md")) {
      toast({ title: "Invalid file", description: "Please upload a Markdown (.md) file", variant: "destructive" });
      return;
    }
    try {
      setter({ file, text: "", name: file.name });
      const text = await file.text();
      setter({ file, text, name: file.name });
      toast({ title: "Markdown loaded", description: `${file.name}: ready for analysis` });
    } catch (err) {
      toast({ title: "Failed to read file", description: String(err), variant: "destructive" });
      setter({ file: null, text: "", name: "" });
    }
  }, [toast]);

  const handleAnalyze = async () => {
    if (!wpr1.text || !wpr2.text) {
      toast({ title: "Missing files", description: "Please upload both WPR markdown files", variant: "destructive" });
      return;
    }
    setIsAnalyzing(true);
    setProgress(10);
    setProgressMessage("Sending to AI for analysis...");

    try {
      setProgress(30);
      setProgressMessage("AI is comparing both WPRs...");
      const analysis = await analyzeWPRsMD(wpr1.text, wpr2.text);

      setProgress(80);
      setProgressMessage("Saving analysis results...");
      const wk = weekNumber ? parseInt(weekNumber) : undefined;
      const id = await saveAnalysis(analysis, wk);

      setProgress(100);
      setProgressMessage("Complete!");
      setTimeout(() => navigate(`/report/${id}`), 500);
    } catch (err: any) {
      toast({ title: "Analysis failed", description: err.message, variant: "destructive" });
      setIsAnalyzing(false);
      setProgress(0);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center glow-shadow">
              <FileCode className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold">Markdown Analysis</h1>
          </div>
          <p className="text-muted-foreground text-lg max-w-2xl">
            Upload two WPR markdown exports for comparison. Markdown files are lighter and faster to analyze than PDFs.
          </p>
        </motion.div>

        <div className="space-y-6">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3">
            <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">Week #</label>
            <Input type="number" placeholder="e.g. 12" value={weekNumber} onChange={e => setWeekNumber(e.target.value)} className="w-28" />
            <span className="text-xs text-muted-foreground">(optional)</span>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            <UploadCard label="Previous Week WPR" sublabel="Older report as baseline" state={wpr1} onChange={(e) => handleFileDrop(e, setWpr1)} index={0} />
            <UploadCard label="Current Week WPR" sublabel="Latest report to analyze" state={wpr2} onChange={(e) => handleFileDrop(e, setWpr2)} index={1} />
          </div>

          <AnimatePresence>
            {isAnalyzing ? (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-card-elevated rounded-2xl p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse-dot" />
                  <span className="text-sm font-medium">{progressMessage}</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div className="h-full gradient-bg rounded-full" initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.5 }} />
                </div>
                <p className="text-xs text-muted-foreground mt-3">This typically takes 20-40 seconds</p>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                <Button onClick={handleAnalyze} disabled={!wpr1.text || !wpr2.text} size="lg" className="w-full md:w-auto h-12 px-8 text-base gap-2 gradient-bg border-0 glow-shadow hover:opacity-90">
                  Run Comparison Analysis
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </DashboardLayout>
  );
};

function UploadCard({ label, sublabel, state, onChange, index }: {
  label: string; sublabel: string; state: UploadState;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; index: number;
}) {
  return (
    <motion.label
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`glass-card-elevated rounded-2xl p-6 cursor-pointer transition-all duration-200 hover:border-primary/30 group relative overflow-hidden ${state.text ? "border-success/30 bg-success/5" : ""}`}
    >
      <input type="file" accept=".md" onChange={onChange} className="sr-only" />
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${state.text ? "bg-success/10" : "bg-muted group-hover:bg-primary/10"}`}>
          {state.text ? <FileText className="w-6 h-6 text-success" /> : <Upload className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{label}</p>
          <p className="text-sm text-muted-foreground mt-0.5">{sublabel}</p>
          {state.name && <p className="text-xs text-success mt-2 font-medium truncate">{state.name}</p>}
          {!state.file && <p className="text-xs text-muted-foreground mt-2">Click to select Markdown (.md)</p>}
          {state.file && !state.text && (
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-dot" />
              Reading file...
            </p>
          )}
        </div>
      </div>
    </motion.label>
  );
}

export default MarkdownAnalysisPage;
