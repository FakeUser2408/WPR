import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FolderOpen, Plus, ArrowRight, AlertTriangle, CheckCircle2, XCircle, Play, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAnalysisHistory, analyzeWPRs, saveAnalysis, compareSitePhotos, type WPRAnalysis } from "@/lib/analysis";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface ProjectSummary {
  name: string;
  latestScore: number;
  latestStatus: string;
  totalWeeks: number;
  latestWeek: number | null;
  latestDate: string;
  latestId: string;
  allIds: string[];
  hasAnalyses: boolean;
}

export default function ProjectsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [analyses, setAnalyses] = useState<WPRAnalysis[]>([]);
  const [dbProjects, setDbProjects] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState("");
  const [scanResults, setScanResults] = useState<Array<{ project: string; status: string; detail?: string }>>([]);
  const [scanningProject, setScanningProject] = useState("");
  const [newProject, setNewProject] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteProject, setDeleteProject] = useState<ProjectSummary | null>(null);
  const [renameProject, setRenameProject] = useState<ProjectSummary | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const loadData = async () => {
    try {
      const [allAnalyses, { data: projectRows }] = await Promise.all([
        getAnalysisHistory(),
        supabase.from("projects").select("id, name").order("name"),
      ]);
      setAnalyses(allAnalyses);
      setDbProjects(projectRows || []);
    } catch (err: any) {
      toast({ title: "Failed to load projects", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // Merge DB projects with analysis data
  const projects: ProjectSummary[] = (() => {
    const analysisMap = analyses.reduce((acc, a) => {
      const key = a.project_name;
      if (!acc[key]) {
        acc[key] = {
          name: key,
          latestScore: a.overall_score,
          latestStatus: a.overall_status,
          totalWeeks: 1,
          latestWeek: a.week_number || null,
          latestDate: a.created_at || "",
          latestId: a.id || "",
          allIds: [a.id || ""],
          hasAnalyses: true,
        };
      } else {
        acc[key].totalWeeks += 1;
        acc[key].allIds.push(a.id || "");
        if (a.created_at && acc[key].latestDate < (a.created_at || "")) {
          acc[key].latestScore = a.overall_score;
          acc[key].latestStatus = a.overall_status;
          acc[key].latestWeek = a.week_number || acc[key].latestWeek;
          acc[key].latestDate = a.created_at || "";
          acc[key].latestId = a.id || "";
        }
      }
      return acc;
    }, {} as Record<string, ProjectSummary>);

    // Add DB-only projects (no analyses yet)
    for (const p of dbProjects) {
      if (!analysisMap[p.name]) {
        analysisMap[p.name] = {
          name: p.name,
          latestScore: 0,
          latestStatus: "pending",
          totalWeeks: 0,
          latestWeek: null,
          latestDate: "",
          latestId: "",
          allIds: [],
          hasAnalyses: false,
        };
      }
    }

    return Object.values(analysisMap).sort((a, b) => a.name.localeCompare(b.name));
  })();

  const handleScanAll = async () => {
    setIsScanning(true);
    setScanResults([]);
    setScanningProject("");
    setScanStep("Scanning project storage...");
    const results: Array<{ project: string; status: string; detail?: string }> = [];

    try {
      // List all project folders in storage
      const { data: folders } = await supabase.storage.from("wpr-uploads").list("", { limit: 100 });
      if (!folders || folders.length === 0) {
        toast({ title: "No data found", description: "Upload WPRs to your projects first." });
        return;
      }

      // Build a map from safe folder names to display names
      const projectNameMap: Record<string, string> = {};
      for (const p of [...dbProjects, ...projects]) {
        const safeName = p.name.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
        projectNameMap[safeName] = p.name;
      }

      const projectFolders = folders.filter(f => !f.id && f.name); // only folders

      for (const folder of projectFolders) {
        const folderName = folder.name;
        const displayName = projectNameMap[folderName] || folderName;
        setScanningProject(displayName);
        setScanStep(`Analyzing ${displayName}...`);

        try {
          // List week folders
          const { data: weekFolders } = await supabase.storage.from("wpr-uploads").list(folderName, { limit: 100 });
          const sortedWeeks = (weekFolders || [])
            .filter(w => w.name.startsWith("week_"))
            .sort((a, b) => parseInt(a.name.replace("week_", "")) - parseInt(b.name.replace("week_", "")));

          if (sortedWeeks.length < 2) {
            results.push({ project: displayName, status: "skipped", detail: "Need at least 2 weeks" });
            setScanResults([...results]);
            continue;
          }

          const prevWeek = sortedWeeks[sortedWeeks.length - 2];
          const currWeek = sortedWeeks[sortedWeeks.length - 1];
          const currWeekNum = parseInt(currWeek.name.replace("week_", ""));

          // Check if already analyzed
          const { data: existing } = await supabase
            .from("wpr_analyses")
            .select("id")
            .eq("project_name", displayName)
            .eq("week_number", currWeekNum)
            .limit(1);

          if (existing && existing.length > 0) {
            results.push({ project: displayName, status: "already_done", detail: `Week ${currWeekNum} already analyzed` });
            setScanResults([...results]);
            continue;
          }

          // Download extracted text
          const [prevTextRes, currTextRes] = await Promise.all([
            supabase.storage.from("wpr-uploads").download(`${folderName}/${prevWeek.name}/extracted.txt`),
            supabase.storage.from("wpr-uploads").download(`${folderName}/${currWeek.name}/extracted.txt`),
          ]);

          if (!prevTextRes.data || !currTextRes.data) {
            results.push({ project: displayName, status: "error", detail: "Missing extracted text - re-upload WPRs" });
            setScanResults([...results]);
            continue;
          }

          const prevText = await prevTextRes.data.text();
          const currText = await currTextRes.data.text();

          if (prevText.length < 50 || currText.length < 50) {
            results.push({ project: displayName, status: "error", detail: "Extracted text too short" });
            setScanResults([...results]);
            continue;
          }

          // Run text analysis
          const analysis = await analyzeWPRs(prevText, currText);

          // Run image comparison
          const downloadWeekImages = async (weekFolder: string): Promise<Blob[]> => {
            const { data: files } = await supabase.storage.from("wpr-uploads").list(`${folderName}/${weekFolder}`, { limit: 50 });
            if (!files) return [];
            const imageFiles = files.filter(f => f.name.endsWith(".jpg") && f.name.startsWith("page_")).sort((a, b) => a.name.localeCompare(b.name));
            const blobs: Blob[] = [];
            for (const f of imageFiles) {
              const { data } = await supabase.storage.from("wpr-uploads").download(`${folderName}/${weekFolder}/${f.name}`);
              if (data) blobs.push(data);
            }
            return blobs;
          };

          const prevWeekNum = parseInt(prevWeek.name.replace("week_", ""));
          const [prevImages, currImages] = await Promise.all([
            downloadWeekImages(prevWeek.name),
            downloadWeekImages(currWeek.name),
          ]);

          if (prevImages.length > 0 && currImages.length > 0) {
            const imageComparison = await compareSitePhotos(prevImages, currImages, prevWeekNum, currWeekNum, displayName);
            if (imageComparison.status !== "error") {
              analysis.image_comparison = imageComparison;
            }
          }

          // Save with display name
          await saveAnalysis({ ...analysis, project_name: displayName }, currWeekNum);
          results.push({ project: displayName, status: "analyzed", detail: `Week ${currWeekNum} analysis saved` });
          setScanResults([...results]);
        } catch (projErr: any) {
          results.push({ project: displayName, status: "error", detail: projErr.message?.substring(0, 100) });
          setScanResults([...results]);
        }
      }

      setScanStep("Complete!");
      const analyzed = results.filter(r => r.status === "analyzed");
      toast({
        title: analyzed.length > 0 ? "Analysis Complete!" : "No New Analyses",
        description: analyzed.length > 0
          ? `${analyzed.length} project(s) analyzed successfully.`
          : results.map(r => `${r.project}: ${r.detail}`).join("; "),
      });
      await loadData();
    } catch (err: any) {
      toast({ title: "Scan failed", description: err.message, variant: "destructive" });
    } finally {
      setIsScanning(false);
      setScanStep("");
      setScanningProject("");
      setTimeout(() => setScanResults([]), 8000);
    }
  };

  const handleCreateProject = async () => {
    const trimmed = newProject.trim();
    if (!trimmed) return;
    // Persist to DB
    const { error } = await supabase.from("projects").insert({ name: trimmed });
    if (error && !error.message.includes("duplicate")) {
      toast({ title: "Failed to create project", description: error.message, variant: "destructive" });
      return;
    }
    setDialogOpen(false);
    setNewProject("");
    navigate(`/project/${encodeURIComponent(trimmed)}`);
  };

  const handleDeleteProject = async () => {
    if (!deleteProject) return;
    try {
      // Delete all analyses from DB
      for (const id of deleteProject.allIds) {
        await supabase.from("wpr_analyses").delete().eq("id", id);
      }
      // Delete from projects table
      await supabase.from("projects").delete().eq("name", deleteProject.name);

      // Delete all storage files for this project
      const safeName = deleteProject.name.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
      try {
        const { data: weekFolders } = await supabase.storage.from("wpr-uploads").list(safeName, { limit: 200 });
        if (weekFolders && weekFolders.length > 0) {
          for (const folder of weekFolders) {
            const { data: files } = await supabase.storage.from("wpr-uploads").list(`${safeName}/${folder.name}`, { limit: 200 });
            if (files && files.length > 0) {
              const filePaths = files.map(f => `${safeName}/${folder.name}/${f.name}`);
              await supabase.storage.from("wpr-uploads").remove(filePaths);
            }
          }
          // Remove any root-level files in the folder
          const rootFiles = weekFolders.filter(f => f.id).map(f => `${safeName}/${f.name}`);
          if (rootFiles.length > 0) {
            await supabase.storage.from("wpr-uploads").remove(rootFiles);
          }
        }
      } catch (storageErr) {
        console.warn("Storage cleanup failed:", storageErr);
      }

      toast({ title: "Project deleted", description: `${deleteProject.name} and all its data have been removed.` });
      setAnalyses(prev => prev.filter(a => a.project_name !== deleteProject.name));
      setDbProjects(prev => prev.filter(p => p.name !== deleteProject.name));
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    } finally {
      setDeleteProject(null);
    }
  };

  const handleRenameProject = async () => {
    if (!renameProject || !renameValue.trim()) return;
    const newName = renameValue.trim();
    try {
      // Rename in analyses
      for (const id of renameProject.allIds) {
        await supabase.from("wpr_analyses").update({ project_name: newName }).eq("id", id);
      }
      // Rename in projects table
      await supabase.from("projects").update({ name: newName }).eq("name", renameProject.name);
      toast({ title: "Project renamed", description: `Renamed to "${newName}"` });
      setAnalyses(prev => prev.map(a => a.project_name === renameProject.name ? { ...a, project_name: newName } : a));
      setDbProjects(prev => prev.map(p => p.name === renameProject.name ? { ...p, name: newName } : p));
    } catch (err: any) {
      toast({ title: "Rename failed", description: err.message, variant: "destructive" });
    } finally {
      setRenameProject(null);
      setRenameValue("");
    }
  };

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === 'healthy') return <CheckCircle2 className="w-5 h-5 text-success" />;
    if (status === 'at_risk') return <AlertTriangle className="w-5 h-5 text-warning" />;
    if (status === 'pending') return <FolderOpen className="w-5 h-5 text-muted-foreground" />;
    return <XCircle className="w-5 h-5 text-critical" />;
  };

  const projectsWithAnalyses = projects.filter(p => p.hasAnalyses);

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold font-sans">Projects</h1>
            <p className="text-muted-foreground mt-1 font-body">All your WPR-tracked projects in one place.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={handleScanAll} disabled={isScanning} className="gap-2 gradient-bg border-0 glow-shadow hover:opacity-90">
              {isScanning ? (<><div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> Analyzing...</>) : (<><Play className="w-4 h-4" /> Analyze All Projects</>)}
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2"><Plus className="w-4 h-4" /> New Project</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create New Project</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-2">
                  <Input placeholder="Project name (e.g. Miracle Group)" value={newProject} onChange={e => setNewProject(e.target.value)} onKeyDown={e => e.key === "Enter" && handleCreateProject()} />
                  <Button onClick={handleCreateProject} disabled={!newProject.trim()} className="w-full">Create & Go to Project</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </motion.div>

        {/* Live Analysis Banner */}
        {(isScanning || scanResults.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-primary/5 border border-primary/15 mb-6 overflow-hidden"
          >
            <div className="flex items-center gap-3 p-4">
              {isScanning && <div className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />}
              {!isScanning && scanResults.length > 0 && <CheckCircle2 className="w-4 h-4 text-success" />}
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground font-sans">
                  {isScanning ? "Analysis in progress" : "Analysis complete"}
                </p>
                <p className="text-xs text-muted-foreground font-body">
                  {isScanning && scanningProject ? `Working on: ${scanningProject}` : scanStep}
                </p>
              </div>
              {isScanning && (
                <div className="h-1 flex-1 max-w-[200px] bg-primary/10 rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: '60%' }} />
                </div>
              )}
            </div>
            {/* Per-project results */}
            {scanResults.length > 0 && (
              <div className="px-4 pb-3 space-y-1">
                {scanResults.map((r, i) => {
                  const displayName = projects.find(p => {
                    const safe = p.name.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
                    return safe === r.project || r.project.includes(safe);
                  })?.name || r.project;
                  return (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      {r.status === "analyzed" ? <CheckCircle2 className="w-3 h-3 text-success" /> :
                       r.status === "error" ? <XCircle className="w-3 h-3 text-critical" /> :
                       r.status === "already_done" ? <CheckCircle2 className="w-3 h-3 text-muted-foreground" /> :
                       <AlertTriangle className="w-3 h-3 text-warning" />}
                      <span className="font-medium text-foreground">{displayName}</span>
                      <span className="text-muted-foreground">— {r.status === "analyzed" ? "✓ Analyzed" : r.status === "already_done" ? "Already up to date" : r.detail || r.status}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {projectsWithAnalyses.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="kpi-card kpi-card-primary"><p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Projects</p><p className="text-3xl font-bold mt-1">{projects.length}</p></div>
            <div className="kpi-card kpi-card-success"><p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Healthy</p><p className="text-3xl font-bold mt-1 text-success">{projectsWithAnalyses.filter(p => p.latestStatus === 'healthy').length}</p></div>
            <div className="kpi-card kpi-card-warning"><p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">At Risk</p><p className="text-3xl font-bold mt-1 text-warning">{projectsWithAnalyses.filter(p => p.latestStatus === 'at_risk').length}</p></div>
            <div className="kpi-card kpi-card-info"><p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Avg Score</p><p className="text-3xl font-bold mt-1">{projectsWithAnalyses.length > 0 ? Math.round(projectsWithAnalyses.reduce((s, p) => s + p.latestScore, 0) / projectsWithAnalyses.length) : 0}</p></div>
          </motion.div>
        )}

        {/* Project Cards */}
        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="flex items-center gap-3 text-muted-foreground"><div className="w-2 h-2 rounded-full bg-primary animate-pulse-dot" /> Loading projects...</div></div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20">
            <FolderOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Projects Yet</h3>
            <p className="text-muted-foreground mb-6">Create your first project and upload WPRs to get started.</p>
            <Button onClick={() => setDialogOpen(true)} className="gap-2"><Plus className="w-4 h-4" /> Create Project</Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project, i) => (
              <motion.div
                key={project.name}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card-elevated rounded-2xl p-5 text-left group hover:border-primary/20 transition-all relative"
              >
                {/* Action buttons */}
                <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); setRenameValue(project.name); setRenameProject(project); }}
                    className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                    title="Rename project"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteProject(project); }}
                    className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    title="Delete project"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  onClick={() => navigate(`/project/${encodeURIComponent(project.name)}`)}
                  className="w-full text-left"
                >
                  <div className="flex items-start justify-between mb-4 pr-14">
                    <div className="flex items-center gap-3">
                      <StatusIcon status={project.latestStatus} />
                      <div>
                        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors font-sans">{project.name}</h3>
                        <p className="text-xs text-muted-foreground font-body">
                          {project.hasAnalyses
                            ? `${project.totalWeeks} analysis${project.totalWeeks > 1 ? 'es' : ''}`
                            : "No analyses yet"}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      {project.latestWeek && (
                        <span className="text-xs font-bold uppercase px-2 py-1 rounded-full bg-primary/10 text-primary">Week {project.latestWeek}</span>
                      )}
                      {!project.hasAnalyses && (
                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-muted text-muted-foreground">New</span>
                      )}
                    </div>
                    <div className="text-right">
                      {project.hasAnalyses ? (
                        <>
                          <p className={`text-2xl font-bold ${project.latestStatus === 'healthy' ? 'text-success' : project.latestStatus === 'at_risk' ? 'text-warning' : 'text-critical'}`}>{project.latestScore}</p>
                          <p className="text-[10px] uppercase font-medium text-muted-foreground">/100</p>
                        </>
                      ) : (
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteProject} onOpenChange={(open) => !open && setDeleteProject(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteProject?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {deleteProject?.hasAnalyses ? `all ${deleteProject?.totalWeeks} analysis report(s) for` : ''} this project. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProject} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete Project</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rename Dialog */}
      <Dialog open={!!renameProject} onOpenChange={(open) => { if (!open) { setRenameProject(null); setRenameValue(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rename Project</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <Input value={renameValue} onChange={e => setRenameValue(e.target.value)} onKeyDown={e => e.key === "Enter" && handleRenameProject()} placeholder="New project name" />
            <Button onClick={handleRenameProject} disabled={!renameValue.trim() || renameValue.trim() === renameProject?.name} className="w-full">Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
