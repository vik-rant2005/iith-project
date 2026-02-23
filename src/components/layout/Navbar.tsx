import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Bell, Settings, User, Check } from "lucide-react";

const steps = [
  { label: "Upload", num: 1 },
  { label: "Review", num: 2 },
  { label: "Validate", num: 3 },
  { label: "Export", num: 4 },
];

interface NavbarProps {
  activeStep: number;
}

function ECGLogo() {
  return (
    <div className="flex items-center gap-2">
      <svg width="32" height="24" viewBox="0 0 32 24" fill="none" className="shrink-0">
        <polyline
          points="0,12 6,12 8,4 10,20 12,8 14,16 16,12 32,12"
          stroke="hsl(243 76% 59%)"
          strokeWidth="2"
          fill="none"
          className="ecg-draw"
        />
      </svg>
      <span className="text-h3 font-bold text-foreground tracking-tight">
        Clin<span className="text-primary">IQ</span>
      </span>
    </div>
  );
}

export function Navbar({ activeStep }: NavbarProps) {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <motion.header
      animate={{ height: scrolled ? 48 : 64 }}
      transition={{ duration: 0.2 }}
      className={`fixed top-0 left-0 right-0 z-50 flex items-center px-6 border-b border-border transition-all ${scrolled ? "backdrop-blur-xl bg-background/80" : "bg-background"
        }`}
    >
      {/* Left: Logo */}
      <ECGLogo />

      {/* Centre: Stepper */}
      <div className="flex-1 flex items-center justify-center gap-1">
        {steps.map((step, i) => (
          <div key={step.num} className="flex items-center">
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-caption font-medium transition-all duration-300 ${step.num < activeStep
                ? "bg-success/20 text-success"
                : step.num === activeStep
                  ? "bg-primary/20 text-primary glow-shadow"
                  : "bg-muted text-muted-foreground"
                }`}
            >
              {step.num < activeStep ? (
                <Check className="w-3 h-3" />
              ) : (
                <span className="w-4 h-4 flex items-center justify-center rounded-full text-[10px] bg-current/20">
                  {step.num}
                </span>
              )}
              <span className="hidden sm:inline">{step.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className="w-8 h-px mx-1 relative overflow-hidden">
                <div className="absolute inset-0 bg-border" />
                <motion.div
                  className="absolute inset-y-0 left-0 bg-primary"
                  initial={{ width: "0%" }}
                  animate={{ width: step.num < activeStep ? "100%" : "0%" }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-4">
        <button className="relative text-muted-foreground hover:text-foreground transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-destructive rounded-full" />
        </button>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-elevated text-caption">
          <div className="w-6 h-6 rounded-full bg-primary/30 flex items-center justify-center">
            <User className="w-3.5 h-3.5 text-primary" />
          </div>
          <span className="hidden md:inline text-foreground">Dr. Arjun Mehta</span>
        </div>
        <button className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </motion.header>
  );
}
