import { motion } from "framer-motion";
import DashboardLayout from "@/components/DashboardLayout";
import {
  BookOpen,
  FolderPlus,
  Upload,
  FileSearch,
  Sparkles,
  BarChart3,
  ArrowDown,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Eye,
  Camera,
  Layers,
  TrendingUp,
  Shield,
  FileText,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function HowItWorksPage() {
  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-4">
            <BookOpen className="w-4 h-4" />
            User Guide
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground font-sans mb-3">
            How WPR Audit Works
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            A complete step-by-step walkthrough of the WPR accountability audit system — from project creation to AI-powered analysis.
          </p>
        </motion.div>

        {/* Overview */}
        <motion.div variants={stagger} initial="hidden" animate="show" className="mb-14">
          <motion.h2 variants={fadeUp} className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            Overview
          </motion.h2>
          <motion.div variants={fadeUp}>
            <Card className="bg-card border-border">
              <CardContent className="p-6 space-y-3 text-muted-foreground leading-relaxed">
                <p>
                  <strong className="text-foreground">WPR Audit</strong> is an AI-powered tool designed for construction and interior fit-out project managers.
                  It compares two consecutive <strong className="text-foreground">Weekly Progress Reports (WPRs)</strong> — typically PDF documents — and generates a detailed accountability analysis.
                </p>
                <p>
                  The system detects delayed milestones, unchanged risk registers, recycled site photos, selection bottlenecks, and timeline slippages — all automatically using AI.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Steps */}
        <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6 mb-14">
          <motion.h2 variants={fadeUp} className="text-xl font-semibold text-foreground mb-2 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Step-by-Step Workflow
          </motion.h2>

          <Step
            number={1}
            icon={<FolderPlus className="w-5 h-5" />}
            title="Create a Project"
            description="Navigate to the Projects page and create a new project. Give it a clear name — this is how all analyses will be grouped and tracked."
            tips={[
              "Use the actual project or client name for easy identification.",
              "Each project acts as a folder to store weekly WPR analyses.",
            ]}
          />

          <StepArrow />

          <Step
            number={2}
            icon={<Upload className="w-5 h-5" />}
            title="Upload the Baseline WPR (First Time Only)"
            description="When setting up a new project for the first time, you must upload a baseline WPR first. This is the initial reference report that all future comparisons will be measured against. Without a baseline, analysis cannot begin."
            tips={[
              "The baseline is typically the first or most recent WPR available for the project.",
              "This only needs to be done once per project — after the first analysis, the system reuses the previous week's WPR automatically.",
              "Supported format: PDF documents only.",
            ]}
          />

          <StepArrow />

          <Step
            number={3}
            icon={<Upload className="w-5 h-5" />}
            title="Upload the Current Week's WPR"
            description="After the baseline is set, upload the current week's WPR. The system will compare this new report against the baseline (or the previous week's WPR) to generate the analysis."
            tips={[
              "From the second week onwards, only the current week's WPR needs to be uploaded.",
              "The system automatically pairs it with the previous week's report for comparison.",
              "Make sure the WPRs are from consecutive weeks for accurate comparison.",
            ]}
          />

          <StepArrow />

          <Step
            number={4}
            icon={<FileSearch className="w-5 h-5" />}
            title="PDF Text Extraction"
            description="The system automatically extracts all text content from both PDF files. This includes project details, selection schedules, progress percentages, timelines, risk registers, and more."
            tips={[
              "This happens automatically — no manual input needed.",
              "The extraction captures tables, bullet points, and structured data.",
            ]}
          />

          <StepArrow />

          <Step
            number={5}
            icon={<Sparkles className="w-5 h-5" />}
            title="AI-Powered Analysis"
            description="The extracted text from both WPRs is sent to Google Gemini AI with a structured prompt. The AI performs a section-by-section comparison and generates findings for each area."
            tips={[
              "The AI analyzes: Project Details, Floor Plans, Selection Schedule, Weekly Progress, Project Timeline, Risk Register, and Site Photos.",
              "Each section receives a status: Healthy, At Risk, Critical, or Unchanged.",
              "The AI generates specific observations with evidence from both reports.",
            ]}
          />

          <StepArrow />

          <Step
            number={6}
            icon={<Camera className="w-5 h-5" />}
            title="Site Photo Comparison (Optional)"
            description="If both WPRs contain site photos, the AI vision model compares images between weeks to detect recycled or identical photos — a common accountability gap."
            tips={[
              "This catches contractors who reuse old progress photos.",
              "The comparison is visual — it detects similar angles, lighting, and content.",
            ]}
          />

          <StepArrow />

          <Step
            number={7}
            icon={<BarChart3 className="w-5 h-5" />}
            title="Report Generation"
            description="A comprehensive analysis report is generated with an overall score, status, and detailed section-by-section breakdown. Each section shows its findings inline with status indicators."
            tips={[
              "Overall score is calculated from 0-100 based on all section statuses.",
              "Reports are saved automatically and can be accessed anytime from the project page.",
              "Each section shows AI findings with colored status borders for quick scanning.",
            ]}
          />

          <StepArrow />

          <Step
            number={8}
            icon={<RefreshCw className="w-5 h-5" />}
            title="Weekly Repeat"
            description="Each week, upload the new WPR and the system automatically uses the previous week's report for comparison. Over time, you build a complete audit trail of project accountability."
            tips={[
              "Track score trends week-over-week to spot declining project health.",
              "All historical analyses are preserved in the History page.",
              "Use the project detail page to see all analyses for a specific project.",
            ]}
          />
        </motion.div>

        {/* Status Guide */}
        <motion.div variants={stagger} initial="hidden" animate="show" className="mb-14">
          <motion.h2 variants={fadeUp} className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Understanding Status Indicators
          </motion.h2>
          <motion.div variants={fadeUp} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StatusCard
              icon={<CheckCircle2 className="w-5 h-5 text-success" />}
              title="Healthy"
              color="border-l-success"
              description="Section is progressing well. No issues detected between the two WPRs. Metrics are stable or improving."
            />
            <StatusCard
              icon={<AlertTriangle className="w-5 h-5 text-warning" />}
              title="At Risk"
              color="border-l-warning"
              description="Some concerns identified. Possible delays, slow progress, or emerging issues that need attention before they escalate."
            />
            <StatusCard
              icon={<XCircle className="w-5 h-5 text-critical" />}
              title="Critical"
              color="border-l-critical"
              description="Serious problems detected. Significant delays, regressions, unresolved blockers, or major accountability gaps."
            />
            <StatusCard
              icon={<Clock className="w-5 h-5 text-muted-foreground" />}
              title="Unchanged"
              color="border-l-muted-foreground"
              description="No changes between the two WPRs. This could be fine (stable items) or concerning (stagnant issues)."
            />
          </motion.div>
        </motion.div>

        {/* Analysis Sections */}
        <motion.div variants={stagger} initial="hidden" animate="show" className="mb-14">
          <motion.h2 variants={fadeUp} className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary" />
            What Gets Analyzed
          </motion.h2>
          <motion.div variants={fadeUp} className="space-y-3">
            {[
              { title: "Project Details", desc: "Team composition, critical dates, project scope changes." },
              { title: "Latest Approved Floor Plan", desc: "Design revisions, layout changes, version tracking." },
              { title: "Selection Schedule", desc: "Material approvals, vendor selections, pending items, delays." },
              { title: "Weekly Progress Done", desc: "Percentage completion changes, regressions, stalled activities." },
              { title: "Project Timeline", desc: "Milestone tracking, deadline breaches, schedule slippages." },
              { title: "Risk Register & Critical Open Pointers", desc: "New risks, unresolved items, escalation patterns." },
              { title: "3D vs Actual Site Photos", desc: "Visual comparison, recycled photo detection, progress verification." },
            ].map((section, i) => (
              <Card key={i} className="bg-card border-border">
                <CardContent className="p-4 flex items-start gap-3">
                  <FileText className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-foreground text-sm">{section.title}</p>
                    <p className="text-muted-foreground text-sm">{section.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </motion.div>
        </motion.div>

        {/* Tips */}
        <motion.div variants={stagger} initial="hidden" animate="show" className="mb-10">
          <motion.h2 variants={fadeUp} className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Pro Tips
          </motion.h2>
          <motion.div variants={fadeUp}>
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-6">
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <span>Upload WPRs consistently every week for the best trend tracking and accountability trail.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <span>Review the AI analysis findings carefully — they highlight specific evidence from both reports.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <span>Use the overall score trend to quickly assess if a project's accountability is improving or declining.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <span>Share analysis reports with stakeholders to drive accountability in review meetings.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <span>Pay special attention to "Critical" and "At Risk" sections — these need immediate action.</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}

function Step({ number, icon, title, description, tips }: {
  number: number;
  icon: React.ReactNode;
  title: string;
  description: string;
  tips: string[];
}) {
  return (
    <motion.div variants={fadeUp}>
      <Card className="bg-card border-border overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center text-primary-foreground text-sm font-bold shrink-0">
              {number}
            </div>
            <div className="flex items-center gap-2 text-primary">{icon}</div>
            <CardTitle className="text-lg">{title}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
          <div className="bg-muted/50 rounded-lg p-3 space-y-1.5">
            {tips.map((tip, i) => (
              <p key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                <CheckCircle2 className="w-3 h-3 text-success mt-0.5 shrink-0" />
                {tip}
              </p>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function StepArrow() {
  return (
    <motion.div variants={fadeUp} className="flex justify-center py-1">
      <ArrowDown className="w-5 h-5 text-primary/40" />
    </motion.div>
  );
}

function StatusCard({ icon, title, color, description }: {
  icon: React.ReactNode;
  title: string;
  color: string;
  description: string;
}) {
  return (
    <Card className={`bg-card border-border border-l-4 ${color}`}>
      <CardContent className="p-4 flex items-start gap-3">
        {icon}
        <div>
          <p className="font-medium text-foreground text-sm">{title}</p>
          <p className="text-muted-foreground text-xs mt-1">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

const fadeUpExport = fadeUp;
