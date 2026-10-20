import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { useToast } from '../../context/ToastContext'
import { Lead } from '../../types'
import { AddLeadModal } from './AddLeadModal'
import { ImportWizardDialog } from './ImportWizardDialog'
import { RecordContactDialog } from './RecordContactDialog'
import { StatusPill, useStatusPillWidth } from '../common/StatusPill'
import { SegmentedTabs } from '../common/SegmentedTabs'
import { useDeleteEnabled } from '../../hooks/useAppConfig'
import { formatDateShort } from '../../../lib/date'
import {
  Search,
  Plus,
  Upload,
  Download,
  Phone,
  ChevronLeft,
  ChevronRight,
  PhoneCall,
  Edit3,
  Archive,
  RotateCcw,
  Trash2,
  AlertCircle,
  X,
} from 'lucide-react'

export const LeadsView: React.FC = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { success, error: toastError } = useToast()
  const deleteEnabled = useDeleteEnabled()

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
    }, 250)
    return () => clearTimeout(timer)
  }, [searchInput])

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [recordTargetLead, setRecordTargetLead] = useState<Lead | null>(null)
  const [editTargetLead, setEditTargetLead] = useState<Lead | null>(null)
  const [archiveConfirmLead, setArchiveConfirmLead] = useState<Lead | null>(null)
  const [deleteConfirmLead, setDeleteConfirmLead] = useState<Lead | null>(null)

  // Fetch Statuses & Categories
  const { data: statuses = [] } = useQuery({
    queryKey: ['statuses'],
    queryFn: () => api.getStatuses(),
  })

  // Calculate and apply uniform status pill width CSS variable
  useStatusPillWidth(statuses)

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

  // Query contacts count for the lead being deleted
  const { data: deleteLeadContacts = [] } = useQuery({
    queryKey: ['leadContacts', deleteConfirmLead?.id],
    queryFn: () => (deleteConfirmLead ? api.getLeadContacts(deleteConfirmLead.id) : Promise.resolve([])),
    enabled: Boolean(deleteConfirmLead),
  })

  // Escape key handler for confirmation dialogs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (deleteConfirmLead) setDeleteConfirmLead(null)
        else if (archiveConfirmLead) setArchiveConfirmLead(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [deleteConfirmLead, archiveConfirmLead])

  // Archive mutation
  const archiveLeadMutation = useMutation({
    mutationFn: (id: number) => api.archiveLead(id),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['lead', updated.id] })
      setArchiveConfirmLead(null)
      success('Lead archived successfully')
    },
    onError: (err: any) => {
      toastError(err.message || 'Failed to archive lead')
    },
  })

  // Restore mutation
  const restoreLeadMutation = useMutation({
    mutationFn: (id: number) => api.restoreLead(id),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['lead', updated.id] })
      success('Lead restored to active list')
    },
    onError: (err: any) => {
      toastError(err.message || 'Failed to restore lead')
    },
  })

  // Delete mutation
  const deleteLeadMutation = useMutation({
    mutationFn: (id: number) => api.deleteLead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setDeleteConfirmLead(null)
      success('Lead permanently deleted')
    },
    onError: (err: any) => {
      if (err?.status === 403 || err?.message?.toLowerCase().includes('delete is disabled')) {
        toastError('Delete is disabled')
      } else {
        toastError(err.message || 'Failed to delete lead')
      }
    },
  })

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
  const isFiltered = Boolean(searchInput || search || statusFilter || categoryFilter || priorityFilter || archivedFilter !== 'active')

  return (
    <div className="space-y-3">
      {/* 1. Header: Title (20px) + Subtitle (13px) on left, 32px Buttons on right */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-bold text-slate-900 tracking-tight leading-tight">Leads</h1>
          <p className="text-[13px] text-slate-500 mt-0.5">Manage and track cold calling prospects</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[13px] font-medium inline-flex items-center gap-2 shadow-xs cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Lead</span>
          </button>

          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="h-8 px-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-[13px] font-medium inline-flex items-center gap-2 shadow-xs cursor-pointer transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            <span>Import</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="h-8 px-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-[13px] font-medium inline-flex items-center gap-2 shadow-xs cursor-pointer transition-colors"
            title="Export filtered leads to CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* 2. Filter Bar in One Row with 10px Card Padding, 8px Gaps (Never Reflows) */}
      <div className="p-2.5 bg-white border border-slate-200 rounded-[10px] shadow-2xs flex items-center gap-2 flex-nowrap overflow-x-auto">
        {/* Search Input: fixed at 280px */}
        <div className="relative w-[280px] shrink-0 h-8">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by title, phone, address..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full h-8 pl-8 pr-7 bg-slate-50 border border-slate-300 rounded-lg text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput('')}
              className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Active / Archived Tabs: 28px tall */}
        <SegmentedTabs
          value={archivedFilter}
          onChange={(val) => {
            setArchivedFilter(val as 'active' | 'archived')
            setPage(1)
          }}
          options={[
            { value: 'active', label: 'Active Leads' },
            { value: 'archived', label: 'Archived' },
          ]}
        />

        {/* Status Filter: fixed at 140px, 32px tall */}
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value)
            setPage(1)
          }}
          className="w-[140px] shrink-0 h-8 px-2.5 bg-white border border-slate-300 rounded-lg text-[13px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600 truncate cursor-pointer"
        >
          <option value="">All Statuses</option>
          <option value="none">Not called</option>
          {statuses.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        {/* Category Filter: fixed at 140px, 32px tall */}
        <select
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value)
            setPage(1)
          }}
          className="w-[140px] shrink-0 h-8 px-2.5 bg-white border border-slate-300 rounded-lg text-[13px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600 truncate cursor-pointer"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {/* Priority Filter: fixed at 140px, 32px tall */}
        <select
          value={priorityFilter}
          onChange={(e) => {
            setPriorityFilter(e.target.value)
            setPage(1)
          }}
          className="w-[140px] shrink-0 h-8 px-2.5 bg-white border border-slate-300 rounded-lg text-[13px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600 truncate cursor-pointer"
        >
          <option value="">All Priorities</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>

        {/* Reset button positioned at ml-auto so the 5 controls never move */}
        <div className="ml-auto shrink-0">
          {isFiltered ? (
            <button
              type="button"
              onClick={() => {
                setSearchInput('')
                setSearch('')
                setStatusFilter('')
                setCategoryFilter('')
                setPriorityFilter('')
                setArchivedFilter('active')
                setPage(1)
              }}
              className="h-8 px-2.5 text-[12px] font-semibold text-blue-600 hover:text-blue-800 cursor-pointer transition-colors"
            >
              Reset Filters
            </button>
          ) : (
            <div className="h-8 w-2" />
          )}
        </div>
      </div>

      {/* 3. Main Container: Fixed Min-Height and Pinned Pagination */}
      <div className="bg-white border border-slate-200 rounded-[10px] shadow-2xs overflow-hidden flex flex-col min-h-[520px] justify-between">
        <div className="w-full flex-1">
          {isLoading ? (
            /* Loading Skeleton Rows: 44px row height and exact column widths */
            <div className="hidden min-[1100px]:block w-full">
              <table className="w-full table-fixed divide-y divide-slate-200 text-[13px]">
                <colgroup>
                  <col className="w-auto" />
                  <col className="w-[120px]" />
                  <col className="w-[96px]" />
                  <col style={{ width: 'var(--status-col-width, 134px)' }} />
                  <col className="w-[76px]" />
                  <col className="w-[96px]" />
                  <col className="w-[156px]" />
                </colgroup>
                <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200 h-9">
                  <tr>
                    <th className="px-3 text-left font-semibold text-slate-600 uppercase text-[11px] tracking-wider">Title</th>
                    <th className="px-3 text-left font-semibold text-slate-600 uppercase text-[11px] tracking-wider">Phone</th>
                    <th className="px-3 text-left font-semibold text-slate-600 uppercase text-[11px] tracking-wider">Category</th>
                    <th className="px-3 text-center font-semibold text-slate-600 uppercase text-[11px] tracking-wider">Status</th>
                    <th className="px-3 text-center font-semibold text-slate-600 uppercase text-[11px] tracking-wider whitespace-nowrap">Priority</th>
                    <th className="px-3 text-center font-semibold text-slate-600 uppercase text-[11px] tracking-wider whitespace-nowrap">Last Contact</th>
                    <th className="px-3 text-right font-semibold text-slate-600 uppercase text-[11px] tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <tr key={i} className="h-[44px] animate-pulse">
                      <td className="px-3 py-2"><div className="h-3.5 bg-slate-200 rounded w-3/4" /></td>
                      <td className="px-3 py-2"><div className="h-3.5 bg-slate-100 rounded w-20" /></td>
                      <td className="px-3 py-2"><div className="h-3.5 bg-slate-100 rounded w-16" /></td>
                      <td className="px-3 py-2"><div className="h-6 bg-slate-100 rounded-full w-[var(--status-pill-width,110px)] mx-auto" /></td>
                      <td className="px-3 py-2 text-center"><div className="h-3.5 bg-slate-100 rounded w-10 mx-auto" /></td>
                      <td className="px-3 py-2 text-center"><div className="h-3.5 bg-slate-100 rounded w-12 mx-auto" /></td>
                      <td className="px-3 py-2 text-right"><div className="h-7 bg-slate-100 rounded w-28 ml-auto" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : isError ? (
            <div className="p-8 text-center max-w-sm mx-auto my-12">
              <p className="text-[13px] font-semibold text-rose-700 mb-2">Error loading leads</p>
              <p className="text-[12px] text-slate-500 mb-3">{(error as any)?.message}</p>
              <button
                type="button"
                onClick={() => refetch()}
                className="h-8 px-3.5 bg-blue-600 text-white rounded-lg text-[13px] font-medium cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : leads.length === 0 ? (
            <div className="p-12 text-center my-10">
              <p className="text-[15px] font-semibold text-slate-900 mb-1">
                {archivedFilter === 'archived' ? 'No archived leads' : 'No leads found'}
              </p>
              <p className="text-[12px] text-slate-500 max-w-sm mx-auto mb-4">
                {search || statusFilter || categoryFilter || priorityFilter
                  ? 'Try adjusting your search criteria or filters.'
                  : archivedFilter === 'archived'
                  ? 'Archived leads will appear here when you archive them.'
                  : 'Import a spreadsheet or add your first lead to get started.'}
              </p>
              {archivedFilter === 'active' && (
                <div className="flex justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(true)}
                    className="h-8 px-3.5 bg-blue-600 text-white text-[13px] font-semibold rounded-lg cursor-pointer"
                  >
                    Add Lead
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsImportModalOpen(true)}
                    className="h-8 px-3.5 bg-slate-100 text-slate-700 text-[13px] font-semibold rounded-lg hover:bg-slate-200 cursor-pointer"
                  >
                    Import Excel
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Desktop Table (>= 1100px): 7 columns, fixed layout, fits 1280px with NO horizontal scroll */}
              <div className="hidden min-[1100px]:block w-full">
                <table className="w-full table-fixed divide-y divide-slate-200 text-[13px]">
                  <colgroup>
                    <col className="w-auto" />
                    <col className="w-[120px]" />
                    <col className="w-[96px]" />
                    <col style={{ width: 'var(--status-col-width, 134px)' }} />
                    <col className="w-[76px]" />
                    <col className="w-[96px]" />
                    <col className="w-[156px]" />
                  </colgroup>
                  <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200 h-9">
                    <tr>
                      <th className="px-3 text-left font-semibold text-slate-600 uppercase text-[11px] tracking-wider">
                        Title
                      </th>
                      <th className="px-3 text-left font-semibold text-slate-600 uppercase text-[11px] tracking-wider">
                        Phone
                      </th>
                      <th className="px-3 text-left font-semibold text-slate-600 uppercase text-[11px] tracking-wider">
                        Category
                      </th>
                      <th className="px-3 text-center font-semibold text-slate-600 uppercase text-[11px] tracking-wider">
                        Status
                      </th>
                      <th className="px-3 text-center font-semibold text-slate-600 uppercase text-[11px] tracking-wider whitespace-nowrap">
                        Priority
                      </th>
                      <th className="px-3 text-center font-semibold text-slate-600 uppercase text-[11px] tracking-wider whitespace-nowrap">
                        Last Contact
                      </th>
                      <th className="px-3 text-right font-semibold text-slate-600 uppercase text-[11px] tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {leads.map((lead) => {
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
                          className="h-[44px] hover:bg-blue-50/40 focus:bg-blue-50/50 cursor-pointer transition-colors outline-none"
                        >
                          {/* 1. Title: flexible, ellipsis & tooltip */}
                          <td className="px-3 py-2 font-semibold text-slate-900 truncate" title={lead.title}>
                            <span className="truncate block">{lead.title}</span>
                          </td>

                          {/* 2. Phone: 120px, clickable tel link, non-monospace, does NOT trigger row click */}
                          <td
                            className="px-3 py-2 whitespace-nowrap text-slate-600 truncate"
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

                          {/* 3. Category: 96px, plain text chip, no dropdown */}
                          <td className="px-3 py-2 whitespace-nowrap truncate">
                            {lead.category?.name ? (
                              <span
                                className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 truncate max-w-[86px]"
                                title={lead.category.name}
                              >
                                {lead.category.name}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>

                          {/* 4. Status: read-only uniform pill (24px tall) */}
                          <td className="px-3 py-2 whitespace-nowrap text-center">
                            <div className="flex justify-center">
                              <StatusPill
                                status={lead.status}
                                fallbackText="Not called"
                              />
                            </div>
                          </td>

                          {/* 5. Priority: 76px, centered, header on one line */}
                          <td className="px-3 py-2 whitespace-nowrap text-center">
                            {lead.priority ? (
                              <span
                                className={`px-1.5 py-0.5 rounded text-[11px] font-semibold border ${
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

                          {/* 6. Last Contact: 96px, centered, e.g. "18 Oct", or "-" */}
                          <td className="px-3 py-2 whitespace-nowrap text-center text-slate-600 text-[12px]">
                            {lead.lastContactDate ? formatDateShort(lead.lastContactDate) : '-'}
                          </td>

                          {/* 7. Actions: 156px, fully inside border */}
                          <td
                            className="px-3 py-2 whitespace-nowrap text-right"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-end gap-1.5">
                              {!lead.archivedAt ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => setRecordTargetLead(lead)}
                                    className="h-7 px-2 text-[12px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-lg inline-flex items-center gap-1 transition-colors cursor-pointer shadow-2xs shrink-0"
                                    title={`Record contact for ${lead.title}`}
                                    aria-label={`Record contact for ${lead.title}`}
                                  >
                                    <PhoneCall className="w-3 h-3 text-blue-600 shrink-0" />
                                    <span>Record</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditTargetLead(lead)}
                                    className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer shrink-0"
                                    title={`Edit ${lead.title}`}
                                    aria-label={`Edit ${lead.title}`}
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setArchiveConfirmLead(lead)}
                                    className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer shrink-0"
                                    title={`Archive ${lead.title}`}
                                    aria-label={`Archive ${lead.title}`}
                                  >
                                    <Archive className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => restoreLeadMutation.mutate(lead.id)}
                                    disabled={restoreLeadMutation.isPending}
                                    className="w-7 h-7 flex items-center justify-center text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                                    title={`Restore ${lead.title}`}
                                    aria-label={`Restore ${lead.title}`}
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={!deleteEnabled}
                                    aria-disabled={!deleteEnabled}
                                    onClick={() => {
                                      if (deleteEnabled) setDeleteConfirmLead(lead)
                                    }}
                                    className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors shrink-0 ${
                                      deleteEnabled
                                        ? 'text-rose-600 hover:bg-rose-50 cursor-pointer'
                                        : 'text-slate-300 cursor-not-allowed'
                                    }`}
                                    title={deleteEnabled ? `Delete ${lead.title} permanently` : 'Delete is disabled'}
                                    aria-label={deleteEnabled ? `Delete ${lead.title} permanently` : 'Delete is disabled'}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile / Tablet Cards (< 1100px): Clean card representation */}
              <div className="min-[1100px]:hidden divide-y divide-slate-200">
                {leads.map((lead) => {
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
                      className="p-3.5 space-y-2 hover:bg-slate-50 focus:bg-slate-50 cursor-pointer transition-colors outline-none"
                    >
                      {/* Top Row: Title, Priority & Status */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-slate-900 text-[14px] leading-snug truncate" title={lead.title}>
                            {lead.title}
                          </h3>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            {lead.category?.name && (
                              <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                                {lead.category.name}
                              </span>
                            )}
                            {lead.priority && (
                              <span
                                className={`text-[10px] px-1.5 py-0.2 rounded font-semibold border ${
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
                        </div>

                        <div>
                          <StatusPill status={lead.status} fallbackText="Not called" />
                        </div>
                      </div>

                      {/* Middle Row: Phone & Last Contact */}
                      <div className="flex items-center justify-between text-[12px] text-slate-600 pt-1">
                        <div onClick={(e) => e.stopPropagation()}>
                          {lead.phone ? (
                            <a
                              href={`tel:${lead.phone}`}
                              className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                            >
                              <Phone className="w-3 h-3 text-blue-500" />
                              <span>{lead.phone}</span>
                            </a>
                          ) : (
                            <span className="text-slate-400">No phone</span>
                          )}
                        </div>
                        <div className="text-slate-500 text-[11px]">
                          Last: {lead.lastContactDate ? formatDateShort(lead.lastContactDate) : 'Never'}
                        </div>
                      </div>

                      {/* Bottom Row: Actions */}
                      <div
                        className="flex items-center justify-end gap-1.5 pt-1.5 border-t border-slate-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {!lead.archivedAt ? (
                          <>
                            <button
                              type="button"
                              onClick={() => setRecordTargetLead(lead)}
                              className="h-7 px-2.5 text-[12px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-lg inline-flex items-center gap-1 cursor-pointer"
                            >
                              <PhoneCall className="w-3 h-3 text-blue-600" />
                              <span>Record</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditTargetLead(lead)}
                              className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                              title="Edit lead"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setArchiveConfirmLead(lead)}
                              className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg cursor-pointer"
                              title="Archive lead"
                            >
                              <Archive className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => restoreLeadMutation.mutate(lead.id)}
                              className="w-7 h-7 flex items-center justify-center text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                              title="Restore lead"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={!deleteEnabled}
                              aria-disabled={!deleteEnabled}
                              onClick={() => {
                                if (deleteEnabled) setDeleteConfirmLead(lead)
                              }}
                              className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors shrink-0 ${
                                deleteEnabled
                                  ? 'text-rose-600 hover:bg-rose-50 cursor-pointer'
                                  : 'text-slate-300 cursor-not-allowed'
                              }`}
                              title={deleteEnabled ? 'Delete permanently' : 'Delete is disabled'}
                              aria-label={deleteEnabled ? 'Delete permanently' : 'Delete is disabled'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>

        {/* 4. Pinned Pagination: Compact 32px Buttons */}
        <div className="px-4 py-2.5 border-t border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-[13px] text-slate-600 shrink-0">
          <div>
            Showing <span className="font-semibold text-slate-900">{total === 0 ? 0 : (page - 1) * pageSize + 1}</span> to{' '}
            <span className="font-semibold text-slate-900">{Math.min(page * pageSize, total)}</span> of{' '}
            <span className="font-semibold text-slate-900">{total}</span> {archivedFilter === 'archived' ? 'archived leads' : 'active leads'}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="h-8 px-2.5 border border-slate-300 rounded-lg bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer inline-flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <span className="px-2 text-[12px] font-medium text-slate-500">
              Page {page} of {totalPages}
            </span>

            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="h-8 px-2.5 border border-slate-300 rounded-lg bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer inline-flex items-center gap-1"
            >
              <span>Next</span>
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
        onOpenImport={() => setIsImportModalOpen(true)}
      />

      {/* Edit Lead Modal */}
      {editTargetLead && (
        <AddLeadModal
          isOpen={true}
          onClose={() => setEditTargetLead(null)}
          statuses={statuses}
          categories={categories}
          leadToEdit={editTargetLead}
        />
      )}

      {/* Import Spreadsheet Modal */}
      <ImportWizardDialog
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        categories={categories}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['leads'] })
          queryClient.invalidateQueries({ queryKey: ['dashboard'] })
        }}
      />

      {/* Record Contact Modal */}
      {recordTargetLead && (
        <RecordContactDialog
          isOpen={true}
          onClose={() => setRecordTargetLead(null)}
          leadId={recordTargetLead.id}
          leadTitle={recordTargetLead.title}
          statuses={statuses}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['leads'] })
            queryClient.invalidateQueries({ queryKey: ['dashboard'] })
          }}
        />
      )}

      {/* Archive Confirmation Dialog */}
      {archiveConfirmLead && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-[10px] max-w-sm w-full p-4 shadow-xl space-y-3">
            <div className="flex items-center gap-2 text-amber-700">
              <Archive className="w-4 h-4 shrink-0" />
              <h3 className="text-[14px] font-bold text-slate-900">Archive this lead?</h3>
            </div>
            <p className="text-[13px] text-slate-600">
              Archive <strong className="text-slate-900">{archiveConfirmLead.title}</strong>? It will be hidden from the active list and reports. You can restore it anytime.
            </p>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setArchiveConfirmLead(null)}
                className="h-8 px-3 text-[13px] font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => archiveLeadMutation.mutate(archiveConfirmLead.id)}
                disabled={archiveLeadMutation.isPending}
                className="h-8 px-3 text-[13px] font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-lg cursor-pointer transition-colors shadow-xs disabled:opacity-60"
              >
                {archiveLeadMutation.isPending ? 'Archiving...' : 'Archive Lead'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmLead && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-[10px] max-w-sm w-full p-4 shadow-xl space-y-3">
            <div className="flex items-center gap-2 text-rose-600">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <h3 className="text-[14px] font-bold text-slate-900">Delete Permanently?</h3>
            </div>
            <p className="text-[13px] text-slate-600">
              Delete permanently? This also removes{' '}
              <strong className="text-slate-900">
                {deleteLeadContacts.length} contact {deleteLeadContacts.length === 1 ? 'record' : 'records'}
              </strong>{' '}
              and cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDeleteConfirmLead(null)}
                className="h-8 px-3 text-[13px] font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteLeadMutation.mutate(deleteConfirmLead.id)}
                disabled={deleteLeadMutation.isPending}
                className="h-8 px-3 text-[13px] font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg cursor-pointer transition-colors shadow-xs disabled:opacity-60"
              >
                {deleteLeadMutation.isPending ? 'Deleting...' : 'Delete Lead'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
