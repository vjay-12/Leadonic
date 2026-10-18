import React, { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { useToast } from '../../context/ToastContext'
import { ContactLog } from '../../types'
import { AddLeadModal } from './AddLeadModal'
import { RecordContactDialog } from './RecordContactDialog'
import { formatDateShort, formatDateTimeIST } from '../../../lib/date'
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
  Layers,
  Star,
  CheckCircle2,
  XCircle,
  PhoneCall,
  History,
  Pencil,
  GraduationCap,
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
  const statusColor = currentStatus?.color || '#64748B'

  return (
    <div className="max-w-6xl mx-auto space-y-3 pb-8">
      {/* 1. Header Card (Compact Yaazhi Style) */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs">
        <div className="mb-2">
          <Link
            to="/leads"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Leads</span>
          </Link>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Title (~22px) and Badges on the same row */}
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <h1 className="text-[22px] font-bold text-slate-900 tracking-tight truncate max-w-full" title={lead.title}>
              {lead.title}
            </h1>

            {/* Category badge */}
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-slate-100 text-slate-700 border border-slate-200/80 rounded-md text-xs font-medium shrink-0">
              <Layers className="w-3 h-3 text-slate-500" />
              <span>{lead.category?.name || 'Uncategorized'}</span>
            </span>

            {/* Status pill (read-only) */}
            {currentStatus ? (
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border shrink-0"
                style={{
                  backgroundColor: `${statusColor}15`,
                  borderColor: `${statusColor}40`,
                  color: statusColor,
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: statusColor }} />
                <span>{currentStatus.name}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                <span>Not called</span>
              </span>
            )}

            {/* Priority badge */}
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
                {lead.priority} Priority
              </span>
            )}

            {/* Phone call button */}
            {lead.phone && (
              <a
                href={`tel:${lead.phone}`}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-xs font-semibold hover:bg-emerald-100 transition-colors shrink-0"
                title={`Call ${lead.phone}`}
              >
                <Phone className="w-3 h-3 text-emerald-600 shrink-0" />
                <span>{lead.phone}</span>
              </a>
            )}

            {isArchived && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-300 rounded-md text-xs font-semibold shrink-0">
                <Archive className="w-3 h-3 text-amber-600" />
                <span>Archived</span>
              </span>
            )}
          </div>

          {/* Action buttons at top right */}
          <div className="flex items-center gap-2 shrink-0 self-start md:self-auto">
            {lead.category?.name.toLowerCase() === 'school' &&
              (lead.school ? (
                <Link
                  to={`/school-erp/${lead.school.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-md transition-colors shadow-2xs"
                >
                  <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Open school</span>
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
      </div>

      {/* 2. ONE compact Lead Details Card */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs">
        <h2 className="text-[13px] font-semibold text-slate-900 mb-2.5">Lead Details</h2>

        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
          {/* 1. Phone */}
          <div className="p-2.5 rounded-[10px] bg-slate-50/70 border border-slate-200/80 shadow-2xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
              Phone
            </span>
            <div className="text-sm font-medium text-slate-900 mt-1 truncate">
              {lead.phone ? (
                <a
                  href={`tel:${lead.phone}`}
                  className="text-blue-600 hover:text-blue-800 hover:underline truncate block"
                  title={lead.phone}
                >
                  {lead.phone}
                </a>
              ) : (
                <span className="text-slate-400 font-normal">—</span>
              )}
            </div>
          </div>

          {/* 2. Emails */}
          <div className="p-2.5 rounded-[10px] bg-slate-50/70 border border-slate-200/80 shadow-2xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
              Emails
            </span>
            <div className="text-sm font-medium text-slate-900 mt-1 truncate">
              {lead.emails ? (
                <a
                  href={`mailto:${lead.emails}`}
                  className="text-blue-600 hover:text-blue-800 hover:underline truncate block"
                  title={lead.emails}
                >
                  {lead.emails}
                </a>
              ) : (
                <span className="text-slate-400 font-normal">—</span>
              )}
            </div>
          </div>

          {/* 3. Website */}
          <div className="p-2.5 rounded-[10px] bg-slate-50/70 border border-slate-200/80 shadow-2xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
              Website
            </span>
            <div className="text-sm font-medium text-slate-900 mt-1 truncate">
              {lead.website ? (
                <a
                  href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1 truncate max-w-full"
                  title={lead.website}
                >
                  <span className="truncate">{lead.website.replace(/^https?:\/\//i, '')}</span>
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              ) : (
                <span className="text-slate-400 font-normal">—</span>
              )}
            </div>
          </div>

          {/* 4. Address (spans 2 columns) */}
          <div className="col-span-2 p-2.5 rounded-[10px] bg-slate-50/70 border border-slate-200/80 shadow-2xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
              Address
            </span>
            <div className="text-sm font-medium text-slate-900 mt-1 truncate">
              {lead.address ? (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1.5 truncate max-w-full"
                  title={lead.address}
                >
                  <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  <span className="truncate">{lead.address}</span>
                </a>
              ) : (
                <span className="text-slate-400 font-normal">—</span>
              )}
            </div>
          </div>

          {/* 5. Maps Category */}
          <div className="p-2.5 rounded-[10px] bg-slate-50/70 border border-slate-200/80 shadow-2xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
              Maps Category
            </span>
            <div className="text-sm font-medium text-slate-900 mt-1 truncate" title={lead.mapsCategory || ''}>
              {lead.mapsCategory ? (
                <span className="truncate block">{lead.mapsCategory}</span>
              ) : (
                <span className="text-slate-400 font-normal">—</span>
              )}
            </div>
          </div>

          {/* 6. Rating & Reviews */}
          <div className="p-2.5 rounded-[10px] bg-slate-50/70 border border-slate-200/80 shadow-2xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
              Rating & Reviews
            </span>
            <div className="text-sm font-medium text-slate-900 mt-1 truncate">
              {lead.reviewRating != null ? (
                <span
                  className="inline-flex items-center gap-1 truncate"
                  title={`${lead.reviewRating} rating from ${lead.reviewCount || 0} reviews`}
                >
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500 shrink-0" />
                  <span>
                    {lead.reviewRating} ★ ({lead.reviewCount || 0})
                  </span>
                </span>
              ) : (
                <span className="text-slate-400 font-normal">—</span>
              )}
            </div>
          </div>

          {/* 7. Priority Score */}
          <div className="p-2.5 rounded-[10px] bg-slate-50/70 border border-slate-200/80 shadow-2xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
              Priority Score
            </span>
            <div className="text-sm font-medium text-slate-900 mt-1 truncate">
              {lead.priorityScore != null ? (
                <span>{lead.priorityScore}</span>
              ) : (
                <span className="text-slate-400 font-normal">—</span>
              )}
            </div>
          </div>

          {/* 8. ERP Match */}
          <div className="p-2.5 rounded-[10px] bg-slate-50/70 border border-slate-200/80 shadow-2xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
              ERP Match
            </span>
            <div className="text-sm font-medium text-slate-900 mt-1 truncate" title={lead.erpMatch || ''}>
              {lead.erpMatch ? (
                <span className="truncate block">{lead.erpMatch}</span>
              ) : (
                <span className="text-slate-400 font-normal">—</span>
              )}
            </div>
          </div>

          {/* 9. Has Website */}
          <div className="p-2.5 rounded-[10px] bg-slate-50/70 border border-slate-200/80 shadow-2xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
              Has Website
            </span>
            <div className="text-sm font-medium mt-1 truncate">
              {lead.hasWebsite === true ? (
                <span className="text-emerald-700 inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Yes</span>
                </span>
              ) : lead.hasWebsite === false ? (
                <span className="text-slate-600 inline-flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>No</span>
                </span>
              ) : (
                <span className="text-slate-400 font-normal">—</span>
              )}
            </div>
          </div>

          {/* 10. Needs Website */}
          <div className="p-2.5 rounded-[10px] bg-slate-50/70 border border-slate-200/80 shadow-2xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
              Needs Website
            </span>
            <div className="text-sm font-medium mt-1 truncate">
              {lead.needsWebsite === true ? (
                <span className="text-blue-700 inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Yes</span>
                </span>
              ) : lead.needsWebsite === false ? (
                <span className="text-slate-600 inline-flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>No</span>
                </span>
              ) : (
                <span className="text-slate-400 font-normal">—</span>
              )}
            </div>
          </div>

          {/* 11. Needs ERP */}
          <div className="p-2.5 rounded-[10px] bg-slate-50/70 border border-slate-200/80 shadow-2xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
              Needs ERP
            </span>
            <div className="text-sm font-medium mt-1 truncate">
              {lead.needsErp === true ? (
                <span className="text-blue-700 inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Yes</span>
                </span>
              ) : lead.needsErp === false ? (
                <span className="text-slate-600 inline-flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>No</span>
                </span>
              ) : (
                <span className="text-slate-400 font-normal">—</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Contact History Card */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs">
        <div className="border-b border-slate-100 pb-2.5 mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-500" />
            <h2 className="text-[13px] font-semibold text-slate-900">Contact History</h2>
          </div>
          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded-full text-xs font-medium">
            {contactLogs.length} {contactLogs.length === 1 ? 'record' : 'records'}
          </span>
        </div>

        {contactLogs.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
            No contacts logged yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3.5 py-2 font-semibold text-slate-600 uppercase tracking-wider w-[120px]">
                    Date
                  </th>
                  <th className="px-3.5 py-2 font-semibold text-slate-600 uppercase tracking-wider w-[160px]">
                    Status
                  </th>
                  <th className="px-3.5 py-2 font-semibold text-slate-600 uppercase tracking-wider">
                    Notes
                  </th>
                  {!isArchived && (
                    <th className="px-3.5 py-2 font-semibold text-slate-600 uppercase tracking-wider text-right w-[70px]">
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
                      <td className="px-3.5 py-2.5 whitespace-nowrap text-slate-700 font-medium">
                        {formatDateShort(log.contactDate)}
                      </td>
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
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
                      <td className="px-3.5 py-2.5 text-slate-700 break-words whitespace-pre-wrap">
                        {log.notes || <span className="text-slate-400 italic">No notes</span>}
                      </td>
                      {!isArchived && (
                        <td className="px-3.5 py-2.5 whitespace-nowrap text-right">
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

      {/* 4. Thin Muted Footer Line */}
      <div className="text-xs text-slate-400 text-center py-2 px-1">
        <span>Created {formatDateTimeIST(lead.createdAt)}</span>
        <span className="mx-1.5">·</span>
        <span>Updated {formatDateTimeIST(lead.updatedAt)}</span>
        <span className="mx-1.5">·</span>
        <span>Import: {lead.batch?.fileName || 'Manual entry'}</span>
        {lead.archivedAt && (
          <>
            <span className="mx-1.5">·</span>
            <span className="text-amber-600">Archived {formatDateTimeIST(lead.archivedAt)}</span>
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
