from models import DealPayload
from typing import Optional

def parse_pipedrive(payload: dict) -> Optional[DealPayload]:
    # Pipedrive webhooks v2 fire on deal update
    current = payload.get("current", {})
    if current.get("status") != "won":
        return None

    person = current.get("person_id", {})
    return DealPayload(
        deal_id=str(current.get("id", "")),
        client_name=current.get("title", ""),
        contact_name=person.get("name", "") if isinstance(person, dict) else "",
        contact_email=current.get("cc_email", ""),
        deal_value=float(current.get("value", 0)),
        service_type=current.get("type", ""),
        billing_type=current.get("billing_type", ""),
        sales_rep=str(current.get("user_id", {}).get("name", "")),
        sales_notes=current.get("notes_count", ""),
    )