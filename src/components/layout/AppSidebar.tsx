import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, History, BarChart3,
  ChevronLeft, ChevronRight
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { label: "History", icon: History, path: "/history" },
  { label: "Analytics", icon: BarChart3, path: "/analytics" },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="fixed left-0 top-16 bottom-0 z-40 flex flex-col bg-sidebar border-r border-border"
      style={{
        borderImage: "linear-gradient(to bottom, transparent, hsl(243 76% 59% / 0.3), transparent) 1",
      }}
    >
      <nav className="flex-1 py-4 space-y-1 px-2 overflow-hidden">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className="block"
            >
              <motion.div
                whileHover={{ x: 4 }}
                transition={{ duration: 0.15 }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors duration-150 ${isActive
                  ? "bg-accent border-l-2 border-primary text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  }`}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="text-body whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            </NavLink>
          );
        })}
      </nav>

      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center p-3 border-t border-border text-muted-foreground hover:text-foreground transition-colors"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </motion.aside>
  );
}

export function useSidebarWidth() {
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const sidebar = document.querySelector("aside");
      if (sidebar) {
        setCollapsed(sidebar.getBoundingClientRect().width < 100);
      }
    });
    observer.observe(document.body, { subtree: true, attributes: true });
    return () => observer.disconnect();
  }, []);
  return collapsed ? 64 : 240;
}
