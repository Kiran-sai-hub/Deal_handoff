from pydantic import BaseModel
from typing import Optional


class DealPayload(BaseModel):
    # ── From CRM ────────────────────────────────────
    deal_id: str
    client_name: str
    contact_name: str
    contact_email: str
    deal_value: float
    service_type: str
    billing_type: str
    sales_rep: str
    sales_notes: Optional[str] = ""
    closed_date: Optional[str] = None

    # ── Enriched by agent ────────────────────────────
    assigned_pm: Optional[str] = None
    pm_email: Optional[str] = None
    project_template: Optional[str] = None
    project_name: Optional[str] = None
    welcome_email_subject: Optional[str] = None
    welcome_email_body: Optional[str] = None

    # ── Set after Slack message is posted ────────────
    slack_ts: Optional[str] = None
    slack_channel_id: Optional[str] = None


class DealStatus(BaseModel):
    """Read model returned by the dashboard API."""
    deal_id: str
    client_name: str
    deal_value: float
    service_type: str
    status: str  # pending_approval | executing | approved | rejected | failed
    created_at: str
    updated_at: str
    pm_name: Optional[str] = None
    project_url: Optional[str] = None
    project_id: Optional[str] = None
    invoice_id: Optional[str] = None
    email_draft_id: Optional[str] = None
    slack_ts: Optional[str] = None
    slack_channel_id: Optional[str] = None
    error_details: Optional[str] = None
    deal_snapshot: Optional[str] = None  # JSON of DealPayload


class SetupStepPayload(BaseModel):
    """Generic key/value dict sent by each setup wizard step."""
    settings: dict
