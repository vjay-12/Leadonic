import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { useToast } from '../../context/ToastContext'
import { Lead } from '../../types'
import { AddLeadModal } from './AddLeadModal'
import { LeadSidePanel } from './LeadSidePanel'
import { ImportWizardDialog } from './ImportWizardDialog'
import {
  Search,
  Plus,
  Upload,
  Download,
  Phone,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ExternalLink,
  ChevronDown,
} from 'lucide-react'

export const LeadsView: React.FC = () => {
  const queryClient = useQueryClient()
  const { success, error: toastError } = useToast()

  // Filter state
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 50

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false)

  // Fetch Statuses & Categories
  const { data: statuses = [] } = useQuery({
    queryKey: ['statuses'],
    queryFn: () => api.getStatuses(),
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.getCategories(),
  })

  // Fetch Leads
  const {
    data: leadsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['leads', { search, statusFilter, categoryFilter, priorityFilter, page }],
    queryFn: () =>
      api.getLeads({
        search,
        statusId: statusFilter,
        categoryId: categoryFilter,
        priority: priorityFilter,
        page,
        pageSize,
        sort: 'createdAt:desc',
      }),
  })

  // Optimistic update for inline lead changes (status, category, remarks)
  const updateLeadMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Lead> }) => api.updateLead(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['leads'] })
      const queryKey = ['leads', { search, statusFilter, categoryFilter, priorityFilter, page }]
      const previous = queryClient.getQueryData(queryKey)

      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return old
        return {
          ...old,
          items: old.items.map((lead: Lead) => {
            if (lead.id === id) {
              const updatedStatus = data.statusId !== undefined
                ? statuses.find((s) => s.id === data.statusId) || null
                : lead.status
              const updatedCategory = data.categoryId !== undefined
                ? categories.find((c) => c.id === data.categoryId) || null
                : lead.category
              return {
                ...lead,
                ...data,
                status: updatedStatus,
                category: updatedCategory,
              }
            }
            return lead
          }),
        }
      })

      return { previous, queryKey }
    },
    onError: (err: any, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(context.queryKey, context.previous)
      }
      toastError(err.message || 'Failed to update lead')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['statuses'] })
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      success('Saved')
    },
  })

  const handleStatusChange = (leadId: number, newStatusId: number | null) => {
    updateLeadMutation.mutate({
      id: leadId,
      data: { statusId: newStatusId },
    })
  }

  const handleCategoryChange = (leadId: number, newCategoryId: number | null) => {
    updateLeadMutation.mutate({
      id: leadId,
      data: { categoryId: newCategoryId },
    })
  }

  const handleRemarksBlur = (leadId: number, original: string | null, current: string) => {
    if ((original || '').trim() !== current.trim()) {
      updateLeadMutation.mutate({
        id: leadId,
        data: { remarks: current.trim() || null },
      })
    }
  }

  const handleExportCsv = () => {
    const q = new URLSearchParams()
    if (search) q.set('search', search)
    if (statusFilter) q.set('statusId', statusFilter)
    if (categoryFilter) q.set('categoryId', categoryFilter)
    if (priorityFilter) q.set('priority', priorityFilter)
    window.location.href = `/api/leads/export.csv?${q.toString()}`
  }

  const leads = leadsData?.items || []
  const total = leadsData?.total || 0
  const totalPages = Math.ceil(total / pageSize) || 1

  return (
    <div className="space-y-4">
      {/* Header and Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Leads</h1>
          <p className="text-sm text-slate-500">Manage and track cold calling prospects</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-semibold transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Lead</span>
          </button>

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-md text-sm font-medium transition-colors cursor-pointer shadow-xs"
          >
            <Upload className="w-4 h-4 text-slate-500" />
            <span>Import</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-md text-sm font-medium transition-colors cursor-pointer shadow-xs"
            title="Export filtered leads to CSV"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Toolbar: Search & Filters */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs flex flex-wrap items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by title, phone, address, or email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-md text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
          />
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value)
            setPage(1)
          }}
          className="px-3 py-1.5 bg-white border border-slate-300 rounded-md text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
        >
          <option value="">All Statuses</option>
          <option value="none">Not called (No status)</option>
          {statuses.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        {/* Category Filter */}
        <select
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value)
            setPage(1)
          }}
          className="px-3 py-1.5 bg-white border border-slate-300 rounded-md text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {/* Priority Filter */}
        <select
          value={priorityFilter}
          onChange={(e) => {
            setPriorityFilter(e.target.value)
            setPage(1)
          }}
          className="px-3 py-1.5 bg-white border border-slate-300 rounded-md text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
        >
          <option value="">All Priorities</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>

        {/* Clear Filters button */}
        {(searchInput || statusFilter || categoryFilter || priorityFilter) && (
          <button
            onClick={() => {
              setSearchInput('')
              setSearch('')
              setStatusFilter('')
              setCategoryFilter('')
              setPriorityFilter('')
              setPage(1)
            }}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 px-2 py-1.5"
          >
            Reset
          </button>
        )}
      </div>

      {/* Main Leads Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden flex flex-col">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
            <span>Loading leads...</span>
          </div>
        ) : isError ? (
          <div className="p-8 text-center max-w-sm mx-auto">
            <p className="text-sm font-semibold text-rose-700 mb-2">Error loading leads</p>
            <p className="text-xs text-slate-500 mb-3">{(error as any)?.message}</p>
            <button
              onClick={() => refetch()}
              className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium"
            >
              Retry
            </button>
          </div>
        ) : leads.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-base font-semibold text-slate-900 mb-1">No leads found</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
              {search || statusFilter || categoryFilter || priorityFilter
                ? 'Try adjusting your search criteria or filters.'
                : 'Import a spreadsheet or add your first lead to get started.'}
            </p>
            <div className="flex justify-center gap-2">
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded"
              >
                Add Lead
              </button>
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded hover:bg-slate-200"
              >
                Import Excel
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-600 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-600 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-600 uppercase tracking-wider min-w-[170px]">
                    Status
                  </th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-600 uppercase tracking-wider min-w-[200px]">
                    Remarks
                  </th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-600 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-600 uppercase tracking-wider">
                    Rating
                  </th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-600 uppercase tracking-wider">
                    Website
                  </th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-600 uppercase tracking-wider">
                    Address
                  </th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-600 uppercase tracking-wider">
                    Emails
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {leads.map((lead) => {
                  const currentStatus = lead.status
                  const statusBg = currentStatus ? currentStatus.color : '#94A3B8'

                  return (
                    <tr
                      key={lead.id}
                      onClick={() => {
                        setSelectedLead(lead)
                        setIsSidePanelOpen(true)
                      }}
                      className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                    >
                      {/* Title */}
                      <td className="px-4 py-2.5 font-semibold text-slate-900 max-w-[200px] truncate">
                        {lead.title}
                      </td>

                      {/* Phone */}
                      <td
                        className="px-3 py-2.5 whitespace-nowrap text-slate-600"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {lead.phone ? (
                          <a
                            href={`tel:${lead.phone}`}
                            className="inline-flex items-center gap-1 font-mono text-blue-600 hover:text-blue-800 hover:underline"
                            title={`Call ${lead.phone}`}
                          >
                            <Phone className="w-3 h-3 text-blue-500" />
                            <span>{lead.phone}</span>
                          </a>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Category (inline select dropdown) */}
                      <td
                        className="px-3 py-2.5 whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <select
                          value={lead.categoryId || ''}
                          onChange={(e) => {
                            const val = e.target.value ? Number(e.target.value) : null
                            handleCategoryChange(lead.id, val)
                          }}
                          className="px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-600"
                        >
                          <option value="">Unassigned</option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Status (colored pill dropdown) */}
                      <td
                        className="px-3 py-2.5 whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="relative inline-block">
                          <select
                            value={lead.statusId || ''}
                            onChange={(e) => {
                              const val = e.target.value ? Number(e.target.value) : null
                              handleStatusChange(lead.id, val)
                            }}
                            style={{
                              backgroundColor: `${statusBg}15`,
                              borderColor: `${statusBg}40`,
                              color: statusBg,
                            }}
                            className="appearance-none font-semibold text-xs rounded-full pl-3 pr-7 py-1 border transition-colors cursor-pointer focus:outline-none focus:ring-1"
                          >
                            <option value="" className="text-slate-700 bg-white">
                              Not called
                            </option>
                            {statuses.map((s) => (
                              <option key={s.id} value={s.id} className="text-slate-700 bg-white">
                                {s.name}
                              </option>
                            ))}
                          </select>
                          <ChevronDown
                            className="w-3 h-3 absolute right-2.5 top-2 pointer-events-none"
                            style={{ color: statusBg }}
                          />
                        </div>
                      </td>

                      {/* Remarks (click to edit, saves on blur) */}
                      <td
                        className="px-3 py-2.5 max-w-[240px]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="text"
                          defaultValue={lead.remarks || ''}
                          placeholder="Click to add remarks..."
                          onBlur={(e) => handleRemarksBlur(lead.id, lead.remarks, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              (e.target as HTMLInputElement).blur()
                            }
                          }}
                          className="w-full px-2 py-1 text-xs text-slate-700 bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-300 focus:border-blue-500 rounded truncate transition-colors"
                        />
                      </td>

                      {/* Priority */}
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {lead.priority ? (
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                              lead.priority.toLowerCase() === 'high'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : lead.priority.toLowerCase() === 'medium'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {lead.priority}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Rating */}
                      <td className="px-3 py-2.5 whitespace-nowrap text-slate-600 font-mono">
                        {lead.reviewRating != null ? String(lead.reviewRating) : '-'}
                      </td>

                      {/* Website */}
                      <td
                        className="px-3 py-2.5 whitespace-nowrap text-slate-600"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {lead.website ? (
                          <a
                            href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800"
                            title={lead.website}
                          >
                            <span>Link</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Address */}
                      <td className="px-3 py-2.5 text-slate-600 max-w-[180px] truncate">
                        {lead.address || '-'}
                      </td>

                      {/* Emails */}
                      <td className="px-3 py-2.5 text-slate-600 max-w-[150px] truncate font-mono">
                        {lead.emails || '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div>
            Showing <span className="font-semibold text-slate-900">{total === 0 ? 0 : (page - 1) * pageSize + 1}</span> to{' '}
            <span className="font-semibold text-slate-900">{Math.min(page * pageSize, total)}</span> of{' '}
            <span className="font-semibold text-slate-900">{total}</span> leads
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-medium">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Add Lead Modal */}
      <AddLeadModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        statuses={statuses}
        categories={categories}
      />

      {/* Import Spreadsheet Wizard Dialog */}
      <ImportWizardDialog
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        categories={categories}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['leads'] })
          queryClient.invalidateQueries({ queryKey: ['dashboard'] })
        }}
      />

      {/* Slide-in Details Panel */}
      <LeadSidePanel
        lead={selectedLead}
        isOpen={isSidePanelOpen}
        onClose={() => {
          setIsSidePanelOpen(false)
          setSelectedLead(null)
        }}
        statuses={statuses}
        categories={categories}
      />
    </div>
  )
}
