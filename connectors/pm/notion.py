import requests
from database import sync_get_setting
from models import DealPayload


def create_notion_project(deal: DealPayload):
    token = sync_get_setting("notion_token")
    database_id = sync_get_setting("notion_database_id")

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
    }
    payload = {
        "parent": {"database_id": database_id},
        "properties": {
            "Name": {"title": [{"text": {"content": deal.project_name or deal.client_name}}]},
            "Client": {"rich_text": [{"text": {"content": deal.client_name}}]},
            "PM": {"rich_text": [{"text": {"content": deal.assigned_pm or ""}}]},
            "Value": {"number": deal.deal_value},
            "Service": {"rich_text": [{"text": {"content": deal.service_type}}]},
            "Status": {"select": {"name": "Kickoff Pending"}},
            "Template": {"rich_text": [{"text": {"content": deal.project_template or ""}}]},
        },
    }
    r = requests.post("https://api.notion.com/v1/pages", headers=headers, json=payload, timeout=15)
    r.raise_for_status()
    return r.json()
