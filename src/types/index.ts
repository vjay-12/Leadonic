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
  school?: { id: number; name: string } | null
  createdAt: string
  updatedAt: string
  status?: LeadStatus | null
  category?: LeadCategory | null
  batch?: { id: number; fileName: string; createdAt: string } | null
}

export interface SchoolStage {
  id: number
  name: string
  color: string
  sortOrder: number
  createdAt: string
  schoolCount: number
  meetingCount?: number
}

export interface SchoolContact {
  id: number
  schoolId: number
  name: string
  role: string | null
  phone: string | null
  email: string | null
  notes: string | null
  isPrimary: boolean
  createdAt: string
  updatedAt: string
}

export interface SchoolMeeting {
  id: number
  schoolId: number
  meetingDate: string
  meetingTime: string | null
  type: 'Call' | 'Visit' | 'Demo' | 'Follow-up'
  locationName: string | null
  contactId: number | null
  stageId: number
  notes: string | null
  createdAt: string
  updatedAt: string
  stage?: SchoolStage
  contact?: SchoolContact | null
}

export interface School {
  id: number
  name: string
  area: string | null
  address: string | null
  phone: string | null
  email: string | null
  website: string | null
  studentStrength: number | null
  notes: string | null
  stageId: number | null
  leadId: number | null
  dedupeKey: string
  archivedAt: string | null
  createdAt: string
  updatedAt: string
  stage?: SchoolStage | null
  lead?: { id: number; title: string; phone?: string | null } | null
  primaryContact?: { id?: number; name: string; role?: string | null; phone?: string | null } | null
  lastMeetingDate?: string | null
  contacts?: SchoolContact[]
  meetings?: SchoolMeeting[]
}

export interface SchoolsResponse {
  items: School[]
  total: number
  page: number
  pageSize: number
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

export interface ImportRowCheckResult {
  index: number
  check: 'ready' | 'duplicate' | 'duplicate_in_file' | 'error'
  reason?: string
  existingLeadId?: number
  existingTitle?: string
  firstRowIndex?: number
}

export interface ImportPreviewResult {
  willAdd: number
  duplicates: number
  skippedArchivedCount?: number
  errors: { row: number; reason: string }[]
  rows: ImportRowCheckResult[]
}

export interface ImportChunkResult {
  added: number
  skipped: number
  skippedArchivedCount?: number
  errors: { row: number; reason: string }[]
  batchId: number
}

export interface AppConfig {
  deleteEnabled: boolean
}
