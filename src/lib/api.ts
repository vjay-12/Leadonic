import {
  Lead,
  LeadStatus,
  LeadCategory,
  ContactLog,
  LeadsResponse,
  DashboardStats,
  ReportData,
  ImportPreviewResult,
  ImportChunkResult,
  SchoolStage,
  SchoolContact,
  SchoolMeeting,
  School,
  SchoolsResponse,
  AppConfig,
} from '../types'

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
  })

  if (!res.ok) {
    let errorMsg = `Request failed (${res.status})`
    try {
      const data = await res.json()
      if (data && data.error) errorMsg = data.error
    } catch {
      // ignore
    }
    const error: any = new Error(errorMsg)
    error.status = res.status
    throw error
  }

  // Handle empty responses
  if (res.status === 204) return {} as T
  return res.json()
}

export const api = {
  // Auth
  async login(password: string): Promise<{ ok: boolean }> {
    return request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
    })
  },

  async logout(): Promise<{ ok: boolean }> {
    return request('/api/auth/logout', { method: 'POST' })
  },

  async checkAuth(): Promise<{ ok: boolean }> {
    return request('/api/auth/me')
  },

  // App Config
  async getConfig(): Promise<AppConfig> {
    return request('/api/config')
  },

  // Statuses
  async getStatuses(): Promise<LeadStatus[]> {
    return request('/api/lead-statuses')
  },

  async createStatus(data: { name: string; color: string }): Promise<LeadStatus> {
    return request('/api/lead-statuses', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async updateStatus(id: number, data: { name?: string; color?: string }): Promise<LeadStatus> {
    return request(`/api/lead-statuses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  async deleteStatus(id: number): Promise<{ ok: boolean }> {
    return request(`/api/lead-statuses/${id}`, { method: 'DELETE' })
  },

  async reorderStatuses(ids: number[]): Promise<{ ok: boolean }> {
    return request('/api/lead-statuses/reorder', {
      method: 'PUT',
      body: JSON.stringify({ ids }),
    })
  },

  // Categories
  async getCategories(): Promise<LeadCategory[]> {
    return request('/api/lead-categories')
  },

  async createCategory(data: { name: string }): Promise<LeadCategory> {
    return request('/api/lead-categories', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async updateCategory(id: number, data: { name: string }): Promise<LeadCategory> {
    return request(`/api/lead-categories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  async deleteCategory(id: number): Promise<{ ok: boolean }> {
    return request(`/api/lead-categories/${id}`, { method: 'DELETE' })
  },

  async reorderCategories(ids: number[]): Promise<{ ok: boolean }> {
    return request('/api/lead-categories/reorder', {
      method: 'PUT',
      body: JSON.stringify({ ids }),
    })
  },

  // Leads
  async getLeads(params: {
    search?: string
    statusId?: string
    categoryId?: string
    priority?: string
    archived?: 'active' | 'archived'
    page?: number
    pageSize?: number
    sort?: string
  }): Promise<LeadsResponse> {
    const q = new URLSearchParams()
    if (params.search) q.set('search', params.search)
    if (params.statusId) q.set('statusId', params.statusId)
    if (params.categoryId) q.set('categoryId', params.categoryId)
    if (params.priority) q.set('priority', params.priority)
    if (params.archived) q.set('archived', params.archived)
    if (params.page) q.set('page', String(params.page))
    if (params.pageSize) q.set('pageSize', String(params.pageSize))
    if (params.sort) q.set('sort', params.sort)

    return request(`/api/leads?${q.toString()}`)
  },

  async getLead(id: number): Promise<Lead> {
    return request(`/api/leads/${id}`)
  },

  async createLead(data: Partial<Lead>): Promise<Lead> {
    return request('/api/leads', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async updateLead(id: number, data: Partial<Lead>): Promise<Lead> {
    return request(`/api/leads/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  async archiveLead(id: number): Promise<Lead> {
    return request(`/api/leads/${id}/archive`, {
      method: 'POST',
    })
  },

  async restoreLead(id: number): Promise<Lead> {
    return request(`/api/leads/${id}/restore`, {
      method: 'POST',
    })
  },

  async deleteLead(id: number): Promise<{ ok: boolean; id?: number }> {
    return request(`/api/leads/${id}`, { method: 'DELETE' })
  },

  // Contact logs
  async getLeadContacts(leadId: number): Promise<ContactLog[]> {
    return request(`/api/leads/${leadId}/contacts`)
  },

  async createLeadContact(
    leadId: number,
    data: { contactDate: string; statusId: number; notes?: string | null }
  ): Promise<ContactLog> {
    return request(`/api/leads/${leadId}/contacts`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async updateContact(
    contactId: number,
    data: { contactDate?: string; statusId?: number; notes?: string | null }
  ): Promise<ContactLog> {
    return request(`/api/contacts/${contactId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  async deleteContact(contactId: number): Promise<{ ok: boolean; id: number }> {
    return request(`/api/contacts/${contactId}`, {
      method: 'DELETE',
    })
  },

  // Import
  async importDryRun(data: {
    fileName: string
    categoryId: number
    rows: any[]
  }): Promise<ImportPreviewResult> {
    return request('/api/leads/import', {
      method: 'POST',
      body: JSON.stringify({ ...data, dryRun: true }),
    })
  },

  async importChunk(data: {
    fileName: string
    categoryId: number
    batchId?: number | null
    rows: any[]
  }): Promise<ImportChunkResult> {
    return request('/api/leads/import', {
      method: 'POST',
      body: JSON.stringify({ ...data, dryRun: false }),
    })
  },

  // Dashboard & Report
  async getDashboard(): Promise<DashboardStats> {
    return request('/api/dashboard')
  },

  async getReport(params?: { categoryId?: string; from?: string; to?: string }): Promise<ReportData> {
    const q = new URLSearchParams()
    if (params?.categoryId) q.set('categoryId', params.categoryId)
    if (params?.from) q.set('from', params.from)
    if (params?.to) q.set('to', params.to)
    return request(`/api/report?${q.toString()}`)
  },

  // School Stages
  async getSchoolStages(): Promise<SchoolStage[]> {
    return request('/api/school-stages')
  },

  async createSchoolStage(data: { name: string; color: string }): Promise<SchoolStage> {
    return request('/api/school-stages', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async updateSchoolStage(id: number, data: { name?: string; color?: string }): Promise<SchoolStage> {
    return request(`/api/school-stages/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  async deleteSchoolStage(id: number): Promise<{ ok: boolean }> {
    return request(`/api/school-stages/${id}`, { method: 'DELETE' })
  },

  async reorderSchoolStages(ids: number[]): Promise<{ ok: boolean }> {
    return request('/api/school-stages/reorder', {
      method: 'PUT',
      body: JSON.stringify({ ids }),
    })
  },

  // Schools
  async getSchools(params?: {
    search?: string
    stageId?: string
    area?: string
    archived?: 'active' | 'archived'
    page?: number
    pageSize?: number
  }): Promise<SchoolsResponse> {
    const q = new URLSearchParams()
    if (params?.search) q.set('search', params.search)
    if (params?.stageId) q.set('stageId', params.stageId)
    if (params?.area) q.set('area', params.area)
    if (params?.archived) q.set('archived', params.archived)
    if (params?.page) q.set('page', String(params.page))
    if (params?.pageSize) q.set('pageSize', String(params.pageSize))
    return request(`/api/schools?${q.toString()}`)
  },

  async getSchoolAreas(): Promise<string[]> {
    return request('/api/schools/areas')
  },

  async getSchool(id: number): Promise<School> {
    return request(`/api/schools/${id}`)
  },

  async createSchool(
    data: any
  ): Promise<School> {
    return request('/api/schools', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async updateSchool(id: number, data: Partial<School>): Promise<School> {
    return request(`/api/schools/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  async archiveSchool(id: number): Promise<School> {
    return request(`/api/schools/${id}/archive`, { method: 'POST' })
  },

  async restoreSchool(id: number): Promise<School> {
    return request(`/api/schools/${id}/restore`, { method: 'POST' })
  },

  async deleteSchool(
    id: number
  ): Promise<{ ok: boolean; deletedContactsCount?: number; deletedMeetingsCount?: number }> {
    return request(`/api/schools/${id}`, { method: 'DELETE' })
  },

  // School Contacts
  async getSchoolContacts(schoolId: number): Promise<SchoolContact[]> {
    return request(`/api/schools/${schoolId}/contacts`)
  },

  async createSchoolContact(schoolId: number, data: Partial<SchoolContact>): Promise<SchoolContact> {
    return request(`/api/schools/${schoolId}/contacts`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async updateSchoolContact(id: number, data: Partial<SchoolContact>): Promise<SchoolContact> {
    return request(`/api/school-contacts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  async deleteSchoolContact(id: number): Promise<{ ok: boolean }> {
    return request(`/api/school-contacts/${id}`, { method: 'DELETE' })
  },

  // School Meetings
  async getSchoolMeetings(schoolId: number): Promise<SchoolMeeting[]> {
    return request(`/api/schools/${schoolId}/meetings`)
  },

  async createSchoolMeeting(
    schoolId: number,
    data: {
      meetingDate: string
      meetingTime?: string | null
      type: string
      locationName?: string | null
      contactId?: number | null
      stageId: number
      notes?: string | null
    }
  ): Promise<SchoolMeeting> {
    return request(`/api/schools/${schoolId}/meetings`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async updateSchoolMeeting(id: number, data: Partial<SchoolMeeting>): Promise<SchoolMeeting> {
    return request(`/api/school-meetings/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  async deleteSchoolMeeting(id: number): Promise<{ ok: boolean }> {
    return request(`/api/school-meetings/${id}`, { method: 'DELETE' })
  },

  // Leads Integration
  async moveToSchoolErp(leadId: number): Promise<{ school: School; alreadyExists?: boolean; linked?: boolean }> {
    return request(`/api/leads/${leadId}/move-to-school-erp`, { method: 'POST' })
  },
}
