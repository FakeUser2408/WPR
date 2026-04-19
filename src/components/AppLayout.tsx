import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { BarChart3, FolderOpen } from "lucide-react";

export default function AppLayout({ children }: { children: ReactNode }) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/70 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center glow-shadow">
              <BarChart3 className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-foreground text-lg font-sans">WPR Audit</span>
          </Link>
          <nav className="flex items-center gap-1">
            <NavItem to="/projects" icon={<FolderOpen className="w-4 h-4" />} label="Projects" active={location.pathname.startsWith("/projects") || location.pathname.startsWith("/project/")} />
          </nav>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}

function NavItem({ to, icon, label, active }: { to: string; icon: ReactNode; label: string; active: boolean }) {
  return (
    <Link
      to={to}
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all
        ${active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"}
      `}
    >
      {icon}
      {label}
    </Link>
  );
}
