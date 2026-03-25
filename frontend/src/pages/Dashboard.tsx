import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { StatusBadge } from '../components/StatusBadge'
import type { Deal } from '../types'

function fmt(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  })
}

function fmtValue(v: number) {
  return '$' + v.toLocaleString(undefined, { maximumFractionDigits: 0 })
}

export default function Dashboard() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      const { deals } = await api.listDeals(100)
      setDeals(deals)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 10_000)
    return () => clearInterval(interval)
  }, [])

  const counts = {
    pending: deals.filter(d => d.status === 'pending_approval').length,
    executing: deals.filter(d => d.status === 'executing').length,
    approved: deals.filter(d => d.status === 'approved').length,
    failed: deals.filter(d => d.status === 'failed').length,
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">All deal handoffs — auto-refreshes every 10s</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Pending Approval', value: counts.pending, color: 'yellow' },
          { label: 'Executing', value: counts.executing, color: 'blue' },
          { label: 'Complete', value: counts.approved, color: 'green' },
          { label: 'Failed', value: counts.failed, color: 'red' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500">{label}</p>
            <p className={`text-3xl font-bold mt-1 text-${color}-600`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Loading deals…</div>
        ) : deals.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-gray-500 font-medium">No deals yet</p>
            <p className="text-gray-400 text-sm mt-1">
              Mark a deal "Closed Won" in your CRM or send a test via{' '}
              <code className="bg-gray-100 px-1 rounded text-xs">/webhook/generic</code>
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Client', 'Service', 'Value', 'PM', 'Status', 'Created', 'Links'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {deals.map(deal => (
                <tr key={deal.deal_id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link to={`/deal/${deal.deal_id}`} className="font-medium text-blue-600 hover:text-blue-800">
                      {deal.client_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{deal.service_type}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{fmtValue(deal.deal_value)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{deal.pm_name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={deal.status} />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400">{fmt(deal.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 text-sm">
                      {deal.project_url && (
                        <a href={deal.project_url} target="_blank" rel="noreferrer"
                          className="text-blue-500 hover:text-blue-700 underline">Project</a>
                      )}
                      {deal.invoice_id && (
                        <span className="text-gray-500">Invoice #{deal.invoice_id}</span>
                      )}
                      {deal.email_draft_id && (
                        <span className="text-gray-500">Email ✓</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
