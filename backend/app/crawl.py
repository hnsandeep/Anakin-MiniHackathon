from __future__ import annotations

import difflib
import hashlib
import time
from typing import Any

import httpx

from .config import settings


def content_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8", errors="replace")).hexdigest()


def meaningful_content_change(old_text: str, new_text: str, min_chars: int = 100) -> bool:
    old_text = old_text or ""
    new_text = new_text or ""
    if not old_text.strip():
        return len(new_text.strip()) > 80
    sm = difflib.SequenceMatcher(None, old_text, new_text)
    changed = 0
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == "equal":
            continue
        changed += max(i2 - i1, j2 - j1)
    return changed > min_chars


def _headers() -> dict[str, str]:
    if not settings.anakin_api_key:
        raise ValueError("ANAKIN_API_KEY is not configured")
    return {
        "X-API-Key": settings.anakin_api_key.strip(),
        "Content-Type": "application/json",
    }


def scrape_url_anakin(url: str) -> dict[str, Any]:
    """
    Submit Anakin URL Scraper job, poll GET /url-scraper/{id}, return markdown + generatedJson per official API.
    """
    body = {
        "url": url,
        "country": "in",
        "useBrowser": True,
        "generateJson": True,
    }
    with httpx.Client(timeout=120.0) as client:
        r = client.post(
            f"{settings.anakin_base_url}/url-scraper",
            headers=_headers(),
            json=body,
        )
        r.raise_for_status()
        submit = r.json()
        job_id = submit.get("jobId") or submit.get("job_id")
        if not job_id:
            raise RuntimeError(f"Unexpected submit response: {submit}")

        for _ in range(90):
            time.sleep(3)
            gr = client.get(
                f"{settings.anakin_base_url}/url-scraper/{job_id}",
                headers={"X-API-Key": settings.anakin_api_key.strip()},
            )
            gr.raise_for_status()
            data = gr.json()
            status = data.get("status")
            if status == "completed":
                return data
            if status == "failed":
                err = data.get("error") or data.get("message") or "scrape failed"
                raise RuntimeError(str(err))
        raise TimeoutError("Anakin scrape polling timed out")


def normalize_extraction(scrape_result: dict[str, Any]) -> tuple[str, dict[str, Any]]:
    """(raw_text, extracted_json) for storage and diffing."""
    md = (scrape_result.get("markdown") or "").strip()
    html_fallback = (scrape_result.get("cleanedHtml") or scrape_result.get("html") or "").strip()
    raw = md if len(md) > 200 else md + "\n\n" + html_fallback[:50_000]

    gj = scrape_result.get("generatedJson")
    if gj is None:
        gj = {}
    if not isinstance(gj, dict):
        gj = {"data": gj}

    structured = {
        "title": gj.get("title") or gj.get("page_title"),
        "summary": gj.get("summary") or gj.get("description"),
        "documentType": gj.get("documentType") or gj.get("type"),
        "fullText": gj.get("fullText") or md[:20_000],
        "rawGeneratedJson": gj,
    }
    if not structured["fullText"]:
        structured["fullText"] = raw[:20_000]
    return raw, structured


def build_side_by_side_diff(old_text: str, new_text: str) -> str:
    old_lines = (old_text or "").splitlines(keepends=True)
    new_lines = (new_text or "").splitlines(keepends=True)
    return "".join(
        difflib.unified_diff(old_lines, new_lines, fromfile="previous", tofile="current", lineterm="")
    )
