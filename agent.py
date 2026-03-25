import google.generativeai as genai
import json
from database import get_setting
from models import DealPayload


async def _get_model():
    """Lazily configure Gemini using key stored in DB."""
    api_key = await get_setting("gemini_api_key")
    if not api_key:
        raise RuntimeError("Gemini API key not configured. Complete setup first.")
    genai.configure(api_key=api_key)
    return genai.GenerativeModel("gemini-2.0-flash")


async def _get_pm_from_db(service_type: str) -> dict:
    """Look up PM assignment from DB config (set during setup wizard step 5)."""
    key = "pm_mapping_" + service_type.lower().replace(" ", "_")
    mapping = await get_setting(key)
    if mapping:
        parts = mapping.split("|")
        if len(parts) >= 3:
            return {"pm": parts[0], "pm_email": parts[1], "template": parts[2]}
    return {"pm": "Unassigned", "pm_email": "", "template": "GENERAL-V1"}


async def enrich_deal(deal: DealPayload) -> DealPayload:
    # Step 1: deterministic PM lookup from DB config
    pm_data = await _get_pm_from_db(deal.service_type)
    deal.assigned_pm = pm_data["pm"]
    deal.pm_email = pm_data["pm_email"]
    deal.project_template = pm_data["template"]

    # Step 2: Gemini for creative content only
    model = await _get_model()
    prompt = f"""
You are an operations assistant. Return ONLY valid JSON, no markdown.

Deal:
- Client: {deal.client_name}
- Service: {deal.service_type}
- Value: ${deal.deal_value}
- Contact: {deal.contact_name} ({deal.contact_email})
- PM: {deal.assigned_pm}
- Sales notes: {deal.sales_notes}

Return exactly this JSON shape:
{{
  "project_name": "concise client + service name (max 6 words)",
  "welcome_email_subject": "warm, professional subject line",
  "welcome_email_body": "3 paragraphs: warm welcome + what happens in the first 30 days + introduce the PM by name"
}}
"""
    response = model.generate_content(prompt)
    text = response.text.replace("```json", "").replace("```", "").strip()
    parsed = json.loads(text)

    deal.project_name = parsed["project_name"]
    deal.welcome_email_subject = parsed["welcome_email_subject"]
    deal.welcome_email_body = parsed["welcome_email_body"]

    return deal
