import type { Deal, ConfigState, SetupStatus } from './types'

const BASE = ''

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, options)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${res.status}: ${text}`)
  }
  return res.json()
}

export const api = {
  // Setup
  setupStatus: (): Promise<SetupStatus> =>
    req('/api/setup/status'),

  saveSetupStep: (step: number, settings: Record<string, string>): Promise<{ saved: boolean }> =>
    req(`/api/setup/step/${step}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings }),
    }),

  testTool: (tool: string): Promise<{ ok: boolean; message: string }> =>
    req(`/api/setup/test/${tool}`, { method: 'POST' }),

  completeSetup: (): Promise<{ complete: boolean }> =>
    req('/api/setup/complete', { method: 'POST' }),

  // Deals
  listDeals: (limit = 50): Promise<{ deals: Deal[] }> =>
    req(`/api/deals?limit=${limit}`),

  getDeal: (id: string): Promise<Deal> =>
    req(`/api/deals/${id}`),

  retryDeal: (id: string): Promise<{ status: string }> =>
    req(`/api/deals/${id}/retry`, { method: 'POST' }),

  // Config
  getConfig: (): Promise<ConfigState> =>
    req('/api/config'),

  updateConfig: (settings: Record<string, string>): Promise<{ saved: boolean }> =>
    req('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings }),
    }),
}
