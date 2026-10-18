export interface LeadStatus {
  id: number
  name: string
  color: string
  sortOrder: number
  createdAt: string
  leadCount: number
}

export interface LeadCategory {
  id: number
  name: string
  sortOrder: number
  createdAt: string
  leadCount: number
}

export interface Lead {
  id: number
  title: string
  phone: string | null
  phoneNormalized: string | null
  dedupeKey: string
  emails: string | null
  website: string | null
  mapsCategory: string | null
  address: string | null
  reviewRating: number | null
  reviewCount: number | null
  hasWebsite: boolean | null
  needsWebsite: boolean | null
  erpMatch: string | null
  needsErp: boolean | null
  priorityScore: number | null
  priority: string | null
  remarks: string | null
  statusId: number | null
  categoryId: number | null
  batchId: number | null
  archivedAt: string | null
  latestNote?: string | null
  lastContactDate?: string | null
  contactLogs?: ContactLog[]
  createdAt: string
  updatedAt: string
  status?: LeadStatus | null
  category?: LeadCategory | null
  batch?: { id: number; fileName: string; createdAt: string } | null
}

export interface ContactLog {
  id: number
  leadId: number
  contactDate: string
  statusId: number
  notes: string | null
  createdAt: string
  updatedAt: string
  status?: LeadStatus | null
  lead?: Lead | null
}

export interface LeadsResponse {
  items: Lead[]
  total: number
  page: number
  pageSize: number
}

export interface DashboardStats {
  total: number
  newThisWeek: number
  notCalled: number
  contactedToday: number
  byStatus: { id: number; name: string; color: string; count: number }[]
  byCategory: { id: number; name: string; count: number }[]
  byPriority: { priority: string; count: number }[]
}

export interface ReportRow {
  categoryId: number | null
  categoryName: string
  counts: Record<string, number>
  total: number
}

export interface ReportData {
  statuses: LeadStatus[]
  rows: ReportRow[]
  totalCounts: Record<string, number>
  grandTotal: number
}

export interface ImportPreviewResult {
  willAdd: number
  duplicates: number
  skippedArchivedCount?: number
  errors: { row: number; reason: string }[]
}

export interface ImportChunkResult {
  added: number
  skipped: number
  skippedArchivedCount?: number
  errors: { row: number; reason: string }[]
  batchId: number
}
