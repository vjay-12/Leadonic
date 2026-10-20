import React from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { useToast } from '../../context/ToastContext'
import { StatusPill, useStatusPillWidth } from '../common/StatusPill'
import { formatDateMedium, formatDateTimeIST } from '../../../lib/date'
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
      <div className="w-full flex-1 flex flex-col items-center justify-center py-12">
        <div className="bg-white border border-slate-200 rounded-[10px] p-8 text-center max-w-sm w-full shadow-2xs">
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
      <div className="w-full flex-1 flex flex-col space-y-3">
        <div className="h-6 w-28 bg-slate-200 rounded animate-pulse" />
        <div className="h-28 bg-white border border-slate-200 rounded-[10px] animate-pulse" />
        <div className="h-28 bg-white border border-slate-200 rounded-[10px] animate-pulse" />
        <div className="h-24 bg-white border border-slate-200 rounded-[10px] animate-pulse" />
        <div className="flex-1 min-h-[160px] bg-white border border-slate-200 rounded-[10px] animate-pulse" />
      </div>
    )
  }

  if (isError || !lead) {
    return (
      <div className="w-full flex-1 flex flex-col space-y-4">
        <div>
          <Link
            to="/leads"
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Leads</span>
          </Link>
        </div>
        <div className="bg-white border border-slate-200 rounded-[10px] p-8 text-center max-w-md mx-auto shadow-2xs">
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
    <div className="w-full flex-1 flex flex-col space-y-3">
      {/* 1. Top Slim Row: Only Back to Leads (13px, ~24px tall) & School Link if applicable */}
      <div className="flex items-center justify-between gap-3 h-6 shrink-0">
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

      {/* 2. Header Card: 14px padding, 44px initials, badges, 20px title, address link, 4 key figure cells on right */}
      <div className="bg-white border border-slate-200 rounded-[10px] p-3.5 shadow-2xs shrink-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
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

          {/* Right: Row of Four Key Figures (LAST CONTACT, CONTACTS, RATING, PRIORITY) */}
          <div className="flex items-center divide-x divide-slate-100 border-t lg:border-t-0 lg:border-l border-slate-100 pt-2.5 lg:pt-0 lg:pl-4 shrink-0 overflow-x-auto">
            {/* 1. LAST CONTACT */}
            <div className="min-w-[120px] px-3 first:pl-0 space-y-0.5">
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

            {/* 2. CONTACTS */}
            <div className="min-w-[120px] px-3 space-y-0.5">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 block leading-none">
                Contacts
              </span>
              <div className="text-[18px] font-semibold text-slate-900 leading-tight">
                {contactLogs.length > 0 ? contactLogs.length : '—'}
              </div>
              <div className="text-[11.5px] text-slate-500 leading-none">
                {contactLogs.length > 0
                  ? `${contactLogs.length} ${contactLogs.length === 1 ? 'total log' : 'total logs'}`
                  : 'No history'}
              </div>
            </div>

            {/* 3. RATING */}
            <div className="min-w-[120px] px-3 space-y-0.5">
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
                  ? `${lead.reviewCount} ${lead.reviewCount === 1 ? 'review' : 'reviews'}`
                  : 'No rating'}
              </div>
            </div>

            {/* 4. PRIORITY */}
            <div className="min-w-[120px] px-3 last:pr-0 space-y-0.5">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 block leading-none">
                Priority
              </span>
              <div className="text-[18px] font-semibold text-slate-900 leading-tight">
                {lead.priority || '—'}
              </div>
              <div className="text-[11.5px] text-slate-500 leading-none">
                {lead.priorityScore != null ? `Score ${lead.priorityScore}` : 'No score'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Contact Details Card: 3 Equal Tiles (Phone, Emails, Website) */}
      <div className="bg-white border border-slate-200 rounded-[10px] p-3.5 shadow-2xs shrink-0">
        <h2 className="text-[14px] font-semibold text-slate-900 mb-2">Contact Details</h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Phone */}
          <div className="p-[10px_12px] rounded-[10px] bg-slate-50/70 border border-slate-200/80 shadow-2xs flex flex-col justify-between h-[76px]">
            <span className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-500 block leading-none h-3.5">
              Phone
            </span>
            <div className="text-[14px] font-medium text-slate-900 truncate leading-5 h-5" title={lead.phone || undefined}>
              {lead.phone || '—'}
            </div>
            <div className="text-[11.5px] font-medium leading-4 h-4 truncate">
              {lead.phone ? (
                <a href={`tel:${lead.phone}`} className="text-blue-600 hover:underline block truncate">
                  Tap to call
                </a>
              ) : (
                <span className="text-slate-400">Not available</span>
              )}
            </div>
          </div>

          {/* Emails */}
          <div className="p-[10px_12px] rounded-[10px] bg-slate-50/70 border border-slate-200/80 shadow-2xs flex flex-col justify-between h-[76px]">
            <span className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-500 block leading-none h-3.5">
              Emails
            </span>
            <div className="text-[14px] font-medium text-slate-900 truncate leading-5 h-5" title={lead.emails || undefined}>
              {lead.emails || '—'}
            </div>
            <div className="text-[11.5px] font-medium leading-4 h-4 truncate">
              {lead.emails ? (
                <a href={`mailto:${lead.emails}`} className="text-blue-600 hover:underline block truncate">
                  Send email
                </a>
              ) : (
                <span className="text-slate-400">Not available</span>
              )}
            </div>
          </div>

          {/* Website */}
          <div className="p-[10px_12px] rounded-[10px] bg-slate-50/70 border border-slate-200/80 shadow-2xs flex flex-col justify-between h-[76px]">
            <span className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-500 block leading-none h-3.5">
              Website
            </span>
            <div className="text-[14px] font-medium text-slate-900 truncate leading-5 h-5" title={lead.website || undefined}>
              {lead.website ? lead.website.replace(/^https?:\/\//i, '') : '—'}
            </div>
            <div className="text-[11.5px] font-medium leading-4 h-4 truncate">
              {lead.website ? (
                <a
                  href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline inline-flex items-center gap-1 truncate"
                >
                  <span>Opens in new tab</span>
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              ) : (
                <span className="text-slate-400">No website</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Business Information Card: 6 Equal Tiles (Only Label & Value, ~56px tall) */}
      <div className="bg-white border border-slate-200 rounded-[10px] p-3.5 shadow-2xs shrink-0">
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
              {lead.erpMatch || '—'}
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

      {/* 5. Contact History Card: flex-1 flex flex-col, stretches to bottom */}
      <div className="bg-white border border-slate-200 rounded-[10px] p-3.5 shadow-2xs flex-1 flex flex-col">
        <div className="border-b border-slate-100 pb-2 mb-2.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-500" />
            <h2 className="text-[14px] font-semibold text-slate-900">Contact History</h2>
          </div>
          <span className="text-[12px] font-medium text-slate-500">
            {contactLogs.length} {contactLogs.length === 1 ? 'record' : 'records'}
          </span>
        </div>

        {contactLogs.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-slate-50/40 rounded-lg border border-dashed border-slate-200">
            <History className="w-6 h-6 text-slate-300 mx-auto mb-1" />
            <p className="text-[13px] font-semibold text-slate-700">No contacts logged yet</p>
            <p className="text-[11.5px] text-slate-400 mt-0.5">
              Contact logs recorded from the Leads table will appear here.
            </p>
          </div>
        ) : (
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-left text-[13px] table-fixed divide-y divide-slate-200">
              <thead className="bg-slate-50/80 h-9">
                <tr>
                  <th className="px-3 text-left font-semibold text-slate-600 uppercase text-[11px] tracking-wider w-[140px] whitespace-nowrap">
                    Date
                  </th>
                  <th className="px-3 text-center font-semibold text-slate-600 uppercase text-[11px] tracking-wider w-[calc(var(--status-pill-width,107px)+24px)] whitespace-nowrap">
                    Status
                  </th>
                  <th className="px-3 text-left font-semibold text-slate-600 uppercase text-[11px] tracking-wider">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {contactLogs.map((log) => (
                  <tr key={log.id} className="min-h-[44px] hover:bg-slate-50/70 transition-colors">
                    <td className="px-3 py-2.5 whitespace-nowrap text-slate-900 font-semibold align-top w-[140px]">
                      {formatDateMedium(log.contactDate)}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-center align-top w-[calc(var(--status-pill-width,107px)+24px)]">
                      <div className="flex justify-center">
                        <StatusPill status={log.status} fallbackText="—" />
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-slate-700 text-[13px] leading-relaxed break-words whitespace-pre-wrap align-top">
                      {log.notes?.trim() ? (
                        <span>{log.notes.trim()}</span>
                      ) : (
                        <span className="text-slate-400 font-normal">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 6. Thin Muted Footer Line: Pinned at the bottom with 12px margin */}
      <div className="mt-3 text-[11px] text-slate-400 text-center py-1 px-1 shrink-0">
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
    </div>
  )
}
