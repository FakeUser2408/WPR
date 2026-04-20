import { motion, AnimatePresence } from "framer-motion";
import {
  Wifi,
  FolderSearch,
  FileText,
  Sparkles,
  BarChart3,
  Save,
  CheckCircle2,
} from "lucide-react";

const STEPS = [
  { key: "connecting", icon: Wifi, label: "Connecting to analysis engine", description: "Establishing secure connection..." },
  { key: "scanning", icon: FolderSearch, label: "Scanning uploaded WPRs", description: "Finding your latest weekly reports..." },
  { key: "extracting", icon: FileText, label: "Extracting report content", description: "Reading text, tables, and data from PDFs..." },
  { key: "analyzing", icon: Sparkles, label: "AI analyzing differences", description: "Comparing sections, progress, risks, and timelines..." },
  { key: "saving", icon: Save, label: "Saving analysis report", description: "Storing results for your project..." },
  { key: "done", icon: CheckCircle2, label: "Analysis complete", description: "Your report is ready!" },
];

interface AnalysisJourneyProps {
  currentStep: string;
  isVisible: boolean;
}

export default function AnalysisJourney({ currentStep, isVisible }: AnalysisJourneyProps) {
  const currentIndex = STEPS.findIndex(s => s.key === currentStep);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
          className="mt-4 overflow-hidden"
        >
          <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-primary/5 p-5">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-sm font-semibold text-foreground font-sans">Analysis in Progress</span>
            </div>

            <div className="space-y-1">
              {STEPS.map((step, i) => {
                const isActive = i === currentIndex;
                const isDone = i < currentIndex;
                const isPending = i > currentIndex;
                const Icon = step.icon;

                return (
                  <motion.div
                    key={step.key}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-start gap-3 relative"
                  >
                    {/* Vertical line */}
                    {i < STEPS.length - 1 && (
                      <div
                        className={`absolute left-[15px] top-[30px] w-[2px] h-[calc(100%)] transition-colors duration-500 ${
                          isDone ? "bg-success/40" : "bg-border"
                        }`}
                      />
                    )}

                    {/* Icon circle */}
                    <div
                      className={`w-[30px] h-[30px] rounded-full flex items-center justify-center shrink-0 z-10 transition-all duration-500 ${
                        isDone
                          ? "bg-success/15 text-success"
                          : isActive
                          ? "bg-primary/15 text-primary ring-2 ring-primary/30 ring-offset-1 ring-offset-card"
                          : "bg-muted text-muted-foreground/40"
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <Icon className={`w-3.5 h-3.5 ${isActive ? "animate-pulse" : ""}`} />
                      )}
                    </div>

                    {/* Text */}
                    <div className={`pb-4 pt-1 transition-all duration-300 ${isPending ? "opacity-40" : ""}`}>
                      <p
                        className={`text-sm font-medium leading-tight ${
                          isDone ? "text-success" : isActive ? "text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {step.label}
                      </p>
                      {(isActive || isDone) && (
                        <motion.p
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`text-xs mt-0.5 ${isDone ? "text-success/60" : "text-muted-foreground"}`}
                        >
                          {isDone ? "Completed" : step.description}
                        </motion.p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export { STEPS };
