import asyncio
import json
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, BackgroundTasks, HTTPException, Request
from fastapi.responses import RedirectResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

from database import (
    init_db,
    is_setup_complete,
    get_setting,
    set_settings_bulk,
    get_all_settings,
    upsert_deal,
    update_status,
    get_deal,
    list_deals,
)
from agent import enrich_deal
from models import DealPayload, SetupStepPayload
from connectors.crm.hubspot import parse_hubspot
from connectors.crm.pipedrive import parse_pipedrive
from connectors.crm.zoho import parse_zoho
from connectors.comms.slack import (
    send_approval_message,
    handle_interaction,
    post_completion_summary,
)


# ── Startup / Shutdown ────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(title="Deal Handoff Agent", lifespan=lifespan)


# ── Root redirect ─────────────────────────────────────────────────────────────

@app.get("/", include_in_schema=False)
async def root():
    return RedirectResponse(url="/ui/index.html")


# ── Setup Wizard API ──────────────────────────────────────────────────────────

@app.get("/api/setup/status")
async def setup_status():
    complete = await is_setup_complete()
    return {"complete": complete}


@app.post("/api/setup/step/{step_number}")
async def save_setup_step(step_number: int, body: SetupStepPayload):
    """Save settings for a single wizard step."""
    await set_settings_bulk(body.settings)
    return {"saved": True, "step": step_number}


@app.post("/api/setup/test/{tool}")
async def test_tool_connection(tool: str):
    """
    Quick connectivity test for each integration.
    Returns {"ok": bool, "message": str}.
    """
    try:
        if tool == "gemini":
            import google.generativeai as genai
            api_key = await get_setting("gemini_api_key")
            if not api_key:
                return {"ok": False, "message": "API key not saved yet."}
            genai.configure(api_key=api_key)
            m = genai.GenerativeModel("gemini-2.0-flash")
            m.generate_content("Say 'ok' in one word.")
            return {"ok": True, "message": "Gemini connected."}

        elif tool == "slack":
            from slack_sdk.web.async_client import AsyncWebClient
            token = await get_setting("slack_bot_token")
            if not token:
                return {"ok": False, "message": "Slack token not saved yet."}
            client = AsyncWebClient(token=token)
            await client.auth_test()
            return {"ok": True, "message": "Slack connected."}

        elif tool == "notion":
            import requests as req
            token = await get_setting("notion_token")
            db_id = await get_setting("notion_database_id")
            if not token or not db_id:
                return {"ok": False, "message": "Notion token/database ID not saved."}
            r = req.get(
                f"https://api.notion.com/v1/databases/{db_id}",
                headers={"Authorization": f"Bearer {token}", "Notion-Version": "2022-06-28"},
                timeout=10,
            )
            if r.status_code == 200:
                return {"ok": True, "message": "Notion connected."}
            return {"ok": False, "message": f"Notion error: {r.status_code}"}

        elif tool == "clickup":
            import requests as req
            token = await get_setting("clickup_api_token")
            if not token:
                return {"ok": False, "message": "ClickUp token not saved."}
            r = req.get(
                "https://api.clickup.com/api/v2/user",
                headers={"Authorization": token},
                timeout=10,
            )
            if r.status_code == 200:
                return {"ok": True, "message": "ClickUp connected."}
            return {"ok": False, "message": f"ClickUp error: {r.status_code}"}

        elif tool == "asana":
            import requests as req
            token = await get_setting("asana_access_token")
            if not token:
                return {"ok": False, "message": "Asana token not saved."}
            r = req.get(
                "https://app.asana.com/api/1.0/users/me",
                headers={"Authorization": f"Bearer {token}"},
                timeout=10,
            )
            if r.status_code == 200:
                return {"ok": True, "message": "Asana connected."}
            return {"ok": False, "message": f"Asana error: {r.status_code}"}

        elif tool == "quickbooks":
            import requests as req
            client_id = await get_setting("quickbooks_client_id")
            client_secret = await get_setting("quickbooks_client_secret")
            refresh_token = await get_setting("quickbooks_refresh_token")
            if not all([client_id, client_secret, refresh_token]):
                return {"ok": False, "message": "QuickBooks credentials not complete."}
            r = req.post(
                "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer",
                auth=(client_id, client_secret),
                data={"grant_type": "refresh_token", "refresh_token": refresh_token},
                timeout=10,
            )
            if r.status_code == 200:
                return {"ok": True, "message": "QuickBooks connected."}
            return {"ok": False, "message": f"QuickBooks error: {r.status_code}"}

        elif tool == "xero":
            import requests as req
            client_id = await get_setting("xero_client_id")
            client_secret = await get_setting("xero_client_secret")
            refresh_token = await get_setting("xero_refresh_token")
            if not all([client_id, client_secret, refresh_token]):
                return {"ok": False, "message": "Xero credentials not complete."}
            r = req.post(
                "https://identity.xero.com/connect/token",
                auth=(client_id, client_secret),
                data={"grant_type": "refresh_token", "refresh_token": refresh_token},
                timeout=10,
            )
            if r.status_code == 200:
                return {"ok": True, "message": "Xero connected."}
            return {"ok": False, "message": f"Xero error: {r.status_code}"}

        return {"ok": False, "message": f"Unknown tool: {tool}"}

    except Exception as e:
        return {"ok": False, "message": str(e)}


@app.post("/api/setup/complete")
async def complete_setup():
    from database import set_setting
    await set_setting("setup_complete", "true")
    return {"complete": True}


# ── Config API ────────────────────────────────────────────────────────────────

_REDACTED_KEYS = {
    "gemini_api_key", "slack_bot_token",
    "notion_token", "clickup_api_token", "asana_access_token",
    "quickbooks_client_secret", "quickbooks_refresh_token",
    "xero_client_secret", "xero_refresh_token",
    "gmail_client_secret", "gmail_refresh_token",
    "outlook_client_secret", "outlook_refresh_token",
}


@app.get("/api/config")
async def get_config():
    all_settings = await get_all_settings()
    redacted = {
        k: ("••••••" if k in _REDACTED_KEYS and v else v)
        for k, v in all_settings.items()
        if k != "setup_complete"
    }
    # Connection status booleans
    redacted["_connected"] = {
        "gemini": bool(all_settings.get("gemini_api_key")),
        "slack": bool(all_settings.get("slack_bot_token")),
        "pm_tool": all_settings.get("pm_tool", "none"),
        "pm": bool(
            all_settings.get("notion_token")
            or all_settings.get("clickup_api_token")
            or all_settings.get("asana_access_token")
        ),
        "billing_tool": all_settings.get("billing_tool", "none"),
        "billing": bool(
            all_settings.get("quickbooks_refresh_token")
            or all_settings.get("xero_refresh_token")
        ),
        "email_tool": all_settings.get("email_tool", "none"),
        "email": bool(
            all_settings.get("gmail_refresh_token")
            or all_settings.get("outlook_refresh_token")
        ),
    }
    return redacted


@app.post("/api/config")
async def update_config(body: SetupStepPayload):
    await set_settings_bulk(body.settings)
    return {"saved": True}


# ── Deal API ──────────────────────────────────────────────────────────────────

@app.get("/api/deals")
async def get_deals(limit: int = 50):
    deals = await list_deals(limit)
    return {"deals": deals}


@app.get("/api/deals/{deal_id}")
async def get_deal_endpoint(deal_id: str):
    deal = await get_deal(deal_id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    return deal


@app.post("/api/deals/{deal_id}/retry")
async def retry_deal(deal_id: str, bg: BackgroundTasks):
    record = await get_deal(deal_id)
    if not record:
        raise HTTPException(status_code=404, detail="Deal not found")
    if record["status"] not in ("failed", "rejected"):
        raise HTTPException(
            status_code=400,
            detail="Only failed or rejected deals can be retried.",
        )
    bg.add_task(
        execute_approved_deal,
        deal_id,
        record.get("slack_channel_id", ""),
        record.get("slack_ts", ""),
    )
    return {"status": "retrying"}


# ── SSE Live Feed ─────────────────────────────────────────────────────────────

@app.get("/api/events")
async def sse_events(request: Request):
    async def generator():
        while True:
            if await request.is_disconnected():
                break
            deals = await list_deals(20)
            yield f"data: {json.dumps(deals)}\n\n"
            await asyncio.sleep(3)

    return StreamingResponse(generator(), media_type="text/event-stream")


# ── CRM Webhooks ──────────────────────────────────────────────────────────────

@app.post("/webhook/hubspot")
async def hubspot_trigger(request: Request, bg: BackgroundTasks):
    payload = await request.json()
    deal = parse_hubspot(payload)
    if deal:
        bg.add_task(process_deal, deal)
    return {"status": "accepted"}


@app.post("/webhook/pipedrive")
async def pipedrive_trigger(request: Request, bg: BackgroundTasks):
    payload = await request.json()
    deal = parse_pipedrive(payload)
    if deal:
        bg.add_task(process_deal, deal)
    return {"status": "accepted"}


@app.post("/webhook/zoho")
async def zoho_trigger(request: Request, bg: BackgroundTasks):
    payload = await request.json()
    deal = parse_zoho(payload)
    if deal:
        bg.add_task(process_deal, deal)
    return {"status": "accepted"}


@app.post("/webhook/generic")
async def generic_trigger(request: Request, bg: BackgroundTasks):
    """Used for testing and custom CRMs."""
    payload = await request.json()
    deal = DealPayload(**payload)
    bg.add_task(process_deal, deal)
    return {"status": "accepted"}


@app.post("/webhook/slack-interactions")
async def slack_interactions(request: Request, bg: BackgroundTasks):
    """Slack sends interaction payloads here (button clicks)."""
    form = await request.form()
    bg.add_task(handle_interaction, form["payload"])
    return {}  # must return 200 immediately — Slack has a 3s timeout


# ── Core Processing ───────────────────────────────────────────────────────────

async def process_deal(deal: DealPayload) -> None:
    now = datetime.now(timezone.utc).isoformat()

    # 1. Save to DB immediately
    await upsert_deal(
        deal.deal_id,
        client_name=deal.client_name,
        deal_value=deal.deal_value,
        service_type=deal.service_type,
        status="pending_approval",
        created_at=now,
    )

    # 2. Enrich with Gemini
    try:
        enriched = await enrich_deal(deal)
    except Exception as e:
        await update_status(deal.deal_id, "failed", error_details=f"Enrichment: {e}")
        return

    await update_status(
        enriched.deal_id,
        "pending_approval",
        pm_name=enriched.assigned_pm,
        deal_snapshot=enriched.model_dump_json(),
    )

    # 3. Send Slack approval message
    try:
        slack_result = await send_approval_message(enriched)
        await update_status(
            enriched.deal_id,
            "pending_approval",
            slack_ts=slack_result["ts"],
            slack_channel_id=slack_result["channel"],
        )
    except Exception as e:
        await update_status(enriched.deal_id, "failed", error_details=f"Slack: {e}")


async def execute_approved_deal(deal_id: str, channel_id: str, message_ts: str) -> None:
    """
    Run all three handoff actions in parallel after PM approves in Slack.
    Failures in individual actions are isolated — partial success is fine.
    """
    record = await get_deal(deal_id)
    if not record or not record.get("deal_snapshot"):
        return

    deal = DealPayload.model_validate_json(record["deal_snapshot"])
    results: dict = {}
    errors: list = []
    loop = asyncio.get_event_loop()

    # ── PM Tool ───────────────────────────────────────────────────────────────
    async def run_pm():
        try:
            pm_tool = (await get_setting("pm_tool") or "").lower()
            if pm_tool == "notion":
                from connectors.pm.notion import create_notion_project
                r = await loop.run_in_executor(None, create_notion_project, deal)
                results["project_url"] = r.get("url")
                results["project_id"] = r.get("id")
            elif pm_tool == "clickup":
                from connectors.pm.clickup import create_clickup_task
                r = await loop.run_in_executor(None, create_clickup_task, deal)
                results["project_url"] = r.get("url")
                results["project_id"] = str(r.get("id", ""))
            elif pm_tool == "asana":
                from connectors.pm.asana import create_asana_task
                r = await loop.run_in_executor(None, create_asana_task, deal)
                results["project_url"] = r.get("data", {}).get("permalink_url")
                results["project_id"] = r.get("data", {}).get("gid", "")
        except Exception as e:
            errors.append(f"PM ({pm_tool}): {e}")

    # ── Billing ───────────────────────────────────────────────────────────────
    async def run_billing():
        try:
            billing_tool = (await get_setting("billing_tool") or "none").lower()
            if billing_tool == "quickbooks":
                from connectors.billing.quickbooks import create_qb_invoice_draft
                r = await loop.run_in_executor(None, create_qb_invoice_draft, deal)
                results["invoice_id"] = r.get("Invoice", {}).get("Id")
            elif billing_tool == "xero":
                from connectors.billing.xero import create_xero_invoice_draft
                r = await create_xero_invoice_draft(deal)
                results["invoice_id"] = r.get("InvoiceID")
        except Exception as e:
            errors.append(f"Billing: {e}")

    # ── Email ─────────────────────────────────────────────────────────────────
    async def run_email():
        try:
            email_tool = (await get_setting("email_tool") or "none").lower()
            if email_tool == "gmail":
                from connectors.comms.gmail import create_gmail_draft
                r = await create_gmail_draft(deal)
                results["email_draft_id"] = r.get("id")
            elif email_tool == "outlook":
                from connectors.comms.outlook import create_outlook_draft
                r = await create_outlook_draft(deal)
                results["email_draft_id"] = r.get("id")
        except Exception as e:
            errors.append(f"Email: {e}")

    # Run all three in parallel — individual failures are isolated
    await asyncio.gather(run_pm(), run_billing(), run_email())

    final_status = "failed" if len(errors) == 3 else "approved"
    await update_status(
        deal_id,
        final_status,
        project_url=results.get("project_url"),
        project_id=results.get("project_id"),
        invoice_id=results.get("invoice_id"),
        email_draft_id=results.get("email_draft_id"),
        error_details="; ".join(errors) if errors else None,
    )

    # Post summary to the original Slack thread
    if channel_id and message_ts:
        try:
            await post_completion_summary(channel_id, message_ts, deal, results, errors)
        except Exception:
            pass  # Summary is informational — don't let it fail the whole flow


# ── Frontend SPA ──────────────────────────────────────────────────────────────
# Must be LAST so it doesn't shadow API routes
import os
_FRONTEND_DIST = os.path.join(os.path.dirname(__file__), "frontend", "dist")
if os.path.isdir(_FRONTEND_DIST):
    app.mount("/ui", StaticFiles(directory=_FRONTEND_DIST, html=True), name="frontend")
