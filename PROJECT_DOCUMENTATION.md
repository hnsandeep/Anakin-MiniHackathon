# ComplianceRadar — Complete Project Documentation

> **AI-powered Hyper-Local Regulatory Compliance Agent for Indian SMEs**  
> Built for the Anakin.io Hackathon 2026

---

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Database Schema](#4-database-schema)
5. [API Reference](#5-api-reference)
6. [Data Flow](#6-data-flow)
7. [Sample Inputs & Outputs](#7-sample-inputs--outputs)
8. [How to Use the App](#8-how-to-use-the-app)
9. [Project File Structure](#9-project-file-structure)
10. [Environment Variables](#10-environment-variables)

---

## 1. Project Overview

### The Problem
Indian SMEs face a fragmented regulatory landscape across 20+ government agencies — GST/CBIC, RBI, SEBI, state Pollution Control Boards, Labour departments, Municipal bodies. Changes are published as PDFs, circulars, and portal updates with no central feed. Missing a deadline can mean penalties, licence suspension, or legal action.

### The Solution
ComplianceRadar continuously monitors registered government portal URLs using **Anakin.io's intelligent crawler**, detects meaningful content changes, and uses **Gemini AI (free)** or **Claude AI (paid)** to generate:
- Plain-English compliance summaries
- Urgency ratings (Critical / High / Medium / Low)
- Concrete action checklists with 3–8 steps
- Deadline and penalty flags

Everything is personalised to the SME's **business profile** (sectors, states, company size).

---

## 2. Architecture

```
┌───────────────────────────────────────────────────────┐
│               USER BROWSER                            │
│         Next.js 14 Frontend (Port 3000)               │
│   Dashboard | Alert Detail | Sources | Profile        │
└───────────────────┬───────────────────────────────────┘
                    │ REST API (JSON)
                    ▼
┌───────────────────────────────────────────────────────┐
│          FastAPI Backend (Port 8000)                  │
│  main.py | crawl.py | analyser.py | seed.py          │
└───────────────────────────────────────────────────────┘
          │                          │
          ▼                          ▼
┌──────────────────┐      ┌──────────────────────┐
│ Anakin.io Crawl  │      │  Gemini Flash / Claude│
│ API (scraping)   │      │  AI Analysis          │
└──────────────────┘      └──────────────────────┘
          │
          ▼
┌──────────────────┐
│  SQLite Database │
│  compliance.db   │
└──────────────────┘
```

### Key Architectural Decisions
- **Async Job Polling**: Anakin's scraper is async — submit a job, poll every 3s (up to 270s)
- **Content Hashing**: SHA-256 deduplication prevents false-positive alerts from minor page changes
- **AI Provider Fallback**: Gemini → Claude → Hardcoded fallback, ensuring the app always works
- **SQLite for dev**: Zero-config local DB; swap `DATABASE_URL` to PostgreSQL for production

---

## 3. Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 14 (App Router) | React SSR/CSR hybrid |
| **Styling** | Tailwind CSS + shadcn/ui | Component design system |
| **Frontend Language** | TypeScript | Type safety |
| **Backend** | FastAPI (Python) | REST API |
| **Backend Language** | Python 3.11+ | Core logic |
| **Web Scraping** | **Anakin.io Crawl API** | Browser-rendered govt portal scraping |
| **AI — Primary** | Google Gemini Flash (Free) | Regulatory text analysis |
| **AI — Secondary** | Anthropic Claude Sonnet | Regulatory text analysis (paid fallback) |
| **Database (Dev)** | SQLite | Zero-config local persistence |
| **Database (Prod)** | PostgreSQL | Production-grade persistence |
| **ORM** | SQLAlchemy 2.0 | Database abstraction |
| **Schema Validation** | Pydantic v2 | API input/output validation |
| **Config Management** | pydantic-settings | `.env` loading |
| **HTTP Client** | httpx | Anakin API calls |
| **Diff Engine** | Python difflib | Regulatory text change detection |

---

## 4. Database Schema

### `sources` — Monitored Government URLs
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Auto-increment |
| url | VARCHAR(2048) UNIQUE | Government portal URL |
| domain | VARCHAR(512) | Extracted domain |
| category | VARCHAR(64) | GST / RBI / SEBI / Municipal / Labor / Environment |
| frequency_hours | INTEGER | How often to crawl (default: 24h) |
| keywords | JSON | Alert trigger keywords |
| last_crawled_at | DATETIME | Last successful crawl |
| is_active | BOOLEAN | Enable/disable monitoring |

### `snapshots` — Raw Page Content History
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Auto-increment |
| source_id | FK → sources | Parent source |
| content_hash | VARCHAR(64) | SHA-256 of raw text |
| raw_text | TEXT | Full page content (markdown) |
| extracted_json | JSON | Structured fields from Anakin |
| crawled_at | DATETIME | When this snapshot was taken |

### `alerts` — Detected Regulatory Changes
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Auto-increment |
| source_id | FK → sources | Which portal changed |
| title | VARCHAR(512) | Alert headline |
| urgency | VARCHAR(32) | Critical / High / Medium / Low |
| ai_summary | TEXT | AI-generated summary |
| action_items | JSON | List of 3–8 concrete actions |
| deadline | VARCHAR(256) | Compliance deadline |
| penalty_note | VARCHAR(512) | Penalty description |
| old_text / new_text | TEXT | Before/after content (for diff) |
| created_at | DATETIME | Alert generation time |

### `user_business_profiles` — SME Configuration
| Column | Type | Description |
|--------|------|-------------|
| user_id | VARCHAR(128) UNIQUE | User identifier |
| sectors | JSON | e.g. ["FinTech", "Manufacturing"] |
| states | JSON | e.g. ["Maharashtra", "Delhi"] |
| company_size | VARCHAR(64) | e.g. "50-200" |

### `alert_acknowledgements` — Checklist Progress
| Column | Type | Description |
|--------|------|-------------|
| alert_id | FK → alerts | Which alert |
| user_id | VARCHAR(128) | User identifier |
| checklist_state | JSON | `{"action text": true/false}` |

---

## 5. API Reference

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Server health check |

### Sources
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sources` | List all monitored sources |
| POST | `/api/sources` | Add a new source URL |
| PATCH | `/api/sources/{id}/toggle` | Enable/disable a source |

### Alerts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/alerts` | List all alerts (newest first) |
| GET | `/api/alerts/{id}` | Get alert detail with diff |
| PATCH | `/api/alerts/{id}/checklist` | Save checklist state |
| POST | `/api/alerts/{id}/reanalyze` | Re-run AI analysis with current profile |

### Profile & Simulate
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/profile` | Get business profile |
| PATCH | `/api/profile` | Update business profile |
| POST | `/api/simulate-crawl` | Live-scrape a URL via Anakin and create alert |

---

## 6. Data Flow

### Flow A — Startup (Demo Mode)
```
App Start → Create DB tables → seed_if_empty()
  → Seeds 20 Indian govt portal URLs
  → Seeds demo user profile (FinTech, Maharashtra)
  → Seeds 4 pre-built alerts (SEBI, RBI, GST, Environment)
  → Dashboard shows immediately
```

### Flow B — Simulate Live Crawl
```
User pastes URL → POST /api/simulate-crawl
  → scrape_url_anakin(url)
      → POST https://api.anakin.io/v1/url-scraper
          { url, country:"in", useBrowser:true, generateJson:true }
      → Poll GET /url-scraper/{jobId} every 3s (max 90 tries)
      → Returns { markdown, generatedJson, cleanedHtml }
  → normalize_extraction() → (raw_text, extracted_json)
  → SHA-256 hash check → if same as last snapshot → 409
  → Diff check → if <100 chars changed → 409
  → Create new Snapshot record
  → analyse_regulatory_change(raw_text, extracted, profile)
      → Gemini Flash (if GEMINI_API_KEY set) → primary
      → Claude (if ANTHROPIC_API_KEY set) → fallback
      → Hardcoded fallback → always works
  → Create Alert record → return AlertOut JSON
```

### Flow C — Re-Analyze with Profile
```
User updates Profile → PATCH /api/profile
User clicks Re-analyze → POST /api/alerts/{id}/reanalyze
  → AI re-runs with business profile context
  → Alert updated with personalized summary and actions
```

---

## 7. Sample Inputs & Outputs

### POST `/api/simulate-crawl`

**Input:**
```json
{ "url": "https://cbic-gst.gov.in/gst-circulars-notification.html" }
```

**Output:**
```json
{
  "id": 5,
  "title": "GST: e-invoicing threshold shift",
  "category": "GST",
  "urgency": "Critical",
  "ai_summary": "CBIC mandates e-invoicing for all B2B transactions above Rs.5 crore turnover from 01 July 2026.",
  "action_items": [
    "Verify current annual turnover against Rs.5 crore threshold",
    "Contact ERP vendor to enable IRP integration module",
    "Register on einvoice1.gst.gov.in before 15 June 2026",
    "Run parallel invoice generation tests with 5 key customers",
    "Train accounts team on e-invoice workflow"
  ],
  "deadline": "01 July 2026",
  "penalty_note": "Incorrect invoicing attracts demand + 18% interest under Section 74",
  "created_at": "2026-05-10T13:45:22",
  "unread": true
}
```

### GET `/api/alerts/1`

**Output (with diff):**
```json
{
  "id": 1,
  "title": "SEBI circular: tightened KYC for brokers",
  "urgency": "High",
  "ai_summary": "SEBI tightened KYC and re-verification timelines for inactive accounts.",
  "action_items": [
    "Re-verify PAN-Aadhaar linkage for dormant accounts",
    "Publish client communication pack by July 15",
    "Conduct sample audit on 50 clients before Jul 31",
    "Update AML monitoring policy"
  ],
  "deadline": "July 31",
  "diff_unified": "--- previous\n+++ current\n@@ -1,3 +1,7 @@\n-SEBI/HO/MIRSD/CIR/P/2023\n+SEBI/HO/MIRSD/CIR/P/2024/KYC-STRICT\n+Enhanced due diligence mandatory...",
  "checklist_state": {
    "Re-verify PAN-Aadhaar linkage for dormant accounts": true,
    "Publish client communication pack by July 15": false
  }
}
```

### PATCH `/api/profile`

**Input:**
```json
{
  "sectors": ["FinTech", "NBFC"],
  "states": ["Maharashtra", "Karnataka"],
  "company_size": "50-200"
}
```

**Output:**
```json
{
  "user_id": "demo",
  "sectors": ["FinTech", "NBFC"],
  "states": ["Maharashtra", "Karnataka"],
  "company_size": "50-200"
}
```

---

## 8. How to Use the App

### Prerequisites
- Python 3.11+, Node.js 18+
- `ANAKIN_API_KEY` from [anakin.io](https://anakin.io)
- `GEMINI_API_KEY` (free) from [aistudio.google.com](https://aistudio.google.com)

### Step 1 — Configure API Keys
```env
# .env (project root)
ANAKIN_API_KEY=ask_your_key_here
GEMINI_API_KEY=your_gemini_key_here
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

### Step 2 — Start the Backend
```powershell
# From d:\Anakin Hackathon
.venv\Scripts\uvicorn.exe backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```
- API live at: http://127.0.0.1:8000
- Swagger docs: http://127.0.0.1:8000/docs

### Step 3 — Start the Frontend
```powershell
cd frontend
npm run dev
```
Open: **http://localhost:3000**

### Using the Dashboard
1. Open `http://localhost:3000` — see 4 pre-seeded compliance alerts
2. Filter by category pills (GST, SEBI, RBI, etc.)
3. Click any alert card to open the detail view with checklist + diff

### Setting Business Profile
1. Click **Profile** in left nav
2. Select **Sectors**, **States**, **Company Size** → **Save Profile**
3. Return to an alert → click **Re-analyze** for personalized AI advice

### Simulating a Live Crawl
1. Click **Sources** in left nav
2. Scroll to **Simulate New Circular**
3. Paste any Indian govt URL → click **Scrape & Analyze**
4. Wait ~15-30s → new alert appears on Dashboard

---

## 9. Project File Structure

```
d:\Anakin Hackathon\
├── .env                         # API keys
├── .env.example                 # Template
├── README.md                    # Quick start
├── PROJECT_DOCUMENTATION.md     # This file
├── STRUGGLES.md                 # Build challenges
│
├── backend/
│   ├── requirements.txt
│   └── app/
│       ├── main.py              # FastAPI routes
│       ├── crawl.py             # Anakin.io scraping + diff
│       ├── analyser.py          # AI (Gemini/Claude/fallback)
│       ├── models.py            # SQLAlchemy ORM models
│       ├── schemas.py           # Pydantic schemas
│       ├── database.py          # DB engine + sessions
│       ├── config.py            # Settings from .env
│       └── seed.py              # Demo data (20 sources + 4 alerts)
│
├── frontend/
│   ├── package.json
│   └── app/
│       ├── layout.tsx           # Root layout + nav
│       ├── globals.css          # Global styles
│       ├── dashboard/page.tsx   # Alert feed + stats
│       ├── alert/[id]/page.tsx  # Alert detail + checklist + diff
│       ├── sources/page.tsx     # Source management + simulate
│       └── profile/page.tsx     # Business profile editor
│
└── skills/
    └── anakin/
        ├── llms-full.txt        # Anakin docs (RAG knowledge base)
        ├── skill-config.json
        ├── system-prompt.md
        └── ingest.py            # Vector store ingestion
```

---

## 10. Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANAKIN_API_KEY` | ✅ Yes | Anakin.io scraping key |
| `GEMINI_API_KEY` | ✅ Recommended | Google Gemini Flash (free AI) |
| `ANTHROPIC_API_KEY` | ⬜ Optional | Claude AI (paid alternative) |
| `NEXT_PUBLIC_API_URL` | ✅ Yes | Backend URL (default: `http://127.0.0.1:8000`) |
| `DATABASE_URL` | ⬜ Optional | DB URL (default: local SQLite file) |

> If neither AI key is set, the app uses a smart fallback analyser that still returns valid compliance guidance.

---

*ComplianceRadar — Built at the Anakin.io Hackathon, May 2026*
