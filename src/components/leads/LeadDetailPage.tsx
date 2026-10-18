import React, { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { useToast } from '../../context/ToastContext'
import { Lead, ContactLog } from '../../types'
import { AddLeadModal } from './AddLeadModal'
import { RecordContactDialog } from './RecordContactDialog'
import { formatDateShort } from '../../../lib/date'
import {
  ArrowLeft,
  Phone,
  MapPin,
  Edit3,
  Archive,
  RotateCcw,
  Trash2,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  Building2,
  Layers,
  Star,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  PhoneCall,
  History,
  Pencil,
} from 'lucide-react'

export const LeadDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { success, error: toastError } = useToast()

  const leadId = Number(id)

  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<ContactLog | null>(null)
  const [contactToDelete, setContactToDelete] = useState<ContactLog | null>(null)
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Fetch lead data
  const {
    data: lead,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['lead', leadId],
    queryFn: () => api.getLead(leadId),
    enabled: !isNaN(leadId),
  })

  // Fetch contact logs for lead (newest first)
  const { data: contactLogs = [] } = useQuery({
    queryKey: ['leadContacts', leadId],
    queryFn: () => api.getLeadContacts(leadId),
    enabled: !isNaN(leadId),
  })

  // Fetch statuses and categories
  const { data: statuses = [] } = useQuery({
    queryKey: ['statuses'],
    queryFn: () => api.getStatuses(),
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.getCategories(),
  })

  // Update lead mutation (for category change)
  const updateMutation = useMutation({
    mutationFn: (data: Partial<Lead>) => api.updateLead(leadId, data),
    onSuccess: (updated) => {
      queryClient.setQueryData(['lead', leadId], updated)
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      success('Category updated')
    },
    onError: (err: any) => {
      toastError(err.message || 'Failed to update lead')
    },
  })

  // Archive mutation
  const archiveMutation = useMutation({
    mutationFn: () => api.archiveLead(leadId),
    onSuccess: (updated) => {
      queryClient.setQueryData(['lead', leadId], updated)
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setShowArchiveConfirm(false)
      success('Lead archived successfully')
    },
    onError: (err: any) => {
      toastError(err.message || 'Failed to archive lead')
    },
  })

  // Restore mutation
  const restoreMutation = useMutation({
    mutationFn: () => api.restoreLead(leadId),
    onSuccess: (updated) => {
      queryClient.setQueryData(['lead', leadId], updated)
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      success('Lead restored to active list')
    },
    onError: (err: any) => {
      toastError(err.message || 'Failed to restore lead')
    },
  })

  // Delete lead mutation (allowed only for archived leads)
  const deleteMutation = useMutation({
    mutationFn: () => api.deleteLead(leadId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setShowDeleteConfirm(false)
      success('Lead deleted permanently')
      navigate('/leads')
    },
    onError: (err: any) => {
      toastError(err.message || 'Failed to delete lead')
    },
  })

  // Delete contact log mutation
  const deleteContactMutation = useMutation({
    mutationFn: (contactId: number) => api.deleteContact(contactId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leadContacts', leadId] })
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] })
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setContactToDelete(null)
      success('Contact log deleted')
    },
    onError: (err: any) => {
      toastError(err.message || 'Failed to delete contact log')
    },
  })

  if (isNaN(leadId)) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
          <p className="text-base font-semibold text-slate-900 mb-2">Invalid Lead ID</p>
          <Link
            to="/leads"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Leads</span>
          </Link>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Leads</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-12 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
          <p className="text-sm font-medium text-slate-600">Loading lead details...</p>
        </div>
      </div>
    )
  }

  if (isError || !lead) {
    return (
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div>
          <Link
            to="/leads"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Leads</span>
          </Link>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
          <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
          <h2 className="text-base font-bold text-slate-900 mb-1">Lead not found</h2>
          <p className="text-xs text-slate-500 mb-5">
            {(error as any)?.message || 'The requested lead does not exist or may have been removed.'}
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => refetch()}
              className="px-3.5 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors cursor-pointer"
            >
              Retry
            </button>
            <Link
              to="/leads"
              className="px-3.5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
            >
              Back to Leads List
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const isArchived = Boolean(lead.archivedAt)
  const currentStatus = lead.status
  const statusColor = currentStatus?.color || '#64748B'

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/leads"
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-600 hover:text-slate-900 transition-colors py-1"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Leads</span>
        </Link>
      </div>

      {/* Header Card (Yaazhi Style) */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">{lead.title}</h1>
              {isArchived && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-300 rounded-md text-xs font-semibold">
                  <Archive className="w-3 h-3 text-amber-600" />
                  <span>Archived</span>
                </span>
              )}
            </div>

            {/* Badges & Quick actions */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Category Badge */}
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-md text-xs font-medium">
                <Layers className="w-3 h-3 text-slate-500" />
                <span>{lead.category?.name || 'Uncategorized'}</span>
              </span>

              {/* Status Pill (Read-only) */}
              {currentStatus ? (
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border"
                  style={{
                    backgroundColor: `${statusColor}15`,
                    borderColor: `${statusColor}40`,
                    color: statusColor,
                  }}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColor }} />
                  <span>{currentStatus.name}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200">
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                  <span>Not called</span>
                </span>
              )}

              {/* Priority Badge */}
              {lead.priority && (
                <span
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${
                    lead.priority.toLowerCase() === 'high'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : lead.priority.toLowerCase() === 'medium'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {lead.priority} Priority
                </span>
              )}

              {/* Tap to call button */}
              {lead.phone && (
                <a
                  href={`tel:${lead.phone}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md font-mono text-xs font-semibold hover:bg-emerald-100 transition-colors"
                  title={`Call ${lead.phone}`}
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{lead.phone}</span>
                </a>
              )}
            </div>
          </div>

          {/* Action buttons at top right */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Record Contact button (hidden for archived leads) */}
            {!isArchived && (
              <button
                onClick={() => {
                  setEditingContact(null)
                  setIsRecordModalOpen(true)
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors cursor-pointer shadow-xs"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Record Contact</span>
              </button>
            )}

            <button
              onClick={() => setIsEditModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors cursor-pointer shadow-xs"
            >
              <Edit3 className="w-3.5 h-3.5 text-slate-600" />
              <span>Edit</span>
            </button>

            {!isArchived ? (
              <button
                onClick={() => setShowArchiveConfirm(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-300 hover:bg-amber-100 rounded-md transition-colors cursor-pointer shadow-xs"
              >
                <Archive className="w-3.5 h-3.5 text-amber-600" />
                <span>Archive</span>
              </button>
            ) : (
              <>
                <button
                  onClick={() => restoreMutation.mutate()}
                  disabled={restoreMutation.isPending}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-300 hover:bg-blue-100 rounded-md transition-colors cursor-pointer shadow-xs disabled:opacity-60"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
                  <span>{restoreMutation.isPending ? 'Restoring...' : 'Restore'}</span>
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-300 hover:bg-rose-100 rounded-md transition-colors cursor-pointer shadow-xs"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Delete</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Grid of Section Cards (Yaazhi Style) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. Contact Section Card */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
          <div className="border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
            <Phone className="w-4 h-4 text-slate-500" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Contact Details</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Phone */}
            <div className="p-3 bg-slate-50/60 rounded-md border border-slate-100">
              <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider block">
                Phone Number
              </span>
              <div className="mt-1">
                {lead.phone ? (
                  <a
                    href={`tel:${lead.phone}`}
                    className="text-sm font-semibold font-mono text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1.5"
                  >
                    <span>{lead.phone}</span>
                  </a>
                ) : (
                  <span className="text-sm font-medium text-slate-400">—</span>
                )}
              </div>
            </div>

            {/* Email */}
            <div className="p-3 bg-slate-50/60 rounded-md border border-slate-100">
              <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider block">
                Emails
              </span>
              <div className="mt-1">
                {lead.emails ? (
                  <a
                    href={`mailto:${lead.emails}`}
                    className="text-sm font-semibold font-mono text-blue-600 hover:text-blue-800 hover:underline truncate block"
                    title={lead.emails}
                  >
                    {lead.emails}
                  </a>
                ) : (
                  <span className="text-sm font-medium text-slate-400">—</span>
                )}
              </div>
            </div>

            {/* Website */}
            <div className="p-3 bg-slate-50/60 rounded-md border border-slate-100">
              <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider block">
                Website
              </span>
              <div className="mt-1">
                {lead.website ? (
                  <a
                    href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1.5 truncate max-w-full"
                    title={lead.website}
                  >
                    <span className="truncate">{lead.website.replace(/^https?:\/\//i, '')}</span>
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  </a>
                ) : (
                  <span className="text-sm font-medium text-slate-400">—</span>
                )}
              </div>
            </div>

            {/* Address */}
            <div className="p-3 bg-slate-50/60 rounded-md border border-slate-100 sm:col-span-2">
              <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider block">
                Address
              </span>
              <div className="mt-1">
                {lead.address ? (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.address)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline inline-flex items-start gap-1.5"
                    title="Open in Google Maps"
                  >
                    <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <span>{lead.address}</span>
                  </a>
                ) : (
                  <span className="text-sm font-medium text-slate-400">—</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 2. Business Info Section Card */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
          <div className="border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-500" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Business Information</h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {/* Maps Category */}
            <div className="p-3 bg-slate-50/60 rounded-md border border-slate-100 col-span-2 sm:col-span-3">
              <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider block">
                Maps Scraper Category
              </span>
              <p className="text-sm font-semibold text-slate-900 mt-1 truncate">
                {lead.mapsCategory || '—'}
              </p>
            </div>

            {/* Rating and review count */}
            <div className="p-3 bg-slate-50/60 rounded-md border border-slate-100">
              <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider block">
                Rating & Reviews
              </span>
              <div className="text-sm font-semibold text-slate-900 mt-1 flex items-center gap-1">
                {lead.reviewRating != null ? (
                  <>
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                    <span>{lead.reviewRating}</span>
                    <span className="text-xs font-normal text-slate-500">
                      ({lead.reviewCount || 0})
                    </span>
                  </>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </div>
            </div>

            {/* Priority Score */}
            <div className="p-3 bg-slate-50/60 rounded-md border border-slate-100">
              <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider block">
                Priority Score
              </span>
              <p className="text-sm font-semibold text-slate-900 mt-1 font-mono">
                {lead.priorityScore != null ? lead.priorityScore : '—'}
              </p>
            </div>

            {/* ERP Match */}
            <div className="p-3 bg-slate-50/60 rounded-md border border-slate-100">
              <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider block">
                ERP Match
              </span>
              <p className="text-sm font-semibold text-slate-900 mt-1 truncate">
                {lead.erpMatch || '—'}
              </p>
            </div>

            {/* Has Website */}
            <div className="p-3 bg-slate-50/60 rounded-md border border-slate-100">
              <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider block">
                Has Website
              </span>
              <div className="text-sm font-semibold mt-1">
                {lead.hasWebsite === true ? (
                  <span className="text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Yes
                  </span>
                ) : lead.hasWebsite === false ? (
                  <span className="text-slate-600 flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5 text-slate-400" /> No
                  </span>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </div>
            </div>

            {/* Needs Website */}
            <div className="p-3 bg-slate-50/60 rounded-md border border-slate-100">
              <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider block">
                Needs Website
              </span>
              <div className="text-sm font-semibold mt-1">
                {lead.needsWebsite === true ? (
                  <span className="text-blue-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" /> Yes
                  </span>
                ) : lead.needsWebsite === false ? (
                  <span className="text-slate-600 flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5 text-slate-400" /> No
                  </span>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </div>
            </div>

            {/* Needs ERP */}
            <div className="p-3 bg-slate-50/60 rounded-md border border-slate-100">
              <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider block">
                Needs ERP
              </span>
              <div className="text-sm font-semibold mt-1">
                {lead.needsErp === true ? (
                  <span className="text-blue-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" /> Yes
                  </span>
                ) : lead.needsErp === false ? (
                  <span className="text-slate-600 flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5 text-slate-400" /> No
                  </span>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 3. Tracking Section Card */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
          <div className="border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-slate-500" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Tracking & Category</h2>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Status: Read-Only pill (status changes only through contact logs) */}
              <div className="p-3 bg-slate-50/60 rounded-md border border-slate-100">
                <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider block mb-1">
                  Current Status (Read-only)
                </span>
                <div className="mt-1">
                  {currentStatus ? (
                    <span
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border"
                      style={{
                        backgroundColor: `${statusColor}15`,
                        borderColor: `${statusColor}40`,
                        color: statusColor,
                      }}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColor }} />
                      <span>{currentStatus.name}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200">
                      <span className="w-2 h-2 rounded-full bg-slate-400" />
                      <span>Not called</span>
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Status is derived automatically from the latest contact record.
                </p>
              </div>

              {/* Category Dropdown */}
              <div className="p-3 bg-slate-50/60 rounded-md border border-slate-100">
                <label className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider block mb-1">
                  Category
                </label>
                <select
                  value={lead.categoryId || ''}
                  onChange={(e) => {
                    const val = e.target.value ? Number(e.target.value) : null
                    updateMutation.mutate({ categoryId: val })
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 mt-1 cursor-pointer"
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
          </div>
        </div>

        {/* 4. Record Info Section Card */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
          <div className="border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Record Information</h2>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-slate-50/60 rounded-md border border-slate-100">
              <span className="text-xs font-semibold text-slate-600">Created At</span>
              <span className="text-xs font-medium text-slate-900 font-mono">
                {new Date(lead.createdAt).toLocaleString()}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50/60 rounded-md border border-slate-100">
              <span className="text-xs font-semibold text-slate-600">Last Updated</span>
              <span className="text-xs font-medium text-slate-900 font-mono">
                {new Date(lead.updatedAt).toLocaleString()}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50/60 rounded-md border border-slate-100">
              <span className="text-xs font-semibold text-slate-600">Import Batch File Name</span>
              <span className="text-xs font-semibold text-slate-900 truncate max-w-[200px]" title={lead.batch?.fileName || 'Manual entry'}>
                {lead.batch?.fileName || 'Manual entry'}
              </span>
            </div>

            {lead.archivedAt && (
              <div className="flex items-center justify-between p-3 bg-amber-50/60 rounded-md border border-amber-200">
                <span className="text-xs font-semibold text-amber-800">Archived At</span>
                <span className="text-xs font-medium text-amber-900 font-mono">
                  {new Date(lead.archivedAt).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 5. Contact History Card (styled like Yaazhi's Stock Movement & Audit History) */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs md:col-span-2">
          <div className="border-b border-slate-100 pb-3 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-slate-500" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Contact History</h2>
            </div>
            <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-full text-xs font-semibold">
              {contactLogs.length} {contactLogs.length === 1 ? 'record' : 'records'}
            </span>
          </div>

          {contactLogs.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
              No contacts logged yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold text-slate-600 uppercase tracking-wider w-[120px]">
                      Date
                    </th>
                    <th className="px-4 py-2.5 font-semibold text-slate-600 uppercase tracking-wider w-[180px]">
                      Status
                    </th>
                    <th className="px-4 py-2.5 font-semibold text-slate-600 uppercase tracking-wider">
                      Notes
                    </th>
                    {!isArchived && (
                      <th className="px-4 py-2.5 font-semibold text-slate-600 uppercase tracking-wider text-right w-[80px]">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {contactLogs.map((log) => {
                    const logStatusColor = log.status?.color || '#64748B'

                    return (
                      <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Date */}
                        <td className="px-4 py-3 whitespace-nowrap font-mono text-slate-700 font-medium">
                          {formatDateShort(log.contactDate)}
                          <span className="text-[10px] text-slate-400 block font-normal">
                            {new Date(log.contactDate).toISOString().slice(0, 10)}
                          </span>
                        </td>

                        {/* Status Pill */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {log.status ? (
                            <span
                              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border"
                              style={{
                                backgroundColor: `${logStatusColor}15`,
                                borderColor: `${logStatusColor}40`,
                                color: logStatusColor,
                              }}
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: logStatusColor }}
                              />
                              <span>{log.status.name}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* Notes */}
                        <td className="px-4 py-3 text-slate-700 break-words whitespace-pre-wrap">
                          {log.notes || <span className="text-slate-400 italic">No notes</span>}
                        </td>

                        {/* Actions (active leads only) */}
                        {!isArchived && (
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingContact(log)
                                  setIsRecordModalOpen(true)
                                }}
                                className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-blue-50 transition-colors cursor-pointer"
                                title="Edit contact record"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setContactToDelete(log)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Delete contact record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal (AddLeadModal prefilled) */}
      <AddLeadModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        statuses={statuses}
        categories={categories}
        leadToEdit={lead}
      />

      {/* Record Contact Modal */}
      {isRecordModalOpen && (
        <RecordContactDialog
          isOpen={true}
          onClose={() => {
            setIsRecordModalOpen(false)
            setEditingContact(null)
          }}
          leadId={lead.id}
          leadTitle={lead.title}
          statuses={statuses}
          contactToEdit={editingContact}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['lead', lead.id] })
            queryClient.invalidateQueries({ queryKey: ['leadContacts', lead.id] })
            queryClient.invalidateQueries({ queryKey: ['leads'] })
            queryClient.invalidateQueries({ queryKey: ['dashboard'] })
          }}
        />
      )}

      {/* Delete Contact Log Confirmation Dialog */}
      {contactToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-sm w-full p-5 shadow-xl space-y-3">
            <div className="flex items-center gap-2.5 text-rose-600">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-bold text-slate-900">Delete Contact Record?</h3>
            </div>
            <p className="text-xs text-slate-600">
              Are you sure you want to delete this contact log from{' '}
              <span className="font-semibold text-slate-900">{formatDateShort(contactToDelete.contactDate)}</span>?
              The lead's status will update to match its latest remaining log.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setContactToDelete(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-md cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteContactMutation.mutate(contactToDelete.id)}
                disabled={deleteContactMutation.isPending}
                className="px-3 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-md cursor-pointer transition-colors shadow-xs disabled:opacity-60"
              >
                {deleteContactMutation.isPending ? 'Deleting...' : 'Delete Log'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Archive Confirmation Dialog */}
      {showArchiveConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                <Archive className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Archive this lead?</h3>
                <p className="text-xs text-slate-500">
                  Are you sure you want to archive "{lead.title}"?
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded border border-slate-100">
              Archived leads will not appear in the active leads list, dashboard, or reports. You can restore it anytime or delete it permanently from the archived view.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setShowArchiveConfirm(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-md cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => archiveMutation.mutate()}
                disabled={archiveMutation.isPending}
                className="px-4 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-md cursor-pointer transition-colors shadow-xs disabled:opacity-60"
              >
                {archiveMutation.isPending ? 'Archiving...' : 'Yes, Archive Lead'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-700 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete permanently?</h3>
                <p className="text-xs text-rose-600 font-medium">This cannot be undone.</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded border border-slate-100">
              Lead "{lead.title}" and its record will be permanently deleted from the database.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-md cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-md cursor-pointer transition-colors shadow-xs disabled:opacity-60"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete Lead'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
