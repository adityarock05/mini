"use client";

import { ReactNode, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/auth";
import {
  LayoutDashboard,
  MessageSquare,
  BookOpen,
  Briefcase,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  UserCircle,
  Calendar,
  Megaphone,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles?: string[];
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Grievances", href: "/grievances", icon: MessageSquare },
  { label: "Courses", href: "/courses", icon: BookOpen },
  { label: "Calendar", href: "/calendar", icon: Calendar },
  { label: "Noticeboard", href: "/noticeboard", icon: Megaphone },
  { label: "Opportunities", href: "/opportunities", icon: Briefcase },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const pathname = usePathname();

  const handleLogout = () => {
    logout();
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-background font-mono">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/80 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-64 bg-sidebar border-r-2 border-border transition-transform duration-200 ease-in-out lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="h-16 flex items-center px-6 border-b-2 border-border bg-sidebar">
            <Link href="/dashboard" className="flex items-center gap-3 group">
              <div className="w-8 h-8 bg-primary flex items-center justify-center border-2 border-primary group-hover:bg-transparent group-hover:text-primary transition-colors">
                <span className="text-black font-bold text-lg group-hover:text-primary">A</span>
              </div>
              <span className="font-bold text-xl text-primary tracking-tighter uppercase">AEGIS</span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden ml-auto p-2 text-primary hover:bg-primary hover:text-black border-2 border-transparent hover:border-primary transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-3 text-sm font-bold uppercase tracking-wider border-2 transition-all duration-200",
                    isActive
                      ? "bg-primary text-black border-primary shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)]"
                      : "text-muted-foreground border-transparent hover:border-primary hover:text-primary hover:bg-sidebar-accent"
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                  {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                </Link>
              );
            })}
          </nav>

          {/* Bottom Actions */}
          <div className="p-4 border-t-2 border-border space-y-2 bg-sidebar">
            <Link
              href="/settings"
              className="flex items-center gap-3 px-3 py-3 text-sm font-bold uppercase tracking-wider text-muted-foreground border-2 border-transparent hover:border-primary hover:text-primary hover:bg-sidebar-accent transition-all"
            >
              <Settings className="w-5 h-5" />
              Settings
            </Link>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-3 text-sm font-bold uppercase tracking-wider text-destructive border-2 border-transparent hover:border-destructive hover:bg-destructive hover:text-black transition-all"
            >
              <LogOut className="w-5 h-5" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:ml-64 min-h-screen flex flex-col">
        {/* Header */}
        <header className="h-16 bg-background border-b-2 border-border sticky top-0 z-30">
          <div className="h-full px-4 lg:px-8 flex items-center justify-between">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-primary hover:bg-primary hover:text-black border-2 border-transparent hover:border-primary transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Breadcrumb (Desktop) */}
            <div className="hidden lg:flex items-center text-sm text-muted-foreground">
              <span className="text-primary font-bold uppercase tracking-widest text-lg">
                // {navItems.find((item) => pathname?.startsWith(item.href))?.label || "Dashboard"}
              </span>
            </div>

            {/* User Menu */}
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm font-bold text-foreground uppercase tracking-wide">
                    {user?.display_name || user?.email}
                  </p>
                  <p className="text-xs text-primary font-mono uppercase">[{user?.role?.toLowerCase()}]</p>
                </div>
                <div className="w-10 h-10 bg-secondary flex items-center justify-center border-2 border-secondary hover:bg-transparent hover:text-secondary text-black transition-all cursor-pointer">
                  <span className="font-bold text-lg">
                    {(user?.display_name || user?.email || "U")[0].toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-8 bg-background relative overflow-hidden">
          {/* Background Grid Pattern */}
          <div className="absolute inset-0 z-0 opacity-10 pointer-events-none"
            style={{
              backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)',
              backgroundSize: '40px 40px'
            }}>
          </div>
          <div className="relative z-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
