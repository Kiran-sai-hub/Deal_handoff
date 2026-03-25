import asyncio
import base64
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

from database import sync_get_setting
from models import DealPayload


async def create_gmail_draft(deal: DealPayload) -> dict:
    """Create a Gmail draft for the PM to review and send."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _create_draft_sync, deal)


def _get_gmail_service():
    """Build an authenticated Gmail service using stored OAuth2 credentials."""
    creds = Credentials(
        token=None,
        refresh_token=sync_get_setting("gmail_refresh_token"),
        token_uri="https://oauth2.googleapis.com/token",
        client_id=sync_get_setting("gmail_client_id"),
        client_secret=sync_get_setting("gmail_client_secret"),
        scopes=["https://www.googleapis.com/auth/gmail.compose"],
    )
    creds.refresh(Request())
    return build("gmail", "v1", credentials=creds)


def _create_draft_sync(deal: DealPayload) -> dict:
    service = _get_gmail_service()

    message = MIMEMultipart("alternative")
    message["to"] = deal.contact_email
    message["subject"] = deal.welcome_email_subject or ""

    text_part = MIMEText(deal.welcome_email_body or "", "plain")
    message.attach(text_part)

    raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
    draft = (
        service.users()
        .drafts()
        .create(userId="me", body={"message": {"raw": raw}})
        .execute()
    )
    return draft
