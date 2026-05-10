from __future__ import annotations

import json
import re
from typing import Any

from .config import settings


# ---------------------------------------------------------------------------
# Fallback (no AI key)
# ---------------------------------------------------------------------------

def _fallback_analysis(content: str, profile: dict[str, Any] | None) -> dict[str, Any]:
    sectors = (profile or {}).get("sectors") or []
    if not isinstance(sectors, list):
        sectors = []
    clip = (content or "")[:1200]
    sector_str = ", ".join(sectors) if sectors else "your business"
    return {
        "summary": (
            "The monitored page content changed. Review the extracted text for new circulars, "
            "deadlines, or penalty language. (Demo fallback — set GEMINI_API_KEY for full AI analysis.)\n\n"
            f"Excerpt: {clip[:400]}..."
        ),
        "urgency": "Medium",
        "actions": [
            "Assign an owner to read the official notification in full.",
            f"Map obligations to your internal policies ({sector_str}).",
            "Log evidence of compliance steps and deadlines in your GRC tracker.",
            "Brief leadership if penalties or licensing conditions are mentioned.",
        ],
        "deadline": None,
        "penalty": "Review source text — penalty applicability not evaluated in fallback mode.",
    }


def _parse_json_block(text: str) -> dict[str, Any]:
    text = text.strip()
    m = re.search(r"\{[\s\S]*\}", text)
    if not m:
        raise ValueError("No JSON object in model output")
    return json.loads(m.group())


# ---------------------------------------------------------------------------
# System prompt (shared across AI providers)
# ---------------------------------------------------------------------------

_SYSTEM = (
    "You are a compliance expert specialising in Indian regulatory regimes (GST/CBIC, RBI, SEBI, "
    "state pollution boards, labour, municipal bylaws).\n"
    "Return ONLY valid JSON with keys: summary (string), urgency (one of Critical|High|Medium|Low), "
    "actions (array of strings, 3-8 items), deadline (string or null), penalty (short string)."
)

_USER_PROMPT = (
    "A regulatory page was scraped. Using the payload, summarise what changed for this business, "
    "prioritise concrete actions, and flag deadlines/penalties.\n\nPAYLOAD:\n{payload}"
)


def _build_payload(markdown: str, extracted: dict, profile: dict | None) -> str:
    return json.dumps(
        {
            "page_markdown_excerpt": markdown[:20_000],
            "structured_hints": extracted,
            "business_profile": profile or {},
        },
        ensure_ascii=False,
    )


# ---------------------------------------------------------------------------
# Gemini Flash (FREE — primary)
# ---------------------------------------------------------------------------

def _analyse_with_gemini(markdown: str, extracted: dict, profile: dict | None) -> dict[str, Any]:
    from google import genai  # type: ignore
    from google.genai import types  # type: ignore

    client = genai.Client(api_key=settings.gemini_api_key)
    payload = _build_payload(markdown, extracted, profile)

    response = client.models.generate_content(
        model=settings.gemini_model,
        config=types.GenerateContentConfig(
            system_instruction=_SYSTEM,
            max_output_tokens=1200,
            temperature=0.2,
        ),
        contents=_USER_PROMPT.format(payload=payload),
    )
    return _parse_json_block(response.text)


# ---------------------------------------------------------------------------
# Anthropic Claude (paid — fallback if set)
# ---------------------------------------------------------------------------

def _analyse_with_anthropic(markdown: str, extracted: dict, profile: dict | None) -> dict[str, Any]:
    import anthropic  # type: ignore

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    payload = _build_payload(markdown, extracted, profile)

    msg = client.messages.create(
        model=settings.analyser_model,
        max_tokens=1200,
        system=_SYSTEM,
        messages=[{"role": "user", "content": _USER_PROMPT.format(payload=payload)}],
    )
    text = "".join(b.text for b in msg.content if b.type == "text")
    return _parse_json_block(text)


# ---------------------------------------------------------------------------
# Public entry-point
# ---------------------------------------------------------------------------

def analyse_regulatory_change(
    extracted_markdown: str,
    extracted_json: dict[str, Any],
    business_profile: dict[str, Any] | None,
) -> dict[str, Any]:
    """
    Returns dict: summary, urgency, actions (list[str]), deadline (str|None), penalty (str).

    Priority:
      1. Gemini Flash (free) — if GEMINI_API_KEY is set
      2. Anthropic Claude — if ANTHROPIC_API_KEY is set
      3. Smart fallback (no AI)
    """
    blob = extracted_json.get("fullText") or extracted_markdown

    if settings.gemini_api_key:
        try:
            data = _analyse_with_gemini(extracted_markdown, extracted_json, business_profile)
        except Exception as exc:
            print(f"[analyser] Gemini error: {exc} — falling back")
            return _fallback_analysis(str(blob), business_profile)
    elif settings.anthropic_api_key:
        try:
            data = _analyse_with_anthropic(extracted_markdown, extracted_json, business_profile)
        except Exception as exc:
            print(f"[analyser] Anthropic error: {exc} — falling back")
            return _fallback_analysis(str(blob), business_profile)
    else:
        return _fallback_analysis(str(blob), business_profile)

    return {
        "summary": str(data.get("summary", "")),
        "urgency": str(data.get("urgency", "Medium")),
        "actions": list(data.get("actions") or []),
        "deadline": data.get("deadline"),
        "penalty": str(data.get("penalty", "")),
    }
