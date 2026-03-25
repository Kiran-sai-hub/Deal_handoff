import requests
from database import sync_get_setting
from models import DealPayload


def create_asana_task(deal: DealPayload):
    token = sync_get_setting("asana_access_token")
    project_id = sync_get_setting("asana_project_id")

    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "data": {
            "name": deal.project_name or deal.client_name,
            "notes": (
                f"Client: {deal.client_name}\n"
                f"Value: ${deal.deal_value:,.0f}\n"
                f"PM: {deal.assigned_pm}\n\n"
                f"{deal.sales_notes or ''}"
            ),
            "projects": [project_id],
        }
    }
    r = requests.post(
        "https://app.asana.com/api/1.0/tasks",
        headers=headers,
        json=payload,
        timeout=15,
    )
    r.raise_for_status()
    return r.json()
