"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { AlertCard } from "@/lib/types";

const URGENCY_CONFIG: Record<string, { bg: string; text: string; border: string; dot: string; label: string }> = {
  Critical: { bg: "bg-red-50",    text: "text-red-700",   border: "border-red-200",   dot: "bg-red-500",   label: "Critical" },
  High:     { bg: "bg-amber-50",  text: "text-amber-700", border: "border-amber-200", dot: "bg-amber-500", label: "High" },
  Medium:   { bg: "bg-blue-50",   text: "text-blue-700",  border: "border-blue-200",  dot: "bg-blue-500",  label: "Medium" },
  Low:      { bg: "bg-slate-50",  text: "text-slate-600", border: "border-slate-200", dot: "bg-slate-400", label: "Low" },
};

const CATEGORY_COLORS: Record<string, string> = {
  GST: "bg-orange-100 text-orange-800",
  RBI: "bg-purple-100 text-purple-800",
  SEBI: "bg-indigo-100 text-indigo-800",
  Municipal: "bg-green-100 text-green-800",
  Labor: "bg-pink-100 text-pink-800",
  Environment: "bg-emerald-100 text-emerald-800",
};

function UrgencyBadge({ urgency }: { urgency: string }) {
  const cfg = URGENCY_CONFIG[urgency] || URGENCY_CONFIG.Low;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${urgency === "Critical" ? "animate-pulse" : ""}`} />
      {cfg.label}
    </span>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const color = CATEGORY_COLORS[category] || "bg-slate-100 text-slate-600";
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {category}
    </span>
  );
}

function StatCard({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-card text-center">
      <div className={`text-3xl font-bold font-heading ${color}`}>{value}</div>
      <div className="text-xs text-slate-500 mt-1 font-medium">{label}</div>
    </div>
  );
}

function AlertCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-card animate-pulse">
      <div className="flex gap-2 mb-3">
        <div className="skeleton h-5 w-16 rounded-full" />
        <div className="skeleton h-5 w-16 rounded-full" />
      </div>
      <div className="skeleton h-6 w-3/4 mb-2 rounded" />
      <div className="skeleton h-4 w-full mb-1 rounded" />
      <div className="skeleton h-4 w-2/3 rounded" />
    </div>
  );
}

export default function Dashboard() {
  const [alerts, setAlerts] = useState<AlertCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("All");

  useEffect(() => {
    api.alerts()
      .then(setAlerts)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const categories = ["All", ...Array.from(new Set(alerts.map(a => a.category)))];
  const filtered = filter === "All" ? alerts : alerts.filter(a => a.category === filter);

  const counts = {
    critical: alerts.filter(a => a.urgency === "Critical").length,
    high:     alerts.filter(a => a.urgency === "High").length,
    total:    alerts.length,
    pending:  alerts.filter(a => a.action_items && a.action_items.length > 0).length,
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-navy">Regulatory Feed</h1>
          <p className="text-slate-500 mt-1">
            AI-powered compliance monitoring for Indian SMEs
          </p>
        </div>
        <Link
          href="/sources"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal text-white rounded-lg font-medium text-sm hover:bg-teal-dark transition-colors shadow-sm"
        >
          + Simulate New Circular
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard value={counts.total}    label="Total Alerts"      color="text-navy" />
        <StatCard value={counts.critical} label="Critical"          color="text-red-600" />
        <StatCard value={counts.high}     label="High Priority"     color="text-amber-600" />
        <StatCard value={counts.pending}  label="Action Required"   color="text-teal" />
      </div>

      {/* Category filter pills */}
      {!loading && alerts.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                filter === cat
                  ? "bg-navy text-white border-navy"
                  : "bg-white text-slate-600 border-slate-200 hover:border-teal hover:text-teal"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Alert feed */}
      <div className="grid gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <AlertCardSkeleton key={i} />)
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-slate-200 shadow-card">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-slate-500 font-medium">No alerts in this category</p>
            <p className="text-slate-400 text-sm mt-1">Try adding sources or simulating a crawl</p>
          </div>
        ) : (
          filtered.map((alert, i) => (
            <Link
              href={`/alert/${alert.id}`}
              key={alert.id}
              className="block group alert-card"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-card">
                {/* Top row */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CategoryBadge category={alert.category} />
                    <UrgencyBadge urgency={alert.urgency} />
                    {alert.unread && (
                      <span className="w-2 h-2 rounded-full bg-teal" title="Unread" />
                    )}
                  </div>
                  <span className="text-xs text-slate-400 whitespace-nowrap ml-2">
                    {new Date(alert.created_at).toLocaleDateString("en-IN", {
                      day: "numeric", month: "short", year: "numeric"
                    })}
                  </span>
                </div>

                {/* Title */}
                <h2 className="text-base font-semibold text-slate-900 group-hover:text-teal transition-colors mb-2 line-clamp-2 font-heading">
                  {alert.title}
                </h2>

                {/* Summary */}
                <p className="text-sm text-slate-600 mb-4 line-clamp-2 leading-relaxed">
                  {alert.ai_summary}
                </p>

                {/* Bottom row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {alert.action_items && alert.action_items.length > 0 && (
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <span>📋</span>
                        {alert.action_items.length} action{alert.action_items.length !== 1 ? "s" : ""}
                      </span>
                    )}
                    {alert.deadline && (
                      <span className="text-xs text-amber-700 font-medium flex items-center gap-1">
                        <span>⏳</span>
                        {alert.deadline}
                      </span>
                    )}
                    {alert.penalty_note && (
                      <span className="text-xs text-red-600 flex items-center gap-1">
                        <span>⚠️</span>
                        Penalty risk
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-teal font-semibold group-hover:underline">
                    View Details →
                  </span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
