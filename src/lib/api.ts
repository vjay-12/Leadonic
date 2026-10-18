import {
  Lead,
  LeadStatus,
  LeadCategory,
  LeadsResponse,
  DashboardStats,
  ReportData,
  ImportPreviewResult,
  ImportChunkResult,
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
}
