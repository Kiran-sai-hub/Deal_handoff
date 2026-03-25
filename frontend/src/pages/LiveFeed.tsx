import { useState, useEffect, useRef } from 'react'
import { StatusBadge } from '../components/StatusBadge'
import type { Deal } from '../types'

interface FeedEvent {
  id: number
  timestamp: string
  deal: Deal
  prev_status?: string
}

export default function LiveFeed() {
  const [events, setEvents] = useState<FeedEvent[]>([])
  const [connected, setConnected] = useState(false)
  const prevDeals = useRef<Record<string, Deal>>({})
  const counterRef = useRef(0)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const es = new EventSource('/api/events')

    es.onopen = () => setConnected(true)
    es.onerror = () => setConnected(false)

    es.onmessage = (e) => {
      const deals: Deal[] = JSON.parse(e.data)
      const newEvents: FeedEvent[] = []

      deals.forEach(deal => {
        const prev = prevDeals.current[deal.deal_id]
        if (!prev) {
          newEvents.push({
            id: ++counterRef.current,
            timestamp: new Date().toISOString(),
            deal,
          })
        } else if (prev.status !== deal.status) {
          newEvents.push({
            id: ++counterRef.current,
            timestamp: new Date().toISOString(),
            deal,
            prev_status: prev.status,
          })
        }
        prevDeals.current[deal.deal_id] = deal
      })

      if (newEvents.length > 0) {
        setEvents(prev => [...prev, ...newEvents].slice(-100))
      }
    }

    return () => es.close()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [events])

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Live Feed</h1>
          <p className="text-gray-500 text-sm mt-1">Real-time deal status updates via SSE</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
          <span className="text-sm text-gray-500">{connected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </div>

      <div className="bg-gray-900 rounded-xl overflow-hidden h-[600px] flex flex-col">
        <div className="px-4 py-2 border-b border-gray-700 flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="ml-2 text-gray-400 text-xs font-mono">deal-handoff-agent — live</span>
        </div>
        <div className="flex-1 overflow-y-auto p-4 font-mono text-sm space-y-1">
          {events.length === 0 && (
            <p className="text-gray-500">Waiting for deal events… Trigger a deal via webhook to see activity here.</p>
          )}
          {events.map(ev => (
            <div key={ev.id} className="flex items-start gap-3">
              <span className="text-gray-600 flex-shrink-0">
                {new Date(ev.timestamp).toLocaleTimeString()}
              </span>
              <span className="text-green-400">→</span>
              <span className="text-gray-200">
                {ev.deal.client_name}
                {ev.prev_status && (
                  <span className="text-gray-500"> [{ev.prev_status} → {ev.deal.status}]</span>
                )}
                {!ev.prev_status && (
                  <span className="text-gray-500"> [new deal]</span>
                )}
              </span>
              <StatusBadge status={ev.deal.status} />
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  )
}
