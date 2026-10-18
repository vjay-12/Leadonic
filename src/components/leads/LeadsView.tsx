import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { useToast } from '../../context/ToastContext'
import { Lead } from '../../types'
import { AddLeadModal } from './AddLeadModal'
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
  ChevronDown,
} from 'lucide-react'

export const LeadsView: React.FC = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { success, error: toastError } = useToast()

  // Filter state
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [archivedFilter, setArchivedFilter] = useState<'active' | 'archived'>('active')
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
  const queryFilters = { search, statusFilter, categoryFilter, priorityFilter, archivedFilter, page }
  const {
    data: leadsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['leads', queryFilters],
    queryFn: () =>
      api.getLeads({
        search,
        statusId: statusFilter,
        categoryId: categoryFilter,
        priority: priorityFilter,
        archived: archivedFilter,
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
      const queryKey = ['leads', queryFilters]
      const previous = queryClient.getQueryData(queryKey)

      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return old
        return {
          ...old,
          items: old.items.map((lead: Lead) => {
            if (lead.id === id) {
              const updatedStatus =
                data.statusId !== undefined
                  ? statuses.find((s) => s.id === data.statusId) || null
                  : lead.status
              const updatedCategory =
                data.categoryId !== undefined
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
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['statuses'] })
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      if (updated?.id) {
        queryClient.setQueryData(['lead', updated.id], updated)
      }
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
    q.set('archived', archivedFilter)
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

        {/* Active / Archived Filter */}
        <select
          value={archivedFilter}
          onChange={(e) => {
            setArchivedFilter(e.target.value as 'active' | 'archived')
            setPage(1)
          }}
          className="px-3 py-1.5 bg-white border border-slate-300 rounded-md text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
        >
          <option value="active">Active Leads</option>
          <option value="archived">Archived Leads</option>
        </select>

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
        {(searchInput || statusFilter || categoryFilter || priorityFilter || archivedFilter !== 'active') && (
          <button
            onClick={() => {
              setSearchInput('')
              setSearch('')
              setStatusFilter('')
              setCategoryFilter('')
              setPriorityFilter('')
              setArchivedFilter('active')
              setPage(1)
            }}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 px-2 py-1.5 cursor-pointer"
          >
            Reset
          </button>
        )}
      </div>

      {/* Main Container */}
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
              className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : leads.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-base font-semibold text-slate-900 mb-1">
              {archivedFilter === 'archived' ? 'No archived leads' : 'No leads found'}
            </p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
              {search || statusFilter || categoryFilter || priorityFilter
                ? 'Try adjusting your search criteria or filters.'
                : archivedFilter === 'archived'
                ? 'Archived leads will appear here when you archive them.'
                : 'Import a spreadsheet or add your first lead to get started.'}
            </p>
            {archivedFilter === 'active' && (
              <div className="flex justify-center gap-2">
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded cursor-pointer"
                >
                  Add Lead
                </button>
                <button
                  onClick={() => setIsImportModalOpen(true)}
                  className="px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded hover:bg-slate-200 cursor-pointer"
                >
                  Import Excel
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table (>= 768px): fixed 6 columns, no horizontal scroll at >= 1280px */}
            <div className="hidden md:block w-full">
              <table className="w-full table-fixed divide-y divide-slate-200 text-xs">
                <colgroup>
                  <col className="w-[26%]" />
                  <col className="w-[15%]" />
                  <col className="w-[15%]" />
                  <col className="w-[16%]" />
                  <col className="w-[20%]" />
                  <col className="w-[8%]" />
                </colgroup>
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
                    <th className="px-3 py-3 text-left font-semibold text-slate-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-3 py-3 text-left font-semibold text-slate-600 uppercase tracking-wider">
                      Remarks
                    </th>
                    <th className="px-3 py-3 text-left font-semibold text-slate-600 uppercase tracking-wider">
                      Priority
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
                        tabIndex={0}
                        onClick={() => navigate(`/leads/${lead.id}`)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            navigate(`/leads/${lead.id}`)
                          }
                        }}
                        className="hover:bg-blue-50/40 focus:bg-blue-50/50 cursor-pointer transition-colors outline-none"
                      >
                        {/* 1. Title: single line with ellipsis, full text on hover */}
                        <td className="px-4 py-2.5 font-semibold text-slate-900 truncate" title={lead.title}>
                          <span className="truncate block">{lead.title}</span>
                        </td>

                        {/* 2. Phone: does NOT trigger row click */}
                        <td
                          className="px-3 py-2.5 whitespace-nowrap text-slate-600 font-mono truncate"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {lead.phone ? (
                            <a
                              href={`tel:${lead.phone}`}
                              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline truncate max-w-full"
                              title={`Call ${lead.phone}`}
                            >
                              <Phone className="w-3 h-3 text-blue-500 shrink-0" />
                              <span className="truncate">{lead.phone}</span>
                            </a>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* 3. Category: compact select, does NOT trigger row click */}
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
                            className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-700 truncate focus:outline-none focus:ring-1 focus:ring-blue-600 cursor-pointer"
                          >
                            <option value="">Unassigned</option>
                            {categories.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* 4. Status: compact pill dropdown, does NOT trigger row click */}
                        <td
                          className="px-3 py-2.5 whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="relative inline-block w-full">
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
                              className="w-full appearance-none font-semibold text-xs rounded-full pl-2.5 pr-6 py-0.5 border truncate transition-colors cursor-pointer focus:outline-none focus:ring-1"
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
                              className="w-3 h-3 absolute right-2 top-1.5 pointer-events-none"
                              style={{ color: statusBg }}
                            />
                          </div>
                        </td>

                        {/* 5. Remarks: single line with ellipsis, editable, does NOT trigger row click */}
                        <td
                          className="px-3 py-2.5 truncate"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="text"
                            defaultValue={lead.remarks || ''}
                            title={lead.remarks || ''}
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

                        {/* 6. Priority */}
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          {lead.priority ? (
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                                lead.priority.toLowerCase() === 'high'
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : lead.priority.toLowerCase() === 'medium'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                            >
                              {lead.priority}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards (< 768px): title, phone, status, category, remarks, priority */}
            <div className="md:hidden divide-y divide-slate-200">
              {leads.map((lead) => {
                const currentStatus = lead.status
                const statusBg = currentStatus ? currentStatus.color : '#94A3B8'

                return (
                  <div
                    key={lead.id}
                    tabIndex={0}
                    onClick={() => navigate(`/leads/${lead.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        navigate(`/leads/${lead.id}`)
                      }
                    }}
                    className="p-4 space-y-3 hover:bg-slate-50 focus:bg-slate-50 cursor-pointer transition-colors outline-none"
                  >
                    {/* Header: Title and Priority */}
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-slate-900 text-sm leading-snug truncate" title={lead.title}>
                        {lead.title}
                      </h3>
                      {lead.priority && (
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold shrink-0 border ${
                            lead.priority.toLowerCase() === 'high'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : lead.priority.toLowerCase() === 'medium'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {lead.priority}
                        </span>
                      )}
                    </div>

                    {/* Phone */}
                    <div onClick={(e) => e.stopPropagation()}>
                      {lead.phone ? (
                        <a
                          href={`tel:${lead.phone}`}
                          className="inline-flex items-center gap-1.5 text-xs font-mono font-medium text-blue-600 hover:text-blue-800"
                        >
                          <Phone className="w-3.5 h-3.5 text-blue-500" />
                          <span>{lead.phone}</span>
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400">No phone</span>
                      )}
                    </div>

                    {/* Category & Status Dropdowns */}
                    <div className="grid grid-cols-2 gap-2" onClick={(e) => e.stopPropagation()}>
                      {/* Status */}
                      <div className="relative">
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
                          className="w-full appearance-none font-semibold text-xs rounded-full pl-2.5 pr-6 py-1 border truncate cursor-pointer focus:outline-none focus:ring-1"
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

                      {/* Category */}
                      <div>
                        <select
                          value={lead.categoryId || ''}
                          onChange={(e) => {
                            const val = e.target.value ? Number(e.target.value) : null
                            handleCategoryChange(lead.id, val)
                          }}
                          className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs text-slate-700 truncate focus:outline-none focus:ring-1 focus:ring-blue-600 cursor-pointer"
                        >
                          <option value="">Unassigned</option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Remarks */}
                    <div onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        defaultValue={lead.remarks || ''}
                        title={lead.remarks || ''}
                        placeholder="Add remarks..."
                        onBlur={(e) => handleRemarksBlur(lead.id, lead.remarks, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            (e.target as HTMLInputElement).blur()
                          }
                        }}
                        className="w-full px-2.5 py-1 text-xs text-slate-700 bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 focus:border-blue-500 rounded truncate transition-colors"
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </>
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
    </div>
  )
}
