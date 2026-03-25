Deal Handoff Agent - Full Implementation Plan (Plug & Play Edition)                                                                                    
                                                        
 Context

 Build a complete, productized Deal Handoff Agent that an agency can sell to B2B clients. The buyer should be able to: pull the Docker image, run
 docker compose up, open a browser, complete a guided setup wizard, and be fully operational — no manual file editing, no terminal commands beyond the
 initial startup.

 Core design principle: The agent CREATES/DRAFTS, humans REVIEW/APPROVE. Zero config files to edit by hand.

 Current State (What Exists)

 - main.py — FastAPI webhook endpoints; broken import (from connectors.slack → must be from connectors.comms.slack)
 - agent.py — Gemini 2.0 Flash enrichment (works)
 - config.py / models.py — Pydantic settings + DealPayload
 - connectors/crm/ — HubSpot, Pipedrive, Zoho parsers (implemented, all 3)
 - connectors/pm/ — Notion, ClickUp, Asana (implemented, sync requests)
 - connectors/billing/quickbooks.py — OAuth2 + DRAFT invoice (implemented)
 - connectors/billing/xero.py — EMPTY
 - connectors/comms/slack.py — EMPTY (broken import in main.py)
 - connectors/comms/gmail.py — EMPTY
 - No frontend, no state tracking, no setup wizard, no parallel execution

 ---
 Plug & Play User Journey

 1. docker compose up
 2. Open http://localhost:8000
 3. Complete 5-step Setup Wizard:
    Step 1: AI key (Gemini)
    Step 2: Pick CRM + paste webhook secret → copy webhook URL to paste in CRM
    Step 3: Pick PM tool + authenticate
    Step 4: Pick billing tool + authenticate
    Step 5: Slack bot + team PM mappings (add rows in a table)
 4. Click "Finish Setup" → system is live
 5. Mark a deal "Closed Won" in CRM → agent fires automatically

 No .env editing. No terminal config. No code changes.

 ---
 Architecture

 Configuration Storage

 Credentials entered via the Setup Wizard are stored in a config table in SQLite (not .env). The config.py Pydantic settings class is replaced by a
 get_setting(key) / set_setting(key, value) database pattern. The .env.example is kept only as a Docker bootstrap (for GEMINI_API_KEY if desired), but
 all runtime config flows through the UI.

 New Files to Create

 database.py                           # SQLite: deal_statuses + app_config tables
 connectors/comms/outlook.py           # MS Graph API draft email
 frontend/
   package.json / tsconfig.json / vite.config.ts / tailwind.config.js
   index.html
   src/
     main.tsx / App.tsx
     types.ts / api.ts
     components/
       StatusBadge.tsx
       NavBar.tsx
       SetupStep.tsx                   # Reusable wizard step container
     pages/
       Setup.tsx                       # 5-step guided wizard (FIRST LAUNCH)
       Dashboard.tsx                   # Deal feed
       DealDetail.tsx                  # Per-deal view
       Configuration.tsx               # Edit settings post-setup

 Modified Files

 - main.py — fix import, add lifespan, setup APIs, deal APIs, SSE, StaticFiles
 - models.py — add slack_ts, slack_channel_id to DealPayload; add DealStatus model
 - config.py — rewrite to read from SQLite config table (with .env fallback for initial bootstrap)
 - connectors/comms/slack.py — Block Kit approval + interaction handler
 - connectors/comms/gmail.py — OAuth2 Gmail draft
 - connectors/billing/xero.py — Xero OAuth2 + DRAFT invoice
 - requirements.txt — add aiosqlite, msal
 - Dockerfile — multi-stage Node + Python
 - docker-compose.yml — SQLite volume, expose port 8000

 ---
 Implementation Order

 Phase 1: Foundation

 1. Fix import bug in main.py
 2. database.py — two tables:
   - deal_statuses (deal tracking)
   - app_config (key/value settings store)
 3. Rewrite config.py — reads from app_config table; .env only needed for GEMINI_API_KEY as Docker bootstrap
 4. Extend models.py — add slack_ts, slack_channel_id, DealStatus

 Phase 2: Connectors

 5. connectors/comms/slack.py — full Block Kit implementation
 6. connectors/comms/gmail.py — Google OAuth2 draft
 7. connectors/comms/outlook.py — MSAL + MS Graph draft
 8. connectors/billing/xero.py — mirrors quickbooks.py pattern

 Phase 3: Core Workflow (main.py)

 9. lifespan startup — init_db(), check_setup_complete()
 10. process_deal() — DB tracking + enrichment + Slack message
 11. execute_approved_deal() — parallel asyncio.gather for PM + billing + email
 12. All new REST endpoints

 Phase 4: Frontend

 13. Setup wizard (Setup.tsx) — 5-step flow
 14. Dashboard, DealDetail, Configuration pages

 Phase 5: Infrastructure

 15. Multi-stage Dockerfile
 16. Updated docker-compose + .env.example

 ---
 Key Implementation Details

 database.py

 # TABLE: app_config
 # key TEXT PRIMARY KEY, value TEXT, updated_at TEXT
 # e.g.: ("crm_type", "hubspot", ...), ("notion_token", "secret_...", ...)

 # TABLE: deal_statuses
 # deal_id, client_name, deal_value, service_type
 # status: pending_approval | executing | approved | rejected | failed
 # created_at, updated_at
 # pm_name, project_url, project_id, invoice_id, email_draft_id
 # slack_ts, slack_channel_id
 # error_details, deal_snapshot (full DealPayload JSON)

 async def get_setting(key: str) -> Optional[str]
 async def set_setting(key: str, value: str) -> None
 async def set_settings_bulk(settings: dict) -> None
 async def is_setup_complete() -> bool   # checks required keys exist
 async def upsert_deal(...) -> None
 async def update_status(...) -> None
 async def get_deal(deal_id: str) -> Optional[dict]
 async def list_deals(limit: int = 50) -> list[dict]

 Setup Wizard API Endpoints

 GET  /api/setup/status          # {"complete": bool, "step": int}
 POST /api/setup/step/{n}        # save each step's config to DB
 POST /api/setup/test/{tool}     # test connection to notion/slack/qb/etc.
 POST /api/setup/complete        # mark setup done, activate agent

 Setup Wizard Steps (Frontend)

 Step 1 — AI
 - Input: Gemini API Key
 - Test button: pings Gemini with a tiny prompt

 Step 2 — CRM
 - Dropdown: HubSpot | Pipedrive | Zoho
 - Input: Webhook secret/token
 - Output box (read-only): "Paste this URL into your CRM: https://yourhost/webhook/hubspot"

 Step 3 — Project Management
 - Dropdown: Notion | ClickUp | Asana
 - Relevant token/IDs input fields (only show fields for selected tool)
 - Test button: creates a test page/task and deletes it

 Step 4 — Billing (optional)
 - Dropdown: QuickBooks | Xero | Skip for now
 - OAuth credential fields
 - Test button: checks token validity

 Step 5 — Team & Slack
 - Input: Slack Bot Token, Slack Channel
 - Dynamic PM Mapping table:
 Service Type     PM Name      PM Email        Template Code
 [SEO Retainer]   [Divya S.]   [divya@co.com]  [SEO-V3]   [+ row] [x]
 - Test button: sends a test Slack message

 First-Launch Redirect

 On app startup, if is_setup_complete() returns false, the frontend redirects all routes to /setup. After setup completion, redirect to / (Dashboard).

 Parallel Execution Pattern

 async def execute_approved_deal(deal_id, channel_id, message_ts):
     deal = DealPayload.model_validate_json((await get_deal(deal_id))["deal_snapshot"])
     results, errors = {}, []
     loop = asyncio.get_event_loop()

     async def run_pm():
         try:
             pm_tool = await get_setting("pm_tool")
             if pm_tool == "notion":
                 r = await loop.run_in_executor(None, create_notion_project, deal)
             elif pm_tool == "clickup":
                 r = await loop.run_in_executor(None, create_clickup_task, deal)
             elif pm_tool == "asana":
                 r = await loop.run_in_executor(None, create_asana_task, deal)
             results["project_url"] = r.get("url") or r.get("permalink_url")
         except Exception as e:
             errors.append(f"PM: {e}")

     async def run_billing():
         try:
             billing_tool = await get_setting("billing_tool")
             if billing_tool == "quickbooks":
                 r = await loop.run_in_executor(None, create_qb_invoice_draft, deal)
                 results["invoice_id"] = r.get("Invoice", {}).get("Id")
             elif billing_tool == "xero":
                 r = await create_xero_invoice_draft(deal)
                 results["invoice_id"] = r.get("InvoiceID")
         except Exception as e:
             errors.append(f"Billing: {e}")

     async def run_email():
         try:
             email_tool = await get_setting("email_tool")
             if email_tool == "gmail":
                 r = await create_gmail_draft(deal)
                 results["email_draft_id"] = r.get("id")
             elif email_tool == "outlook":
                 r = await create_outlook_draft(deal)
                 results["email_draft_id"] = r.get("id")
         except Exception as e:
             errors.append(f"Email: {e}")

     await asyncio.gather(run_pm(), run_billing(), run_email())
     # failures are isolated — partial success is handled
     final_status = "failed" if len(errors) == 3 else "approved"
     await update_status(deal_id, final_status, **results,
                         error_details="; ".join(errors) if errors else None)
     await post_completion_to_slack(channel_id, message_ts, deal, results, errors)

 Slack connector

 # send_approval_message(deal): Block Kit message with:
 #   - Client info, deal value, service type
 #   - Assigned PM, project name
 #   - Welcome email subject + preview (first 200 chars)
 #   - [Approve & Execute] [Reject] buttons (value = deal_id)
 #   Returns: {ts, channel} → stored in DB

 # handle_interaction(payload_json): called from bg task in /webhook/slack-interactions
 #   - Parses action_id, deal_id, channel_id, message_ts
 #   - approve: chat.update to "Executing...", then execute_approved_deal()
 #   - reject: chat.update to "Rejected by @user", update DB

 Configuration Page (post-setup)

 Same form as Setup Wizard but pre-filled with current values. Allows updating any credential or PM mapping without needing to redo the full wizard.
 Changes take effect immediately (reads from DB on each request).

 API Endpoints Summary

 # Setup
 GET  /api/setup/status
 POST /api/setup/step/{n}
 POST /api/setup/test/{tool}
 POST /api/setup/complete

 # Deals
 GET  /api/deals                   # list, ?limit=50
 GET  /api/deals/{id}              # detail + snapshot
 POST /api/deals/{id}/retry        # re-run failed actions

 # Config (post-setup)
 GET  /api/config                  # current settings (tokens redacted)
 POST /api/config                  # update settings

 # Webhooks (CRM triggers)
 POST /webhook/hubspot
 POST /webhook/pipedrive
 POST /webhook/zoho
 POST /webhook/generic             # for testing
 POST /webhook/slack-interactions  # Slack button callbacks

 # SSE
 GET  /api/events                  # live feed, pushes deal array every 3s

 # Frontend (catch-all)
 GET  /ui/{path}                   # React SPA (StaticFiles html=True)
 GET  /                            # redirect to /ui

 Dockerfile (multi-stage)

 FROM node:20-slim AS frontend-builder
 WORKDIR /app/frontend
 COPY frontend/package.json frontend/package-lock.json ./
 RUN npm ci
 COPY frontend/ .
 RUN npm run build

 FROM python:3.11-slim
 WORKDIR /app
 COPY requirements.txt .
 RUN pip install --no-cache-dir -r requirements.txt
 COPY . .
 COPY --from=frontend-builder /app/frontend/dist ./frontend/dist
 EXPOSE 8000
 CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

 docker-compose.yml

 version: "3.9"
 services:
   agent:
     build: .
     ports:
       - "8000:8000"
     volumes:
       - ./data:/app/data   # SQLite persists here
     environment:
       - SQLITE_DB_PATH=/app/data/deals.db
     restart: unless-stopped
     # No env_file needed — all config lives in SQLite after setup wizard

 ---
 End-to-End Slack Approval Flow

 CRM webhook → POST /webhook/hubspot (or pipedrive, zoho)
   → parse deal → DealPayload
   → DB: INSERT (pending_approval)
   → agent.py: enrich_deal() [Gemini — assigns PM, writes email, project name]
   → DB: UPDATE with enriched snapshot
   → slack.py: send_approval_message() → {ts, channel}
   → DB: UPDATE slack_ts, slack_channel_id

 [PM sees message in Slack, clicks "Approve & Execute"]

 Slack → POST /webhook/slack-interactions
   → returns {} immediately (Slack 3s timeout requirement)
   → bg task: handle_interaction()
       → chat.update: replace buttons with "⏳ Executing..."
       → DB: status = executing
       → execute_approved_deal() via asyncio.gather:
           ┌─ run_pm()      → Notion/ClickUp/Asana project created
           ├─ run_billing() → QB or Xero draft invoice created
           └─ run_email()   → Gmail or Outlook draft created
       → DB: status = approved, project_url, invoice_id, email_draft_id stored
       → Slack thread reply: "✅ Done — Project: [link] | Invoice: #DRAFT-123 | Email: drafted"

 ---
 Verification

 1. docker compose up --build → opens http://localhost:8000 → redirects to /ui/setup
 2. Complete wizard with test credentials → click "Finish Setup"
 3. curl -X POST http://localhost:8000/webhook/generic -d '{...}' to trigger a test deal
 4. Slack approval message appears → click "Approve & Execute"
 5. Dashboard at /ui shows deal status updating in real time
 6. DealDetail shows project URL, invoice ID, email draft ID
 7. Test all 3 CRM parsers via /webhook/hubspot, /webhook/pipedrive, /webhook/zoho