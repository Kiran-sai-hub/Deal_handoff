import type { DealStatusValue } from '../types'

const config: Record<DealStatusValue, { label: string; className: string }> = {
  pending_approval: { label: 'Pending Approval', className: 'bg-yellow-100 text-yellow-800' },
  executing:        { label: 'Executing…',        className: 'bg-blue-100 text-blue-800 animate-pulse' },
  approved:         { label: 'Complete',           className: 'bg-green-100 text-green-800' },
  rejected:         { label: 'Rejected',           className: 'bg-gray-100 text-gray-600' },
  failed:           { label: 'Failed',             className: 'bg-red-100 text-red-800' },
}

export function StatusBadge({ status }: { status: DealStatusValue }) {
  const { label, className } = config[status] ?? config.pending_approval
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}
