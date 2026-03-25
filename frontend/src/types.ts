export type DealStatusValue =
  | 'pending_approval'
  | 'executing'
  | 'approved'
  | 'rejected'
  | 'failed'

export interface Deal {
  deal_id: string
  client_name: string
  deal_value: number
  service_type: string
  status: DealStatusValue
  created_at: string
  updated_at: string
  pm_name: string | null
  project_url: string | null
  project_id: string | null
  invoice_id: string | null
  email_draft_id: string | null
  slack_ts: string | null
  slack_channel_id: string | null
  error_details: string | null
  deal_snapshot: string | null
}

export interface DealSnapshot {
  deal_id: string
  client_name: string
  contact_name: string
  contact_email: string
  deal_value: number
  service_type: string
  billing_type: string
  sales_rep: string
  sales_notes: string | null
  closed_date: string | null
  assigned_pm: string | null
  pm_email: string | null
  project_template: string | null
  project_name: string | null
  welcome_email_subject: string | null
  welcome_email_body: string | null
}

export interface ConfigState {
  [key: string]: string | object
  _connected: {
    gemini: boolean
    slack: boolean
    pm_tool: string
    pm: boolean
    billing_tool: string
    billing: boolean
    email_tool: string
    email: boolean
  }
}

export interface SetupStatus {
  complete: boolean
}
