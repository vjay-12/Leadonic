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
  useStatusPillWidth(statuses.map((s) => s.name))

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
      toastError(err.message || 'Failed to delete lead')
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

      {/* Static Toolbar: Search & Fixed Width Filters (Never reflows) */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs flex flex-wrap items-center gap-3">
        {/* Search Input: Fixed Width */}
        <div className="relative w-64 sm:w-72 shrink-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by title, phone, address..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-md text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
          />
        </div>

        {/* Segmented Tabs (Active / Archived) - Shared Component */}
        <SegmentedTabs
          value={archivedFilter}
          onChange={(val) => {
            setArchivedFilter(val)
            setPage(1)
          }}
          options={[
            { value: 'active', label: 'Active Leads' },
            { value: 'archived', label: 'Archived' },
          ]}
        />

        {/* Status Filter: Fixed Width */}
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value)
            setPage(1)
          }}
          className="w-[150px] shrink-0 px-3 py-1.5 bg-white border border-slate-300 rounded-md text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600 truncate cursor-pointer"
        >
          <option value="">All Statuses</option>
          <option value="none">Not called</option>
          {statuses.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        {/* Category Filter: Fixed Width */}
        <select
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value)
            setPage(1)
          }}
          className="w-[150px] shrink-0 px-3 py-1.5 bg-white border border-slate-300 rounded-md text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600 truncate cursor-pointer"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {/* Priority Filter: Fixed Width */}
        <select
          value={priorityFilter}
          onChange={(e) => {
            setPriorityFilter(e.target.value)
            setPage(1)
          }}
          className="w-[130px] shrink-0 px-3 py-1.5 bg-white border border-slate-300 rounded-md text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600 truncate cursor-pointer"
        >
          <option value="">All Priorities</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>

        {/* Reset button */}
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
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 px-2 py-1.5 cursor-pointer shrink-0"
          >
            Reset
          </button>
        )}
      </div>

      {/* Main Container: Fixed Min-Height and Pinned Pagination */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden flex flex-col min-h-[580px] justify-between">
        <div className="w-full flex-1">
          {isLoading ? (
            /* Loading Skeleton Rows: Exact row height (~52px) and column widths */
            <div className="hidden lg:block w-full">
              <table className="w-full table-fixed divide-y divide-slate-200 text-xs">
                <colgroup>
                  <col className="w-auto min-w-[220px]" />
                  <col className="w-[130px]" />
                  <col className="w-[110px]" />
                  <col style={{ width: 'var(--status-col-width, 196px)' }} />
                  <col className="w-[90px]" />
                  <col className="w-[110px]" />
                  <col className="w-[170px]" />
                </colgroup>
                <thead className="bg-slate-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-3.5 py-3 text-left font-semibold text-slate-600 uppercase tracking-wider">Title</th>
                    <th className="px-2.5 py-3 text-left font-semibold text-slate-600 uppercase tracking-wider">Phone</th>
                    <th className="px-2.5 py-3 text-left font-semibold text-slate-600 uppercase tracking-wider">Category</th>
                    <th className="px-2.5 py-3 text-center font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                    <th className="px-2 py-3 text-center font-semibold text-slate-600 uppercase tracking-wider">Priority</th>
                    <th className="px-2 py-3 text-center font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">Last Contact</th>
                    <th className="px-3 py-3 text-right font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <tr key={i} className="h-[52px] animate-pulse">
                      <td className="px-3.5 py-3"><div className="h-4 bg-slate-200 rounded w-3/4" /></td>
                      <td className="px-2.5 py-3"><div className="h-4 bg-slate-100 rounded w-20" /></td>
                      <td className="px-2.5 py-3"><div className="h-4 bg-slate-100 rounded w-16" /></td>
                      <td className="px-2.5 py-3"><div className="h-7 bg-slate-100 rounded-full w-[var(--status-pill-width,168px)] mx-auto" /></td>
                      <td className="px-2 py-3 text-center"><div className="h-4 bg-slate-100 rounded w-12 mx-auto" /></td>
                      <td className="px-2 py-3 text-center"><div className="h-4 bg-slate-100 rounded w-14 mx-auto" /></td>
                      <td className="px-3 py-3 text-right"><div className="h-7 bg-slate-100 rounded w-28 ml-auto" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : isError ? (
            <div className="p-8 text-center max-w-sm mx-auto my-12">
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
            <div className="p-12 text-center my-12">
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
              {/* Desktop Table (>= 1024px): 7 columns, fixed layout, fits >= 1280px with no horizontal scroll */}
              <div className="hidden lg:block w-full">
                <table className="w-full table-fixed divide-y divide-slate-200 text-xs">
                  <colgroup>
                    <col className="w-auto min-w-[220px]" />
                    <col className="w-[130px]" />
                    <col className="w-[110px]" />
                    <col style={{ width: 'var(--status-col-width, 196px)' }} />
                    <col className="w-[90px]" />
                    <col className="w-[110px]" />
                    <col className="w-[170px]" />
                  </colgroup>
                  <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
                    <tr>
                      <th className="px-3.5 py-3 text-left font-semibold text-slate-600 uppercase tracking-wider">
                        Title
                      </th>
                      <th className="px-2.5 py-3 text-left font-semibold text-slate-600 uppercase tracking-wider">
                        Phone
                      </th>
                      <th className="px-2.5 py-3 text-left font-semibold text-slate-600 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-2.5 py-3 text-center font-semibold text-slate-600 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-2 py-3 text-center font-semibold text-slate-600 uppercase tracking-wider">
                        Priority
                      </th>
                      <th className="px-2 py-3 text-center font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                        Last Contact
                      </th>
                      <th className="px-3 py-3 text-right font-semibold text-slate-600 uppercase tracking-wider">
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
                          className="h-[52px] hover:bg-blue-50/40 focus:bg-blue-50/50 cursor-pointer transition-colors outline-none"
                        >
                          {/* 1. Title: flexible, min 220px, ellipsis & tooltip */}
                          <td className="px-3.5 py-2.5 font-semibold text-slate-900 truncate" title={lead.title}>
                            <span className="truncate block">{lead.title}</span>
                          </td>

                          {/* 2. Phone: 130px, clickable tel link, non-monospace, does NOT trigger row click */}
                          <td
                            className="px-2.5 py-2.5 whitespace-nowrap text-slate-600 truncate"
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

                          {/* 3. Category: 110px, plain text chip, no dropdown */}
                          <td className="px-2.5 py-2.5 whitespace-nowrap truncate">
                            {lead.category?.name ? (
                              <span
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 truncate max-w-[100px]"
                                title={lead.category.name}
                              >
                                {lead.category.name}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>

                          {/* 4. Status: read-only uniform pill */}
                          <td className="px-2.5 py-2.5 whitespace-nowrap text-center">
                            <div className="flex justify-center">
                              <StatusPill
                                name={lead.status?.name}
                                color={lead.status?.color}
                                defaultName="Not called"
                              />
                            </div>
                          </td>

                          {/* 5. Priority: 90px, centered */}
                          <td className="px-2 py-2.5 whitespace-nowrap text-center">
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

                          {/* 6. Last Contact: 110px, centered, e.g. "18 Oct", or "-" */}
                          <td className="px-2 py-2.5 whitespace-nowrap text-center text-slate-600 text-xs">
                            {lead.lastContactDate ? formatDateShort(lead.lastContactDate) : '-'}
                          </td>

                          {/* 7. Actions: 170px, compact Record button (~30px tall) + Edit + Archive/Restore icon buttons */}
                          <td
                            className="px-3 py-2.5 whitespace-nowrap text-right"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-end gap-1.5">
                              {!lead.archivedAt ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => setRecordTargetLead(lead)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 h-[30px] text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-md transition-colors cursor-pointer shadow-2xs shrink-0"
                                    title={`Record contact for ${lead.title}`}
                                    aria-label={`Record contact for ${lead.title}`}
                                  >
                                    <PhoneCall className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                    <span>Record</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditTargetLead(lead)}
                                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                                    title={`Edit ${lead.title}`}
                                    aria-label={`Edit ${lead.title}`}
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setArchiveConfirmLead(lead)}
                                    className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded transition-colors cursor-pointer"
                                    title={`Archive ${lead.title}`}
                                    aria-label={`Archive ${lead.title}`}
                                  >
                                    <Archive className="w-4 h-4" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => restoreLeadMutation.mutate(lead.id)}
                                    disabled={restoreLeadMutation.isPending}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 h-[30px] text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-md transition-colors cursor-pointer shadow-2xs shrink-0"
                                    title={`Restore ${lead.title}`}
                                    aria-label={`Restore ${lead.title}`}
                                  >
                                    <RotateCcw className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                    <span>Restore</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditTargetLead(lead)}
                                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                                    title={`Edit ${lead.title}`}
                                    aria-label={`Edit ${lead.title}`}
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeleteConfirmLead(lead)}
                                    className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                    title={`Delete ${lead.title}`}
                                    aria-label={`Delete ${lead.title}`}
                                  >
                                    <Trash2 className="w-4 h-4" />
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

              {/* Responsive Cards (< 1024px): Title, Phone, Category, Status Pill, Priority, Last Contact, Action buttons */}
              <div className="lg:hidden divide-y divide-slate-200">
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
                      className="p-4 space-y-2.5 hover:bg-slate-50 focus:bg-slate-50 cursor-pointer transition-colors outline-none"
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

                      {/* Phone and Category */}
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <div onClick={(e) => e.stopPropagation()}>
                          {lead.phone ? (
                            <a
                              href={`tel:${lead.phone}`}
                              className="inline-flex items-center gap-1.5 font-medium text-blue-600 hover:text-blue-800"
                            >
                              <Phone className="w-3.5 h-3.5 text-blue-500" />
                              <span>{lead.phone}</span>
                            </a>
                          ) : (
                            <span className="text-slate-400">No phone</span>
                          )}
                        </div>

                        <div>
                          {lead.category?.name ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                              {lead.category.name}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </div>
                      </div>

                      {/* Status and Last Contact */}
                      <div className="flex items-center justify-between gap-2">
                        <StatusPill
                          name={lead.status?.name}
                          color={lead.status?.color}
                          defaultName="Not called"
                        />

                        <div className="text-xs text-slate-500">
                          Last: {lead.lastContactDate ? formatDateShort(lead.lastContactDate) : '-'}
                        </div>
                      </div>

                      {/* Action buttons at bottom */}
                      <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
                        {!lead.archivedAt ? (
                          <>
                            <button
                              type="button"
                              onClick={() => setRecordTargetLead(lead)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 h-[30px] text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-md transition-colors cursor-pointer shadow-2xs"
                              title="Record Contact"
                              aria-label="Record Contact"
                            >
                              <PhoneCall className="w-3.5 h-3.5 text-blue-600" />
                              <span>Record</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditTargetLead(lead)}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                              title="Edit Lead"
                              aria-label="Edit Lead"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setArchiveConfirmLead(lead)}
                              className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded transition-colors cursor-pointer"
                              title="Archive Lead"
                              aria-label="Archive Lead"
                            >
                              <Archive className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => restoreLeadMutation.mutate(lead.id)}
                              disabled={restoreLeadMutation.isPending}
                              className="inline-flex items-center gap-1 px-3 py-1.5 h-[30px] text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-md transition-colors cursor-pointer shadow-2xs"
                              title="Restore Lead"
                              aria-label="Restore Lead"
                            >
                              <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
                              <span>Restore</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditTargetLead(lead)}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                              title="Edit Lead"
                              aria-label="Edit Lead"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmLead(lead)}
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                              title="Delete Lead"
                              aria-label="Delete Lead"
                            >
                              <Trash2 className="w-4 h-4" />
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

        {/* Fixed Position Pagination Bar at bottom */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 mt-auto">
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

      {/* Edit Lead Modal */}
      {editTargetLead && (
        <AddLeadModal
          isOpen={true}
          onClose={() => setEditTargetLead(null)}
          leadToEdit={editTargetLead}
          statuses={statuses}
          categories={categories}
        />
      )}

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

      {/* Record Contact Dialog */}
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
          <div className="bg-white border border-slate-200 rounded-xl max-w-sm w-full p-5 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <Archive className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900">Archive Lead</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Are you sure you want to archive &ldquo;{archiveConfirmLead.title}&rdquo;? It will be hidden from the active list.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setArchiveConfirmLead(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => archiveLeadMutation.mutate(archiveConfirmLead.id)}
                disabled={archiveLeadMutation.isPending}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-md cursor-pointer disabled:opacity-60"
              >
                {archiveLeadMutation.isPending ? 'Archiving...' : 'Archive'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmLead && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-sm w-full p-5 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900">Delete Lead</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Permanently delete &ldquo;{deleteConfirmLead.title}&rdquo;? This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setDeleteConfirmLead(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteLeadMutation.mutate(deleteConfirmLead.id)}
                disabled={deleteLeadMutation.isPending}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-md cursor-pointer disabled:opacity-60"
              >
                {deleteLeadMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
