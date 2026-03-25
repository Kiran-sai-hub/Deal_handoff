import requests
from database import sync_get_setting
from models import DealPayload


def get_qb_token() -> str:
    """Refresh the QuickBooks OAuth2 token."""
    client_id = sync_get_setting("quickbooks_client_id")
    client_secret = sync_get_setting("quickbooks_client_secret")
    refresh_token = sync_get_setting("quickbooks_refresh_token")

    r = requests.post(
        "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer",
        auth=(client_id, client_secret),
        data={"grant_type": "refresh_token", "refresh_token": refresh_token},
        timeout=15,
    )
    r.raise_for_status()
    return r.json()["access_token"]


def create_qb_invoice_draft(deal: DealPayload):
    """Create a DRAFT invoice in QuickBooks. Never auto-sends."""
    token = get_qb_token()
    company_id = sync_get_setting("quickbooks_company_id")

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    payload = {
        "Line": [
            {
                "Amount": deal.deal_value,
                "DetailType": "SalesItemLineDetail",
                "SalesItemLineDetail": {
                    "ItemRef": {"value": "1", "name": deal.service_type}
                },
            }
        ],
        "CustomerRef": {"name": deal.client_name},
        "EmailStatus": "NotSet",  # DRAFT — never auto-sends
        "DocNumber": f"DRAFT-{deal.deal_id}",
    }
    r = requests.post(
        f"https://quickbooks.api.intuit.com/v3/company/{company_id}/invoice",
        headers=headers,
        json=payload,
        timeout=15,
    )
    r.raise_for_status()
    return r.json()
