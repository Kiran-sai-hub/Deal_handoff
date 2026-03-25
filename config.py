from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # AI
    gemini_api_key: str

    # CRM
    crm_type: str = "webhook"
    hubspot_webhook_secret: Optional[str] = None
    pipedrive_webhook_token: Optional[str] = None
    zoho_webhook_token: Optional[str] = None

    # PM
    pm_tool: str = "notion"
    notion_token: Optional[str] = None
    notion_database_id: Optional[str] = None
    clickup_api_token: Optional[str] = None
    clickup_list_id: Optional[str] = None
    asana_access_token: Optional[str] = None
    asana_project_id: Optional[str] = None

    # Billing
    billing_tool: str = "none"
    quickbooks_client_id: Optional[str] = None
    quickbooks_client_secret: Optional[str] = None
    quickbooks_refresh_token: Optional[str] = None
    quickbooks_company_id: Optional[str] = None
    xero_client_id: Optional[str] = None
    xero_client_secret: Optional[str] = None
    xero_refresh_token: Optional[str] = None
    xero_tenant_id: Optional[str] = None

    # Comms
    slack_bot_token: str
    slack_channel: str = "new-clients"
    gmail_client_id: Optional[str] = None
    gmail_client_secret: Optional[str] = None
    gmail_refresh_token: Optional[str] = None

    class Config:
        env_file = ".env"

settings = Settings()