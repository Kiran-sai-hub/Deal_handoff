from models import DealPayload
from typing import Optional

def parse_zoho(payload: dict) -> Optional[DealPayload]:
    deal = payload.get("deals", [{}])[0]
    if deal.get("Stage") != "Closed Won":
        return None

    return DealPayload(
        deal_id=str(deal.get("id", "")),
        client_name=deal.get("Deal_Name", ""),
        contact_name=deal.get("Contact_Name", {}).get("name", ""),
        contact_email=deal.get("Email", ""),
        deal_value=float(deal.get("Amount", 0)),
        service_type=deal.get("Type", ""),
        billing_type=deal.get("Billing_Type", ""),
        sales_rep=deal.get("Owner", {}).get("name", ""),
        sales_notes=deal.get("Description", ""),
    )