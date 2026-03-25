from models import DealPayload
from typing import Optional

def parse_hubspot(payload: dict) -> Optional[DealPayload]:
    # HubSpot sends a list of property change events
    # Filter for dealstage = closedwon
    props = payload.get("properties", {})
    if props.get("dealstage", {}).get("value") != "closedwon":
        return None

    return DealPayload(
        deal_id=str(payload.get("objectId", "")),
        client_name=props.get("dealname", {}).get("value", ""),
        contact_name=props.get("contact_name", {}).get("value", ""),
        contact_email=props.get("email", {}).get("value", ""),
        deal_value=float(props.get("amount", {}).get("value", 0)),
        service_type=props.get("deal_type", {}).get("value", ""),
        billing_type=props.get("billing_type", {}).get("value", ""),
        sales_rep=props.get("hubspot_owner_id", {}).get("value", ""),
        sales_notes=props.get("description", {}).get("value", ""),
        closed_date=props.get("closedate", {}).get("value", ""),
    )