import asyncio
import requests

from database import sync_get_setting
from models import DealPayload


async def create_xero_invoice_draft(deal: DealPayload) -> dict:
    """Create a DRAFT invoice in Xero. Never auto-sends."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _create_invoice_sync, deal)


def _get_xero_token() -> tuple[str, str]:
    """Refresh the Xero OAuth2 token and return (access_token, tenant_id)."""
    client_id = sync_get_setting("xero_client_id")
    client_secret = sync_get_setting("xero_client_secret")
    refresh_token = sync_get_setting("xero_refresh_token")
    tenant_id = sync_get_setting("xero_tenant_id") or ""

    resp = requests.post(
        "https://identity.xero.com/connect/token",
        auth=(client_id, client_secret),
        data={"grant_type": "refresh_token", "refresh_token": refresh_token},
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json()["access_token"], tenant_id


def _create_invoice_sync(deal: DealPayload) -> dict:
    token, tenant_id = _get_xero_token()
    headers = {
        "Authorization": f"Bearer {token}",
        "Xero-tenant-id": tenant_id,
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    payload = {
        "Invoices": [
            {
                "Type": "ACCREC",
                "Status": "DRAFT",
                "Contact": {"Name": deal.client_name},
                "LineItems": [
                    {
                        "Description": deal.service_type,
                        "Quantity": 1.0,
                        "UnitAmount": deal.deal_value,
                        "AccountCode": "200",
                    }
                ],
                "Reference": f"DEAL-{deal.deal_id}",
            }
        ]
    }
    resp = requests.post(
        "https://api.xero.com/api.xro/2.0/Invoices",
        headers=headers,
        json=payload,
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json()["Invoices"][0]
