from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class SourceCreate(BaseModel):
    url: str
    domain: str = ""
    category: str = "GST"
    frequency_hours: int = 24
    keywords: list[str] | None = None


class SourceOut(BaseModel):
    id: int
    url: str
    domain: str
    category: str
    frequency_hours: int
    keywords: list[str] | None
    last_crawled_at: datetime | None
    is_active: bool

    class Config:
        from_attributes = True


class AlertOut(BaseModel):
    id: int
    source_id: int
    title: str
    category: str
    url: str
    urgency: str
    ai_summary: str
    action_items: list[str] | None
    deadline: str | None
    penalty_note: str | None
    created_at: datetime
    unread: bool = True

    class Config:
        from_attributes = False


class AlertDetailOut(BaseModel):
    id: int
    source_id: int
    title: str
    category: str
    url: str
    urgency: str
    ai_summary: str
    action_items: list[str] | None
    deadline: str | None
    penalty_note: str | None
    old_text: str
    new_text: str
    diff_unified: str
    checklist_state: dict[str, Any] | None = None
    created_at: datetime


class ProfileIn(BaseModel):
    sectors: list[str] = Field(default_factory=list)
    states: list[str] = Field(default_factory=list)
    company_size: str | None = None


class ProfileOut(BaseModel):
    user_id: str
    sectors: list[str]
    states: list[str]
    company_size: str | None

    class Config:
        from_attributes = True


class SimulateIn(BaseModel):
    url: str


class ChecklistPatch(BaseModel):
    checklist_state: dict[str, Any]
