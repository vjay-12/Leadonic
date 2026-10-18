import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { useToast } from '../../context/ToastContext'
import { SchoolContact, SchoolMeeting } from '../../types'
import { formatDateMedium, formatDateTimeIST } from '../../../lib/date'
import { RecordMeetingDialog } from './RecordMeetingDialog'
import { StatusPill, useStatusPillWidth } from '../common/StatusPill'
import {
  ArrowLeft,
  MapPin,
  Users,
  Edit3,
  Archive,
  RotateCcw,
  Trash2,
  AlertCircle,
  Plus,
  ExternalLink,
  PhoneCall,
  History,
  Pencil,
  GraduationCap,
  X,
} from 'lucide-react'

const ROLE_SUGGESTIONS = ['Principal', 'Correspondent', 'Administrator', 'Accountant', 'Teacher', 'Other']

function getInitials(name?: string): string {
  if (!name) return 'S'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export const SchoolDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const schoolId = parseInt(id || '', 10)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { success, error: toastError } = useToast()

  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isRecordMeetingOpen, setIsRecordMeetingOpen] = useState(false)
  const [meetingToEdit, setMeetingToEdit] = useState<SchoolMeeting | null>(null)
  const [meetingToDelete, setMeetingToDelete] = useState<SchoolMeeting | null>(null)

  // Contacts modal state
  const [isContactModalOpen, setIsContactModalOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<SchoolContact | null>(null)
  const [contactToDelete, setContactToDelete] = useState<SchoolContact | null>(null)

  // School archive / delete confirmation
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Edit School form state
  const [editName, setEditName] = useState('')
  const [editArea, setEditArea] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editWebsite, setEditWebsite] = useState('')
  const [editStrength, setEditStrength] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [schoolFormError, setSchoolFormError] = useState<string | null>(null)

  // Contact form state
  const [contactName, setContactName] = useState('')
  const [contactRole, setContactRole] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactNotes, setContactNotes] = useState('')
  const [contactIsPrimary, setContactIsPrimary] = useState(false)
  const [contactFormError, setContactFormError] = useState<string | null>(null)

  // Fetch School Stages
  const { data: stages = [] } = useQuery({
    queryKey: ['schoolStages'],
    queryFn: () => api.getSchoolStages(),
  })

  // Synchronize status pill width across stage lists
  useStatusPillWidth(stages)

  // Fetch School Data
  const {
    data: school,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['school', schoolId],
    queryFn: () => api.getSchool(schoolId),
    enabled: !isNaN(schoolId),
  })

  // Escape key handler for all dialogs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (contactToDelete) setContactToDelete(null)
        else if (meetingToDelete) setMeetingToDelete(null)
        else if (showArchiveConfirm) setShowArchiveConfirm(false)
        else if (showDeleteConfirm) setShowDeleteConfirm(false)
        else if (isContactModalOpen) setIsContactModalOpen(false)
        else if (isEditModalOpen) setIsEditModalOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    contactToDelete,
    meetingToDelete,
    showArchiveConfirm,
    showDeleteConfirm,
    isContactModalOpen,
    isEditModalOpen,
  ])

  // Update School Mutation
  const updateSchoolMutation = useMutation({
    mutationFn: (data: any) => api.updateSchool(schoolId, data),
    onSuccess: (updated) => {
      queryClient.setQueryData(['school', schoolId], updated)
      queryClient.invalidateQueries({ queryKey: ['schools'] })
      queryClient.invalidateQueries({ queryKey: ['schoolAreas'] })
      success('School details updated')
      setIsEditModalOpen(false)
    },
    onError: (err: any) => {
      const msg = err.message || 'Failed to update school'
      setSchoolFormError(msg)
      toastError(msg)
    },
  })

  // Archive Mutation
  const archiveMutation = useMutation({
    mutationFn: () => api.archiveSchool(schoolId),
    onSuccess: (updated) => {
      queryClient.setQueryData(['school', schoolId], updated)
      queryClient.invalidateQueries({ queryKey: ['schools'] })
      setShowArchiveConfirm(false)
      success('School archived')
    },
    onError: (err: any) => toastError(err.message || 'Failed to archive school'),
  })

  // Restore Mutation
  const restoreMutation = useMutation({
    mutationFn: () => api.restoreSchool(schoolId),
    onSuccess: (updated) => {
      queryClient.setQueryData(['school', schoolId], updated)
      queryClient.invalidateQueries({ queryKey: ['schools'] })
      success('School restored')
    },
    onError: (err: any) => toastError(err.message || 'Failed to restore school'),
  })

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: () => api.deleteSchool(schoolId),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['schools'] })
      success(
        `School deleted permanently (${res.deletedContactsCount || 0} contacts and ${
          res.deletedMeetingsCount || 0
        } meetings removed)`
      )
      navigate('/school-erp')
    },
    onError: (err: any) => toastError(err.message || 'Failed to delete school'),
  })

  // Contact Mutations
  const saveContactMutation = useMutation({
    mutationFn: (data: any) => {
      if (editingContact) {
        return api.updateSchoolContact(editingContact.id, data)
      }
      return api.createSchoolContact(schoolId, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school', schoolId] })
      queryClient.invalidateQueries({ queryKey: ['schools'] })
      success(editingContact ? 'Contact updated' : 'Contact added')
      setIsContactModalOpen(false)
    },
    onError: (err: any) => {
      const msg = err.message || 'Failed to save contact'
      setContactFormError(msg)
      toastError(msg)
    },
  })

  const deleteContactMutation = useMutation({
    mutationFn: (contactId: number) => api.deleteSchoolContact(contactId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school', schoolId] })
      queryClient.invalidateQueries({ queryKey: ['schools'] })
      setContactToDelete(null)
      success('Contact deleted')
    },
    onError: (err: any) => toastError(err.message || 'Failed to delete contact'),
  })

  const makePrimaryMutation = useMutation({
    mutationFn: (contactId: number) => api.updateSchoolContact(contactId, { isPrimary: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school', schoolId] })
      queryClient.invalidateQueries({ queryKey: ['schools'] })
      success('Primary contact updated')
    },
    onError: (err: any) => toastError(err.message || 'Failed to set primary contact'),
  })

  // Meeting Delete Mutation
  const deleteMeetingMutation = useMutation({
    mutationFn: (meetingId: number) => api.deleteSchoolMeeting(meetingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school', schoolId] })
      queryClient.invalidateQueries({ queryKey: ['schools'] })
      setMeetingToDelete(null)
      success('Meeting deleted')
    },
    onError: (err: any) => toastError(err.message || 'Failed to delete meeting'),
  })

  if (isNaN(schoolId)) {
    return (
      <div className="p-8 bg-white border border-rose-200 rounded-lg text-center max-w-md mx-auto mt-12">
        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
        <h2 className="text-base font-semibold text-slate-900">Invalid School ID</h2>
        <Link to="/school-erp" className="text-xs text-blue-600 hover:underline mt-3 inline-block">
          &larr; Back to School ERP
        </Link>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="h-6 w-32 bg-slate-200 rounded animate-pulse" />
        <div className="h-44 bg-white border border-slate-200 rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-64 bg-white border border-slate-200 rounded-xl animate-pulse" />
          <div className="h-64 bg-white border border-slate-200 rounded-xl animate-pulse" />
        </div>
      </div>
    )
  }

  if (isError || !school) {
    return (
      <div className="p-8 bg-white border border-rose-200 rounded-lg text-center max-w-md mx-auto mt-12">
        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
        <h2 className="text-base font-semibold text-slate-900">School Not Found</h2>
        <p className="text-xs text-slate-500 mt-1 mb-4">
          {(error as any)?.message || 'The requested school could not be loaded.'}
        </p>
        <div className="flex justify-center gap-3">
          <button
            onClick={() => refetch()}
            className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700 cursor-pointer"
          >
            Retry
          </button>
          <Link
            to="/school-erp"
            className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded text-xs font-semibold hover:bg-slate-200"
          >
            Back to School ERP
          </Link>
        </div>
      </div>
    )
  }

  const isArchived = Boolean(school.archivedAt)
  const currentStage = school.stage
  const contacts = school.contacts || []
  const meetings = school.meetings || []
  const primaryContact = contacts.find((c) => c.isPrimary) || contacts[0]
  const lastMeeting = meetings[0]

  const openEditModal = () => {
    setEditName(school.name)
    setEditArea(school.area || '')
    setEditAddress(school.address || '')
    setEditPhone(school.phone || '')
    setEditEmail(school.email || '')
    setEditWebsite(school.website || '')
    setEditStrength(school.studentStrength ? String(school.studentStrength) : '')
    setEditNotes(school.notes || '')
    setSchoolFormError(null)
    setIsEditModalOpen(true)
  }

  const openAddContactModal = () => {
    setEditingContact(null)
    setContactName('')
    setContactRole('')
    setContactPhone('')
    setContactEmail('')
    setContactNotes('')
    setContactIsPrimary(contacts.length === 0)
    setContactFormError(null)
    setIsContactModalOpen(true)
  }

  const openEditContactModal = (c: SchoolContact) => {
    setEditingContact(c)
    setContactName(c.name)
    setContactRole(c.role || '')
    setContactPhone(c.phone || '')
    setContactEmail(c.email || '')
    setContactNotes(c.notes || '')
    setContactIsPrimary(c.isPrimary)
    setContactFormError(null)
    setIsContactModalOpen(true)
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4 pb-8">
      {/* 1. Top Action Toolbar Row (Outside & Above Header Card) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <Link
          to="/school-erp"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to School ERP</span>
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          {school.lead && (
            <Link
              to={`/leads/${school.lead.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-md transition-colors shadow-2xs"
            >
              <span>Linked Lead #{school.lead.id}</span>
              <ExternalLink className="w-3 h-3 text-blue-600" />
            </Link>
          )}

          {!isArchived ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setMeetingToEdit(null)
                  setIsRecordMeetingOpen(true)
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors cursor-pointer shadow-2xs"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Record Meeting</span>
              </button>

              <button
                type="button"
                onClick={openEditModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors cursor-pointer shadow-2xs"
              >
                <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                <span>Edit</span>
              </button>

              <button
                type="button"
                onClick={() => setShowArchiveConfirm(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-300 hover:bg-amber-100 rounded-md transition-colors cursor-pointer shadow-2xs"
              >
                <Archive className="w-3.5 h-3.5 text-amber-600" />
                <span>Archive</span>
              </button>
            </>
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
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-50 to-blue-100 border border-indigo-200/60 flex items-center justify-center text-indigo-700 font-bold text-lg shrink-0 shadow-2xs">
              {getInitials(school.name)}
            </div>

            {/* Middle Info */}
            <div className="min-w-0 space-y-1">
              {/* Badge Row */}
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill status={currentStage} fallbackText="Not started" />

                {school.area && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-slate-100 text-slate-700 border border-slate-200/80 rounded-md text-xs font-medium shrink-0">
                    <MapPin className="w-3 h-3 text-slate-500" />
                    <span>{school.area}</span>
                  </span>
                )}

                {school.studentStrength != null && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200/80 rounded-md text-xs font-semibold shrink-0">
                    <GraduationCap className="w-3 h-3 text-indigo-600" />
                    <span>{school.studentStrength.toLocaleString()} students</span>
                  </span>
                )}

                <span className="text-xs text-slate-400 font-medium">School #{school.id}</span>

                {isArchived && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-300 rounded-md text-xs font-semibold shrink-0">
                    <Archive className="w-3 h-3 text-amber-600" />
                    <span>Archived</span>
                  </span>
                )}
              </div>

              {/* School Name (~24px, Bold) */}
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight truncate max-w-full" title={school.name}>
                {school.name}
              </h1>

              {/* Address Subtitle with Ellipsis */}
              {school.address ? (
                <p className="text-xs text-slate-500 flex items-center gap-1.5 truncate" title={school.address}>
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{school.address}</span>
                </p>
              ) : (
                <p className="text-xs text-slate-400 italic">No address provided</p>
              )}
            </div>
          </div>

          {/* Right: Key-Figure Blocks (Yaazhi Style) */}
          <div className="flex items-center gap-6 self-start md:self-auto border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-6 shrink-0">
            {/* LAST MEETING Block */}
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Last Meeting
              </span>
              <div className="text-[17px] font-bold text-slate-900 leading-tight">
                {lastMeeting ? formatDateMedium(lastMeeting.meetingDate) : 'Never'}
              </div>
              <div className="text-[11px] text-slate-500">
                {meetings.length > 0
                  ? `${meetings.length} ${meetings.length === 1 ? 'meeting' : 'meetings'} recorded`
                  : 'No meetings yet'}
              </div>
            </div>

            {/* CAMPUS CONTACTS Block */}
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Campus Contacts
              </span>
              <div className="text-[17px] font-bold text-slate-900 leading-tight">
                {contacts.length} {contacts.length === 1 ? 'Contact' : 'Contacts'}
              </div>
              <div className="text-[11px] text-slate-500 truncate max-w-[140px]" title={primaryContact ? primaryContact.name : ''}>
                {primaryContact ? primaryContact.name : 'No contacts'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Campus Details Card (4 Equal Tiles) */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
        <h2 className="text-[13px] font-semibold text-slate-900 mb-3">Campus Details</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Phone */}
          <div className="p-3.5 rounded-[10px] bg-slate-50/70 border border-slate-200/80 shadow-2xs flex flex-col justify-between min-h-[82px] max-h-[90px]">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
              Phone
            </span>
            <div className="mt-1">
              {school.phone ? (
                <>
                  <div className="text-[15px] font-semibold text-slate-900 truncate" title={school.phone}>
                    {school.phone}
                  </div>
                  <a
                    href={`tel:${school.phone}`}
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

          {/* Official Email */}
          <div className="p-3.5 rounded-[10px] bg-slate-50/70 border border-slate-200/80 shadow-2xs flex flex-col justify-between min-h-[82px] max-h-[90px]">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
              Official Email
            </span>
            <div className="mt-1">
              {school.email ? (
                <>
                  <div className="text-[15px] font-semibold text-slate-900 truncate" title={school.email}>
                    {school.email}
                  </div>
                  <a
                    href={`mailto:${school.email}`}
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
              {school.website ? (
                <>
                  <div className="text-[15px] font-semibold text-slate-900 truncate" title={school.website}>
                    {school.website.replace(/^https?:\/\//i, '')}
                  </div>
                  <a
                    href={school.website.startsWith('http') ? school.website : `https://${school.website}`}
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
              {school.address ? (
                <>
                  <div className="text-[15px] font-semibold text-slate-900 truncate" title={school.address}>
                    {school.address}
                  </div>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      `${school.name} ${school.address}`
                    )}`}
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

      {/* 4. Campus Contacts Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
        <div className="border-b border-slate-100 pb-3 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-500" />
            <h2 className="text-[13px] font-semibold text-slate-900">Campus Contacts</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-slate-500">
              {contacts.length} {contacts.length === 1 ? 'contact' : 'contacts'}
            </span>
            {!isArchived && (
              <button
                type="button"
                onClick={openAddContactModal}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-md transition-colors cursor-pointer shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Contact</span>
              </button>
            )}
          </div>
        </div>

        {contacts.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 bg-slate-50/50 rounded-lg border border-dashed border-slate-200 flex flex-col items-center justify-center space-y-2">
            <Users className="w-8 h-8 text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">No contacts added yet</p>
            {!isArchived && (
              <button
                type="button"
                onClick={openAddContactModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors cursor-pointer shadow-xs mt-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Primary Contact</span>
              </button>
            )}
          </div>
        ) : (
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs divide-y divide-slate-200">
                <thead className="bg-slate-50/80">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold text-slate-600 uppercase tracking-wider w-[220px]">
                      Name & Role
                    </th>
                    <th className="px-4 py-2.5 font-semibold text-slate-600 uppercase tracking-wider w-[220px]">
                      Phone & Email
                    </th>
                    <th className="px-4 py-2.5 font-semibold text-slate-600 uppercase tracking-wider">
                      Notes
                    </th>
                    {!isArchived && (
                      <th className="px-4 py-2.5 font-semibold text-slate-600 uppercase tracking-wider text-right w-[140px]">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {contacts.map((c) => (
                    <tr key={c.id} className="h-[52px] hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-900">{c.name}</span>
                          {c.isPrimary && (
                            <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[10px] font-bold">
                              Primary
                            </span>
                          )}
                        </div>
                        {c.role && <span className="text-[11px] text-slate-500 block">{c.role}</span>}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        {c.phone && (
                          <a href={`tel:${c.phone}`} className="text-blue-600 hover:underline block">
                            {c.phone}
                          </a>
                        )}
                        {c.email && (
                          <a
                            href={`mailto:${c.email}`}
                            className="text-slate-500 text-[11px] hover:underline block truncate max-w-[200px]"
                            title={c.email}
                          >
                            {c.email}
                          </a>
                        )}
                        {!c.phone && !c.email && <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">
                        {c.notes ? (
                          <span className="line-clamp-2 block" title={c.notes}>
                            {c.notes}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">No notes</span>
                        )}
                      </td>
                      {!isArchived && (
                        <td className="px-4 py-2.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {!c.isPrimary && (
                              <button
                                type="button"
                                onClick={() => makePrimaryMutation.mutate(c.id)}
                                className="px-2 py-1 text-[11px] font-semibold text-slate-700 hover:text-blue-700 bg-slate-50 hover:bg-blue-50 rounded border border-slate-200 cursor-pointer transition-colors"
                                title="Make primary contact"
                              >
                                Primary
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => openEditContactModal(c)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 rounded-md hover:bg-blue-50 cursor-pointer transition-colors"
                              title="Edit contact"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setContactToDelete(c)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 cursor-pointer transition-colors"
                              title="Delete contact"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 5. Meeting History Card (Yaazhi Table Style) */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
        <div className="border-b border-slate-100 pb-3 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-500" />
            <h2 className="text-[13px] font-semibold text-slate-900">Meeting History</h2>
          </div>
          <span className="text-xs font-medium text-slate-500">
            {meetings.length} {meetings.length === 1 ? 'meeting' : 'meetings'}
          </span>
        </div>

        {meetings.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 bg-slate-50/50 rounded-lg border border-dashed border-slate-200 space-y-3">
            <History className="w-8 h-8 text-slate-300 mx-auto" />
            <div>
              <p className="text-sm font-semibold text-slate-700">No meetings recorded yet</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Keep log of visits, calls, and product demos with campus officials.
              </p>
            </div>
            {!isArchived && (
              <button
                type="button"
                onClick={() => {
                  setMeetingToEdit(null)
                  setIsRecordMeetingOpen(true)
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors cursor-pointer shadow-xs"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Record first meeting</span>
              </button>
            )}
          </div>
        ) : (
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs divide-y divide-slate-200">
                <thead className="bg-slate-50/80">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold text-slate-600 uppercase tracking-wider w-[130px]">
                      Date
                    </th>
                    <th className="px-4 py-2.5 font-semibold text-slate-600 uppercase tracking-wider w-[100px]">
                      Type
                    </th>
                    <th className="px-4 py-2.5 font-semibold text-slate-600 uppercase tracking-wider w-[160px]">
                      Met with
                    </th>
                    <th className="px-4 py-2.5 font-semibold text-slate-600 uppercase tracking-wider w-[150px]">
                      Stage
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
                  {meetings.map((m) => {
                    return (
                      <tr key={m.id} className="h-[52px] hover:bg-slate-50/70 transition-colors">
                        {/* Date */}
                        <td className="px-4 py-2.5 whitespace-nowrap text-slate-900 font-semibold">
                          {formatDateMedium(m.meetingDate)}
                          {m.meetingTime && (
                            <span className="text-[11px] text-slate-500 block font-normal">
                              {m.meetingTime}
                            </span>
                          )}
                        </td>

                        {/* Type */}
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                            {m.type}
                          </span>
                        </td>

                        {/* Met with */}
                        <td className="px-4 py-2.5 whitespace-nowrap text-slate-700">
                          {m.contact ? (
                            <div>
                              <span className="font-semibold text-slate-900">{m.contact.name}</span>
                              {m.contact.role && (
                                <span className="text-[11px] text-slate-500 block">
                                  {m.contact.role}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* Stage Pill */}
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <StatusPill status={m.stage} fallbackText="—" />
                        </td>

                        {/* Notes */}
                        <td className="px-4 py-2.5 text-slate-700">
                          {m.notes ? (
                            <span className="line-clamp-2 block" title={m.notes}>
                              {m.notes}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">No notes</span>
                          )}
                        </td>

                        {/* Actions (active only) */}
                        {!isArchived && (
                          <td className="px-4 py-2.5 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setMeetingToEdit(m)
                                  setIsRecordMeetingOpen(true)
                                }}
                                className="p-1.5 text-slate-400 hover:text-blue-600 rounded-md hover:bg-blue-50 cursor-pointer transition-colors"
                                title="Edit meeting"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setMeetingToDelete(m)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 cursor-pointer transition-colors"
                                title="Delete meeting"
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
        <span>Created {formatDateTimeIST(school.createdAt)}</span>
        <span className="mx-1.5">·</span>
        <span>Updated {formatDateTimeIST(school.updatedAt)}</span>
        {school.archivedAt && (
          <>
            <span className="mx-1.5">·</span>
            <span className="text-amber-600 font-medium">Archived {formatDateTimeIST(school.archivedAt)}</span>
          </>
        )}
      </div>

      {/* Edit School Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full shadow-xl my-8 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-base font-bold text-slate-900">Edit School</h2>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {schoolFormError && (
              <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2.5 text-xs font-medium text-rose-800">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{schoolFormError}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault()
                setSchoolFormError(null)
                if (!editName.trim()) {
                  setSchoolFormError('School name is required')
                  return
                }
                updateSchoolMutation.mutate({
                  name: editName.trim(),
                  area: editArea.trim() || null,
                  address: editAddress.trim() || null,
                  phone: editPhone.trim() || null,
                  email: editEmail.trim() || null,
                  website: editWebsite.trim() || null,
                  studentStrength: editStrength ? Number(editStrength) : null,
                  notes: editNotes.trim() || null,
                })
              }}
              className="p-6 space-y-3"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  School Name *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Area / Locality
                  </label>
                  <input
                    type="text"
                    value={editArea}
                    onChange={(e) => setEditArea(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Student Strength
                  </label>
                  <input
                    type="number"
                    value={editStrength}
                    onChange={(e) => setEditStrength(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Website
                  </label>
                  <input
                    type="text"
                    value={editWebsite}
                    onChange={(e) => setEditWebsite(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Notes
                </label>
                <textarea
                  rows={3}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateSchoolMutation.isPending}
                  className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {updateSchoolMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Contact Modal */}
      {isContactModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full shadow-xl my-8 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-base font-bold text-slate-900">
                {editingContact ? 'Edit Contact' : 'Add Campus Contact'}
              </h2>
              <button
                onClick={() => setIsContactModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {contactFormError && (
              <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2.5 text-xs font-medium text-rose-800">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{contactFormError}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault()
                setContactFormError(null)
                if (!contactName.trim()) {
                  setContactFormError('Name is required')
                  return
                }
                saveContactMutation.mutate({
                  name: contactName.trim(),
                  role: contactRole.trim() || null,
                  phone: contactPhone.trim() || null,
                  email: contactEmail.trim() || null,
                  notes: contactNotes.trim() || null,
                  isPrimary: contactIsPrimary,
                })
              }}
              className="p-6 space-y-3"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sister Mary / Dr. Anand"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Role / Designation
                </label>
                <input
                  type="text"
                  list="role-suggestions"
                  placeholder="e.g. Principal / Correspondent"
                  value={contactRole}
                  onChange={(e) => setContactRole(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <datalist id="role-suggestions">
                  {ROLE_SUGGESTIONS.map((r) => (
                    <option key={r} value={r} />
                  ))}
                </datalist>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {ROLE_SUGGESTIONS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setContactRole(r)}
                      className="px-2 py-0.5 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors cursor-pointer"
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="Direct mobile"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="Email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  placeholder="Brief notes about this person..."
                  value={contactNotes}
                  onChange={(e) => setContactNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={contactIsPrimary}
                    onChange={(e) => setContactIsPrimary(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-slate-800">
                    Set as Primary Contact for this school
                  </span>
                </label>
              </div>

              <div className="pt-2 flex justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsContactModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveContactMutation.isPending}
                  className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {saveContactMutation.isPending ? 'Saving...' : 'Save Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Meeting Dialog */}
      {isRecordMeetingOpen && (
        <RecordMeetingDialog
          isOpen={isRecordMeetingOpen}
          onClose={() => {
            setIsRecordMeetingOpen(false)
            setMeetingToEdit(null)
          }}
          schoolId={school.id}
          schoolName={school.name}
          stages={stages}
          contacts={contacts}
          meetingToEdit={meetingToEdit}
        />
      )}

      {/* Delete Contact Confirmation Dialog */}
      {contactToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-sm w-full p-5 shadow-xl space-y-3">
            <div className="flex items-center gap-2.5 text-rose-600">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-bold text-slate-900">Delete Contact?</h3>
            </div>
            <p className="text-xs text-slate-600">
              Are you sure you want to remove <span className="font-semibold text-slate-900">{contactToDelete.name}</span>?
              {contactToDelete.isPrimary && contacts.length > 1 && (
                <span className="block mt-1 text-slate-500 italic">
                  Note: The oldest remaining contact will automatically be promoted to primary.
                </span>
              )}
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setContactToDelete(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteContactMutation.isPending}
                onClick={() => deleteContactMutation.mutate(contactToDelete.id)}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 rounded hover:bg-rose-700 cursor-pointer disabled:opacity-50"
              >
                {deleteContactMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Meeting Confirmation Dialog */}
      {meetingToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-sm w-full p-5 shadow-xl space-y-3">
            <div className="flex items-center gap-2.5 text-rose-600">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-bold text-slate-900">Delete Meeting Record?</h3>
            </div>
            <p className="text-xs text-slate-600">
              Are you sure you want to delete this meeting record from{' '}
              <span className="font-semibold text-slate-900">{formatDateMedium(meetingToDelete.meetingDate)}</span>?
              <span className="block mt-1 text-slate-500 italic">
                The school's current stage will automatically re-sync to the prior meeting.
              </span>
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setMeetingToDelete(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteMeetingMutation.isPending}
                onClick={() => deleteMeetingMutation.mutate(meetingToDelete.id)}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 rounded hover:bg-rose-700 cursor-pointer disabled:opacity-50"
              >
                {deleteMeetingMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Archive School Confirmation Dialog */}
      {showArchiveConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                <Archive className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Archive this school?</h3>
                <p className="text-xs text-slate-500">
                  Are you sure you want to archive "{school.name}"?
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded border border-slate-100">
              Archived schools will become view-only and hidden from active lists until restored.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowArchiveConfirm(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-md cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={archiveMutation.isPending}
                onClick={() => archiveMutation.mutate()}
                className="px-4 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-md cursor-pointer transition-colors shadow-xs disabled:opacity-60"
              >
                {archiveMutation.isPending ? 'Archiving...' : 'Yes, Archive School'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permanent Delete School Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-700 shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete permanently?</h3>
                <p className="text-xs text-rose-600 font-medium">This cannot be undone.</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded border border-slate-100">
              School "{school.name}" and all associated data will be deleted permanently:
            </p>
            <div className="p-3 bg-rose-50 border border-rose-200 rounded text-xs text-rose-800 space-y-1">
              <ul className="list-disc list-inside space-y-0.5">
                <li>
                  <strong>{contacts.length}</strong> contact{contacts.length === 1 ? '' : 's'}
                </li>
                <li>
                  <strong>{meetings.length}</strong> meeting record{meetings.length === 1 ? '' : 's'}
                </li>
              </ul>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-md cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate()}
                className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-md cursor-pointer transition-colors shadow-xs disabled:opacity-60"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
