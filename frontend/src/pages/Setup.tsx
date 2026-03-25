import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { SetupStep } from '../components/SetupStep'

const TOTAL_STEPS = 5

interface FieldProps {
  label: string
  id: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
  hint?: string
  readOnly?: boolean
}

function Field({ label, id, value, onChange, type = 'text', placeholder, hint, readOnly }: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          readOnly ? 'bg-gray-50 text-gray-500 select-all' : ''
        }`}
      />
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  )
}

function Select({ label, id, value, onChange, options }: {
  label: string; id: string; value: string; onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <select
        id={id}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

function TestButton({ tool, onResult }: { tool: string; onResult: (ok: boolean, msg: string) => void }) {
  const [loading, setLoading] = useState(false)
  const test = async () => {
    setLoading(true)
    try {
      const r = await api.testTool(tool)
      onResult(r.ok, r.message)
    } catch (e: unknown) {
      onResult(false, String(e))
    } finally {
      setLoading(false)
    }
  }
  return (
    <button
      onClick={test}
      disabled={loading}
      className="text-sm text-blue-600 hover:text-blue-800 underline disabled:opacity-50"
    >
      {loading ? 'Testing…' : 'Test connection'}
    </button>
  )
}

// ── PM Mapping table ──────────────────────────────────────────────────────────

interface PmRow { service: string; pm: string; email: string; template: string }

function PmMappingTable({ rows, onChange }: { rows: PmRow[]; onChange: (r: PmRow[]) => void }) {
  const addRow = () => onChange([...rows, { service: '', pm: '', email: '', template: 'GENERAL-V1' }])
  const removeRow = (i: number) => onChange(rows.filter((_, idx) => idx !== i))
  const updateRow = (i: number, field: keyof PmRow, val: string) => {
    const next = [...rows]
    next[i] = { ...next[i], [field]: val }
    onChange(next)
  }

  const cellClass = 'border border-gray-200 px-2 py-1'
  const inputClass = 'w-full text-sm focus:outline-none bg-transparent'

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-gray-700">PM Assignments by Service Type</label>
        <button onClick={addRow} className="text-xs text-blue-600 hover:text-blue-800">+ Add row</button>
      </div>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {['Service Type', 'PM Name', 'PM Email', 'Template Code', ''].map(h => (
                <th key={h} className="px-3 py-2 text-left text-xs font-medium text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-t border-gray-100">
                {(['service', 'pm', 'email', 'template'] as (keyof PmRow)[]).map(f => (
                  <td key={f} className={cellClass}>
                    <input
                      className={inputClass}
                      value={row[f]}
                      onChange={e => updateRow(i, f, e.target.value)}
                      placeholder={f === 'template' ? 'e.g. SEO-V1' : ''}
                    />
                  </td>
                ))}
                <td className={cellClass}>
                  <button onClick={() => removeRow(i)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-1 text-xs text-gray-500">
        Service type must match exactly what your CRM sends (e.g. "SEO Retainer").
      </p>
    </div>
  )
}

// ── Main Setup Component ──────────────────────────────────────────────────────

export default function Setup({ onComplete }: { onComplete: () => void }) {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)

  // Step 1 — AI
  const [geminiKey, setGeminiKey] = useState('')

  // Step 2 — CRM
  const [crmType, setCrmType] = useState('hubspot')
  const [hubspotSecret, setHubspotSecret] = useState('')
  const [pipedriveToken, setPipedriveToken] = useState('')
  const [zohoToken, setZohoToken] = useState('')

  // Step 3 — PM
  const [pmTool, setPmTool] = useState('notion')
  const [notionToken, setNotionToken] = useState('')
  const [notionDbId, setNotionDbId] = useState('')
  const [clickupToken, setClickupToken] = useState('')
  const [clickupListId, setClickupListId] = useState('')
  const [asanaToken, setAsanaToken] = useState('')
  const [asanaProjectId, setAsanaProjectId] = useState('')

  // Step 4 — Billing
  const [billingTool, setBillingTool] = useState('none')
  const [qbClientId, setQbClientId] = useState('')
  const [qbClientSecret, setQbClientSecret] = useState('')
  const [qbRefreshToken, setQbRefreshToken] = useState('')
  const [qbCompanyId, setQbCompanyId] = useState('')
  const [xeroClientId, setXeroClientId] = useState('')
  const [xeroClientSecret, setXeroClientSecret] = useState('')
  const [xeroRefreshToken, setXeroRefreshToken] = useState('')
  const [xeroTenantId, setXeroTenantId] = useState('')

  // Step 5 — Slack + Email + Team
  const [slackToken, setSlackToken] = useState('')
  const [slackChannel, setSlackChannel] = useState('new-clients')
  const [emailTool, setEmailTool] = useState('gmail')
  const [gmailClientId, setGmailClientId] = useState('')
  const [gmailClientSecret, setGmailClientSecret] = useState('')
  const [gmailRefreshToken, setGmailRefreshToken] = useState('')
  const [outlookClientId, setOutlookClientId] = useState('')
  const [outlookClientSecret, setOutlookClientSecret] = useState('')
  const [outlookRefreshToken, setOutlookRefreshToken] = useState('')
  const [outlookTenantId, setOutlookTenantId] = useState('')
  const [pmRows, setPmRows] = useState<PmRow[]>([
    { service: 'SEO Retainer', pm: '', email: '', template: 'SEO-V1' },
    { service: 'Brand Identity', pm: '', email: '', template: 'BRAND-V1' },
  ])

  const webhookUrl = (crm: string) => `${window.location.origin}/webhook/${crm}`

  const saveAndNext = async (settings: Record<string, string>) => {
    setLoading(true)
    setTestResult(null)
    try {
      await api.saveSetupStep(step, settings)
      setStep(s => s + 1)
    } catch (e: unknown) {
      alert('Failed to save: ' + String(e))
    } finally {
      setLoading(false)
    }
  }

  const finish = async () => {
    setLoading(true)
    try {
      // Build PM mapping settings
      const pmSettings: Record<string, string> = {}
      pmRows.forEach(row => {
        if (row.service && row.pm) {
          const key = 'pm_mapping_' + row.service.toLowerCase().replace(/\s+/g, '_')
          pmSettings[key] = `${row.pm}|${row.email}|${row.template}`
        }
      })

      await api.saveSetupStep(5, {
        slack_bot_token: slackToken,
        slack_channel: slackChannel,
        email_tool: emailTool,
        gmail_client_id: gmailClientId,
        gmail_client_secret: gmailClientSecret,
        gmail_refresh_token: gmailRefreshToken,
        outlook_client_id: outlookClientId,
        outlook_client_secret: outlookClientSecret,
        outlook_refresh_token: outlookRefreshToken,
        outlook_tenant_id: outlookTenantId,
        ...pmSettings,
      })
      await api.completeSetup()
      onComplete()
      navigate('/')
    } catch (e: unknown) {
      alert('Failed to complete setup: ' + String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center px-4 py-12">
      <div className="mb-10 text-center">
        <div className="text-5xl mb-3">🤝</div>
        <h1 className="text-3xl font-bold text-gray-900">Deal Handoff Agent</h1>
        <p className="text-gray-500 mt-2">Let's get you set up in 5 minutes.</p>
      </div>

      {/* ── Step 1: Gemini ───────────────────────────────────────────────── */}
      {step === 1 && (
        <SetupStep
          stepNumber={1} totalSteps={TOTAL_STEPS}
          title="Connect AI (Gemini)"
          description="The agent uses Gemini to write project names, assign PMs, and draft welcome emails."
          onNext={() => saveAndNext({ gemini_api_key: geminiKey })}
          loading={loading}
        >
          <Field label="Gemini API Key" id="gemini" value={geminiKey} onChange={setGeminiKey}
            type="password" placeholder="AIza…"
            hint="Get your key at aistudio.google.com" />
          <div className="flex items-center gap-3">
            <TestButton tool="gemini" onResult={(ok, msg) => setTestResult({ ok, msg: msg } as never)} />
            {testResult && (
              <span className={`text-sm ${testResult.ok ? 'text-green-600' : 'text-red-600'}`}>
                {testResult.ok ? '✓' : '✗'} {testResult.message}
              </span>
            )}
          </div>
        </SetupStep>
      )}

      {/* ── Step 2: CRM ─────────────────────────────────────────────────── */}
      {step === 2 && (
        <SetupStep
          stepNumber={2} totalSteps={TOTAL_STEPS}
          title="Connect Your CRM"
          description="Choose your CRM and paste your webhook secret. Then copy the URL below into your CRM's webhook settings."
          onBack={() => setStep(1)}
          onNext={() => saveAndNext({
            crm_type: crmType,
            hubspot_webhook_secret: hubspotSecret,
            pipedrive_webhook_token: pipedriveToken,
            zoho_webhook_token: zohoToken,
          })}
          loading={loading}
        >
          <Select label="CRM" id="crm" value={crmType} onChange={setCrmType} options={[
            { value: 'hubspot', label: 'HubSpot' },
            { value: 'pipedrive', label: 'Pipedrive' },
            { value: 'zoho', label: 'Zoho CRM' },
          ]} />
          {crmType === 'hubspot' && (
            <Field label="HubSpot Webhook Secret" id="hs-secret" value={hubspotSecret}
              onChange={setHubspotSecret} type="password" placeholder="Your webhook secret from HubSpot" />
          )}
          {crmType === 'pipedrive' && (
            <Field label="Pipedrive Webhook Token" id="pd-token" value={pipedriveToken}
              onChange={setPipedriveToken} type="password" placeholder="Your Pipedrive token" />
          )}
          {crmType === 'zoho' && (
            <Field label="Zoho Webhook Token" id="z-token" value={zohoToken}
              onChange={setZohoToken} type="password" placeholder="Your Zoho token" />
          )}
          <Field
            label={`Paste this URL into ${crmType.charAt(0).toUpperCase() + crmType.slice(1)}'s webhook settings`}
            id="webhook-url" value={webhookUrl(crmType)} onChange={() => {}}
            readOnly hint="Configure this URL to fire when a deal is marked Closed Won."
          />
        </SetupStep>
      )}

      {/* ── Step 3: PM Tool ──────────────────────────────────────────────── */}
      {step === 3 && (
        <SetupStep
          stepNumber={3} totalSteps={TOTAL_STEPS}
          title="Connect Project Management"
          description="The agent will auto-create a project here when a deal is approved."
          onBack={() => setStep(2)}
          onNext={() => saveAndNext({
            pm_tool: pmTool,
            notion_token: notionToken,
            notion_database_id: notionDbId,
            clickup_api_token: clickupToken,
            clickup_list_id: clickupListId,
            asana_access_token: asanaToken,
            asana_project_id: asanaProjectId,
          })}
          loading={loading}
        >
          <Select label="PM Tool" id="pm-tool" value={pmTool} onChange={setPmTool} options={[
            { value: 'notion', label: 'Notion' },
            { value: 'clickup', label: 'ClickUp' },
            { value: 'asana', label: 'Asana' },
          ]} />
          {pmTool === 'notion' && (
            <>
              <Field label="Notion Integration Token" id="notion-token" value={notionToken}
                onChange={setNotionToken} type="password" placeholder="secret_…" />
              <Field label="Notion Database ID" id="notion-db" value={notionDbId}
                onChange={setNotionDbId} placeholder="32-character database ID from the URL" />
            </>
          )}
          {pmTool === 'clickup' && (
            <>
              <Field label="ClickUp API Token" id="cu-token" value={clickupToken}
                onChange={setClickupToken} type="password" placeholder="pk_…" />
              <Field label="ClickUp List ID" id="cu-list" value={clickupListId}
                onChange={setClickupListId} placeholder="List ID where tasks will be created" />
            </>
          )}
          {pmTool === 'asana' && (
            <>
              <Field label="Asana Personal Access Token" id="asana-token" value={asanaToken}
                onChange={setAsanaToken} type="password" />
              <Field label="Asana Project ID (GID)" id="asana-project" value={asanaProjectId}
                onChange={setAsanaProjectId} placeholder="Project GID from the URL" />
            </>
          )}
          <div className="flex items-center gap-3">
            <TestButton tool={pmTool} onResult={(ok, msg) => setTestResult({ ok, msg: msg } as never)} />
            {testResult && (
              <span className={`text-sm ${testResult.ok ? 'text-green-600' : 'text-red-600'}`}>
                {testResult.ok ? '✓' : '✗'} {testResult.message}
              </span>
            )}
          </div>
        </SetupStep>
      )}

      {/* ── Step 4: Billing ──────────────────────────────────────────────── */}
      {step === 4 && (
        <SetupStep
          stepNumber={4} totalSteps={TOTAL_STEPS}
          title="Connect Billing (Optional)"
          description="The agent creates a DRAFT invoice — never sends it. You review before it goes out."
          onBack={() => setStep(3)}
          onNext={() => saveAndNext({
            billing_tool: billingTool,
            quickbooks_client_id: qbClientId,
            quickbooks_client_secret: qbClientSecret,
            quickbooks_refresh_token: qbRefreshToken,
            quickbooks_company_id: qbCompanyId,
            xero_client_id: xeroClientId,
            xero_client_secret: xeroClientSecret,
            xero_refresh_token: xeroRefreshToken,
            xero_tenant_id: xeroTenantId,
          })}
          loading={loading}
        >
          <Select label="Billing Tool" id="billing-tool" value={billingTool} onChange={setBillingTool} options={[
            { value: 'none', label: 'Skip for now' },
            { value: 'quickbooks', label: 'QuickBooks Online' },
            { value: 'xero', label: 'Xero' },
          ]} />
          {billingTool === 'quickbooks' && (
            <>
              <Field label="Client ID" id="qb-id" value={qbClientId} onChange={setQbClientId} placeholder="QuickBooks OAuth2 client ID" />
              <Field label="Client Secret" id="qb-secret" value={qbClientSecret} onChange={setQbClientSecret} type="password" />
              <Field label="Refresh Token" id="qb-refresh" value={qbRefreshToken} onChange={setQbRefreshToken} type="password" hint="OAuth2 refresh token from your QBO developer app" />
              <Field label="Company ID (Realm ID)" id="qb-company" value={qbCompanyId} onChange={setQbCompanyId} placeholder="Found in your QBO URL" />
            </>
          )}
          {billingTool === 'xero' && (
            <>
              <Field label="Client ID" id="xero-id" value={xeroClientId} onChange={setXeroClientId} />
              <Field label="Client Secret" id="xero-secret" value={xeroClientSecret} onChange={setXeroClientSecret} type="password" />
              <Field label="Refresh Token" id="xero-refresh" value={xeroRefreshToken} onChange={setXeroRefreshToken} type="password" />
              <Field label="Tenant ID" id="xero-tenant" value={xeroTenantId} onChange={setXeroTenantId} hint="Your Xero organisation's tenant ID" />
            </>
          )}
          {billingTool !== 'none' && (
            <div className="flex items-center gap-3">
              <TestButton tool={billingTool} onResult={(ok, msg) => setTestResult({ ok, msg: msg } as never)} />
              {testResult && (
                <span className={`text-sm ${testResult.ok ? 'text-green-600' : 'text-red-600'}`}>
                  {testResult.ok ? '✓' : '✗'} {testResult.message}
                </span>
              )}
            </div>
          )}
        </SetupStep>
      )}

      {/* ── Step 5: Slack + Email + Team ─────────────────────────────────── */}
      {step === 5 && (
        <SetupStep
          stepNumber={5} totalSteps={TOTAL_STEPS}
          title="Slack, Email & Team"
          description="Set up your approval channel, email drafts, and which PM handles each service type."
          onBack={() => setStep(4)}
          onNext={finish}
          nextLabel="Finish Setup →"
          loading={loading}
        >
          <Field label="Slack Bot Token" id="slack-token" value={slackToken} onChange={setSlackToken}
            type="password" placeholder="xoxb-…"
            hint="Create a Slack app at api.slack.com, add chat:write and channels:history scopes." />
          <Field label="Slack Channel" id="slack-channel" value={slackChannel} onChange={setSlackChannel}
            placeholder="new-clients" hint="Channel name without #" />

          <Select label="Welcome Email Tool" id="email-tool" value={emailTool} onChange={setEmailTool} options={[
            { value: 'none', label: 'Skip for now' },
            { value: 'gmail', label: 'Gmail' },
            { value: 'outlook', label: 'Outlook / Microsoft 365' },
          ]} />
          {emailTool === 'gmail' && (
            <>
              <Field label="Gmail Client ID" id="gmail-id" value={gmailClientId} onChange={setGmailClientId} />
              <Field label="Gmail Client Secret" id="gmail-secret" value={gmailClientSecret} onChange={setGmailClientSecret} type="password" />
              <Field label="Gmail Refresh Token" id="gmail-refresh" value={gmailRefreshToken} onChange={setGmailRefreshToken} type="password"
                hint="OAuth2 refresh token with gmail.compose scope." />
            </>
          )}
          {emailTool === 'outlook' && (
            <>
              <Field label="Azure App Client ID" id="ol-id" value={outlookClientId} onChange={setOutlookClientId} />
              <Field label="Client Secret" id="ol-secret" value={outlookClientSecret} onChange={setOutlookClientSecret} type="password" />
              <Field label="Refresh Token" id="ol-refresh" value={outlookRefreshToken} onChange={setOutlookRefreshToken} type="password" />
              <Field label="Tenant ID" id="ol-tenant" value={outlookTenantId} onChange={setOutlookTenantId}
                hint="Use 'common' for multi-tenant apps." />
            </>
          )}
          {emailTool !== 'none' && (
            <div className="flex items-center gap-3">
              <TestButton tool={emailTool} onResult={(ok, msg) => setTestResult({ ok, msg: msg } as never)} />
              {testResult && (
                <span className={`text-sm ${testResult.ok ? 'text-green-600' : 'text-red-600'}`}>
                  {testResult.ok ? '✓' : '✗'} {testResult.message}
                </span>
              )}
            </div>
          )}

          <div className="flex items-center gap-3">
            <TestButton tool="slack" onResult={(ok, msg) => setTestResult({ ok, msg: msg } as never)} />
            {testResult && (
              <span className={`text-sm ${testResult.ok ? 'text-green-600' : 'text-red-600'}`}>
                {testResult.ok ? '✓' : '✗'} {testResult.message}
              </span>
            )}
          </div>

          <PmMappingTable rows={pmRows} onChange={setPmRows} />
        </SetupStep>
      )}
    </div>
  )
}
