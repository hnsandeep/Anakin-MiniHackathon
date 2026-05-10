"""Seed regulated sources + demo alerts for hackathon judging."""

from __future__ import annotations

from datetime import datetime, timedelta
from urllib.parse import urlparse

from sqlalchemy.orm import Session

from .models import Alert, Snapshot, Source, UserBusinessProfile

DEMO_SOURCES: list[dict] = [
    {"url": "https://cbic-gst.gov.in/gst-circulars-notification.html", "category": "GST", "kw": ["penalty", "notification"]},
    {"url": "https://www.rbi.org.in/scripts/BS_CircularIndexDisplay.aspx", "category": "RBI", "kw": ["circular", "deadline"]},
    {"url": "https://www.sebi.gov.in/sebiweb/home/HomeAction.do?doListing=yes&sid=1&ssid=4", "category": "SEBI", "kw": ["KYC", "broker"]},
    {"url": "https://mphuaiss.mp.gov.in/MPHUA/Home.aspx", "category": "Municipal", "kw": ["building", "fire"]},
    {"url": "https://www.delhi.gov.in/health/health-bulletins-healthcare-facilities", "category": "Municipal", "kw": ["health", "order"]},
    {"url": "https://environment.telangana.gov.in/", "category": "Environment", "kw": ["pollution", "consent"]},
    {"url": "https://pcb.maharashtra.gov.in/", "category": "Environment", "kw": ["air", "water"]},
    {"url": "https://www.gpcb.gov.in/", "category": "Environment", "kw": ["industry", "compliance"]},
    {"url": "https://labour.gov.in/", "category": "Labor", "kw": ["wage", "code"]},
    {"url": "https://www.epfindia.gov.in/site_en/index.php", "category": "Labor", "kw": ["EPFO", "contribution"]},
    {"url": "https://www.incometax.gov.in/iec/foportal/", "category": "GST", "kw": ["filing", "due"]},
    {"url": "https://www.mca.gov.in/content/mca/global/en/mca/master-data/LLP.html", "category": "Municipal", "kw": ["LLP", "filing"]},
    {"url": "https://www.sebi.gov.in/sebiweb/home/HomeAction.do?doListing=yes&sid=1&ssid=2", "category": "SEBI", "kw": ["mutual", "disclosure"]},
    {"url": "https://www.sebi.gov.in/sebiweb/home/HomeAction.do?doListing=yes&sid=1&ssid=3", "category": "SEBI", "kw": ["debt", "listing"]},
    {"url": "https://www.tnpcb.gov.in/", "category": "Environment", "kw": ["consent", "industry"]},
    {"url": "https://www.kspcb.karnataka.gov.in/", "category": "Environment", "kw": ["CTE", "CTO"]},
    {"url": "https://uppcb.com/", "category": "Environment", "kw": ["NOC", "emission"]},
    {"url": "https://www.mpcb.gov.in/", "category": "Environment", "kw": ["hazardous", "waste"]},
    {"url": "https://prd.kerala.gov.in/", "category": "Municipal", "kw": ["permit", "license"]},
    {"url": "https://urban.rajasthan.gov.in/", "category": "Municipal", "kw": ["zoning", "approval"]},
]

SEBI_KYC_OLD = """SEBI/HO/MIRSD/MIRSD2/CIR/P/2023/XXX
Circular for Know Your Client requirements for Stock Brokers dated 01 Jan 2023.
Broker intermediaries shall complete standard KYC for clients and maintain records."""

SEBI_KYC_NEW = """SEBI/HO/MIRSD/MIRSD2/CIR/P/2024/KYC-STRICT
Circular: Revised KYC norms for stock brokers — enhanced due diligence mandatory.
All brokers must re-verify PAN-Aadhaar linkage for inactive accounts by 31 July.
Non-compliance attracts monetary penalty under Securities Contracts (Regulation) Act, 1956.
Timelines: go-live audits from 01 August; escalate breaches to DSC within 7 days."""

RBI_DELTA_OLD = "RBI/2024-25/101 Payment Aggregator dormant accounts — interim guidance."
RBI_DELTA_NEW = (
    RBI_DELTA_OLD
    + " Updated 10 May 2026: Aggregators shall reconcile settlement reports within T+1 and preserve audit logs for 7 years."
)

GST_DELTA_OLD = "GST Instruction 06/2024 — e-invoicing threshold clarification for MSME exporters."
GST_DELTA_NEW = GST_DELTA_OLD + " Amendment: phased mandatory B2B e-invoicing from 01 July 2026 for entities > Rs.5 crore turnover."


def _domain(u: str) -> str:
    try:
        return urlparse(u).netloc or u
    except Exception:
        return u


def seed_if_empty(db: Session) -> None:
    if db.query(Source).first():
        return

    for row in DEMO_SOURCES:
        db.add(
            Source(
                url=row["url"],
                domain=_domain(row["url"]),
                category=row["category"],
                frequency_hours=6,
                keywords=row.get("kw"),
                is_active=True,
            )
        )
    db.commit()

    if not db.query(UserBusinessProfile).filter(UserBusinessProfile.user_id == "demo").first():
        db.add(UserBusinessProfile(user_id="demo", sectors=["FinTech"], states=["Maharashtra"], company_size="50-200"))
        db.commit()

    src_sebi = db.query(Source).filter(Source.url == DEMO_SOURCES[2]["url"]).first()
    src_rbi = db.query(Source).filter(Source.url == DEMO_SOURCES[1]["url"]).first()
    src_gst = db.query(Source).filter(Source.url == DEMO_SOURCES[0]["url"]).first()
    src_env = db.query(Source).filter(Source.url == DEMO_SOURCES[5]["url"]).first()

    def make_alert(
        source: Source,
        title: str,
        urgency: str,
        summary: str,
        actions: list[str],
        deadline: str | None,
        penalty: str,
        old_t: str,
        new_t: str,
        days_ago: int,
    ) -> None:
        so = Snapshot(
            source_id=source.id,
            content_hash="seed-old",
            raw_text=old_t,
            extracted_json={},
            crawled_at=datetime.utcnow() - timedelta(days=days_ago + 1),
        )
        sn = Snapshot(
            source_id=source.id,
            content_hash="seed-new",
            raw_text=new_t,
            extracted_json={},
            crawled_at=datetime.utcnow() - timedelta(days=days_ago),
        )
        db.add_all([so, sn])
        db.flush()
        db.add(
            Alert(
                source_id=source.id,
                snapshot_old_id=so.id,
                snapshot_new_id=sn.id,
                title=title,
                urgency=urgency,
                ai_summary=summary,
                action_items=actions,
                deadline=deadline,
                penalty_note=penalty,
                old_text=old_t,
                new_text=new_t,
                created_at=datetime.utcnow() - timedelta(days=days_ago),
            )
        )

    if src_sebi:
        make_alert(
            src_sebi,
            "SEBI circular: tightened KYC for brokers",
            "High",
            "SEBI tightened KYC and re-verification timelines for inactive accounts.",
            [
                "Re-verify PAN-Aadhaar linkage for dormant accounts flagged in RMS.",
                "Publish client communication pack by July 15.",
                "Conduct sample audit on 50 clients before Jul 31 deadline.",
                "Update policy & board note on AML monitoring triggers.",
                "Escalate non-responsive clients to DSC within 7 days of breach.",
            ],
            "July 31 (re-verification complete)",
            "Monetary penalties referenced for systemic non-compliance.",
            SEBI_KYC_OLD,
            SEBI_KYC_NEW,
            0,
        )
    if src_rbi:
        make_alert(
            src_rbi,
            "RBI: Payment Aggregator reconciliation update",
            "Medium",
            "Aggregators must reconcile settlements T+1 and retain seven-year audit logs.",
            [
                "Patch settlement recon jobs to T+1.",
                "Archive historical logs to compliant storage.",
                "Train ops on new breach reporting template.",
            ],
            None,
            "Possible regulatory enforcement for material delays.",
            RBI_DELTA_OLD,
            RBI_DELTA_NEW,
            1,
        )
    if src_gst:
        make_alert(
            src_gst,
            "GST: e-invoicing threshold shift",
            "Critical",
            "Mandatory B2B e-invoicing timeline updated for mid-size taxpayers.",
            [
                "Assess turnover against Rs.5 crore threshold.",
                "Enable IRP integration in ERP before Jul 1 2026.",
                "Run parallel invoice tests with customers.",
            ],
            "01 July 2026",
            "Incorrect invoicing may attract demand + interest.",
            GST_DELTA_OLD,
            GST_DELTA_NEW,
            2,
        )
    if src_env:
        make_alert(
            src_env,
            "Telangana PCB: renewed consent validity checks",
            "Low",
            "Consent renewals flagged for continuous emission monitoring anomalies.",
            [
                "Download latest stack test reports.",
                "Submit CEMS calibration certificates.",
                "Schedule site visit briefing with EHS head.",
            ],
            None,
            "Consent suspension risk after repeated deviations.",
            "Prior consent conditions unchanged.",
            "New portal notice mandates quarterly CEMS calibration proof upload by FY quarter end.",
            4,
        )
    db.commit()
