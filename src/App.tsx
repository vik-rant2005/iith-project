import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { BackgroundAnimation } from "@/components/layout/BackgroundAnimation";
import Dashboard from "./pages/Dashboard";
import ClinicalReview from "./pages/ClinicalReview";
import ValidationReport from "./pages/ValidationReport";
import ExportPage from "./pages/ExportPage";
import History from "./pages/History";
import Analytics from "./pages/Analytics";

import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function getActiveStep(pathname: string) {
  if (pathname === "/") return 1;
  if (pathname === "/review") return 2;
  if (pathname === "/validate") return 3;
  if (pathname === "/export") return 4;
  return 1;
}

const pageVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
  exit: { opacity: 0, transition: { duration: 0.2, ease: "easeIn" } },
};

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="w-full"
      >
        <Routes location={location}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/review" element={<ClinicalReview />} />
          <Route path="/validate" element={<ValidationReport />} />
          <Route path="/export" element={<ExportPage />} />
          <Route path="/history" element={<History />} />
          <Route path="/analytics" element={<Analytics />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeStep = getActiveStep(location.pathname);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      if (e.key === 'u' && !e.shiftKey) { e.preventDefault(); navigate('/'); }
      else if (e.key === 'h' && !e.shiftKey) { e.preventDefault(); navigate('/history'); }
      else if (e.key === 'A' && e.shiftKey) { e.preventDefault(); navigate('/analytics'); }

    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate]);


  return (
    <div className="min-h-screen w-full">
      <BackgroundAnimation />
      <Navbar activeStep={activeStep} />
      <div className="flex pt-16">
        <AppSidebar />
        <main className="flex-1 ml-[240px] p-6 relative z-10">
          <AnimatedRoutes />
        </main>
      </div>
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
