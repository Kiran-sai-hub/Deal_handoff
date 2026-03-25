import requests
from database import sync_get_setting
from models import DealPayload


def create_clickup_task(deal: DealPayload):
    token = sync_get_setting("clickup_api_token")
    list_id = sync_get_setting("clickup_list_id")

    headers = {"Authorization": token}
    payload = {
        "name": deal.project_name or deal.client_name,
        "description": (
            f"Client: {deal.client_name}\n"
            f"Value: ${deal.deal_value:,.0f}\n"
            f"Service: {deal.service_type}\n"
            f"PM: {deal.assigned_pm}\n\n"
            f"Sales Notes:\n{deal.sales_notes or ''}"
        ),
        "assignees": [],
        "status": "to do",
        "priority": 2,
    }
    r = requests.post(
        f"https://api.clickup.com/api/v2/list/{list_id}/task",
        headers=headers,
        json=payload,
        timeout=15,
    )
    r.raise_for_status()
    return r.json()
