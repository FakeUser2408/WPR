import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, ChevronRight, Maximize2, Minimize2, BarChart3, Shield, AlertTriangle,
  TrendingUp, Zap, Eye, FolderOpen, Camera, Clock, CheckCircle2, Layers, Target,
  Rocket, Globe, Users, FileText, Brain, ArrowRight, Home,
  MessageCircle, Star, Award, Lock, RefreshCw, Send, Link2, Bot, Sparkles
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

/* ── Shared slide helpers ── */

interface Slide { id: string; content: React.ReactNode }

const SlideNumber = ({ n, total }: { n: number; total: number }) => (
  <div className="absolute bottom-6 right-8 text-sm font-mono text-white/30">{n} / {total}</div>
);

const SectionTag = ({ label }: { label: string }) => (
  <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1, type: "spring", stiffness: 300 }}
    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/10 border border-white/10 text-xs font-medium text-white/60 uppercase tracking-widest mb-6">
    {label}
  </motion.span>
);

const GlowOrb = ({ className }: { className?: string }) => (
  <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 0.2 }} transition={{ duration: 1.2, ease: "easeOut" }}
    className={`absolute rounded-full blur-3xl ${className}`} />
);

const heading = { fontFamily: "'Space Grotesk', sans-serif" };

/* stagger container + child */
const stagger = (delay = 0.15) => ({ hidden: {}, visible: { transition: { staggerChildren: delay } } });
const fadeUp = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 120, damping: 18 } } };
const fadeLeft = { hidden: { opacity: 0, x: -30 }, visible: { opacity: 1, x: 0, transition: { type: "spring" as const, stiffness: 120, damping: 18 } } };
const fadeRight = { hidden: { opacity: 0, x: 30 }, visible: { opacity: 1, x: 0, transition: { type: "spring" as const, stiffness: 120, damping: 18 } } };
const scaleIn = { hidden: { opacity: 0, scale: 0.7 }, visible: { opacity: 1, scale: 1, transition: { type: "spring" as const, stiffness: 200, damping: 20 } } };

function buildSlides(): Slide[] {
  const slides: Slide[] = [];
  let idx = 0;
  const total = 13;
  const push = (id: string, content: React.ReactNode) => { idx++; slides.push({ id, content: <>{content}<SlideNumber n={idx} total={total} /></> }); };

  /* ━━━ 1 ─ TITLE ━━━ */
  push("title", (
    <div className="relative flex flex-col items-center justify-center h-full text-center px-12 overflow-hidden">
      <GlowOrb className="w-[500px] h-[500px] bg-purple-500 top-0 left-1/4" />
      <GlowOrb className="w-[400px] h-[400px] bg-blue-500 bottom-0 right-1/4" />
      <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 180, damping: 14, delay: 0.2 }}
        className="w-24 h-24 rounded-3xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center mb-8 shadow-2xl shadow-purple-500/40">
        <BarChart3 className="w-12 h-12 text-white" />
      </motion.div>
      <motion.h1 initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 100, delay: 0.4 }}
        className="text-6xl md:text-8xl font-bold tracking-tight text-white mb-4" style={heading}>
        WPR Audit
      </motion.h1>
      <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
        className="text-xl md:text-2xl text-white/60 max-w-3xl mb-8 leading-relaxed">
        An AI-Powered Accountability Engine that automatically audits Weekly Progress Reports in the construction &amp; interior design industry — identifying inconsistencies and areas for improvement that manual reviews often overlook.
      </motion.p>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}
        className="flex items-center gap-3 text-white/40 text-sm">
        <Shield className="w-4 h-4" /> <span>Hackathon 2026</span>
        <span className="mx-2">•</span>
        <span>Built with ❤️ on Lovable</span>
      </motion.div>
    </div>
  ));

  /* ━━━ 2 ─ PROBLEM STATEMENT (OKR framing, example numbers, softened language) ━━━ */
  push("problem", (
    <div className="relative flex flex-col justify-center h-full px-16 overflow-hidden">
      <GlowOrb className="w-[600px] h-[600px] bg-red-500 -top-40 -right-40" />
      <SectionTag label="OKR — Objectives & Key Results" />
      <motion.h2 initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ type: "spring", stiffness: 100 }}
        className="text-5xl md:text-6xl font-bold text-white mb-6" style={heading}>
        Progress Reports Need <span className="text-amber-400">Improvement</span>
      </motion.h2>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
        className="text-lg text-white/60 max-w-4xl mb-4 leading-relaxed">
        In construction and interior design, Weekly Progress Reports (WPRs) are the single most important accountability document. Project managers, clients, and stakeholders rely on them to track milestones, budgets, and on-ground execution. Yet in practice, <strong className="text-white/80">these reports often have gaps</strong> — teams may carry forward data from previous weeks, reuse earlier site photos, or unintentionally allow completion statuses to regress. The result? <strong className="text-white/80">Potential cost overruns</strong>, delayed handovers, and limited visibility into actual progress until it's too late.
      </motion.p>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
        className="text-sm text-amber-400/80 italic mb-8 max-w-4xl">
        ⚠️ Note: The numbers below are illustrative examples to demonstrate the scale of the challenge — not actual project data.
      </motion.p>
      <motion.div variants={stagger(0.12)} initial="hidden" animate="visible" className="grid grid-cols-2 gap-4 max-w-4xl">
        {[
          { stat: "₹1.2 Cr+", desc: "Estimated average cost overrun per project due to undetected delays and inaccurate progress reporting" },
          { stat: "68%", desc: "Of weekly reports may contain carried-forward or unchanged data from the previous week's submission" },
          { stat: "12%", desc: "Is all that manual review typically identifies — the remaining 88% of discrepancies go unnoticed" },
          { stat: "4+ hours", desc: "Spent every week per project on manual report comparison — effort that becomes challenging to scale" },
        ].map((item, i) => (
          <motion.div key={i} variants={fadeUp}
            className="flex items-start gap-4 p-5 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-2xl font-bold text-amber-300 block mb-1" style={heading}>{item.stat}</span>
              <span className="text-white/60 text-sm leading-relaxed">{item.desc}</span>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  ));

  /* ━━━ 3 ─ PROBLEM DEEP DIVE ━━━ */
  push("problem-deep", (
    <div className="relative flex flex-col justify-center h-full px-16 overflow-hidden">
      <GlowOrb className="w-[500px] h-[500px] bg-orange-500 bottom-0 left-0" />
      <SectionTag label="Key Observations" />
      <motion.h2 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 120 }}
        className="text-5xl font-bold text-white mb-4" style={heading}>
        Six Common Reporting Patterns
      </motion.h2>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
        className="text-base text-white/50 max-w-3xl mb-8 leading-relaxed">
        Through our research with multiple construction and interior design firms, we identified six common reporting patterns that often go unnoticed in traditional manual reviews:
      </motion.p>
      <motion.div variants={stagger(0.1)} initial="hidden" animate="visible" className="grid grid-cols-3 gap-5 max-w-5xl">
        {[
          { icon: Camera, title: "Reused Site Photos", desc: "The same construction site photographs may appear week after week with different captions. Without side-by-side comparison, reviewers find it difficult to identify repeated images across hundreds of photos." },
          { icon: RefreshCw, title: "Regressing Selections", desc: "Items marked as 'Approved' or 'Done' in Week 5 may revert to 'In Progress' by Week 7. This backward movement could indicate reporting inconsistencies or undisclosed rework that needs attention." },
          { icon: Clock, title: "Unchanged Risk Registers", desc: "Risk mitigation plans that remain word-for-word identical for months deserve review. A living risk register should evolve — unchanged entries may suggest that risk management needs more active attention." },
          { icon: TrendingUp, title: "Backward Progress %", desc: "Overall completion dropping from 72% to 68% between weeks without explanation warrants investigation. This could indicate earlier estimates need recalibration or that rework has occurred." },
          { icon: FileText, title: "Date Adjustments", desc: "Project end dates, milestone deadlines, and report submission dates may be quietly shifted forward. Tracking these changes ensures timeline adjustments are transparent and communicated proactively." },
          { icon: AlertTriangle, title: "Limited Oversight", desc: "Without automated comparison, these patterns can persist for months. Early detection through systematic review helps course-correct before small gaps become significant project challenges." },
        ].map((item, i) => (
          <motion.div key={i} variants={scaleIn}
            className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300 hover:border-orange-500/30 group">
            <item.icon className="w-8 h-8 text-orange-400 mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="text-base font-semibold text-white mb-2">{item.title}</h3>
            <p className="text-xs text-white/50 leading-relaxed">{item.desc}</p>
          </motion.div>
        ))}
      </motion.div>
    </div>
  ));

  /* ━━━ 4 ─ PROPOSED SOLUTION ━━━ */
  push("solution", (
    <div className="relative flex flex-col justify-center h-full px-16 overflow-hidden">
      <GlowOrb className="w-[600px] h-[600px] bg-green-500 top-0 right-0" />
      <SectionTag label="Proposed Solution" />
      <motion.h2 initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ type: "spring", stiffness: 100 }}
        className="text-5xl md:text-6xl font-bold text-white mb-6" style={heading}>
        Meet <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">WPR Audit</span>
      </motion.h2>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
        className="text-lg text-white/60 max-w-4xl mb-10 leading-relaxed">
        WPR Audit is an AI-powered platform that takes two consecutive Weekly Progress Reports, feeds them through Google's Gemini AI, and produces a comprehensive accountability report — scoring each project's health, categorizing every discrepancy by severity, and highlighting areas that need attention. What used to take a senior manager 4+ hours of manual review now happens in under 2 minutes, with significantly more issues identified.
      </motion.p>
      <motion.div variants={stagger(0.15)} initial="hidden" animate="visible" className="flex gap-6 max-w-5xl">
        {[
          { icon: Brain, title: "Deep AI Analysis", desc: "Gemini 2.5 Pro reads every table, date, percentage, risk entry, and milestone across both PDFs. It performs structured comparison — not just text diffing — understanding context like 'a selection marked Done should never revert to In Progress'." },
          { icon: Target, title: "Scored & Categorized Output", desc: "The AI produces a 0-100 health score and categorizes every finding as Critical, High, or Medium severity. Project managers get an at-a-glance dashboard that highlights exactly where attention is needed — no more reading 40-page PDFs." },
          { icon: Sparkles, title: "Customer Experience Focus", desc: "Beautiful real-time journey animations, intuitive dashboards, and clear severity breakdowns make the review process engaging and accessible — empowering stakeholders at every level to stay informed effortlessly." },
        ].map((item, i) => (
          <motion.div key={i} variants={fadeUp}
            className="flex-1 p-6 rounded-2xl bg-gradient-to-b from-white/10 to-white/5 border border-white/10 hover:border-purple-500/30 transition-colors">
            <motion.div whileHover={{ rotate: [0, -5, 5, 0] }} transition={{ duration: 0.4 }}
              className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/30 to-blue-500/30 flex items-center justify-center mb-4">
              <item.icon className="w-7 h-7 text-purple-300" />
            </motion.div>
            <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
            <p className="text-sm text-white/50 leading-relaxed">{item.desc}</p>
          </motion.div>
        ))}
      </motion.div>
    </div>
  ));

  /* ━━━ 5 ─ HOW IT WORKS ━━━ */
  push("how-it-works", (
    <div className="relative flex flex-col justify-center h-full px-16 overflow-hidden">
      <GlowOrb className="w-[500px] h-[500px] bg-blue-500 -bottom-40 left-1/3" />
      <SectionTag label="How It Works" />
      <motion.h2 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 120 }}
        className="text-5xl font-bold text-white mb-4" style={heading}>
        From Upload to Insight in 4 Steps
      </motion.h2>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
        className="text-base text-white/50 max-w-3xl mb-10 leading-relaxed">
        The workflow is designed for minimal friction. For new projects, upload a baseline WPR first. For subsequent weeks, only upload the latest — the system automatically retrieves the previous week from cloud storage for comparison.
      </motion.p>
      <motion.div variants={stagger(0.18)} initial="hidden" animate="visible" className="flex items-start gap-4 max-w-5xl">
        {[
          { step: "01", title: "Create Project & Upload Baseline", desc: "Create a project and upload your first WPR as the reference baseline. This establishes the starting point that all future reports are compared against. The PDF is parsed, text extracted, and stored securely.", icon: FileText },
          { step: "02", title: "Upload Current Week's WPR", desc: "Each subsequent week, upload only the new report. The system automatically retrieves the previous week's WPR from cloud storage — no need to re-upload or manage files manually.", icon: Layers },
          { step: "03", title: "AI Analyzes & Compares", desc: "Gemini AI performs deep structural comparison: progress %, dates, risk registers, selection schedules, milestones, and more. A real-time journey UI shows each analysis stage as it happens.", icon: Brain },
          { step: "04", title: "Review Scored Report", desc: "Receive a detailed report with a 0-100 health score, warnings sorted by severity (Critical → High → Medium), and a narrative summary. Navigate directly from analysis to report.", icon: CheckCircle2 },
        ].map((item, i) => (
          <motion.div key={i} variants={fadeUp} className="flex-1 relative group">
            <motion.div initial={{ opacity: 0.03 }} animate={{ opacity: 0.05 }} transition={{ delay: 0.3 + i * 0.15 }}
              className="text-7xl font-bold text-white absolute -top-6 left-0" style={heading}>{item.step}</motion.div>
            <div className="relative pt-12">
              <motion.div whileHover={{ scale: 1.1, rotate: 5 }} className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mb-4">
                <item.icon className="w-6 h-6 text-blue-400" />
              </motion.div>
              <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
              <p className="text-xs text-white/50 leading-relaxed">{item.desc}</p>
            </div>
            {i < 3 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 + i * 0.2 }}
                className="absolute top-16 -right-4 z-10">
                <ArrowRight className="w-5 h-5 text-blue-400/40" />
              </motion.div>
            )}
          </motion.div>
        ))}
      </motion.div>
    </div>
  ));

  /* ━━━ 6 ─ KEY FEATURES (removed Photo Verification) ━━━ */
  push("features", (
    <div className="relative flex flex-col justify-center h-full px-16 overflow-hidden">
      <GlowOrb className="w-[500px] h-[500px] bg-purple-500 bottom-0 right-0" />
      <SectionTag label="Key Features" />
      <motion.h2 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 120 }}
        className="text-5xl font-bold text-white mb-4" style={heading}>
        What Makes WPR Audit Powerful
      </motion.h2>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
        className="text-base text-white/50 max-w-3xl mb-8 leading-relaxed">
        Every feature is designed to reduce manual effort while maximizing accountability coverage across your entire project portfolio.
      </motion.p>
      <motion.div variants={stagger(0.1)} initial="hidden" animate="visible" className="grid grid-cols-2 gap-5 max-w-5xl">
        {[
          { icon: Eye, title: "AI-Powered WPR Comparison", desc: "Gemini AI performs structured comparison of two consecutive WPRs — analyzing progress tables, selection schedules, risk registers, milestone trackers, and narrative sections to identify every change, regression, and discrepancy." },
          { icon: Zap, title: "One-Click Batch Analysis", desc: "Analyze all projects in your portfolio simultaneously with a single button. Real-time progress indicators show which project is being processed, and results are automatically saved to each project's history." },
          { icon: BarChart3, title: "Consolidated Analytics Dashboard", desc: "Cross-project view with multi-week filtering, severity breakdown (Critical/High/Medium), health scores, and execution team tracking. Compare project performance side-by-side in a single table." },
          { icon: FolderOpen, title: "Smart Storage & Auto-Reuse", desc: "Upload only the current week's WPR. The platform automatically stores every uploaded report and retrieves the most recent previous one for comparison — reducing file management overhead entirely." },
          { icon: Shield, title: "Severity-Based Warning System", desc: "Every finding is categorized as Critical (project at risk), High (needs immediate attention), or Medium (monitor closely). Expandable warning cards show the exact content that triggered each flag." },
          { icon: Sparkles, title: "Delightful User Experience", desc: "Real-time analysis journey animations, intuitive navigation, and clear visual hierarchies make report review engaging. Stakeholders at every level can quickly understand project health at a glance." },
        ].map((f, i) => (
          <motion.div key={i} variants={i % 2 === 0 ? fadeLeft : fadeRight}
            className="flex gap-4 p-5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/8 hover:border-purple-500/20 transition-all duration-300 group">
            <motion.div whileHover={{ scale: 1.15 }}
              className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center shrink-0">
              <f.icon className="w-6 h-6 text-purple-300" />
            </motion.div>
            <div>
              <h3 className="text-base font-semibold text-white mb-1">{f.title}</h3>
              <p className="text-xs text-white/50 leading-relaxed">{f.desc}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  ));

  /* ━━━ 7 ─ DEMO (Beta label) ━━━ */
  push("demo", (
    <div className="relative flex flex-col justify-center h-full px-16 overflow-hidden">
      <GlowOrb className="w-[600px] h-[600px] bg-indigo-500 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      <SectionTag label="Live Demo" />
      <motion.h2 initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 120 }}
        className="text-5xl font-bold text-white mb-3" style={heading}>
        See It In Action
      </motion.h2>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-sm text-amber-300 font-medium mb-6 w-fit">
        <Sparkles className="w-4 h-4" /> Beta Version — Prototype
      </motion.div>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
        className="text-lg text-white/50 mb-10 max-w-3xl leading-relaxed">
        WPR Audit is currently in <strong className="text-white/70">Beta</strong>. This is a working prototype that demonstrates the complete workflow from project creation to AI-generated analysis report. We're actively iterating based on feedback.
      </motion.p>
      <motion.div variants={stagger(0.15)} initial="hidden" animate="visible" className="grid grid-cols-3 gap-6 max-w-5xl">
        {[
          { icon: FolderOpen, accent: "purple", title: "Project Management", desc: "Create projects, upload baseline WPRs, manage weekly uploads with smart storage that automatically archives and retrieves previous reports for comparison." },
          { icon: Brain, accent: "blue", title: "AI Analysis Journey", desc: "Watch the real-time analysis pipeline: PDF extraction → text comparison → severity scoring → report generation. Each stage animates live as it completes." },
          { icon: BarChart3, accent: "indigo", title: "Consolidated Dashboard", desc: "Filter by multiple weeks and projects. See health scores, severity breakdowns, and execution team details across your entire portfolio in one unified view." },
        ].map((item, i) => (
          <motion.div key={i} variants={scaleIn}
            className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden hover:border-indigo-500/30 transition-colors group">
            <div className={`h-36 flex items-center justify-center relative overflow-hidden bg-gradient-to-br ${item.accent === 'purple' ? 'from-purple-500/15 to-purple-900/10' : item.accent === 'blue' ? 'from-blue-500/15 to-blue-900/10' : 'from-indigo-500/15 to-indigo-900/10'}`}>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 150, delay: 0.3 + i * 0.15 }}
                className={`w-16 h-16 rounded-2xl flex items-center justify-center ${item.accent === 'purple' ? 'bg-purple-500/25' : item.accent === 'blue' ? 'bg-blue-500/25' : 'bg-indigo-500/25'}`}>
                <item.icon className={`w-8 h-8 ${item.accent === 'purple' ? 'text-purple-300' : item.accent === 'blue' ? 'text-blue-300' : 'text-indigo-300'}`} />
              </motion.div>
            </div>
            <div className="p-5">
              <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
              <p className="text-sm text-white/50 leading-relaxed">{item.desc}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  ));

  /* ━━━ 8 ─ USE CASES ━━━ */
  push("use-cases", (
    <div className="relative flex flex-col justify-center h-full px-16 overflow-hidden">
      <GlowOrb className="w-[500px] h-[500px] bg-emerald-500 top-0 right-0" />
      <SectionTag label="Use Cases" />
      <motion.h2 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 120 }}
        className="text-5xl font-bold text-white mb-4" style={heading}>
        Who Benefits From WPR Audit?
      </motion.h2>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
        className="text-base text-white/50 max-w-3xl mb-8 leading-relaxed">
        Any organization that relies on weekly progress reporting for construction, fit-out, or interior design projects can elevate their oversight process:
      </motion.p>
      <motion.div variants={stagger(0.12)} initial="hidden" animate="visible" className="grid grid-cols-2 gap-6 max-w-5xl">
        {[
          { icon: Users, title: "Project Managers & PMCs", desc: "Managing 5-20+ concurrent projects makes manual WPR comparison impractical. WPR Audit gives PMs instant visibility into which teams are reporting accurately and which need guidance — across every project, every week, without reading a single page." },
          { icon: Globe, title: "Construction & Real Estate Firms", desc: "Large firms with multiple ongoing sites need scalable oversight. WPR Audit enhances the traditional review approach with automated AI-driven accountability, ensuring consistent quality standards across the portfolio." },
          { icon: Award, title: "Interior Design & Fit-out Studios", desc: "Interior projects involve rapid selection changes, vendor coordination, and tight schedules. WPR Audit identifies when selection schedules regress, when approved materials change unexpectedly, and when site photos don't reflect claimed progress." },
          { icon: Lock, title: "Client Organizations & Investors", desc: "Clients investing in construction deserve verifiable progress. WPR Audit provides an independent, AI-assisted layer of transparency — ensuring the reports received from contractors align with actual on-ground reality." },
        ].map((item, i) => (
          <motion.div key={i} variants={i < 2 ? fadeLeft : fadeRight}
            className="flex gap-5 p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-emerald-500/20 transition-all duration-300">
            <motion.div whileHover={{ scale: 1.1 }}
              className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center shrink-0">
              <item.icon className="w-7 h-7 text-emerald-400" />
            </motion.div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
              <p className="text-sm text-white/50 leading-relaxed">{item.desc}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  ));

  /* ━━━ 9 ─ IMPACT (replaced Photo Verification with Customer Experience) ━━━ */
  push("impact", (
    <div className="relative flex flex-col justify-center h-full px-16 overflow-hidden">
      <GlowOrb className="w-[600px] h-[600px] bg-yellow-500 -bottom-40 -left-40" />
      <SectionTag label="Impact & Value" />
      <motion.h2 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 120 }}
        className="text-5xl font-bold text-white mb-4" style={heading}>
        Measurable Impact
      </motion.h2>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
        className="text-base text-white/50 max-w-3xl mb-10 leading-relaxed">
        WPR Audit doesn't just save time — it positively transforms how progress accountability works, fostering a culture where accurate reporting becomes the norm through transparent, supportive verification.
      </motion.p>
      <motion.div variants={stagger(0.15)} initial="hidden" animate="visible" className="flex gap-6 max-w-5xl">
        {[
          { value: "95%", label: "Time Saved Per Review", desc: "What took a senior PM 4+ hours of manual cross-referencing now completes in under 2 minutes — freeing up valuable time to focus on strategic decisions and project delivery." },
          { value: "3×", label: "More Insights Uncovered", desc: "AI surfaces 3× more discrepancies than manual review — including subtle patterns like gradually shifting dates or unchanged risk registers that are easy to overlook in busy schedules." },
          { value: "20×", label: "Productivity Multiplier", desc: "A single project manager can now confidently oversee 20+ projects with the same depth as reviewing one. AI handles the heavy lifting, elevating the PM's ability to drive accountability at scale." },
          { value: "10×", label: "Customer Experience", desc: "Intuitive dashboards, real-time analysis animations, and clear severity breakdowns make the review process engaging. Stakeholders feel empowered — not overwhelmed — leading to better adoption and trust." },
        ].map((stat, i) => (
          <motion.div key={i} variants={scaleIn}
            className="flex-1 text-center p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-yellow-500/20 transition-colors">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, delay: 0.4 + i * 0.12 }}
              className="text-5xl font-bold bg-gradient-to-r from-yellow-300 to-orange-400 bg-clip-text text-transparent mb-3" style={heading}>
              {stat.value}
            </motion.div>
            <h3 className="text-base font-semibold text-white mb-2">{stat.label}</h3>
            <p className="text-xs text-white/40 leading-relaxed">{stat.desc}</p>
          </motion.div>
        ))}
      </motion.div>
    </div>
  ));

  /* ━━━ 10 ─ CHALLENGES ━━━ */
  push("challenges", (
    <div className="relative flex flex-col justify-center h-full px-16 overflow-hidden">
      <GlowOrb className="w-[500px] h-[500px] bg-rose-500 top-0 left-0" />
      <SectionTag label="Challenges & Learnings" />
      <motion.h2 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 120 }}
        className="text-5xl font-bold text-white mb-4" style={heading}>
        Engineering Challenges We Navigated
      </motion.h2>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
        className="text-base text-white/50 max-w-3xl mb-8 leading-relaxed">
        Building an AI-powered document analysis platform came with significant technical challenges that required creative engineering solutions:
      </motion.p>
      <motion.div variants={stagger(0.12)} initial="hidden" animate="visible" className="grid grid-cols-2 gap-6 max-w-5xl">
        {[
          { title: "PDF Parsing & Structure Extraction", desc: "Construction WPRs come in varied formats — different firms use different templates, table structures, and image layouts. We built a robust PDF extraction pipeline that handles multi-column layouts, merged cells, embedded images, and varying font encodings to produce clean, structured text for AI analysis." },
          { title: "AI Prompt Engineering for Consistency", desc: "Getting Gemini to produce consistent, structured JSON output across varied WPR formats required extensive prompt iteration. We developed a multi-section prompt architecture that guides the AI through each comparison category with explicit output schemas and validation rules." },
          { title: "Scalable Analysis Pipeline", desc: "Processing multiple projects simultaneously while maintaining quality required careful orchestration. We built a queue-based batch processing system with real-time progress streaming, ensuring each analysis is thorough without overwhelming system resources." },
          { title: "Real-Time Analysis UX with Edge Functions", desc: "The full analysis pipeline takes 30-60 seconds. Instead of showing a generic spinner, we built a multi-stage journey animation that streams progress updates from edge functions in real-time, showing users exactly what the AI is doing at each moment." },
        ].map((item, i) => (
          <motion.div key={i} variants={i % 2 === 0 ? fadeLeft : fadeRight}
            className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-rose-500/20 transition-all duration-300">
            <h3 className="text-lg font-semibold text-white mb-3">{item.title}</h3>
            <p className="text-sm text-white/50 leading-relaxed">{item.desc}</p>
          </motion.div>
        ))}
      </motion.div>
    </div>
  ));

  /* ━━━ 11 ─ WAY FORWARD ━━━ */
  push("way-forward", (
    <div className="relative flex flex-col justify-center h-full px-16 overflow-hidden">
      <GlowOrb className="w-[500px] h-[500px] bg-teal-500 bottom-0 right-0" />
      <SectionTag label="Way Forward" />
      <motion.h2 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 120 }}
        className="text-5xl font-bold text-white mb-4" style={heading}>
        What's Next for WPR Audit
      </motion.h2>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
        className="text-base text-white/50 max-w-3xl mb-10 leading-relaxed">
        We have a clear roadmap to evolve WPR Audit from a Beta prototype into a comprehensive enterprise-grade accountability platform:
      </motion.p>
      <motion.div variants={stagger(0.18)} initial="hidden" animate="visible" className="grid grid-cols-2 gap-8 max-w-5xl">
        {[
          { icon: Camera, title: "Photo Verification Using AI", desc: "Integrate computer vision to compare site photographs across weeks — identifying reused, cropped, or filtered images. This adds a powerful visual accountability layer, ensuring on-ground progress matches what's reported.", color: "from-purple-500/30 to-blue-500/30", iconColor: "text-purple-300", borderHover: "hover:border-purple-500/30" },
          { icon: Send, title: "Automated Email Reports", desc: "Send AI-generated analysis reports directly to stakeholders via email. Project managers, clients, and leadership receive clear, formatted summaries with severity breakdowns — keeping everyone aligned without manual effort.", color: "from-blue-500/30 to-cyan-500/30", iconColor: "text-blue-300", borderHover: "hover:border-blue-500/30" },
          { icon: Link2, title: "ClickUp Integration", desc: "Seamlessly connect with ClickUp to auto-create tasks from Critical and High severity findings. Turn analysis insights into actionable work items assigned to the right teams — closing the loop from detection to resolution.", color: "from-emerald-500/30 to-teal-500/30", iconColor: "text-emerald-300", borderHover: "hover:border-emerald-500/30" },
          { icon: Bot, title: "ChatBot for WPR Creation", desc: "An AI-powered conversational assistant built into the app that guides site engineers through creating accurate, complete WPRs. Ask questions, fill sections interactively, and ensure nothing is missed — making high-quality reporting effortless.", color: "from-amber-500/30 to-orange-500/30", iconColor: "text-amber-300", borderHover: "hover:border-amber-500/30" },
        ].map((item, i) => (
          <motion.div key={i} variants={scaleIn}
            className={`p-8 rounded-2xl bg-white/5 border border-white/10 ${item.borderHover} transition-all duration-300 group`}>
            <motion.div whileHover={{ scale: 1.1, rotate: 5 }}
              className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-5`}>
              <item.icon className={`w-8 h-8 ${item.iconColor}`} />
            </motion.div>
            <h3 className="text-xl font-semibold text-white mb-3">{item.title}</h3>
            <p className="text-sm text-white/50 leading-relaxed">{item.desc}</p>
          </motion.div>
        ))}
      </motion.div>
    </div>
  ));

  /* ━━━ 12 ─ CONCLUSION ━━━ */
  push("conclusion", (
    <div className="relative flex flex-col items-center justify-center h-full text-center px-16 overflow-hidden">
      <GlowOrb className="w-[500px] h-[500px] bg-purple-500 top-0 left-1/4" />
      <GlowOrb className="w-[400px] h-[400px] bg-blue-500 bottom-0 right-1/4" />
      <SectionTag label="Conclusion" />
      <motion.h2 initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 100 }}
        className="text-5xl md:text-6xl font-bold text-white mb-6" style={heading}>
        Accountability, <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">Elevated</span>
      </motion.h2>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
        className="text-lg text-white/60 max-w-3xl mb-10 leading-relaxed">
        WPR Audit positively transforms how the construction and interior design industry tracks progress. By complementing manual reviews with AI-powered verification, we help ensure that every Weekly Progress Report reflects the true picture — identifying inconsistencies, highlighting areas for improvement, and empowering teams to deliver with greater transparency.
      </motion.p>
      <motion.div variants={stagger(0.1)} initial="hidden" animate="visible" className="flex gap-3">
        {["AI-Powered Analysis", "Batch Processing", "Severity Scoring", "Consolidated Dashboard", "Customer Experience"].map((tag, i) => (
          <motion.span key={i} variants={scaleIn}
            className="px-4 py-2 rounded-full bg-purple-500/20 border border-purple-500/30 text-sm text-purple-300">
            {tag}
          </motion.span>
        ))}
      </motion.div>
    </div>
  ));

  /* ━━━ 13 ─ Q&A ━━━ */
  push("qa", (
    <div className="relative flex flex-col items-center justify-center h-full text-center px-16 overflow-hidden">
      <GlowOrb className="w-[600px] h-[600px] bg-indigo-500 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 150, damping: 12 }}
        className="w-28 h-28 rounded-3xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center mb-8 shadow-2xl shadow-purple-500/40">
        <MessageCircle className="w-14 h-14 text-white" />
      </motion.div>
      <motion.h2 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 100, delay: 0.3 }}
        className="text-6xl md:text-7xl font-bold text-white mb-4" style={heading}>
        Q &amp; A
      </motion.h2>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
        className="text-2xl text-white/50 mb-4">Thank you for watching!</motion.p>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
        className="text-lg text-white/30">We'd love to answer your questions</motion.p>
    </div>
  ));

  return slides;
}

/* ── PRESENTATION COMPONENT ── */

export default function PresentationPage() {
  const [slides] = useState(buildSlides);
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const goNext = useCallback(() => setCurrent(c => Math.min(c + 1, slides.length - 1)), [slides.length]);
  const goPrev = useCallback(() => setCurrent(c => Math.max(c - 1, 0)), []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); goNext(); }
      if (e.key === "ArrowLeft") { e.preventDefault(); goPrev(); }
      if (e.key === "Escape" && isFullscreen) toggleFullscreen();
      if (e.key === "f" || e.key === "F") toggleFullscreen();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev, isFullscreen, toggleFullscreen]);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  return (
    <div className="h-screen w-screen bg-[#0a0a1a] flex flex-col overflow-hidden select-none">
      {/* Slide area */}
      <div className="flex-1 relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, x: 80, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -80, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 200, damping: 25 }}
            className="absolute inset-0"
          >
            {slides[current].content}
          </motion.div>
        </AnimatePresence>

        {/* Click zones */}
        <div className="absolute inset-y-0 left-0 w-1/3 cursor-pointer z-10" onClick={goPrev} />
        <div className="absolute inset-y-0 right-0 w-1/3 cursor-pointer z-10" onClick={goNext} />
      </div>

      {/* Bottom bar */}
      <motion.div initial={{ y: 60 }} animate={{ y: 0 }} transition={{ type: "spring", stiffness: 200, delay: 0.5 }}
        className="h-14 bg-black/40 backdrop-blur-xl border-t border-white/5 flex items-center justify-between px-6 z-20">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="text-white/60 hover:text-white hover:bg-white/10" title="Back to Dashboard">
            <Home className="w-5 h-5" />
          </Button>
          <div className="w-px h-5 bg-white/10 mx-1" />
          <Button variant="ghost" size="icon" onClick={goPrev} disabled={current === 0} className="text-white/60 hover:text-white hover:bg-white/10">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <span className="text-sm text-white/40 font-mono min-w-[60px] text-center">{current + 1} / {slides.length}</span>
          <Button variant="ghost" size="icon" onClick={goNext} disabled={current === slides.length - 1} className="text-white/60 hover:text-white hover:bg-white/10">
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        {/* Dot indicators */}
        <div className="flex gap-1.5">
          {slides.map((_, i) => (
            <button key={i} onClick={() => setCurrent(i)}
              className={`h-2 rounded-full transition-all duration-300 ${i === current ? "bg-purple-400 w-6" : "bg-white/20 hover:bg-white/40 w-2"}`} />
          ))}
        </div>

        <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="text-white/60 hover:text-white hover:bg-white/10">
          {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
        </Button>
      </motion.div>
    </div>
  );
}
