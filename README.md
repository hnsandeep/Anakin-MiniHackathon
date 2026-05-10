# ComplianceRadar — Anakin.io Hackathon

**AI-powered Hyper-Local Regulatory Compliance Agent for Indian SMEs**

---

## What it does

ComplianceRadar monitors 20+ Indian government regulatory portals (GST/CBIC, RBI, SEBI, state PCBs, labour, municipal), detects when documents change, and uses **Anakin.io** (for scraping) + **Claude AI** (for analysis) to deliver plain-English compliance alerts with action checklists — personalised to your business profile.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router) + Tailwind CSS |
| Backend | FastAPI (Python) |
| Scraping | **Anakin.io Crawl API** |
| AI Analysis | Claude (claude-sonnet-4) via Anthropic |
| Database | SQLite (dev) / PostgreSQL (prod) |
| Anakin Skill | `skills/anakin/llms-full.txt` (RAG knowledge base) |

---

## Quick Start

### 1. Set environment variables
```bash
cp .env.example .env
# Edit .env and set ANAKIN_API_KEY and ANTHROPIC_API_KEY
```

### 2. Start the backend
```bash
# From repo root (activate venv first)
.venv\Scripts\uvicorn.exe backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Start the frontend
```bash
cd frontend
npm run dev
```

Open http://localhost:3000

---

## Anakin.io Integration

The Anakin Crawl API is the **primary scraping engine** for all government portals.

- **Endpoint**: `POST https://api.anakin.io/v1/url-scraper`
- **Polling**: `GET https://api.anakin.io/v1/url-scraper/{jobId}`
- **Features used**: Browser rendering (`useBrowser: true`), India geo (`country: "in"`), JSON extraction (`generateJson: true`)

See `backend/app/crawl.py` for the full implementation.

### Anakin Skill
The `skills/anakin/llms-full.txt` file is the Anakin.io documentation used as a RAG knowledge base for the AI assistant and for grounding the integration logic.

---

## Demo Flow (for judges)

1. Open http://localhost:3000 → pre-seeded dashboard with 4 real alerts
2. See **SEBI KYC circular** (High urgency, deadline July 31)  
3. See **GST e-invoicing** alert (Critical, deadline Jul 1 2026)
4. Click any alert → view diff, action checklist, AI summary
5. Go to **Profile** → set your business sectors & states
6. Click **Re-analyze** → Claude personalises the impact analysis
7. Go to **Sources → Simulate New Circular** → paste any govt URL → Anakin scrapes live → new alert in ~15s

---

## Project Structure

```
├── backend/
│   └── app/
│       ├── main.py         # FastAPI routes
│       ├── crawl.py        # Anakin.io scraping engine
│       ├── analyser.py     # Claude AI analysis
│       ├── models.py       # SQLAlchemy models
│       ├── seed.py         # Demo data seed
│       └── config.py       # Settings
├── frontend/
│   └── app/
│       ├── dashboard/      # Alert feed
│       ├── sources/        # Source management + simulate
│       ├── profile/        # Business profile
│       └── alert/[id]/     # Alert detail + checklist
├── skills/
│   └── anakin/
│       ├── llms-full.txt   # Anakin docs knowledge base
│       ├── skill-config.json
│       ├── system-prompt.md
│       └── ingest.py       # Vector store ingestion
└── .env
```
