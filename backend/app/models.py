from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class Source(Base):
    __tablename__ = "sources"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    url: Mapped[str] = mapped_column(String(2048), unique=True, index=True)
    domain: Mapped[str] = mapped_column(String(512), default="")
    category: Mapped[str] = mapped_column(String(64), index=True)
    frequency_hours: Mapped[int] = mapped_column(Integer, default=24)
    keywords: Mapped[list | None] = mapped_column(JSON, nullable=True)
    last_crawled_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    snapshots: Mapped[list["Snapshot"]] = relationship(back_populates="source")
    alerts: Mapped[list["Alert"]] = relationship(back_populates="source")


class Snapshot(Base):
    __tablename__ = "snapshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    source_id: Mapped[int] = mapped_column(ForeignKey("sources.id"), index=True)
    content_hash: Mapped[str] = mapped_column(String(64), index=True)
    raw_text: Mapped[str] = mapped_column(Text, default="")
    extracted_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    crawled_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    source: Mapped["Source"] = relationship(back_populates="snapshots")


class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    source_id: Mapped[int] = mapped_column(ForeignKey("sources.id"), index=True)
    snapshot_old_id: Mapped[int | None] = mapped_column(ForeignKey("snapshots.id"), nullable=True)
    snapshot_new_id: Mapped[int | None] = mapped_column(ForeignKey("snapshots.id"), nullable=True)
    title: Mapped[str] = mapped_column(String(512), default="Regulatory update")
    urgency: Mapped[str] = mapped_column(String(32), index=True)
    ai_summary: Mapped[str] = mapped_column(Text, default="")
    action_items: Mapped[list | None] = mapped_column(JSON, nullable=True)
    deadline: Mapped[str | None] = mapped_column(String(256), nullable=True)
    penalty_note: Mapped[str | None] = mapped_column(String(512), nullable=True)
    old_text: Mapped[str] = mapped_column(Text, default="")
    new_text: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)

    source: Mapped["Source"] = relationship(back_populates="alerts")


class UserBusinessProfile(Base):
    __tablename__ = "user_business_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    sectors: Mapped[list | None] = mapped_column(JSON, nullable=True)
    states: Mapped[list | None] = mapped_column(JSON, nullable=True)
    company_size: Mapped[str | None] = mapped_column(String(64), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class AlertAcknowledgement(Base):
    __tablename__ = "alert_acknowledgements"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    alert_id: Mapped[int] = mapped_column(ForeignKey("alerts.id"), index=True)
    user_id: Mapped[str] = mapped_column(String(128), index=True)
    acknowledged_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    checklist_state: Mapped[dict | None] = mapped_column(JSON, nullable=True)
