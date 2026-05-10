"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Source } from "@/lib/types";

const CATEGORY_OPTIONS = ["GST", "RBI", "SEBI", "Municipal", "Labor", "Environment"];

const CATEGORY_COLORS: Record<string, string> = {
  GST: "bg-orange-100 text-orange-800",
  RBI: "bg-purple-100 text-purple-800",
  SEBI: "bg-indigo-100 text-indigo-800",
  Municipal: "bg-green-100 text-green-800",
  Labor: "bg-pink-100 text-pink-800",
  Environment: "bg-emerald-100 text-emerald-800",
};

export default function SourcesPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUrl, setNewUrl] = useState("");
  const [newCategory, setNewCategory] = useState("GST");
  const [simUrl, setSimUrl] = useState("");
  const [simLoading, setSimLoading] = useState(false);
  const [simResult, setSimResult] = useState<string | null>(null);
  const [addingSource, setAddingSource] = useState(false);

  useEffect(() => {
    fetchSources();
  }, []);

  const fetchSources = async () => {
    try {
      const data = await api.sources();
      setSources(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl) return;
    setAddingSource(true);
    try {
      await api.addSource({ url: newUrl, category: newCategory });
      setNewUrl("");
      fetchSources();
    } catch (e: any) {
      alert("Failed to add: " + e.message);
    } finally {
      setAddingSource(false);
    }
  };

  const handleToggle = async (id: number) => {
    try {
      await api.toggleSource(id);
      setSources(prev => prev.map(s => s.id === id ? { ...s, is_active: !s.is_active } : s));
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simUrl) return;
    setSimLoading(true);
    setSimResult(null);
    try {
      const alertCard = await api.simulate(simUrl);
      setSimResult(`✅ Alert created: "${alertCard.title}" — Urgency: ${alertCard.urgency}`);
      setSimUrl("");
    } catch (e: any) {
      setSimResult(`❌ ${e.message}`);
    } finally {
      setSimLoading(false);
    }
  };

  const activeSources = sources.filter(s => s.is_active);
  const inactiveSources = sources.filter(s => !s.is_active);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-heading font-bold text-navy">Monitored Portals</h1>
        <p className="text-slate-500 mt-1">{sources.length} sources tracked — {activeSources.length} active</p>
      </div>

      {/* Two action panels side by side on desktop */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Add Source */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-card p-6">
          <h2 className="text-lg font-heading font-bold text-navy mb-1">Add Monitoring Source</h2>
          <p className="text-sm text-slate-500 mb-4">Register a government portal URL to watch for regulatory changes.</p>
          <form onSubmit={handleAdd} className="space-y-3">
            <input
              type="url"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="https://cbic-gst.gov.in/..."
              className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal outline-none transition-all"
              required
            />
            <div className="flex gap-3">
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="flex-1 px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-teal outline-none"
              >
                {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <button
                type="submit"
                disabled={addingSource}
                className="px-4 py-2.5 bg-navy text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                {addingSource ? "Adding..." : "Add"}
              </button>
            </div>
          </form>
        </div>

        {/* Simulate */}
        <div className="bg-gradient-to-br from-teal/5 to-blue-50 rounded-xl border border-teal/20 shadow-card p-6">
          <h2 className="text-lg font-heading font-bold text-navy mb-1 flex items-center gap-2">
            <span>⚡</span> Simulate New Circular
          </h2>
          <p className="text-sm text-slate-500 mb-4">
            Paste any govt URL — Anakin.io scrapes it live, Claude AI generates an alert in ~15 seconds.
          </p>
          <form onSubmit={handleSimulate} className="space-y-3">
            <input
              type="url"
              value={simUrl}
              onChange={(e) => setSimUrl(e.target.value)}
              placeholder="https://rbi.org.in/..."
              className="w-full px-4 py-2.5 text-sm border border-teal/30 rounded-lg focus:ring-2 focus:ring-teal outline-none bg-white transition-all"
              required
            />
            <button
              type="submit"
              disabled={simLoading}
              className="w-full py-2.5 bg-teal text-white text-sm font-semibold rounded-lg hover:bg-teal-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {simLoading ? (
                <><span className="animate-spin">⟳</span> Scraping with Anakin.io...</>
              ) : (
                <><span>🔍</span> Scrape & Analyze</>
              )}
            </button>
          </form>
          {simResult && (
            <div className={`mt-3 p-3 rounded-lg text-sm ${simResult.startsWith("✅") ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
              {simResult}
            </div>
          )}
        </div>
      </div>

      {/* Sources list */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 animate-pulse flex gap-4">
              <div className="skeleton h-5 w-20 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-4 w-1/3 rounded" />
                <div className="skeleton h-3 w-2/3 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {sources.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
              <p className="text-slate-500">No sources yet. Add one above.</p>
            </div>
          ) : (
            sources.map((s) => (
              <div
                key={s.id}
                className={`flex items-center gap-4 p-4 bg-white rounded-xl border shadow-card transition-all ${
                  s.is_active ? "border-slate-200" : "border-slate-100 opacity-60"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[s.category] || "bg-slate-100 text-slate-600"}`}>
                      {s.category}
                    </span>
                    <span className="text-sm font-semibold text-slate-800 truncate">{s.domain}</span>
                  </div>
                  <p className="text-xs text-slate-400 truncate">{s.url}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-xs text-slate-400">Every {s.frequency_hours}h</span>
                    {s.last_crawled_at && (
                      <span className="text-xs text-slate-400">
                        Last crawled: {new Date(s.last_crawled_at).toLocaleDateString("en-IN")}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleToggle(s.id)}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    s.is_active
                      ? "bg-teal/10 text-teal border-teal/30 hover:bg-teal/20"
                      : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${s.is_active ? "bg-teal" : "bg-slate-400"}`} />
                  {s.is_active ? "Active" : "Paused"}
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
