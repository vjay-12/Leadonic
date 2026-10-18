import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { useToast } from '../../context/ToastContext'
import { ContactLog } from '../../types'
import { AddLeadModal } from './AddLeadModal'
import { RecordContactDialog } from './RecordContactDialog'
import { StatusPill, useStatusPillWidth } from '../common/StatusPill'
import { formatDateShort, formatDateMedium, formatDateTimeIST } from '../../../lib/date'
import {
  ArrowLeft,
  MapPin,
  Edit3,
  Archive,
  RotateCcw,
  Trash2,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  Layers,
  Star,
  CheckCircle2,
  XCircle,
  PhoneCall,
  History,
  Pencil,
  GraduationCap,
} from 'lucide-react'

function getInitials(name?: string): string {
  if (!name) return 'L'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

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

  // Compute shared status pill width
  useStatusPillWidth(statuses)

  // Escape key handler for local dialogs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (contactToDelete) setContactToDelete(null)
        else if (showArchiveConfirm) setShowArchiveConfirm(false)
        else if (showDeleteConfirm) setShowDeleteConfirm(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [contactToDelete, showArchiveConfirm, showDeleteConfirm])

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

  // Move to School ERP mutation
  const moveToSchoolMutation = useMutation({
    mutationFn: () => api.moveToSchoolErp(leadId),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] })
      queryClient.invalidateQueries({ queryKey: ['schools'] })
      success(res.alreadyExists ? 'School already exists for this lead' : 'Moved to School ERP')
      if (res.school?.id) {
        navigate(`/school-erp/${res.school.id}`)
      }
    },
    onError: (err: any) => {
      toastError(err.message || 'Failed to move to School ERP')
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
  const lastContactLog = contactLogs[0]

  return (
    <div className="max-w-6xl mx-auto space-y-4 pb-8">
      {/* 1. Top Action Toolbar Row (Outside & Above Header Card) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <Link
          to="/leads"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Leads</span>
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          {lead.category?.name.toLowerCase() === 'school' &&
            (lead.school ? (
              <Link
                to={`/school-erp/${lead.school.id}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-md transition-colors shadow-2xs"
              >
                <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                <span>Open School</span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => moveToSchoolMutation.mutate()}
                disabled={moveToSchoolMutation.isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-md transition-colors cursor-pointer shadow-2xs disabled:opacity-60"
              >
                <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                <span>{moveToSchoolMutation.isPending ? 'Moving...' : 'Move to School ERP'}</span>
              </button>
            ))}

          {!isArchived && (
            <button
              type="button"
              onClick={() => {
                setEditingContact(null)
                setIsRecordModalOpen(true)
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors cursor-pointer shadow-2xs"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Record</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsEditModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors cursor-pointer shadow-2xs"
          >
            <Edit3 className="w-3.5 h-3.5 text-slate-600" />
            <span>Edit</span>
          </button>

          {!isArchived ? (
            <button
              type="button"
              onClick={() => setShowArchiveConfirm(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-300 hover:bg-amber-100 rounded-md transition-colors cursor-pointer shadow-2xs"
            >
              <Archive className="w-3.5 h-3.5 text-amber-600" />
              <span>Archive</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => restoreMutation.mutate()}
                disabled={restoreMutation.isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-300 hover:bg-blue-100 rounded-md transition-colors cursor-pointer shadow-2xs disabled:opacity-60"
              >
                <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
                <span>{restoreMutation.isPending ? 'Restoring...' : 'Restore'}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-300 hover:bg-rose-100 rounded-md transition-colors cursor-pointer shadow-2xs"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Delete</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* 2. Header Card (Yaazhi Product Detail Style) */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          {/* Left: 56px initials tile + Middle: badges, title, subtitle */}
          <div className="flex items-start gap-4 min-w-0">
            {/* 56px Initials Tile */}
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-100 border border-blue-200/60 flex items-center justify-center text-blue-700 font-bold text-lg shrink-0 shadow-2xs">
              {getInitials(lead.title)}
            </div>

            {/* Middle Info */}
            <div className="min-w-0 space-y-1">
              {/* Badge Row */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-slate-100 text-slate-700 border border-slate-200/80 rounded-md text-xs font-medium shrink-0">
                  <Layers className="w-3 h-3 text-slate-500" />
                  <span>{lead.category?.name || 'Uncategorized'}</span>
                </span>

                <StatusPill status={currentStatus} fallbackText="Not called" />

                {lead.priority && (
                  <span
                    className={`px-2 py-0.5 rounded-md text-xs font-semibold border shrink-0 ${
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

                <span className="text-xs text-slate-400 font-medium">Lead #{lead.id}</span>

                {isArchived && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-300 rounded-md text-xs font-semibold shrink-0">
                    <Archive className="w-3 h-3 text-amber-600" />
                    <span>Archived</span>
                  </span>
                )}
              </div>

              {/* Lead Title (~24px, Bold) */}
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight truncate max-w-full" title={lead.title}>
                {lead.title}
              </h1>

              {/* Address Subtitle with Ellipsis */}
              {lead.address ? (
                <p className="text-xs text-slate-500 flex items-center gap-1.5 truncate" title={lead.address}>
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{lead.address}</span>
                </p>
              ) : (
                <p className="text-xs text-slate-400 italic">No address provided</p>
              )}
            </div>
          </div>

          {/* Right: Key-Figure Blocks (Yaazhi Style) */}
          <div className="flex items-center gap-6 self-start md:self-auto border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-6 shrink-0">
            {/* LAST CONTACT Block */}
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Last Contact
              </span>
              <div className="text-[17px] font-bold text-slate-900 leading-tight">
                {lastContactLog ? formatDateMedium(lastContactLog.contactDate) : 'Never'}
              </div>
              <div className="text-[11px] text-slate-500">
                {contactLogs.length > 0
                  ? `${contactLogs.length} ${contactLogs.length === 1 ? 'contact' : 'contacts'} recorded`
                  : 'Never contacted'}
              </div>
            </div>

            {/* RATING Block */}
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Rating
              </span>
              <div className="text-[17px] font-bold text-slate-900 leading-tight flex items-center gap-1">
                {lead.reviewRating != null ? (
                  <>
                    <span>{lead.reviewRating}</span>
                    <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                  </>
                ) : (
                  <span>—</span>
                )}
              </div>
              <div className="text-[11px] text-slate-500">
                {lead.reviewCount != null && lead.reviewCount > 0
                  ? `${lead.reviewCount} reviews`
                  : 'No reviews'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Contact Details Card (4 Equal Tiles) */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
        <h2 className="text-[13px] font-semibold text-slate-900 mb-3">Contact Details</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Phone */}
          <div className="p-3.5 rounded-[10px] bg-slate-50/70 border border-slate-200/80 shadow-2xs flex flex-col justify-between min-h-[82px] max-h-[90px]">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
              Phone
            </span>
            <div className="mt-1">
              {lead.phone ? (
                <>
                  <div className="text-[15px] font-semibold text-slate-900 truncate" title={lead.phone}>
                    {lead.phone}
                  </div>
                  <a
                    href={`tel:${lead.phone}`}
                    className="text-[12px] font-medium text-blue-600 hover:text-blue-800 hover:underline block truncate mt-0.5"
                  >
                    Tap to call
                  </a>
                </>
              ) : (
                <>
                  <div className="text-[15px] font-medium text-slate-400">—</div>
                  <span className="text-[12px] text-slate-400 block mt-0.5">Not available</span>
                </>
              )}
            </div>
          </div>

          {/* Emails */}
          <div className="p-3.5 rounded-[10px] bg-slate-50/70 border border-slate-200/80 shadow-2xs flex flex-col justify-between min-h-[82px] max-h-[90px]">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
              Emails
            </span>
            <div className="mt-1">
              {lead.emails ? (
                <>
                  <div className="text-[15px] font-semibold text-slate-900 truncate" title={lead.emails}>
                    {lead.emails}
                  </div>
                  <a
                    href={`mailto:${lead.emails}`}
                    className="text-[12px] font-medium text-blue-600 hover:text-blue-800 hover:underline block truncate mt-0.5"
                  >
                    Send email
                  </a>
                </>
              ) : (
                <>
                  <div className="text-[15px] font-medium text-slate-400">—</div>
                  <span className="text-[12px] text-slate-400 block mt-0.5">Not available</span>
                </>
              )}
            </div>
          </div>

          {/* Website */}
          <div className="p-3.5 rounded-[10px] bg-slate-50/70 border border-slate-200/80 shadow-2xs flex flex-col justify-between min-h-[82px] max-h-[90px]">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
              Website
            </span>
            <div className="mt-1">
              {lead.website ? (
                <>
                  <div className="text-[15px] font-semibold text-slate-900 truncate" title={lead.website}>
                    {lead.website.replace(/^https?:\/\//i, '')}
                  </div>
                  <a
                    href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[12px] font-medium text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1 mt-0.5 truncate"
                  >
                    <span>Visit website</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                </>
              ) : (
                <>
                  <div className="text-[15px] font-medium text-slate-400">—</div>
                  <span className="text-[12px] text-slate-400 block mt-0.5">No website</span>
                </>
              )}
            </div>
          </div>

          {/* Address */}
          <div className="p-3.5 rounded-[10px] bg-slate-50/70 border border-slate-200/80 shadow-2xs flex flex-col justify-between min-h-[82px] max-h-[90px]">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
              Address
            </span>
            <div className="mt-1">
              {lead.address ? (
                <>
                  <div className="text-[15px] font-semibold text-slate-900 truncate" title={lead.address}>
                    {lead.address}
                  </div>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[12px] font-medium text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1 mt-0.5 truncate"
                  >
                    <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                    <span>Open in Maps</span>
                  </a>
                </>
              ) : (
                <>
                  <div className="text-[15px] font-medium text-slate-400">—</div>
                  <span className="text-[12px] text-slate-400 block mt-0.5">No address</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Business Information Card (6 Equal Tiles) */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
        <h2 className="text-[13px] font-semibold text-slate-900 mb-3">Business Information</h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Maps Category */}
          <div className="p-3.5 rounded-[10px] bg-slate-50/70 border border-slate-200/80 shadow-2xs flex flex-col justify-between min-h-[82px] max-h-[90px]">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
              Maps Category
            </span>
            <div className="mt-1">
              <div className="text-[15px] font-semibold text-slate-900 truncate" title={lead.mapsCategory || undefined}>
                {lead.mapsCategory || '—'}
              </div>
              <span className="text-[12px] text-slate-400 block mt-0.5">Google Maps</span>
            </div>
          </div>

          {/* Priority Score */}
          <div className="p-3.5 rounded-[10px] bg-slate-50/70 border border-slate-200/80 shadow-2xs flex flex-col justify-between min-h-[82px] max-h-[90px]">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
              Priority Score
            </span>
            <div className="mt-1">
              <div className="text-[15px] font-semibold text-slate-900">
                {lead.priorityScore != null ? lead.priorityScore : '—'}
              </div>
              <span className="text-[12px] text-slate-400 block mt-0.5">Calculated</span>
            </div>
          </div>

          {/* ERP Match */}
          <div className="p-3.5 rounded-[10px] bg-slate-50/70 border border-slate-200/80 shadow-2xs flex flex-col justify-between min-h-[82px] max-h-[90px]">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
              ERP Match
            </span>
            <div className="mt-1">
              <div className="text-[15px] font-semibold text-slate-900 truncate" title={lead.erpMatch || undefined}>
                {lead.erpMatch ? (
                  <span className="text-indigo-600 font-semibold">{lead.erpMatch}</span>
                ) : (
                  <span className="text-slate-400 font-normal">—</span>
                )}
              </div>
              <span className="text-[12px] text-slate-400 block mt-0.5">School ERP</span>
            </div>
          </div>

          {/* Has Website */}
          <div className="p-3.5 rounded-[10px] bg-slate-50/70 border border-slate-200/80 shadow-2xs flex flex-col justify-between min-h-[82px] max-h-[90px]">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
              Has Website
            </span>
            <div className="mt-1">
              <div className="text-[15px] font-semibold">
                {lead.hasWebsite === true ? (
                  <span className="text-emerald-700 inline-flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Yes</span>
                  </span>
                ) : lead.hasWebsite === false ? (
                  <span className="text-slate-600 inline-flex items-center gap-1">
                    <XCircle className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>No</span>
                  </span>
                ) : (
                  <span className="text-slate-400 font-normal">—</span>
                )}
              </div>
              <span className="text-[12px] text-slate-400 block mt-0.5">Web presence</span>
            </div>
          </div>

          {/* Needs Website */}
          <div className="p-3.5 rounded-[10px] bg-slate-50/70 border border-slate-200/80 shadow-2xs flex flex-col justify-between min-h-[82px] max-h-[90px]">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
              Needs Website
            </span>
            <div className="mt-1">
              <div className="text-[15px] font-semibold">
                {lead.needsWebsite === true ? (
                  <span className="text-blue-700 inline-flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Yes</span>
                  </span>
                ) : lead.needsWebsite === false ? (
                  <span className="text-slate-600 inline-flex items-center gap-1">
                    <XCircle className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>No</span>
                  </span>
                ) : (
                  <span className="text-slate-400 font-normal">—</span>
                )}
              </div>
              <span className="text-[12px] text-slate-400 block mt-0.5">Opportunity</span>
            </div>
          </div>

          {/* Needs ERP */}
          <div className="p-3.5 rounded-[10px] bg-slate-50/70 border border-slate-200/80 shadow-2xs flex flex-col justify-between min-h-[82px] max-h-[90px]">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
              Needs ERP
            </span>
            <div className="mt-1">
              <div className="text-[15px] font-semibold">
                {lead.needsErp === true ? (
                  <span className="text-blue-700 inline-flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Yes</span>
                  </span>
                ) : lead.needsErp === false ? (
                  <span className="text-slate-600 inline-flex items-center gap-1">
                    <XCircle className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>No</span>
                  </span>
                ) : (
                  <span className="text-slate-400 font-normal">—</span>
                )}
              </div>
              <span className="text-[12px] text-slate-400 block mt-0.5">Opportunity</span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Contact History Card (Yaazhi Table Style) */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
        <div className="border-b border-slate-100 pb-3 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-500" />
            <h2 className="text-[13px] font-semibold text-slate-900">Contact History</h2>
          </div>
          <span className="text-xs font-medium text-slate-500">
            {contactLogs.length} {contactLogs.length === 1 ? 'record' : 'records'}
          </span>
        </div>

        {contactLogs.length === 0 ? (
          <div className="p-8 text-center bg-slate-50/50 rounded-lg border border-dashed border-slate-200 space-y-3">
            <History className="w-8 h-8 text-slate-300 mx-auto" />
            <div>
              <p className="text-sm font-semibold text-slate-700">No contacts logged yet</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Start tracking touchpoints, calls, and status updates for this lead.
              </p>
            </div>
            {!isArchived && (
              <button
                type="button"
                onClick={() => {
                  setEditingContact(null)
                  setIsRecordModalOpen(true)
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors cursor-pointer shadow-xs"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Record first contact</span>
              </button>
            )}
          </div>
        ) : (
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs divide-y divide-slate-200">
                <thead className="bg-slate-50/80">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold text-slate-600 uppercase tracking-wider w-[120px]">
                      Date
                    </th>
                    <th className="px-4 py-2.5 font-semibold text-slate-600 uppercase tracking-wider w-[160px]">
                      Status
                    </th>
                    <th className="px-4 py-2.5 font-semibold text-slate-600 uppercase tracking-wider">
                      Notes
                    </th>
                    <th className="px-4 py-2.5 font-semibold text-slate-600 uppercase tracking-wider w-[120px]">
                      Recorded
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
                    return (
                      <tr key={log.id} className="h-[52px] hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-2.5 whitespace-nowrap text-slate-900 font-semibold">
                          {formatDateMedium(log.contactDate)}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <StatusPill status={log.status} fallbackText="—" />
                        </td>
                        <td className="px-4 py-2.5 text-slate-700">
                          {log.notes ? (
                            <span
                              className="line-clamp-2 block cursor-default"
                              title={log.notes}
                            >
                              {log.notes}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">No notes</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-slate-500 font-normal">
                          {formatDateShort(log.createdAt)}
                        </td>
                        {!isArchived && (
                          <td className="px-4 py-2.5 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingContact(log)
                                  setIsRecordModalOpen(true)
                                }}
                                className="p-1.5 text-slate-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors cursor-pointer"
                                title="Edit contact record"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setContactToDelete(log)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors cursor-pointer"
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
          </div>
        )}
      </div>

      {/* 6. Thin Muted Footer Line */}
      <div className="text-xs text-slate-400 text-center py-2 px-1">
        <span>Created {formatDateTimeIST(lead.createdAt)}</span>
        <span className="mx-1.5">·</span>
        <span>Updated {formatDateTimeIST(lead.updatedAt)}</span>
        <span className="mx-1.5">·</span>
        <span>Import: {lead.batch?.fileName || 'Manual entry'}</span>
        {lead.archivedAt && (
          <>
            <span className="mx-1.5">·</span>
            <span className="text-amber-600 font-medium">Archived {formatDateTimeIST(lead.archivedAt)}</span>
          </>
        )}
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
              <span className="font-semibold text-slate-900">{formatDateMedium(contactToDelete.contactDate)}</span>?
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
