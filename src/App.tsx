import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import LandingPage from "./pages/LandingPage";
import Index from "./pages/Index";
import AnalysisReport from "./pages/AnalysisReport";
import HistoryPage from "./pages/HistoryPage";
import ProjectsPage from "./pages/ProjectsPage";
import ProjectDetailPage from "./pages/ProjectDetailPage";
import HowItWorksPage from "./pages/HowItWorksPage";
import AnalysisDashboard from "./pages/AnalysisDashboard";
import PresentationPage from "./pages/PresentationPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/upload" element={<Index />} />
          <Route path="/report/:id" element={<AnalysisReport />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/project/:name" element={<ProjectDetailPage />} />
          <Route path="/how-it-works" element={<HowItWorksPage />} />
          <Route path="/analysis" element={<AnalysisDashboard />} />
          <Route path="/presentation" element={<PresentationPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
