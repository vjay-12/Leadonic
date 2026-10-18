export type LeadStatus = 'New' | 'Contacted' | 'Interested' | 'Lost'

export type CallOutcome =
  | 'No answer'
  | 'Callback'
  | 'Interested'
  | 'Not interested'
  | 'Wrong number'
  | 'Do not call'

export interface Lead {
  id: string
  name: string
  phone: string // Normalized (e.g., +919876543210)
  rawPhone?: string
  address: string
  category: string
  website?: string
  rating: number // 1.0 to 5.0
  reviews: number
  area: string
  batchId?: string
  status: LeadStatus
  score: number
  doNotCall: boolean
  nextFollowup: string | null // ISO Date string
  lastCalledAt: string | null // ISO Date string
  callCount: number
  createdAt: string // ISO Date string
  notes?: string
}

export interface CallLog {
  id: string
  leadId: string
  outcome: CallOutcome
  notes: string
  calledAt: string // ISO Date string
  followupDate?: string | null
}

export interface Task {
  id: string
  leadId: string
  title: string
  dueDate: string // ISO Date string
  done: boolean
  createdAt: string
  leadName?: string
  leadPhone?: string
  leadArea?: string
}

export type TemplateType = 'script' | 'whatsapp' | 'email'

export interface Template {
  id: string
  type: TemplateType
  name: string
  body: string // contains {business_name} and {area}
  isDefault?: boolean
}

export interface ImportBatch {
  id: string
  fileName: string
  area: string
  date: string // ISO Date string
  added: number
  skipped: number
  errors: number
  leadsCount: number
}

export type ActivityType = 'call' | 'note' | 'status' | 'task' | 'message' | 'import'

export interface ActivityEvent {
  id: string
  leadId: string
  type: ActivityType
  text: string
  at: string // ISO Date string
  meta?: Record<string, any>
}

export interface ScoringRules {
  ratingThreshold: number // default 4.0
  ratingPoints: number // default +2
  websitePoints: number // default +1
  targetCategories: string[]
  categoryPoints: number // default +2
  previouslyInterestedPoints: number // default +3
  noAnswerPenaltyThreshold: number // default 3
  noAnswerPenaltyPoints: number // default -2
}

export interface FilterOptions {
  search: string
  status: string
  area: string
  category: string
  batchId: string
  minScore: number | null
  doNotCallOnly: boolean
}
