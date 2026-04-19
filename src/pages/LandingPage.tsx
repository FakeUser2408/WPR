import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Shield, ArrowRight, BarChart3, AlertTriangle, TrendingUp, Zap, Eye, FolderOpen, Clock, CheckCircle2, Camera, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import AppLayout from "@/components/AppLayout";

const features = [
  {
    icon: <Eye className="w-6 h-6" />,
    title: "AI-Powered Comparison",
    description: "Gemini AI analyzes two consecutive WPRs and detects every change, regression, and discrepancy automatically.",
    gradient: "from-primary to-primary-glow",
  },
  {
    icon: <AlertTriangle className="w-6 h-6" />,
    title: "Accountability Tracking",
    description: "Flag delayed milestones, unchanged risk registers, recycled photos, and missing progress updates.",
    gradient: "from-warning to-critical",
  },
  {
    icon: <Camera className="w-6 h-6" />,
    title: "Site Photo Verification",
    description: "AI vision detects recycled or identical site photos between weeks — no more copy-pasted progress images.",
    gradient: "from-critical to-warning",
  },
  {
    icon: <TrendingUp className="w-6 h-6" />,
    title: "Progress Dashboard",
    description: "KPI cards, score trends, and visual metrics give you instant clarity on project health.",
    gradient: "from-success to-info",
  },
  {
    icon: <Zap className="w-6 h-6" />,
    title: "Batch Automation",
    description: "Upload once per week, hit one button — all projects analyzed simultaneously with smart comparison.",
    gradient: "from-info to-primary",
  },
  {
    icon: <FolderOpen className="w-6 h-6" />,
    title: "Smart Storage",
    description: "Only upload the current week's WPR. Previous weeks are stored and reused automatically for comparison.",
    gradient: "from-primary-glow to-primary",
  },
];

const problems = [
  "Teams submit identical photos across weeks",
  "Risk registers stay unchanged for months",
  "Progress percentages decrease without explanation",
  "Selection schedules regress from 'Done' to 'In Progress'",
  "Report dates are copy-pasted from previous weeks",
  "Timeline end dates shift silently",
];

export default function LandingPage() {
  return (
    <AppLayout>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/10" />
        <div className="absolute top-20 left-1/4 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-info/8 rounded-full blur-3xl animate-float" style={{ animationDelay: "2s" }} />

        <div className="max-w-6xl mx-auto px-6 py-24 md:py-36 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <Shield className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary font-sans">AI-Powered WPR Accountability</span>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 font-sans">
              Stop Letting{" "}
              <span className="gradient-hero-text">Weak Reports</span>
              {" "}Slip Through
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed font-body">
              WPR Audit uses AI to compare consecutive Weekly Progress Reports, catching inconsistencies, 
              regressions, and accountability gaps that manual reviews miss.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
              <Link to="/projects">
                <Button size="lg" className="h-12 px-8 text-base gap-2 gradient-bg border-0 glow-shadow hover:opacity-90 transition-opacity font-sans font-semibold">
                  <FolderOpen className="w-5 h-5" />
                  View Projects
                </Button>
              </Link>
              <Link to="/upload">
                <Button variant="outline" size="lg" className="h-12 px-8 text-base gap-2 font-sans font-semibold">
                  Quick Analysis
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Problem Statement */}
      <section className="py-20 bg-card/50 border-y border-border/50">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold mb-3 font-sans">The Problem We Solve</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto font-body">
              Weekly Progress Reports are meant to track real progress. But without scrutiny, 
              teams can slip through with minimal accountability.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {problems.map((problem, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="flex items-start gap-3 p-4 rounded-xl bg-critical/5 border border-critical/10"
              >
                <AlertTriangle className="w-4 h-4 text-critical mt-0.5 flex-shrink-0" />
                <span className="text-sm text-foreground font-body">{problem}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl font-bold mb-3 font-sans">How It Works</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto font-body">
              Upload your WPRs, and let AI do the heavy lifting.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-card-elevated rounded-2xl p-6 group hover:border-primary/20 transition-all"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center text-primary-foreground mb-4`}>
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold mb-2 font-sans">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed font-body">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section className="py-20 bg-card/50 border-y border-border/50">
        <div className="max-w-4xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl font-bold mb-3 font-sans">Weekly Workflow</h2>
          </motion.div>

          <div className="space-y-6">
            {[
              { step: "01", title: "Upload Current Week's WPR", desc: "Just the new one — previous week's is already stored.", icon: <FolderOpen className="w-5 h-5" /> },
              { step: "02", title: "AI Compares Reports & Photos", desc: "Text analysis + vision AI flags recycled photos and unchanged data.", icon: <Camera className="w-5 h-5" /> },
              { step: "03", title: "Hit 'Analyze All Projects'", desc: "One button compares every project against its previous WPR.", icon: <Zap className="w-5 h-5" /> },
              { step: "04", title: "Review KPI Dashboard", desc: "Score, risks, progress deltas, and accountability flags at a glance.", icon: <BarChart3 className="w-5 h-5" /> },
              { step: "05", title: "Act on Findings", desc: "Clear action items, escalation points, and deadline tracking.", icon: <CheckCircle2 className="w-5 h-5" /> },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex items-start gap-5"
              >
                <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center text-primary-foreground flex-shrink-0 glow-shadow">
                  {item.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-primary/60 uppercase font-sans tracking-wider">Step {item.step}</span>
                  </div>
                  <h3 className="text-lg font-semibold font-sans">{item.title}</h3>
                  <p className="text-muted-foreground text-sm font-body">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-bold mb-4 font-sans">Ready to Audit Your WPRs?</h2>
            <p className="text-muted-foreground text-lg mb-8 font-body">
              Start with your first project — it takes less than 2 minutes.
            </p>
            <Link to="/projects">
              <Button size="lg" className="h-14 px-12 text-lg gap-3 gradient-bg border-0 glow-shadow hover:opacity-90 font-sans font-semibold">
                Get Started
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md gradient-bg flex items-center justify-center">
              <BarChart3 className="w-3 h-3 text-primary-foreground" />
            </div>
            <span className="text-sm font-medium text-muted-foreground font-sans">WPR Audit</span>
          </div>
          <p className="text-xs text-muted-foreground font-body">AI-Powered Weekly Progress Report Accountability</p>
        </div>
      </footer>
    </AppLayout>
  );
}
