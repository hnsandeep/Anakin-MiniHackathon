"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/sources", label: "Sources", icon: "🌐" },
  { href: "/profile", label: "Profile", icon: "🏢" },
];

export function Nav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="nav-glass sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal to-teal-dark flex items-center justify-center shadow-sm">
            <span className="text-white text-sm font-bold">CR</span>
          </div>
          <span className="text-white font-heading font-bold text-lg tracking-tight">
            Compliance<span className="text-teal">Radar</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden sm:flex items-center gap-1">
          {NAV_LINKS.map((link) => {
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                  active
                    ? "bg-teal/15 text-teal border border-teal/25"
                    : "text-slate-400 hover:text-white hover:bg-white/8"
                }`}
              >
                <span className="text-base">{link.icon}</span>
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Status pill */}
        <div className="hidden sm:flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-3 py-1">
          <span className="w-1.5 h-1.5 rounded-full bg-teal animate-pulse" />
          <span className="text-xs text-slate-400">Anakin AI Active</span>
        </div>

        {/* Mobile menu button */}
        <button
          className="sm:hidden text-slate-400 hover:text-white transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Menu"
        >
          {mobileOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="sm:hidden border-t border-white/10 bg-navy px-4 py-3 space-y-1">
          {NAV_LINKS.map((link) => {
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  active ? "bg-teal/15 text-teal" : "text-slate-400 hover:text-white"
                }`}
              >
                {link.icon} {link.label}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
