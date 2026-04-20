import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Upload, Play, FileText, Clock, AlertTriangle, CheckCircle2, XCircle, ArrowRight, Trash2, Pencil, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAnalysisHistory, analyzeWPRs, saveAnalysis, compareSitePhotos, type WPRAnalysis } from "@/lib/analysis";
import { extractTextFromPDF, extractSitePhotoPages } from "@/lib/pdf-extract";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import AnalysisJourney from "@/components/AnalysisJourney";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function sanitizeStorageKey(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export default function ProjectDetailPage() {
  const { name } = useParams<{ name: string }>();
  const projectName = decodeURIComponent(name || "");
  const navigate = useNavigate();
  const { toast } = useToast();
  const [analyses, setAnalyses] = useState<WPRAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekNumber, setWeekNumber] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [prevWeekNumber, setPrevWeekNumber] = useState("");
  const [prevFile, setPrevFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeStep, setAnalyzeStep] = useState("");
  const [deleteReport, setDeleteReport] = useState<WPRAnalysis | null>(null);
  const [editReport, setEditReport] = useState<WPRAnalysis | null>(null);
  const [editProjectName, setEditProjectName] = useState(projectName);
  const [editWeek, setEditWeek] = useState("");
  const [showRenameProject, setShowRenameProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState(projectName);
  const [storedWeeks, setStoredWeeks] = useState<number>(0);

  // Track seen reports in localStorage
  const SEEN_KEY = "wpr_seen_reports";
  const getSeenReports = (): Set<string> => {
    try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || "[]")); } catch { return new Set(); }
  };
  const isReportSeen = (id: string) => getSeenReports().has(id);
  const markReportSeen = (id: string) => {
    const seen = getSeenReports();
    seen.add(id);
    localStorage.setItem(SEEN_KEY, JSON.stringify([...seen]));
  };

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  const safeName = projectName.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();

  useEffect(() => {
    if (!projectName) return;
    // Ensure project exists in DB
    supabase.from("projects").upsert({ name: projectName }, { onConflict: "name" }).then(() => {});

    const checkStoredWeeks = async () => {
      const { data: weekFolders } = await supabase.storage.from("wpr-uploads").list(safeName, { limit: 100 });
      const weeks = (weekFolders || []).filter(w => w.name.startsWith("week_"));
      setStoredWeeks(weeks.length);
      setIsFirstTime(weeks.length < 1);
    };
    checkStoredWeeks();

    getAnalysisHistory()
      .then(all => {
        const filtered = all.filter(a => a.project_name === projectName);
        filtered.sort((a, b) => (b.week_number || 0) - (a.week_number || 0));
        setAnalyses(filtered);
      })
      .catch(err => toast({ title: "Error", description: err.message, variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [projectName]);

  const MAX_FILE_SIZE_MB = 200;

  const validateFile = (f: File | null, fieldKey: string): boolean => {
    if (!f) {
      setErrors(prev => ({ ...prev, [fieldKey]: "Please select a PDF file" }));
      return false;
    }
    if (!f.name.toLowerCase().endsWith('.pdf')) {
      setErrors(prev => ({ ...prev, [fieldKey]: "Only PDF files are accepted" }));
      return false;
    }
    if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setErrors(prev => ({ ...prev, [fieldKey]: `File exceeds ${MAX_FILE_SIZE_MB}MB limit` }));
      return false;
    }
    if (f.size < 1000) {
      setErrors(prev => ({ ...prev, [fieldKey]: "File appears to be empty or corrupted" }));
      return false;
    }
    setErrors(prev => { const n = { ...prev }; delete n[fieldKey]; return n; });
    return true;
  };

  const validateWeek = (week: string, fieldKey: string): boolean => {
    if (!week.trim()) {
      setErrors(prev => ({ ...prev, [fieldKey]: "Week number is required" }));
      return false;
    }
    const num = parseInt(week);
    if (isNaN(num) || num < 1 || num > 104) {
      setErrors(prev => ({ ...prev, [fieldKey]: "Enter a valid week (1-104)" }));
      return false;
    }
    setErrors(prev => { const n = { ...prev }; delete n[fieldKey]; return n; });
    return true;
  };

  const [uploadProgress, setUploadProgress] = useState("");

  const uploadSingleWPR = async (wprFile: File, week: string) => {
    // Step 1: Extract text
    setUploadProgress("Extracting text...");
    let text = "";
    try {
      text = await extractTextFromPDF(wprFile);
    } catch (extractErr) { console.warn("Text extraction failed:", extractErr); }

    // Step 2: Upload text
    if (text) {
      setUploadProgress("Uploading text...");
      const textPath = `${safeName}/week_${week}/extracted.txt`;
      const textBlob = new Blob([text], { type: "text/plain" });
      await supabase.storage.from("wpr-uploads").upload(textPath, textBlob, { contentType: "text/plain", upsert: true });
    }

    // Step 3: Extract site photo images ONLY from "3Ds Vs Actual Site Photos" section
    setUploadProgress("Extracting site photo pages...");
    let imageBlobs: Blob[] = [];
    try {
      imageBlobs = await extractSitePhotoPages(wprFile, { maxPages: 12, scale: 1.5, quality: 0.7 });
    } catch (imgErr) { console.warn("Site photo extraction failed:", imgErr); }

    // Step 4: Upload images in parallel batches
    if (imageBlobs.length > 0) {
      setUploadProgress(`Uploading ${imageBlobs.length} site photo pages...`);
      const batchSize = 3;
      for (let i = 0; i < imageBlobs.length; i += batchSize) {
        const batch = imageBlobs.slice(i, i + batchSize);
        await Promise.all(batch.map((blob, bIdx) => {
          const imgPath = `${safeName}/week_${week}/page_${i + bIdx + 1}.jpg`;
          return supabase.storage.from("wpr-uploads").upload(imgPath, blob, { contentType: "image/jpeg", upsert: true });
        }));
        setUploadProgress(`Uploaded ${Math.min(i + batchSize, imageBlobs.length)}/${imageBlobs.length} images...`);
      }
    } else {
      setUploadProgress("No site photo pages found in PDF");
      await new Promise(r => setTimeout(r, 1500));
    }

    setUploadProgress("");
  };

  const handleUpload = useCallback(async () => {
    const weekValid = validateWeek(weekNumber, "weekNumber");
    const fileValid = validateFile(file, "file");
    if (!weekValid || !fileValid) return;

    setIsUploading(true);
    try {
      await uploadSingleWPR(file!, weekNumber);
      setFile(null);
      setWeekNumber("");
      setStoredWeeks(prev => prev + 1);
      toast({ title: `Week ${weekNumber} uploaded successfully` });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message || "Please try again.", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  }, [file, weekNumber, safeName, toast]);

  const [baselineUploading, setBaselineUploading] = useState(false);

  const handleBaselineUpload = useCallback(async () => {
    const weekValid = validateWeek(prevWeekNumber, "prevWeekNumber");
    const fileValid = validateFile(prevFile, "prevFile");
    if (!weekValid || !fileValid) return;

    setBaselineUploading(true);
    try {
      await uploadSingleWPR(prevFile!, prevWeekNumber);
      setPrevFile(null);
      setPrevWeekNumber("");
      setStoredWeeks(prev => prev + 1);
      setIsFirstTime(false);
      toast({ title: `Baseline (Week ${prevWeekNumber}) uploaded - now upload the current week above` });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message || "Please try again.", variant: "destructive" });
    } finally {
      setBaselineUploading(false);
    }
  }, [prevFile, prevWeekNumber, safeName, toast]);

  /**
   * Client-side analysis: download stored texts + images, run Gemini locally.
   */
  const handleAnalyzeThis = async () => {
    setIsAnalyzing(true);
    setAnalyzeStep("connecting");
    try {
      // Step 1: Find the two most recent weeks in storage
      await new Promise(r => setTimeout(r, 400));
      setAnalyzeStep("scanning");

      const { data: weekFolders } = await supabase.storage.from("wpr-uploads").list(safeName, { limit: 100 });
      const sortedWeeks = (weekFolders || [])
        .filter(w => w.name.startsWith("week_"))
        .sort((a, b) => {
          const numA = parseInt(a.name.replace("week_", ""));
          const numB = parseInt(b.name.replace("week_", ""));
          return numA - numB;
        });

      if (sortedWeeks.length < 2) {
        toast({ title: "Need at least 2 weeks", description: "Upload at least 2 weekly WPRs first.", variant: "destructive" });
        return;
      }

      const prevWeek = sortedWeeks[sortedWeeks.length - 2];
      const currWeek = sortedWeeks[sortedWeeks.length - 1];
      const currWeekNum = parseInt(currWeek.name.replace("week_", ""));
      const prevWeekNum = parseInt(prevWeek.name.replace("week_", ""));

      // Check if already analyzed
      const { data: existing } = await supabase
        .from("wpr_analyses")
        .select("id")
        .eq("project_name", projectName)
        .eq("week_number", currWeekNum)
        .limit(1);

      if (existing && existing.length > 0) {
        setAnalyzeStep("done");
        await new Promise(r => setTimeout(r, 800));
        toast({ title: "Already up to date", description: `Week ${currWeekNum} has already been analyzed.` });
        return;
      }

      // Step 2: Download extracted text
      setAnalyzeStep("extracting");

      const downloadWprText = async (weekName: string): Promise<string | null> => {
        const txtRes = await supabase.storage.from("wpr-uploads").download(`${safeName}/${weekName}/extracted.txt`);
        if (txtRes.data) return txtRes.data.text();
        return null;
      };

      const [prevText, currText] = await Promise.all([
        downloadWprText(prevWeek.name),
        downloadWprText(currWeek.name),
      ]);

      if (!prevText || !currText) {
        toast({ title: "Missing WPR data", description: "Could not find extracted.md or extracted.txt. Re-upload the WPRs.", variant: "destructive" });
        return;
      }

      if (prevText.length < 50 || currText.length < 50) {
        toast({ title: "Text too short", description: "WPR content is too short for analysis.", variant: "destructive" });
        return;
      }

      // Step 3: Run text analysis via Gemini
      setAnalyzeStep("analyzing");
      const analysis = await analyzeWPRs(prevText, currText);

      // Step 4: Run image comparison
      setAnalyzeStep("photos");

      // Download images for both weeks
      const downloadWeekImages = async (weekFolder: string): Promise<Blob[]> => {
        const { data: files } = await supabase.storage.from("wpr-uploads").list(`${safeName}/${weekFolder}`, { limit: 50 });
        if (!files) return [];

        const imageFiles = files
          .filter(f => f.name.endsWith(".jpg") && f.name.startsWith("page_"))
          .sort((a, b) => a.name.localeCompare(b.name));

        const blobs: Blob[] = [];
        for (const f of imageFiles) {
          const { data } = await supabase.storage.from("wpr-uploads").download(`${safeName}/${weekFolder}/${f.name}`);
          if (data) blobs.push(data);
        }
        return blobs;
      };

      const [prevImages, currImages] = await Promise.all([
        downloadWeekImages(prevWeek.name),
        downloadWeekImages(currWeek.name),
      ]);

      let imageComparison = null;
      if (prevImages.length > 0 && currImages.length > 0) {
        imageComparison = await compareSitePhotos(prevImages, currImages, prevWeekNum, currWeekNum, projectName);
      }

      if (imageComparison) {
        analysis.image_comparison = imageComparison;
      }

      // Step 5: Save to database
      setAnalyzeStep("saving");
      const id = await saveAnalysis(analysis, currWeekNum);

      setAnalyzeStep("done");
      await new Promise(r => setTimeout(r, 800));
      toast({ title: "Analysis complete" });
      navigate(`/report/${id}`);
    } catch (err: any) {
      toast({ title: "Analysis failed", description: err.message || "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setIsAnalyzing(false);
      setAnalyzeStep("");
    }
  };

  const handleDeleteReport = async () => {
    if (!deleteReport?.id) return;
    try {
      await supabase.from("wpr_analyses").delete().eq("id", deleteReport.id);
      setAnalyses(prev => prev.filter(a => a.id !== deleteReport.id));
      toast({ title: "Report deleted" });
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    } finally {
      setDeleteReport(null);
    }
  };

  const handleEditReport = async () => {
    if (!editReport?.id) return;
    try {
      const updates: any = {};
      if (editWeek) updates.week_number = parseInt(editWeek);
      if (editProjectName.trim() && editProjectName.trim() !== editReport.project_name) updates.project_name = editProjectName.trim();
      if (Object.keys(updates).length === 0) { setEditReport(null); return; }
      await supabase.from("wpr_analyses").update(updates).eq("id", editReport.id);
      setAnalyses(prev => prev.map(a => a.id === editReport.id ? { ...a, ...updates } : a));
      toast({ title: "Report updated" });
    } catch (err: any) {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    } finally {
      setEditReport(null);
    }
  };

  const handleRenameProject = async () => {
    if (!newProjectName.trim() || newProjectName.trim() === projectName) { setShowRenameProject(false); return; }
    const newName = newProjectName.trim();
    try {
      for (const a of analyses) {
        if (a.id) await supabase.from("wpr_analyses").update({ project_name: newName }).eq("id", a.id);
      }
      await supabase.from("projects").update({ name: newName }).eq("name", projectName);
      toast({ title: "Project renamed" });
      navigate(`/project/${encodeURIComponent(newName)}`, { replace: true });
    } catch (err: any) {
      toast({ title: "Rename failed", description: err.message, variant: "destructive" });
    } finally {
      setShowRenameProject(false);
    }
  };

  const latest = analyses[0];
  const statusColor = !latest ? 'text-muted-foreground' :
    latest.overall_status === 'healthy' ? 'text-success' :
    latest.overall_status === 'at_risk' ? 'text-warning' : 'text-critical';

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto px-6 py-8">
        <button onClick={() => navigate("/projects")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> All Projects
        </button>

        {/* Project Header */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-3xl font-bold font-sans">{projectName}</h1>
                  <button
                    onClick={() => { setNewProjectName(projectName); setShowRenameProject(true); }}
                    className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                    title="Rename project"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-muted-foreground mt-1 font-body">{analyses.length} analysis{analyses.length !== 1 ? 'es' : ''} on record</p>
              </div>
            </div>
            {latest && (
              <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl ${
                latest.overall_status === 'healthy' ? 'bg-success/10 border border-success/20' :
                latest.overall_status === 'at_risk' ? 'bg-warning/10 border border-warning/20' : 'bg-critical/10 border border-critical/20'
              }`}>
                <div>
                  <p className={`text-3xl font-bold ${statusColor}`}>{latest.overall_score}</p>
                  <p className={`text-xs font-bold uppercase ${statusColor}`}>{latest.overall_status.replace('_', ' ')}</p>
                </div>
                <p className="text-xs text-muted-foreground">/100<br/>Latest</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Upload & Analyze Row */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className={`glass-card-elevated rounded-2xl p-6 mb-8 ${isFirstTime ? 'opacity-60 pointer-events-none' : ''}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2 font-sans">
              <Upload className="w-5 h-5 text-primary" /> Add New WPR
            </h3>
          </div>

          {isFirstTime && (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/50 border border-border/50 mb-4 pointer-events-auto opacity-100">
              <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground font-body">
                Upload a baseline WPR below first. This section will be enabled once a baseline is available.
              </p>
            </div>
          )}

          {/* Current week upload */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[140px]">
              <label className="text-xs font-medium text-muted-foreground mb-1 block font-body">Week Number <span className="text-destructive">*</span></label>
              <Input
                type="number"
                placeholder="e.g. 14"
                value={weekNumber}
                onChange={e => { setWeekNumber(e.target.value); if (errors.weekNumber) validateWeek(e.target.value, "weekNumber"); }}
                disabled={isFirstTime}
                className={errors.weekNumber ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              {errors.weekNumber && <p className="text-[11px] text-destructive mt-1 font-body">{errors.weekNumber}</p>}
            </div>
            <div className="flex-[2] min-w-[200px]">
              <label className="text-xs font-medium text-muted-foreground mb-1 block font-body">WPR File <span className="text-destructive">*</span></label>
              <div
                className={`glass-card rounded-lg px-3 py-2 ${isFirstTime ? 'cursor-not-allowed' : 'cursor-pointer hover:border-primary/30'} transition-colors flex items-center gap-2 text-sm h-10 relative ${errors.file ? 'border-destructive' : ''}`}
                onClick={() => !isFirstTime && document.getElementById('wpr-file-input')?.click()}
              >
                <FileText className={`w-4 h-4 shrink-0 ${errors.file ? 'text-destructive' : file ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className={`truncate font-body ${file ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>{file?.name || "Select PDF or .md file..."}</span>
              </div>
              {!isFirstTime && <input id="wpr-file-input" type="file" accept=".pdf,.md" className="sr-only" onChange={e => { const f = e.target.files?.[0] || null; setFile(f); if (f) validateFile(f, "file"); }} />}
              {errors.file && <p className="text-[11px] text-destructive mt-1 font-body">{errors.file}</p>}
            </div>
            <Button onClick={handleUpload} disabled={isFirstTime || isUploading} className="gap-2">
              {isUploading ? (uploadProgress || "Uploading...") : "Upload"}
            </Button>
          </div>
          {isUploading && uploadProgress && (
            <div className="flex items-center gap-2 mt-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse-dot" />
              <span className="text-xs text-muted-foreground font-body">{uploadProgress}</span>
            </div>
          )}

          {/* Analysis buttons */}
          {!isFirstTime && (
            <>
              <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-border/50">
                <Button onClick={handleAnalyzeThis} disabled={isAnalyzing || storedWeeks < 2} className="gap-2 gradient-bg border-0 glow-shadow hover:opacity-90">
                  {isAnalyzing ? (<><div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> Analyzing...</>) : (<><Play className="w-4 h-4" /> Analyze This Project</>)}
                </Button>
                {storedWeeks < 2 && (
                  <span className="text-xs text-muted-foreground font-body">Need at least 2 uploaded weeks to analyze.</span>
                )}
              </div>
              <AnalysisJourney currentStep={analyzeStep} isVisible={isAnalyzing} />
            </>
          )}

          {!isFirstTime && (
            <p className="text-xs text-muted-foreground mt-3 font-body">
              Upload the current week's WPR. The system automatically uses the stored previous week for comparison.
            </p>
          )}
        </motion.div>

        {/* First-time baseline upload */}
        {isFirstTime && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card-elevated rounded-2xl p-6 mb-8">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/10 mb-5">
              <Info className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div className="text-sm text-muted-foreground font-body">
                <p className="font-medium text-foreground mb-1">First-Time Setup</p>
                <p>Upload your <strong>previous week's WPR</strong> below as a baseline. Once uploaded, go back up and upload the current week's WPR, then run the analysis.</p>
              </div>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[140px]">
                <label className="text-xs font-medium text-muted-foreground mb-1 block font-body">Previous Week # <span className="text-destructive">*</span></label>
                <Input
                  type="number"
                  placeholder="e.g. 12"
                  value={prevWeekNumber}
                  onChange={e => { setPrevWeekNumber(e.target.value); if (errors.prevWeekNumber) validateWeek(e.target.value, "prevWeekNumber"); }}
                  className={errors.prevWeekNumber ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {errors.prevWeekNumber && <p className="text-[11px] text-destructive mt-1 font-body">{errors.prevWeekNumber}</p>}
              </div>
              <div className="flex-[2] min-w-[200px]">
                <label className="text-xs font-medium text-muted-foreground mb-1 block font-body">Previous Week WPR File <span className="text-destructive">*</span></label>
                <div
                  className={`glass-card rounded-lg px-3 py-2 cursor-pointer hover:border-primary/30 transition-colors flex items-center gap-2 text-sm h-10 ${errors.prevFile ? 'border-destructive' : ''}`}
                  onClick={() => document.getElementById('baseline-file-input')?.click()}
                >
                  <FileText className={`w-4 h-4 shrink-0 ${errors.prevFile ? 'text-destructive' : prevFile ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={`truncate font-body ${prevFile ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>{prevFile?.name || "Select PDF or .md file..."}</span>
                </div>
                <input id="baseline-file-input" type="file" accept=".pdf,.md" className="sr-only" onChange={e => { const f = e.target.files?.[0] || null; setPrevFile(f); if (f) validateFile(f, "prevFile"); }} />
                {errors.prevFile && <p className="text-[11px] text-destructive mt-1 font-body">{errors.prevFile}</p>}
              </div>
              <Button onClick={handleBaselineUpload} disabled={baselineUploading} className="gap-2">
                {baselineUploading ? (uploadProgress || "Uploading...") : "Upload Baseline"}
              </Button>
            </div>
            {baselineUploading && uploadProgress && (
              <div className="flex items-center gap-2 mt-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse-dot" />
                <span className="text-xs text-muted-foreground font-body">{uploadProgress}</span>
              </div>
            )}
          </motion.div>
        )}

        {/* Analysis History */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <h3 className="font-semibold mb-4 flex items-center gap-2 font-sans">
            <Clock className="w-5 h-5 text-primary" /> Analysis History
          </h3>

          {loading ? (
            <div className="flex items-center gap-3 text-muted-foreground py-12 justify-center"><div className="w-2 h-2 rounded-full bg-primary animate-pulse-dot" /> Loading...</div>
          ) : analyses.length === 0 && !isFirstTime ? (
            <div className="glass-card rounded-2xl p-6">
              <div className="text-center py-6">
                <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground font-body">No analyses yet. Upload the current week's WPR above and run analysis.</p>
              </div>
            </div>
          ) : analyses.length > 0 ? (
            <div className="space-y-3">
              {analyses.map((a, i) => {
                const StatusIcon = a.overall_status === 'healthy' ? CheckCircle2 : a.overall_status === 'at_risk' ? AlertTriangle : XCircle;
                const sc = a.overall_status === 'healthy' ? 'text-success' : a.overall_status === 'at_risk' ? 'text-warning' : 'text-critical';

                return (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className={`w-full glass-card rounded-xl p-4 hover:border-primary/20 transition-all text-left group relative ${!isReportSeen(a.id!) ? 'ring-2 ring-primary/30 border-primary/20' : ''}`}
                  >
                    {/* Report action buttons */}
                    <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditProjectName(a.project_name); setEditWeek(String(a.week_number || "")); setEditReport(a); }}
                        className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                        title="Edit report"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteReport(a); }}
                        className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        title="Delete report"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button onClick={() => { markReportSeen(a.id!); navigate(`/report/${a.id}`); }} className="w-full text-left">
                      <div className="flex items-center justify-between pr-16">
                        <div className="flex items-center gap-3">
                          <StatusIcon className={`w-5 h-5 ${sc}`} />
                          <div>
                            <div className="flex items-center gap-2">
                              {!isReportSeen(a.id!) && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground animate-pulse">NEW</span>
                              )}
                              {a.week_number && (
                                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">Week {a.week_number}</span>
                              )}
                              <span className="text-sm text-muted-foreground font-body">{a.wpr1_date} &rarr; {a.wpr2_date}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 font-body">{a.summary?.substring(0, 100)}...</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className={`text-xl font-bold ${sc}`}>{a.overall_score}/100</p>
                          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-all" />
                        </div>
                      </div>
                    </button>
                  </motion.div>
                );
              })}
            </div>
          ) : null}
        </motion.div>
      </div>

      {/* Delete Report Confirmation */}
      <AlertDialog open={!!deleteReport} onOpenChange={(open) => !open && setDeleteReport(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this report?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the Week {deleteReport?.week_number} analysis ({deleteReport?.wpr1_date} &rarr; {deleteReport?.wpr2_date}). This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteReport} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Report Dialog */}
      <Dialog open={!!editReport} onOpenChange={(open) => !open && setEditReport(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Report</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Week Number</label>
              <Input type="number" value={editWeek} onChange={e => setEditWeek(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Project Name</label>
              <Input value={editProjectName} onChange={e => setEditProjectName(e.target.value)} />
            </div>
            <Button onClick={handleEditReport} className="w-full">Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename Project Dialog */}
      <Dialog open={showRenameProject} onOpenChange={setShowRenameProject}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rename Project</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <Input value={newProjectName} onChange={e => setNewProjectName(e.target.value)} onKeyDown={e => e.key === "Enter" && handleRenameProject()} />
            <Button onClick={handleRenameProject} disabled={!newProjectName.trim() || newProjectName.trim() === projectName} className="w-full">Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
