import type { AlertCard, AlertDetail, Profile, Source } from "./types";

const base = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${base}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  if (!r.ok) {
    let detail = r.statusText;
    try {
      const j = await r.json();
      detail = j.detail ?? JSON.stringify(j);
    } catch {
      /* ignore */
    }
    throw new Error(`${r.status}: ${detail}`);
  }
  return r.json() as Promise<T>;
}

export const api = {
  alerts: () => req<AlertCard[]>("/api/alerts"),
  alert: (id: number) => req<AlertDetail>(`/api/alerts/${id}`),
  checklist: (id: number, checklist_state: Record<string, boolean>) =>
    req<{ ok: boolean }>(`/api/alerts/${id}/checklist`, {
      method: "PATCH",
      body: JSON.stringify({ checklist_state }),
    }),
  reanalyze: (id: number) =>
    req<AlertDetail>(`/api/alerts/${id}/reanalyze`, { method: "POST" }),
  sources: () => req<Source[]>("/api/sources"),
  toggleSource: (id: number) =>
    req<Source>(`/api/sources/${id}/toggle`, { method: "PATCH" }),
  addSource: (body: {
    url: string;
    category?: string;
    frequency_hours?: number;
    keywords?: string[];
  }) =>
    req<Source>("/api/sources", {
      method: "POST",
      body: JSON.stringify({
        url: body.url,
        domain: "",
        category: body.category ?? "GST",
        frequency_hours: body.frequency_hours ?? 24,
        keywords: body.keywords ?? [],
      }),
    }),
  profile: () => req<Profile>("/api/profile"),
  saveProfile: (body: Profile) =>
    req<Profile>("/api/profile", {
      method: "PATCH",
      body: JSON.stringify({
        sectors: body.sectors,
        states: body.states,
        company_size: body.company_size,
      }),
    }),
  simulate: (url: string) =>
    req<AlertCard>("/api/simulate-crawl", {
      method: "POST",
      body: JSON.stringify({ url }),
    }),
};
