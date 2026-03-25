import asyncio
import requests

from database import sync_get_setting
from models import DealPayload


async def create_outlook_draft(deal: DealPayload) -> dict:
    """Create a draft email in Microsoft 365 via the Graph API."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _create_draft_sync, deal)


def _get_access_token() -> str:
    """Obtain an MS Graph access token using the stored refresh token."""
    tenant_id = sync_get_setting("outlook_tenant_id") or "common"
    resp = requests.post(
        f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token",
        data={
            "grant_type": "refresh_token",
            "client_id": sync_get_setting("outlook_client_id"),
            "client_secret": sync_get_setting("outlook_client_secret"),
            "refresh_token": sync_get_setting("outlook_refresh_token"),
            "scope": "https://graph.microsoft.com/Mail.ReadWrite offline_access",
        },
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json()["access_token"]


def _create_draft_sync(deal: DealPayload) -> dict:
    token = _get_access_token()
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    body = {
        "subject": deal.welcome_email_subject or "",
        "body": {
            "contentType": "Text",
            "content": deal.welcome_email_body or "",
        },
        "toRecipients": [
            {"emailAddress": {"address": deal.contact_email, "name": deal.contact_name}}
        ],
        "isDraft": True,
    }
    resp = requests.post(
        "https://graph.microsoft.com/v1.0/me/messages",
        headers=headers,
        json=body,
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json()
