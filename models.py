from pydantic import BaseModel
from typing import Optional

class DealPayload(BaseModel):
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
    # enriched by agent
    assigned_pm: Optional[str] = None
    pm_email: Optional[str] = None
    project_template: Optional[str] = None
    project_name: Optional[str] = None
    welcome_email_subject: Optional[str] = None
    welcome_email_body: Optional[str] = None