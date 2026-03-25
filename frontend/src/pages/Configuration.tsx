import { useState, useEffect } from 'react'
import { api } from '../api'
import type { ConfigState } from '../types'

function Dot({ on }: { on: boolean }) {
  return (
    <span className={`inline-block w-2 h-2 rounded-full mr-2 ${on ? 'bg-green-500' : 'bg-gray-300'}`} />
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
      <h2 className="font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-100">{title}</h2>
      {children}
    </div>
  )
}

export default function Configuration() {
  const [config, setConfig] = useState<ConfigState | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => { api.getConfig().then(setConfig) }, [])

  const connected = config?._connected as ConfigState['_connected'] | undefined

  const save = async () => {
    setSaving(true)
    try {
      await api.updateConfig(form)
      const updated = await api.getConfig()
      setConfig(updated)
      setEditMode(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  if (!config) return <div className="p-12 text-center text-gray-400">Loading configuration…</div>

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configuration</h1>
          <p className="text-gray-500 text-sm mt-1">View and update your integrations</p>
        </div>
        <div className="flex items-center gap-3">
          {saved && <span className="text-green-600 text-sm font-medium">Saved ✓</span>}
          <button
            onClick={() => editMode ? save() : setEditMode(true)}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            {editMode ? (saving ? 'Saving…' : 'Save Changes') : 'Edit'}
          </button>
          {editMode && (
            <button onClick={() => setEditMode(false)} className="text-gray-500 text-sm hover:text-gray-700">
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Status overview */}
      <Section title="Integration Status">
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Gemini AI', on: connected?.gemini ?? false },
            { label: 'Slack', on: connected?.slack ?? false },
            { label: `PM Tool (${connected?.pm_tool ?? 'none'})`, on: connected?.pm ?? false },
            { label: `Billing (${connected?.billing_tool ?? 'none'})`, on: connected?.billing ?? false },
            { label: `Email (${connected?.email_tool ?? 'none'})`, on: connected?.email ?? false },
          ].map(({ label, on }) => (
            <div key={label} className="flex items-center text-sm text-gray-700">
              <Dot on={on} /> {label}
            </div>
          ))}
        </div>
      </Section>

      {/* Edit mode shows input fields */}
      {editMode && (
        <Section title="Update Settings">
          <p className="text-sm text-gray-500 mb-4">
            Enter new values to update. Leave fields blank to keep existing values. Tokens are never displayed for security.
          </p>
          {[
            { label: 'Slack Bot Token', key: 'slack_bot_token', type: 'password' },
            { label: 'Slack Channel', key: 'slack_channel', type: 'text' },
            { label: 'Notion Token', key: 'notion_token', type: 'password' },
            { label: 'Notion Database ID', key: 'notion_database_id', type: 'text' },
            { label: 'ClickUp API Token', key: 'clickup_api_token', type: 'password' },
            { label: 'ClickUp List ID', key: 'clickup_list_id', type: 'text' },
            { label: 'Asana Token', key: 'asana_access_token', type: 'password' },
            { label: 'QuickBooks Client ID', key: 'quickbooks_client_id', type: 'text' },
            { label: 'QuickBooks Refresh Token', key: 'quickbooks_refresh_token', type: 'password' },
            { label: 'Gmail Client ID', key: 'gmail_client_id', type: 'text' },
            { label: 'Gmail Refresh Token', key: 'gmail_refresh_token', type: 'password' },
          ].map(({ label, key, type }) => (
            <div key={key} className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <input
                type={type}
                placeholder="Leave blank to keep existing value"
                value={form[key] ?? ''}
                onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ))}
        </Section>
      )}

      {/* Read-only view */}
      {!editMode && (
        <>
          <Section title="Active Settings">
            <dl className="divide-y divide-gray-100">
              {Object.entries(config)
                .filter(([k]) => k !== '_connected' && !k.startsWith('pm_mapping_'))
                .map(([k, v]) => (
                  <div key={k} className="flex gap-4 py-2">
                    <dt className="w-52 flex-shrink-0 text-sm font-mono text-gray-500">{k}</dt>
                    <dd className="text-sm text-gray-700 truncate max-w-xs">{String(v)}</dd>
                  </div>
                ))}
            </dl>
          </Section>

          <Section title="PM Assignments">
            <dl className="divide-y divide-gray-100">
              {Object.entries(config)
                .filter(([k]) => k.startsWith('pm_mapping_'))
                .map(([k, v]) => (
                  <div key={k} className="flex gap-4 py-2">
                    <dt className="w-52 flex-shrink-0 text-sm font-mono text-gray-500">
                      {k.replace('pm_mapping_', '').replace(/_/g, ' ')}
                    </dt>
                    <dd className="text-sm text-gray-700">{String(v)}</dd>
                  </div>
                ))}
              {!Object.keys(config).some(k => k.startsWith('pm_mapping_')) && (
                <p className="text-sm text-gray-400 py-2">No PM mappings configured yet.</p>
              )}
            </dl>
          </Section>
        </>
      )}
    </div>
  )
}
