import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { useToast } from '../../context/ToastContext'
import { ContactLog } from '../../types'
import { RecordContactDialog } from './RecordContactDialog'
import { StatusPill, useStatusPillWidth } from '../common/StatusPill'
import { formatDateShort, formatDateMedium, formatDateTimeIST } from '../../../lib/date'
import {
  ArrowLeft,
  MapPin,
  ExternalLink,
  AlertTriangle,
  Layers,
  Star,
  CheckCircle2,
  XCircle,
  History,
  Pencil,
  Trash2,
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

  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<ContactLog | null>(null)
  const [contactToDelete, setContactToDelete] = useState<ContactLog | null>(null)

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

  // Fetch statuses
  const { data: statuses = [] } = useQuery({
    queryKey: ['statuses'],
    queryFn: () => api.getStatuses(),
  })

  // Compute shared status pill width
  useStatusPillWidth(statuses)

  // Escape key handler for local dialogs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (contactToDelete) setContactToDelete(null)
        else if (isRecordModalOpen) {
          setIsRecordModalOpen(false)
          setEditingContact(null)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [contactToDelete, isRecordModalOpen])

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
        <div className="bg-white border border-slate-200 rounded-[10px] p-8 text-center">
          <p className="text-[14px] font-semibold text-slate-900 mb-2">Invalid Lead ID</p>
          <Link
            to="/leads"
            className="inline-flex items-center gap-1 text-[13px] font-semibold text-blue-600 hover:text-blue-700"
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
      <div className="max-w-6xl mx-auto space-y-3">
        <div className="h-6 w-24 bg-slate-200 rounded animate-pulse" />
        <div className="h-24 bg-white border border-slate-200 rounded-[10px] animate-pulse" />
        <div className="h-20 bg-white border border-slate-200 rounded-[10px] animate-pulse" />
        <div className="h-20 bg-white border border-slate-200 rounded-[10px] animate-pulse" />
      </div>
    )
  }

  if (isError || !lead) {
    return (
      <div className="max-w-5xl mx-auto p-6 space-y-4">
        <div>
          <Link
            to="/leads"
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Leads</span>
          </Link>
        </div>
        <div className="bg-white border border-slate-200 rounded-[10px] p-8 text-center">
          <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
          <h2 className="text-[15px] font-bold text-slate-900 mb-1">Lead not found</h2>
          <p className="text-[12px] text-slate-500 mb-4">
            {(error as any)?.message || 'The requested lead does not exist or may have been removed.'}
          </p>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => refetch()}
              className="h-8 px-3 text-[13px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              Retry
            </button>
            <Link
              to="/leads"
              className="h-8 px-3 text-[13px] font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors inline-flex items-center"
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
    <div className="max-w-6xl mx-auto space-y-3 pb-6">
      {/* 1. Top Slim Row: Only Back to Leads (13px, ~24px tall) & School Link if applicable */}
      <div className="flex items-center justify-between gap-3 h-6">
        <Link
          to="/leads"
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Leads</span>
        </Link>

        {lead.category?.name.toLowerCase() === 'school' &&
          (lead.school ? (
            <Link
              to={`/school-erp/${lead.school.id}`}
              className="h-7 px-2.5 text-[12px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-lg transition-colors inline-flex items-center gap-1.5 shadow-2xs"
            >
              <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
              <span>Open School</span>
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => moveToSchoolMutation.mutate()}
              disabled={moveToSchoolMutation.isPending}
              className="h-7 px-2.5 text-[12px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-lg transition-colors inline-flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-60"
            >
              <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
              <span>{moveToSchoolMutation.isPending ? 'Moving...' : 'Move to School ERP'}</span>
            </button>
          ))}
      </div>

      {/* 2. Header Card: 14px padding, 44px initials tile, badges row, 20px bold title, 13px address, key figures */}
      <div className="bg-white border border-slate-200 rounded-[10px] p-3.5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Left: 44px initials tile + Middle: badges, title, address */}
          <div className="flex items-start gap-3 min-w-0">
            {/* 44px Initials Tile */}
            <div className="w-11 h-11 rounded-[10px] bg-gradient-to-br from-blue-50 to-indigo-100 border border-blue-200/60 flex items-center justify-center text-blue-700 font-bold text-base shrink-0 shadow-2xs">
              {getInitials(lead.title)}
            </div>

            {/* Middle Info */}
            <div className="min-w-0 space-y-0.5">
              {/* Badges Row */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200/80 rounded text-[11px] font-medium shrink-0">
                  <Layers className="w-3 h-3 text-slate-500" />
                  <span>{lead.category?.name || 'Uncategorized'}</span>
                </span>

                <StatusPill status={currentStatus} fallbackText="Not called" />

                {lead.priority && (
                  <span
                    className={`px-1.5 py-0.5 rounded text-[11px] font-semibold border shrink-0 ${
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

                <span className="text-[11px] text-slate-400 font-medium">Lead #{lead.id}</span>

                {isArchived && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-300 rounded text-[11px] font-semibold shrink-0">
                    Archived
                  </span>
                )}
              </div>

              {/* Lead Title: 20px Bold */}
              <h1 className="text-[20px] font-bold text-slate-900 tracking-tight leading-tight truncate max-w-full" title={lead.title}>
                {lead.title}
              </h1>

              {/* Address: 13px muted Google Maps link with pin icon */}
              {lead.address ? (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[13px] text-slate-500 hover:text-blue-600 inline-flex items-center gap-1 truncate max-w-full transition-colors mt-0.5"
                  title={lead.address}
                >
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{lead.address}</span>
                </a>
              ) : (
                <p className="text-[12px] text-slate-400 italic">No address provided</p>
              )}
            </div>
          </div>

          {/* Right: Key-Figure Blocks (LAST CONTACT, RATING) */}
          <div className="flex items-center gap-5 self-start md:self-auto border-t md:border-t-0 md:border-l border-slate-100 pt-2.5 md:pt-0 md:pl-5 shrink-0">
            {/* LAST CONTACT Block */}
            <div className="space-y-0.5">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 block leading-none">
                Last Contact
              </span>
              <div className="text-[18px] font-semibold text-slate-900 leading-tight">
                {lastContactLog ? formatDateMedium(lastContactLog.contactDate) : '—'}
              </div>
              <div className="text-[11.5px] text-slate-500 leading-none">
                {contactLogs.length > 0
                  ? `${contactLogs.length} ${contactLogs.length === 1 ? 'contact' : 'contacts'} recorded`
                  : 'Never contacted'}
              </div>
            </div>

            {/* RATING Block */}
            <div className="space-y-0.5">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 block leading-none">
                Rating
              </span>
              <div className="text-[18px] font-semibold text-slate-900 leading-tight flex items-center gap-1">
                {lead.reviewRating != null ? (
                  <>
                    <span>{lead.reviewRating}</span>
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                  </>
                ) : (
                  <span>—</span>
                )}
              </div>
              <div className="text-[11.5px] text-slate-500 leading-none">
                {lead.reviewCount != null && lead.reviewCount > 0
                  ? `${lead.reviewCount} reviews`
                  : 'No rating'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Contact Details Card: 3 Equal Tiles (Phone, Emails, Website; Address removed) */}
      <div className="bg-white border border-slate-200 rounded-[10px] p-3.5 shadow-2xs">
        <h2 className="text-[14px] font-semibold text-slate-900 mb-2">Contact Details</h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Phone */}
          <div className="p-[10px_12px] rounded-[10px] bg-slate-50/70 border border-slate-200/80 shadow-2xs flex flex-col justify-between min-h-[66px] max-h-[74px]">
            <span className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-500 block leading-none">
              Phone
            </span>
            <div className="mt-1">
              {lead.phone ? (
                <>
                  <div className="text-[14px] font-medium text-slate-900 truncate leading-snug" title={lead.phone}>
                    {lead.phone}
                  </div>
                  <a
                    href={`tel:${lead.phone}`}
                    className="text-[11.5px] font-medium text-blue-600 hover:underline block truncate leading-none mt-1"
                  >
                    Tap to call
                  </a>
                </>
              ) : (
                <>
                  <div className="text-[14px] font-medium text-slate-400 leading-snug">—</div>
                  <span className="text-[11.5px] text-slate-400 block leading-none mt-1">Not available</span>
                </>
              )}
            </div>
          </div>

          {/* Emails */}
          <div className="p-[10px_12px] rounded-[10px] bg-slate-50/70 border border-slate-200/80 shadow-2xs flex flex-col justify-between min-h-[66px] max-h-[74px]">
            <span className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-500 block leading-none">
              Emails
            </span>
            <div className="mt-1">
              {lead.emails ? (
                <>
                  <div className="text-[14px] font-medium text-slate-900 truncate leading-snug" title={lead.emails}>
                    {lead.emails}
                  </div>
                  <a
                    href={`mailto:${lead.emails}`}
                    className="text-[11.5px] font-medium text-blue-600 hover:underline block truncate leading-none mt-1"
                  >
                    Send email
                  </a>
                </>
              ) : (
                <>
                  <div className="text-[14px] font-medium text-slate-400 leading-snug">—</div>
                  <span className="text-[11.5px] text-slate-400 block leading-none mt-1">Not available</span>
                </>
              )}
            </div>
          </div>

          {/* Website */}
          <div className="p-[10px_12px] rounded-[10px] bg-slate-50/70 border border-slate-200/80 shadow-2xs flex flex-col justify-between min-h-[66px] max-h-[74px]">
            <span className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-500 block leading-none">
              Website
            </span>
            <div className="mt-1">
              {lead.website ? (
                <>
                  <div className="text-[14px] font-medium text-slate-900 truncate leading-snug" title={lead.website}>
                    {lead.website.replace(/^https?:\/\//i, '')}
                  </div>
                  <a
                    href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11.5px] font-medium text-blue-600 hover:underline inline-flex items-center gap-1 leading-none mt-1 truncate"
                  >
                    <span>Opens in new tab</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                </>
              ) : (
                <>
                  <div className="text-[14px] font-medium text-slate-400 leading-snug">—</div>
                  <span className="text-[11.5px] text-slate-400 block leading-none mt-1">No website</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Business Information Card: 6 Equal Tiles (Only Label & Value, ~56px tall) */}
      <div className="bg-white border border-slate-200 rounded-[10px] p-3.5 shadow-2xs">
        <h2 className="text-[14px] font-semibold text-slate-900 mb-2">Business Information</h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {/* Maps Category */}
          <div className="h-[56px] min-h-[56px] p-[8px_10px] rounded-[10px] bg-slate-50/70 border border-slate-200/80 shadow-2xs flex flex-col justify-center">
            <span className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-500 block leading-tight truncate">
              Maps Category
            </span>
            <div className="text-[14px] font-medium text-slate-900 truncate leading-tight mt-0.5" title={lead.mapsCategory || undefined}>
              {lead.mapsCategory || '—'}
            </div>
          </div>

          {/* Priority Score */}
          <div className="h-[56px] min-h-[56px] p-[8px_10px] rounded-[10px] bg-slate-50/70 border border-slate-200/80 shadow-2xs flex flex-col justify-center">
            <span className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-500 block leading-tight truncate">
              Priority Score
            </span>
            <div className="text-[14px] font-medium text-slate-900 truncate leading-tight mt-0.5">
              {lead.priorityScore != null ? lead.priorityScore : '—'}
            </div>
          </div>

          {/* ERP Match */}
          <div className="h-[56px] min-h-[56px] p-[8px_10px] rounded-[10px] bg-slate-50/70 border border-slate-200/80 shadow-2xs flex flex-col justify-center">
            <span className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-500 block leading-tight truncate">
              ERP Match
            </span>
            <div className="text-[14px] font-medium text-slate-900 truncate leading-tight mt-0.5" title={lead.erpMatch || undefined}>
              {lead.erpMatch ? (
                <span className="text-indigo-600 font-semibold">{lead.erpMatch}</span>
              ) : (
                <span className="text-slate-400">—</span>
              )}
            </div>
          </div>

          {/* Has Website */}
          <div className="h-[56px] min-h-[56px] p-[8px_10px] rounded-[10px] bg-slate-50/70 border border-slate-200/80 shadow-2xs flex flex-col justify-center">
            <span className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-500 block leading-tight truncate">
              Has Website
            </span>
            <div className="text-[14px] font-medium leading-tight mt-0.5">
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
                <span className="text-slate-400">—</span>
              )}
            </div>
          </div>

          {/* Needs Website */}
          <div className="h-[56px] min-h-[56px] p-[8px_10px] rounded-[10px] bg-slate-50/70 border border-slate-200/80 shadow-2xs flex flex-col justify-center">
            <span className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-500 block leading-tight truncate">
              Needs Website
            </span>
            <div className="text-[14px] font-medium leading-tight mt-0.5">
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
                <span className="text-slate-400">—</span>
              )}
            </div>
          </div>

          {/* Needs ERP */}
          <div className="h-[56px] min-h-[56px] p-[8px_10px] rounded-[10px] bg-slate-50/70 border border-slate-200/80 shadow-2xs flex flex-col justify-center">
            <span className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-500 block leading-tight truncate">
              Needs ERP
            </span>
            <div className="text-[14px] font-medium leading-tight mt-0.5">
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
                <span className="text-slate-400">—</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 5. Contact History Card: Header at 14px with "N records", 36px header row, 44px rows, compact pill */}
      <div className="bg-white border border-slate-200 rounded-[10px] p-3.5 shadow-2xs">
        <div className="border-b border-slate-100 pb-2 mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-500" />
            <h2 className="text-[14px] font-semibold text-slate-900">Contact History</h2>
          </div>
          <span className="text-[12px] font-medium text-slate-500">
            {contactLogs.length} {contactLogs.length === 1 ? 'record' : 'records'}
          </span>
        </div>

        {contactLogs.length === 0 ? (
          <div className="p-6 text-center bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
            <History className="w-6 h-6 text-slate-300 mx-auto mb-1" />
            <p className="text-[13px] font-semibold text-slate-700">No contacts logged yet</p>
            <p className="text-[11.5px] text-slate-400 mt-0.5">
              Contact logs recorded from the Leads table will appear here.
            </p>
          </div>
        ) : (
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px] divide-y divide-slate-200">
                <thead className="bg-slate-50/80 h-9">
                  <tr>
                    <th className="px-3 text-left font-semibold text-slate-600 uppercase text-[11px] tracking-wider w-[120px]">
                      Date
                    </th>
                    <th className="px-3 text-center font-semibold text-slate-600 uppercase text-[11px] tracking-wider w-[150px]">
                      Status
                    </th>
                    <th className="px-3 text-left font-semibold text-slate-600 uppercase text-[11px] tracking-wider">
                      Notes
                    </th>
                    <th className="px-3 text-left font-semibold text-slate-600 uppercase text-[11px] tracking-wider w-[110px]">
                      Recorded
                    </th>
                    {!isArchived && (
                      <th className="px-3 text-right font-semibold text-slate-600 uppercase text-[11px] tracking-wider w-[70px]">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {contactLogs.map((log) => {
                    return (
                      <tr key={log.id} className="h-[44px] hover:bg-slate-50/70 transition-colors">
                        <td className="px-3 py-2 whitespace-nowrap text-slate-900 font-semibold">
                          {formatDateMedium(log.contactDate)}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-center">
                          <div className="flex justify-center">
                            <StatusPill status={log.status} fallbackText="—" />
                          </div>
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          {log.notes ? (
                            <span
                              className="line-clamp-2 block cursor-default leading-snug"
                              title={log.notes}
                            >
                              {log.notes}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">No notes</span>
                          )}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-slate-500 font-normal text-[12px]">
                          {formatDateShort(log.createdAt)}
                        </td>
                        {!isArchived && (
                          <td className="px-3 py-2 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingContact(log)
                                  setIsRecordModalOpen(true)
                                }}
                                className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                                title="Edit contact record"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setContactToDelete(log)}
                                className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
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
      <div className="text-[11px] text-slate-400 text-center py-1.5 px-1">
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

      {/* Record Contact Modal (Only opened when editing an existing contact log) */}
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
          <div className="bg-white border border-slate-200 rounded-[10px] max-w-sm w-full p-4 shadow-xl space-y-3">
            <div className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <h3 className="text-[14px] font-bold text-slate-900">Delete Contact Record?</h3>
            </div>
            <p className="text-[13px] text-slate-600">
              Are you sure you want to delete this contact log from{' '}
              <strong className="text-slate-900">{formatDateMedium(contactToDelete.contactDate)}</strong>?
              The lead's status will update to match its latest remaining log.
            </p>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setContactToDelete(null)}
                className="h-8 px-3 text-[13px] font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteContactMutation.mutate(contactToDelete.id)}
                disabled={deleteContactMutation.isPending}
                className="h-8 px-3 text-[13px] font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg cursor-pointer transition-colors shadow-xs disabled:opacity-60"
              >
                {deleteContactMutation.isPending ? 'Deleting...' : 'Delete Log'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
