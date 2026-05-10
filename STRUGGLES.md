# 🚧 Build Struggles & Challenges — ComplianceRadar

> Candid log of every technical obstacle hit during the 2-hour hackathon build.

---

## 1. PowerShell Execution Policy Blocked `npx`

**Error:** `npx.ps1 cannot be loaded because running scripts is disabled on this system.`  
**Cause:** Windows Restricted policy blocks unsigned scripts.  
**Fix:** Wrapped all npm/npx commands with `cmd.exe /c "npx ..."` throughout the build.

---

## 2. Path-with-Spaces Issue (`d:\Anakin Hackathon`)

**Error:** `'d:\Anakin' is not recognized as an internal or external command`  
**Cause:** The space in `Anakin Hackathon` caused Windows shell to split the path.  
**Fix:** Used `python -m pip install ...` which resolves through the active interpreter.

---

## 3. shadcn Init Created Conflicting Layout Imports

**Error:** TypeScript errors — `localFont`, `Geist`, `Inter`, and `cn` all imported simultaneously in `layout.tsx` from different sources.  
**Fix:** Completely rewrote `layout.tsx` from scratch using only `Inter` + `Instrument_Sans`.

---

## 4. Anakin API Response Schema Mismatch

**Issue:** Docs describe `POST /v1/extract` but actual working API is async:
- `POST /v1/url-scraper` → returns `{ jobId }`
- `GET /v1/url-scraper/{jobId}` → poll for `{ status, markdown, generatedJson }`

**Fix:** Implemented 90×3s polling loop in `crawl.py`. Added `normalize_extraction()` to handle varying field names.

---

## 5. SQLite `check_same_thread` Error

**Error:** `ProgrammingError: SQLite objects created in a thread can only be used in that same thread.`  
**Cause:** FastAPI's async handlers run in a thread pool; SQLite defaults to single-thread mode.  
**Fix:** Added `connect_args={"check_same_thread": False}` conditionally for SQLite in `database.py`.

---

## 6. `google-genai` Installed to Wrong Python (User-Level, Not venv)

**Warning:** `Defaulting to user installation because normal site-packages is not writeable`  
**Fix:** Added `google-genai>=1.0.0` to `requirements.txt` so fresh `pip install -r` into venv works correctly.

---

## 7. Seed Data Skipped on Partial DB Init

**Issue:** `seed_if_empty()` guards on `db.query(Source).first()`. If sources exist but alerts don't, reruns skip seeding entirely.  
**Fix:** Added explicit `db.flush()` before Alert inserts to ensure Snapshot IDs are available as foreign keys.

---

## 8. `font-heading` Class Not Applying `Instrument Sans`

**Issue:** Tailwind's `font-heading` class wasn't applying the correct font — CSS variable declared but Tailwind config used a static stack.  
**Fix:** Set `fontFamily.heading: ["Instrument Sans", "Inter", "sans-serif"]` in `tailwind.config.ts`.

---

## 9. Diff Viewer Appeared Empty for Short Seeded Texts

**Issue:** `difflib.unified_diff` on very short texts produces only `---/+++` header lines with no `@@` hunks.  
**Fix:** Added Show/Hide collapsible toggle and `diff_unified.trim()` check before rendering.

---

## 10. CORS Policy Blocked Frontend → Backend Calls

**Error:** `Access to fetch at 'http://127.0.0.1:8000' blocked by CORS policy`  
**Cause:** CORS configured for `localhost:3000` but API URL was `127.0.0.1:8000` — browser treats as different origins.  
**Fix:** Added both `http://localhost:3000` and `http://127.0.0.1:3000` to `allow_origins`.

---

## 11. No Anthropic API Key — Needed a Free Alternative

**Issue:** Entire `analyser.py` built around Anthropic Claude. User had no paid API key.  
**Fix:** Refactored to a provider-agnostic priority chain:
1. **Gemini Flash** (free) — if `GEMINI_API_KEY` is set  
2. **Anthropic Claude** (paid) — if `ANTHROPIC_API_KEY` is set  
3. **Smart fallback** — template-based analysis

---

## 12. `simulate-crawl` Returns 409 for Already-Crawled URLs

**Error response:** `"Content unchanged since last crawl (hash match)."`  
**Fix:** Styled the 409 error clearly in the frontend. Added explanatory text on the Sources page.

---

## Summary

| # | Struggle | Category | Status |
|---|----------|----------|--------|
| 1 | PowerShell execution policy | Windows/DevEnv | ✅ Fixed |
| 2 | Path spaces in shell | Windows/DevEnv | ✅ Fixed |
| 3 | Conflicting layout imports | Next.js | ✅ Fixed |
| 4 | Anakin API schema mismatch | API Integration | ✅ Fixed |
| 5 | SQLite threading error | Database | ✅ Fixed |
| 6 | google-genai wrong Python target | Python/venv | ✅ Fixed |
| 7 | Seed data partial init | Database | ✅ Fixed |
| 8 | Font variable not applied | CSS/Tailwind | ✅ Fixed |
| 9 | Diff viewer empty for short diffs | Frontend UI | ✅ Fixed |
| 10 | CORS blocking API calls | Network | ✅ Fixed |
| 11 | No Anthropic key needed free AI | AI/API | ✅ Fixed |
| 12 | 409 on repeat simulate-crawl | Backend Logic | ✅ Fixed |
