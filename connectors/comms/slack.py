import json
import asyncio
from slack_sdk.web.async_client import AsyncWebClient
from database import get_setting, update_status
from models import DealPayload


async def _client() -> AsyncWebClient:
    token = await get_setting("slack_bot_token")
    if not token:
        raise RuntimeError("Slack bot token not configured.")
    return AsyncWebClient(token=token)


async def send_approval_message(deal: DealPayload) -> dict:
    """
    Post a Block Kit approval card to Slack.
    Returns {ts, channel} which the caller stores in the DB for threading.
    """
    slack = await _client()
    channel = (await get_setting("slack_channel")) or "new-clients"

    email_preview = (deal.welcome_email_body or "")[:220].strip()
    if len(deal.welcome_email_body or "") > 220:
        email_preview += "…"

    blocks = [
        {
            "type": "header",
            "text": {"type": "plain_text", "text": "🎉 New Deal — Approval Required"},
        },
        {
            "type": "section",
            "fields": [
                {"type": "mrkdwn", "text": f"*Client*\n{deal.client_name}"},
                {"type": "mrkdwn", "text": f"*Deal Value*\n${deal.deal_value:,.0f}"},
                {"type": "mrkdwn", "text": f"*Service*\n{deal.service_type}"},
                {"type": "mrkdwn", "text": f"*Billing*\n{deal.billing_type}"},
            ],
        },
        {
            "type": "section",
            "fields": [
                {"type": "mrkdwn", "text": f"*Contact*\n{deal.contact_name}"},
                {"type": "mrkdwn", "text": f"*Email*\n{deal.contact_email}"},
                {"type": "mrkdwn", "text": f"*Sales Rep*\n{deal.sales_rep}"},
                {"type": "mrkdwn", "text": f"*Closed*\n{deal.closed_date or 'Today'}"},
            ],
        },
        {"type": "divider"},
        {
            "type": "section",
            "fields": [
                {"type": "mrkdwn", "text": f"*Project Name*\n{deal.project_name}"},
                {"type": "mrkdwn", "text": f"*Template*\n{deal.project_template}"},
                {"type": "mrkdwn", "text": f"*Assigned PM*\n{deal.assigned_pm}"},
                {"type": "mrkdwn", "text": f"*PM Email*\n{deal.pm_email or '—'}"},
            ],
        },
        {"type": "divider"},
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": (
                    f"*Welcome Email Draft*\n"
                    f"*Subject:* {deal.welcome_email_subject}\n\n"
                    f"{email_preview}"
                ),
            },
        },
        {"type": "divider"},
        {
            "type": "context",
            "elements": [
                {
                    "type": "mrkdwn",
                    "text": "Approving will create the project, draft invoice, and draft welcome email — all in one click.",
                }
            ],
        },
        {
            "type": "actions",
            "elements": [
                {
                    "type": "button",
                    "text": {"type": "plain_text", "text": "✅ Approve & Execute"},
                    "style": "primary",
                    "action_id": "approve_deal",
                    "value": deal.deal_id,
                    "confirm": {
                        "title": {"type": "plain_text", "text": "Confirm Approval"},
                        "text": {
                            "type": "mrkdwn",
                            "text": f"Execute all handoff actions for *{deal.client_name}*?\nThis will create the project, draft invoice, and draft welcome email.",
                        },
                        "confirm": {"type": "plain_text", "text": "Yes, Execute"},
                        "deny": {"type": "plain_text", "text": "Cancel"},
                    },
                },
                {
                    "type": "button",
                    "text": {"type": "plain_text", "text": "❌ Reject"},
                    "style": "danger",
                    "action_id": "reject_deal",
                    "value": deal.deal_id,
                },
            ],
        },
    ]

    resp = await slack.chat_postMessage(
        channel=channel, blocks=blocks, text=f"New deal: {deal.client_name}"
    )
    return {"ts": resp["ts"], "channel": resp["channel"]}


async def handle_interaction(payload_json: str) -> None:
    """
    Called as a background task after Slack sends an interaction payload.
    Parses button actions and dispatches approve or reject logic.
    """
    # Import here to avoid circular imports
    from main import execute_approved_deal

    try:
        payload = json.loads(payload_json)
    except json.JSONDecodeError:
        return

    actions = payload.get("actions", [])
    if not actions:
        return

    action = actions[0]
    action_id = action.get("action_id")
    deal_id = action.get("value", "")
    channel_id = payload.get("channel", {}).get("id", "")
    message_ts = payload.get("message", {}).get("ts", "")
    actor = payload.get("user", {}).get("name", "someone")

    slack = await _client()

    if action_id == "approve_deal":
        await _replace_buttons(
            slack, channel_id, message_ts,
            f"⏳ Executing handoff… (triggered by @{actor})"
        )
        await update_status(deal_id, "executing")
        await execute_approved_deal(deal_id, channel_id, message_ts)

    elif action_id == "reject_deal":
        await _replace_buttons(slack, channel_id, message_ts, f"❌ Rejected by @{actor}")
        await update_status(deal_id, "rejected")
        await slack.chat_postEphemeral(
            channel=channel_id,
            user=payload.get("user", {}).get("id", ""),
            text="Deal rejected. The record has been updated in the dashboard.",
        )


async def post_completion_summary(
    channel_id: str,
    message_ts: str,
    deal: DealPayload,
    results: dict,
    errors: list,
) -> None:
    """Post a threaded reply summarising completed actions."""
    slack = await _client()

    lines = [f"*Handoff complete for {deal.client_name}* ✅"]
    if results.get("project_url"):
        lines.append(f"• Project: <{results['project_url']}|Open project>")
    elif results.get("project_id"):
        lines.append(f"• Project created (ID: `{results['project_id']}`)")
    if results.get("invoice_id"):
        lines.append(f"• Invoice draft created (#{results['invoice_id']})")
    if results.get("email_draft_id"):
        lines.append(f"• Welcome email draft ready — check your drafts folder")
    if errors:
        lines.append(
            "\n⚠️ Some actions had errors:\n" + "\n".join(f"  — {e}" for e in errors)
        )

    await slack.chat_postMessage(
        channel=channel_id,
        thread_ts=message_ts,
        text="\n".join(lines),
    )


# ── Internal helpers ──────────────────────────────────────────────────────────

async def _replace_buttons(
    client: AsyncWebClient, channel: str, ts: str, status_text: str
) -> None:
    """Replace the actions block in the original message with a status line."""
    try:
        history = await client.conversations_history(
            channel=channel, latest=ts, limit=1, inclusive=True
        )
        msgs = history.get("messages", [])
        if not msgs:
            return
        blocks = msgs[0].get("blocks", [])
        new_blocks = [b for b in blocks if b.get("type") not in ("actions",)]
        new_blocks.append({
            "type": "context",
            "elements": [{"type": "mrkdwn", "text": status_text}],
        })
        await client.chat_update(
            channel=channel, ts=ts, blocks=new_blocks, text=status_text
        )
    except Exception:
        pass  # Non-critical — don't fail the whole flow
