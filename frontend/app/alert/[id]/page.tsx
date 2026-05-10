"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { AlertDetail } from "@/lib/types";

const URGENCY_CONFIG: Record<string, { bg: string; text: string; border: string; stripe: string }> = {
  Critical: { bg: "bg-red-50",   text: "text-red-700",   border: "border-red-300",   stripe: "bg-red-500" },
  High:     { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-300", stripe: "bg-amber-500" },
  Medium:   { bg: "bg-blue-50",  text: "text-blue-700",  border: "border-blue-300",  stripe: "bg-blue-500" },
  Low:      { bg: "bg-slate-50", text: "text-slate-600", border: "border-slate-300", stripe: "bg-slate-400" },
};

export default function AlertPage() {
  const { id } = useParams();
  const router = useRouter();
  const [alertData, setAlertData] = useState<AlertDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [showDiff, setShowDiff] = useState(false);

  useEffect(() => {
    api.alert(Number(id))
      .then(setAlertData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleChecklist = async (task: string, checked: boolean) => {
    if (!alertData) return;
    const newState = { ...alertData.checklist_state, [task]: checked };
    setAlertData({ ...alertData, checklist_state: newState });
    await api.checklist(alertData.id, newState).catch(console.error);
  };

  const handleReanalyze = async () => {
    if (!alertData) return;
    setReanalyzing(true);
    try {
      const updated = await api.reanalyze(alertData.id);
      setAlertData(updated);
    } catch (e: any) {
      alert("Re-analysis failed: " + e.message);
    } finally {
      setReanalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4 animate-pulse">
        <div className="skeleton h-4 w-24 rounded" />
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <div className="flex gap-2">
            <div className="skeleton h-6 w-16 rounded-full" />
            <div className="skeleton h-6 w-16 rounded-full" />
          </div>
          <div className="skeleton h-8 w-3/4 rounded" />
          <div className="skeleton h-4 w-full rounded" />
          <div className="skeleton h-4 w-5/6 rounded" />
        </div>
      </div>
    );
  }

  if (!alertData) {
    return (
      <div className="text-center py-20">
        <div className="text-5xl mb-4">🔍</div>
        <p className="text-slate-600 font-medium">Alert not found</p>
        <button onClick={() => router.back()} className="mt-4 text-teal hover:underline text-sm">← Go back</button>
      </div>
    );
  }

  const cfg = URGENCY_CONFIG[alertData.urgency] || URGENCY_CONFIG.Low;
  const completedCount = alertData.action_items?.filter(item => alertData.checklist_state?.[item]).length || 0;
  const totalCount = alertData.action_items?.length || 0;
  const progressPct = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16 animate-fade-in">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-navy transition-colors font-medium"
      >
        ← Back to Dashboard
      </button>

      {/* Main card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
        {/* Urgency stripe */}
        <div className={`h-1 ${cfg.stripe}`} />

        <div className="p-6">
          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap mb-4">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
              {alertData.category}
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
              {alertData.urgency}
            </span>
            <span className="ml-auto text-xs text-slate-400">
              {new Date(alertData.created_at).toLocaleString("en-IN", {
                day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
              })}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-heading font-bold text-navy mb-4 leading-tight">
            {alertData.title}
          </h1>

          {/* Summary */}
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 mb-6">
            <p className="text-sm text-slate-700 leading-relaxed">{alertData.ai_summary}</p>
          </div>

          {/* Deadline & Penalty */}
          <div className="space-y-3 mb-6">
            {alertData.deadline && (
              <div className="flex items-start gap-3 p-3 bg-amber-50 text-amber-800 rounded-lg border border-amber-200 text-sm">
                <span className="text-base">⏳</span>
                <div><span className="font-semibold">Deadline: </span>{alertData.deadline}</div>
              </div>
            )}
            {alertData.penalty_note && (
              <div className="flex items-start gap-3 p-3 bg-red-50 text-red-800 rounded-lg border border-red-200 text-sm">
                <span className="text-base">⚠️</span>
                <div><span className="font-semibold">Penalty / Risk: </span>{alertData.penalty_note}</div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleReanalyze}
              disabled={reanalyzing}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium text-sm hover:bg-slate-200 transition-colors disabled:opacity-50"
            >
              {reanalyzing ? (
                <><span className="animate-spin">⟳</span> Re-analyzing...</>
              ) : (
                <><span>🔄</span> Re-analyze for My Profile</>
              )}
            </button>
            {alertData.url && (
              <a
                href={alertData.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-navy text-white rounded-lg font-medium text-sm hover:bg-slate-800 transition-colors"
              >
                <span>📄</span> View Source Document
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Action Checklist */}
      {alertData.action_items && alertData.action_items.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-card p-6">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-heading font-bold text-navy flex items-center gap-2">
              <span>📋</span> Action Checklist
            </h2>
            <span className={`text-sm font-semibold ${progressPct === 100 ? "text-teal" : "text-slate-500"}`}>
              {completedCount}/{totalCount} completed
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-2 bg-slate-100 rounded-full mb-6 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-teal to-teal-dark rounded-full transition-all duration-700"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <div className="space-y-2">
            {alertData.action_items.map((item, idx) => {
              const done = alertData.checklist_state?.[item] || false;
              return (
                <label
                  key={idx}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    done
                      ? "bg-teal/5 border-teal/20"
                      : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={done}
                    onChange={(e) => handleChecklist(item, e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-slate-300 accent-teal cursor-pointer"
                  />
                  <span className={`text-sm leading-relaxed ${done ? "line-through text-slate-400" : "text-slate-700"}`}>
                    {item}
                  </span>
                </label>
              );
            })}
          </div>

          {progressPct === 100 && (
            <div className="mt-4 p-3 bg-teal/10 text-teal rounded-lg text-sm font-medium text-center">
              ✅ All actions completed!
            </div>
          )}
        </div>
      )}

      {/* Diff viewer */}
      {alertData.diff_unified && alertData.diff_unified.trim() && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-card">
          <button
            className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-slate-50 transition-colors rounded-xl"
            onClick={() => setShowDiff(!showDiff)}
          >
            <h2 className="text-lg font-heading font-bold text-navy flex items-center gap-2">
              <span>📑</span> Document Changes
            </h2>
            <span className="text-slate-400 text-sm">{showDiff ? "Hide ▲" : "Show ▼"}</span>
          </button>

          {showDiff && (
            <div className="px-6 pb-6">
              <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto text-xs font-mono leading-6">
                {alertData.diff_unified.split("\n").map((line, i) => {
                  let cls = "text-slate-400";
                  if (line.startsWith("+") && !line.startsWith("+++")) cls = "text-green-400";
                  else if (line.startsWith("-") && !line.startsWith("---")) cls = "text-red-400";
                  else if (line.startsWith("@@")) cls = "text-blue-400 font-semibold";
                  else if (line.startsWith("---") || line.startsWith("+++")) cls = "text-slate-500";
                  return (
                    <div key={i} className={cls}>
                      {line || "\u00A0"}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
