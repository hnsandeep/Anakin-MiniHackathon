"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Profile } from "@/lib/types";

const SECTOR_OPTIONS = [
  "FinTech", "Banking", "Insurance", "Manufacturing", "Retail", "E-Commerce",
  "Healthcare", "Pharma", "IT/Software", "Logistics", "Real Estate", "Education",
  "FMCG", "Telecom", "Energy", "Agriculture"
];

const STATE_OPTIONS = [
  "Maharashtra", "Karnataka", "Delhi", "Tamil Nadu", "Gujarat", "Telangana",
  "Rajasthan", "Uttar Pradesh", "West Bengal", "Andhra Pradesh", "Madhya Pradesh",
  "Kerala", "Punjab", "Haryana", "Bihar"
];

const COMPANY_SIZES = [
  { value: "1-10",    label: "1–10 employees (Startup)" },
  { value: "11-50",   label: "11–50 employees (Small)" },
  { value: "51-200",  label: "51–200 employees (Mid-size)" },
  { value: "201-500", label: "201–500 employees (Growth)" },
  { value: "500+",    label: "500+ employees (Enterprise)" },
];

function Tag({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-navy text-white rounded-full text-xs font-medium">
      {label}
      <button onClick={onRemove} className="hover:text-red-300 transition-colors text-slate-400">✕</button>
    </span>
  );
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [sectors, setSectors] = useState<string[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [size, setSize] = useState("");
  const [sectorInput, setSectorInput] = useState("");
  const [stateInput, setStateInput] = useState("");

  useEffect(() => {
    api.profile().then(p => {
      setProfile(p);
      setSectors(p.sectors || []);
      setStates(p.states || []);
      setSize(p.company_size || "");
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const addSector = (val: string) => {
    const trimmed = val.trim();
    if (trimmed && !sectors.includes(trimmed)) setSectors(prev => [...prev, trimmed]);
    setSectorInput("");
  };

  const addState = (val: string) => {
    const trimmed = val.trim();
    if (trimmed && !states.includes(trimmed)) setStates(prev => [...prev, trimmed]);
    setStateInput("");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      const updated = await api.saveProfile({
        user_id: "demo",
        sectors,
        states,
        company_size: size || null,
      });
      setProfile(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      alert("Failed to save: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto animate-pulse space-y-4">
        <div className="skeleton h-8 w-48 rounded" />
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <div className="skeleton h-4 w-1/3 rounded" />
          <div className="skeleton h-10 w-full rounded" />
          <div className="skeleton h-4 w-1/3 rounded" />
          <div className="skeleton h-10 w-full rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-heading font-bold text-navy">Business Profile</h1>
        <p className="text-slate-500 mt-1">
          Help ComplianceRadar AI understand your business for personalised impact analysis.
        </p>
      </div>

      {/* Profile insight card */}
      {profile && (sectors.length > 0 || states.length > 0) && (
        <div className="bg-gradient-to-r from-teal/10 to-blue-50 rounded-xl border border-teal/20 p-4 flex items-start gap-3">
          <span className="text-2xl">🤖</span>
          <div>
            <p className="text-sm font-semibold text-navy">AI personalization active</p>
            <p className="text-xs text-slate-600 mt-0.5">
              Claude will tailor compliance impact analysis for your{" "}
              <strong>{sectors.join(", ") || "business"}</strong>{" "}
              operating in{" "}
              <strong>{states.join(", ") || "India"}</strong>.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white rounded-xl border border-slate-200 shadow-card p-6 space-y-6">
        {/* Sectors */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Business Sectors
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {sectors.map(s => (
              <Tag key={s} label={s} onRemove={() => setSectors(prev => prev.filter(x => x !== s))} />
            ))}
          </div>
          <div className="flex gap-2">
            <select
              value={sectorInput}
              onChange={e => { if (e.target.value) addSector(e.target.value); }}
              className="flex-1 px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-teal outline-none"
            >
              <option value="">+ Add sector...</option>
              {SECTOR_OPTIONS.filter(s => !sectors.includes(s)).map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <input
              type="text"
              value={sectorInput}
              onChange={e => setSectorInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addSector(sectorInput); } }}
              placeholder="Custom sector..."
              className="w-36 px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal outline-none"
            />
          </div>
        </div>

        {/* States */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Operating States
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {states.map(s => (
              <Tag key={s} label={s} onRemove={() => setStates(prev => prev.filter(x => x !== s))} />
            ))}
          </div>
          <div className="flex gap-2">
            <select
              value={stateInput}
              onChange={e => { if (e.target.value) addState(e.target.value); }}
              className="flex-1 px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-teal outline-none"
            >
              <option value="">+ Add state...</option>
              {STATE_OPTIONS.filter(s => !states.includes(s)).map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <input
              type="text"
              value={stateInput}
              onChange={e => setStateInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addState(stateInput); } }}
              placeholder="Custom state..."
              className="w-36 px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal outline-none"
            />
          </div>
        </div>

        {/* Company Size */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Company Size
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {COMPANY_SIZES.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSize(opt.value)}
                className={`px-3 py-2.5 text-left rounded-lg border text-sm transition-all ${
                  size === opt.value
                    ? "bg-navy text-white border-navy"
                    : "bg-white text-slate-600 border-slate-200 hover:border-teal"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Save */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-teal text-white font-semibold rounded-lg hover:bg-teal-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <><span className="animate-spin">⟳</span> Saving...</> : "Save Profile"}
          </button>
          {saved && (
            <p className="text-center text-teal text-sm mt-3 font-medium animate-fade-in">
              ✅ Profile saved! AI will now personalize your alerts.
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
