from __future__ import annotations

from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .analyser import analyse_regulatory_change
from .config import ROOT
from .crawl import (
    build_side_by_side_diff,
    content_hash,
    meaningful_content_change,
    normalize_extraction,
    scrape_url_anakin,
)
from .database import engine, get_db
from .models import Alert, AlertAcknowledgement, Snapshot, Source, UserBusinessProfile
from .schemas import (
    AlertDetailOut,
    AlertOut,
    ChecklistPatch,
    ProfileIn,
    ProfileOut,
    SimulateIn,
    SourceCreate,
    SourceOut,
)
from .seed import seed_if_empty

app = FastAPI(title="ComplianceRadar API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _domain(url: str) -> str:
    try:
        return urlparse(url).netloc or url
    except Exception:
        return url


@app.on_event("startup")
def on_startup():
    Path(ROOT / "backend" / "data").mkdir(parents=True, exist_ok=True)
    from .database import Base

    Base.metadata.create_all(bind=engine)
    db = next(get_db())
    try:
        seed_if_empty(db)
    finally:
        db.close()


def _profile_dict(db: Session) -> dict:
    row = db.query(UserBusinessProfile).filter(UserBusinessProfile.user_id == "demo").first()
    if not row:
        return {}
    return {
        "sectors": row.sectors or [],
        "states": row.states or [],
        "company_size": row.company_size,
    }


@app.get("/health")
def health():
    return {"ok": True}


@app.get("/api/sources", response_model=list[SourceOut])
def list_sources(db: Session = Depends(get_db)):
    return db.query(Source).order_by(Source.id.asc()).all()


@app.post("/api/sources", response_model=SourceOut)
def create_source(payload: SourceCreate, db: Session = Depends(get_db)):
    dup = db.query(Source).filter(Source.url == payload.url.strip()).first()
    if dup:
        raise HTTPException(status_code=400, detail="Source URL already monitored")
    dom = payload.domain.strip() or _domain(payload.url)
    s = Source(
        url=payload.url.strip(),
        domain=dom,
        category=payload.category,
        frequency_hours=payload.frequency_hours,
        keywords=payload.keywords,
        is_active=True,
    )
    db.add(s)
    db.commit()
    db.refresh(s)
    return s


@app.patch("/api/sources/{source_id}/toggle", response_model=SourceOut)
def toggle_source(source_id: int, db: Session = Depends(get_db)):
    s = db.query(Source).filter(Source.id == source_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Source not found")
    s.is_active = not s.is_active
    db.commit()
    db.refresh(s)
    return s


def _alert_to_card(a: Alert, db: Session) -> AlertOut:
    src = db.query(Source).filter(Source.id == a.source_id).first()
    return AlertOut(
        id=a.id,
        source_id=a.source_id,
        title=a.title,
        category=src.category if src else "—",
        url=src.url if src else "",
        urgency=a.urgency,
        ai_summary=a.ai_summary,
        action_items=a.action_items,
        deadline=a.deadline,
        penalty_note=a.penalty_note,
        created_at=a.created_at,
        unread=True,
    )


@app.get("/api/alerts", response_model=list[AlertOut])
def list_alerts(db: Session = Depends(get_db)):
    rows = db.query(Alert).order_by(Alert.created_at.desc()).all()
    return [_alert_to_card(r, db) for r in rows]


@app.get("/api/alerts/{alert_id}", response_model=AlertDetailOut)
def get_alert(alert_id: int, db: Session = Depends(get_db)):
    a = db.query(Alert).filter(Alert.id == alert_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Alert not found")
    src = db.query(Source).filter(Source.id == a.source_id).first()
    ack = (
        db.query(AlertAcknowledgement)
        .filter(AlertAcknowledgement.alert_id == alert_id, AlertAcknowledgement.user_id == "demo")
        .first()
    )
    checklist = ack.checklist_state if ack else {}
    diff_u = build_side_by_side_diff(a.old_text, a.new_text)
    return AlertDetailOut(
        id=a.id,
        source_id=a.source_id,
        title=a.title,
        category=src.category if src else "—",
        url=src.url if src else "",
        urgency=a.urgency,
        ai_summary=a.ai_summary,
        action_items=a.action_items,
        deadline=a.deadline,
        penalty_note=a.penalty_note,
        old_text=a.old_text,
        new_text=a.new_text,
        diff_unified=diff_u,
        checklist_state=checklist or {},
        created_at=a.created_at,
    )


@app.patch("/api/alerts/{alert_id}/checklist")
def patch_checklist(alert_id: int, body: ChecklistPatch, db: Session = Depends(get_db)):
    a = db.query(Alert).filter(Alert.id == alert_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Alert not found")
    ack = (
        db.query(AlertAcknowledgement)
        .filter(AlertAcknowledgement.alert_id == alert_id, AlertAcknowledgement.user_id == "demo")
        .first()
    )
    if not ack:
        ack = AlertAcknowledgement(
            alert_id=alert_id,
            user_id="demo",
            checklist_state=body.checklist_state,
            acknowledged_at=datetime.utcnow(),
        )
        db.add(ack)
    else:
        ack.checklist_state = body.checklist_state
        ack.acknowledged_at = datetime.utcnow()
    db.commit()
    return {"ok": True}


@app.post("/api/alerts/{alert_id}/reanalyze", response_model=AlertDetailOut)
def reanalyze(alert_id: int, db: Session = Depends(get_db)):
    a = db.query(Alert).filter(Alert.id == alert_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Alert not found")
    profile = _profile_dict(db)
    out = analyse_regulatory_change(a.new_text, {}, profile)
    a.ai_summary = out["summary"]
    a.urgency = out["urgency"]
    a.action_items = out["actions"]
    a.deadline = out.get("deadline")
    a.penalty_note = out.get("penalty")
    db.commit()
    return get_alert(alert_id, db)


@app.get("/api/profile", response_model=ProfileOut)
def get_profile(db: Session = Depends(get_db)):
    row = db.query(UserBusinessProfile).filter(UserBusinessProfile.user_id == "demo").first()
    if not row:
        row = UserBusinessProfile(user_id="demo", sectors=[], states=[], company_size=None)
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


@app.patch("/api/profile", response_model=ProfileOut)
def patch_profile(payload: ProfileIn, db: Session = Depends(get_db)):
    row = db.query(UserBusinessProfile).filter(UserBusinessProfile.user_id == "demo").first()
    if not row:
        row = UserBusinessProfile(user_id="demo")
        db.add(row)
    row.sectors = payload.sectors
    row.states = payload.states
    row.company_size = payload.company_size
    row.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(row)
    return row


@app.post("/api/simulate-crawl", response_model=AlertOut)
def simulate_crawl(payload: SimulateIn, db: Session = Depends(get_db)):
    url = payload.url.strip()
    if not url.startswith("http"):
        raise HTTPException(status_code=400, detail="Invalid URL")

    try:
        raw_result = scrape_url_anakin(url)
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Anakin scrape failed: {e}") from e

    raw_text, extracted = normalize_extraction(raw_result)
    h = content_hash(raw_text)

    src = db.query(Source).filter(Source.url == url).first()
    if not src:
        src = Source(
            url=url,
            domain=_domain(url),
            category="GST",
            frequency_hours=6,
            keywords=["demo"],
            is_active=True,
            last_crawled_at=datetime.utcnow(),
        )
        db.add(src)
        db.commit()
        db.refresh(src)
    else:
        src.last_crawled_at = datetime.utcnow()
        db.commit()

    last_snap = (
        db.query(Snapshot).filter(Snapshot.source_id == src.id).order_by(Snapshot.crawled_at.desc()).first()
    )
    old_text = last_snap.raw_text if last_snap else ""

    if last_snap and last_snap.content_hash == h:
        raise HTTPException(status_code=409, detail="Content unchanged since last crawl (hash match).")

    if last_snap is not None and not meaningful_content_change(old_text, raw_text):
        raise HTTPException(status_code=409, detail="No meaningful text change (>100 chars) versus last snapshot.")

    now = datetime.utcnow()
    snap_old_id = last_snap.id if last_snap else None
    sn_new = Snapshot(
        source_id=src.id,
        content_hash=h,
        raw_text=raw_text,
        extracted_json=extracted,
        crawled_at=now,
    )
    db.add(sn_new)
    db.flush()

    profile = _profile_dict(db)
    ai = analyse_regulatory_change(raw_text, extracted, profile)
    title_hint = extracted.get("title") or f"Live crawl: {_domain(url)}"

    alert = Alert(
        source_id=src.id,
        snapshot_old_id=snap_old_id,
        snapshot_new_id=sn_new.id,
        title=str(title_hint)[:500],
        urgency=ai["urgency"],
        ai_summary=ai["summary"],
        action_items=ai["actions"],
        deadline=ai.get("deadline"),
        penalty_note=ai.get("penalty"),
        old_text=old_text,
        new_text=raw_text,
        created_at=now,
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return _alert_to_card(alert, db)
