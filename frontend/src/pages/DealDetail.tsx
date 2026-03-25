import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { StatusBadge } from '../components/StatusBadge'
import type { Deal, DealSnapshot } from '../types'

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-4 py-3 border-b border-gray-100 last:border-0">
      <dt className="w-44 flex-shrink-0 text-sm font-medium text-gray-500">{label}</dt>
      <dd className="text-sm text-gray-900 flex-1">{value ?? <span className="text-gray-400">—</span>}</dd>
    </div>
  )
}

export default function DealDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [deal, setDeal] = useState<Deal | null>(null)
  const [snapshot, setSnapshot] = useState<DealSnapshot | null>(null)
  const [retrying, setRetrying] = useState(false)

  useEffect(() => {
    if (!id) return
    api.getDeal(id).then(d => {
      setDeal(d)
      if (d.deal_snapshot) {
        try { setSnapshot(JSON.parse(d.deal_snapshot)) } catch { /* ignore */ }
      }
    })
  }, [id])

  const retry = async () => {
    if (!id) return
    setRetrying(true)
    try {
      await api.retryDeal(id)
      const updated = await api.getDeal(id)
      setDeal(updated)
    } finally {
      setRetrying(false)
    }
  }

  if (!deal) {
    return <div className="p-12 text-center text-gray-400">Loading…</div>
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <button onClick={() => navigate(-1)} className="text-sm text-gray-500 hover:text-gray-700 mb-6 flex items-center gap-1">
        ← Back
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{deal.client_name}</h1>
          <p className="text-gray-500 text-sm mt-1">{deal.service_type} · ${deal.deal_value.toLocaleString()}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={deal.status} />
          {(deal.status === 'failed' || deal.status === 'rejected') && (
            <button
              onClick={retry}
              disabled={retrying}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              {retrying ? 'Retrying…' : 'Retry'}
            </button>
          )}
        </div>
      </div>

      {deal.error_details && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm font-medium text-red-800 mb-1">Errors</p>
          <p className="text-sm text-red-700">{deal.error_details}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Action Results */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Action Results</h2>
          <dl>
            <Row label="Project" value={
              deal.project_url
                ? <a href={deal.project_url} target="_blank" rel="noreferrer" className="text-blue-600 underline">Open project ↗</a>
                : deal.project_id
                ? `Created (ID: ${deal.project_id})`
                : null
            } />
            <Row label="Invoice Draft" value={deal.invoice_id ? `#${deal.invoice_id}` : null} />
            <Row label="Email Draft" value={deal.email_draft_id ? `Ready — check your drafts folder` : null} />
            <Row label="Slack Message" value={deal.slack_ts ? `Posted (${deal.slack_ts})` : null} />
          </dl>
        </div>

        {/* Status Timeline */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Timeline</h2>
          <dl>
            <Row label="Created" value={new Date(deal.created_at).toLocaleString()} />
            <Row label="Last Updated" value={new Date(deal.updated_at).toLocaleString()} />
            <Row label="Assigned PM" value={deal.pm_name} />
          </dl>
        </div>
      </div>

      {/* Deal Snapshot */}
      {snapshot && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Deal Details</h2>
          <dl>
            <Row label="Contact" value={`${snapshot.contact_name} (${snapshot.contact_email})`} />
            <Row label="Sales Rep" value={snapshot.sales_rep} />
            <Row label="Billing Type" value={snapshot.billing_type} />
            <Row label="Closed Date" value={snapshot.closed_date} />
            <Row label="Project Name" value={snapshot.project_name} />
            <Row label="Template" value={snapshot.project_template} />
            <Row label="PM Email" value={snapshot.pm_email} />
          </dl>
          {snapshot.sales_notes && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm font-medium text-gray-500 mb-2">Sales Notes</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{snapshot.sales_notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Welcome Email Preview */}
      {snapshot?.welcome_email_subject && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Welcome Email Draft</h2>
          <p className="text-sm text-gray-500 mb-1">Subject</p>
          <p className="text-sm font-medium text-gray-900 mb-4">{snapshot.welcome_email_subject}</p>
          <p className="text-sm text-gray-500 mb-1">Body</p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{snapshot.welcome_email_body}</p>
        </div>
      )}
    </div>
  )
}
