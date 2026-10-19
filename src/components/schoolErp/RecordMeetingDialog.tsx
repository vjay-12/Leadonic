import React, { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { useToast } from '../../context/ToastContext'
import { SchoolStage, SchoolContact, SchoolMeeting } from '../../types'
import { getTodayIST, isFutureDateIST } from '../../../lib/date'
import { X, AlertCircle, Calendar, Plus } from 'lucide-react'

interface RecordMeetingDialogProps {
  isOpen: boolean
  onClose: () => void
  schoolId: number
  schoolName: string
  stages: SchoolStage[]
  contacts: SchoolContact[]
  meetingToEdit?: SchoolMeeting | null
  onSuccess?: () => void
}

export const RecordMeetingDialog: React.FC<RecordMeetingDialogProps> = ({
  isOpen,
  onClose,
  schoolId,
  schoolName,
  stages,
  contacts,
  meetingToEdit,
  onSuccess,
}) => {
  const queryClient = useQueryClient()
  const { success, error: toastError } = useToast()

  const [meetingDate, setMeetingDate] = useState(getTodayIST())
  const [meetingTime, setMeetingTime] = useState('')
  const [type, setType] = useState<'Call' | 'Visit' | 'Demo' | 'Follow-up'>('Visit')
  const [locationName, setLocationName] = useState('')
  const [contactId, setContactId] = useState<number | ''>('')
  const [stageId, setStageId] = useState<number | ''>(stages[0]?.id || '')
  const [notes, setNotes] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Inline "+ New contact" state
  const [showNewContactForm, setShowNewContactForm] = useState(false)
  const [newContactName, setNewContactName] = useState('')
  const [newContactRole, setNewContactRole] = useState('')
  const [newContactPhone, setNewContactPhone] = useState('')
  const [savingNewContact, setSavingNewContact] = useState(false)

  const today = getTodayIST()

  useEffect(() => {
    if (isOpen) {
      if (meetingToEdit) {
        setMeetingDate(meetingToEdit.meetingDate.slice(0, 10))
        setMeetingTime(meetingToEdit.meetingTime || '')
        setType(meetingToEdit.type as any)
        setLocationName(meetingToEdit.locationName || '')
        setContactId(meetingToEdit.contactId || '')
        setStageId(meetingToEdit.stageId)
        setNotes(meetingToEdit.notes || '')
      } else {
        setMeetingDate(getTodayIST())
        setMeetingTime('')
        setType('Visit')
        setLocationName('')
        setContactId(contacts.find((c) => c.isPrimary)?.id || contacts[0]?.id || '')
        setStageId(stages[0]?.id || '')
        setNotes('')
      }
      setErrorMessage(null)
      setShowNewContactForm(false)
      setNewContactName('')
      setNewContactRole('')
      setNewContactPhone('')
    }
  }, [isOpen, meetingToEdit, stages, contacts])

  // Handle Escape key to close
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const saveMeetingMutation = useMutation({
    mutationFn: (data: any) => {
      if (meetingToEdit) {
        return api.updateSchoolMeeting(meetingToEdit.id, data)
      }
      return api.createSchoolMeeting(schoolId, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schools'] })
      queryClient.invalidateQueries({ queryKey: ['school', schoolId] })
      queryClient.invalidateQueries({ queryKey: ['schoolMeetings', schoolId] })
      queryClient.invalidateQueries({ queryKey: ['schoolStages'] })
      success(meetingToEdit ? 'Meeting updated successfully' : 'Meeting recorded successfully')
      if (onSuccess) onSuccess()
      onClose()
    },
    onError: (err: any) => {
      const msg = err.message || (meetingToEdit ? 'Failed to update meeting' : 'Failed to record meeting')
      setErrorMessage(msg)
      toastError(msg)
    },
  })

  if (!isOpen) return null

  const handleCreateContactInline = async () => {
    if (!newContactName.trim()) {
      setErrorMessage('Please enter contact name')
      return
    }

    try {
      setSavingNewContact(true)
      setErrorMessage(null)
      const created = await api.createSchoolContact(schoolId, {
        name: newContactName.trim(),
        role: newContactRole.trim() || null,
        phone: newContactPhone.trim() || null,
      })
      queryClient.invalidateQueries({ queryKey: ['school', schoolId] })
      queryClient.invalidateQueries({ queryKey: ['schoolContacts', schoolId] })
      setContactId(created.id)
      setShowNewContactForm(false)
      setNewContactName('')
      setNewContactRole('')
      setNewContactPhone('')
      success(`Contact "${created.name}" created`)
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create contact')
    } finally {
      setSavingNewContact(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!meetingDate) {
      setErrorMessage('Meeting date is required')
      return
    }

    if (isFutureDateIST(meetingDate)) {
      setErrorMessage('Meeting date cannot be in the future')
      return
    }

    if (!stageId) {
      setErrorMessage('Stage is required')
      return
    }

    if (notes.length > 2000) {
      setErrorMessage('Notes cannot exceed 2000 characters')
      return
    }

    saveMeetingMutation.mutate({
      meetingDate,
      meetingTime: meetingTime.trim() || null,
      type,
      locationName: locationName.trim() || null,
      contactId: contactId ? Number(contactId) : null,
      stageId: Number(stageId),
      notes: notes.trim() || null,
    })
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-[10px] max-w-lg w-full shadow-xl my-8 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-slate-900">
                {meetingToEdit ? 'Edit Meeting' : 'Record Meeting'}
              </h2>
              <p className="text-[12px] text-slate-500 truncate max-w-sm" title={schoolName}>
                {schoolName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="mx-5 mt-3.5 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2.5 text-xs font-medium text-rose-800">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Date */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                Date *
              </label>
              <input
                type="date"
                required
                max={today}
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                className="w-full h-8 px-3 bg-white border border-slate-300 rounded-lg text-[13px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <span className="text-[11px] text-slate-400 mt-0.5 block">Defaults to today</span>
            </div>

            {/* Time */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                Time (optional)
              </label>
              <input
                type="text"
                placeholder="e.g. 11:30 AM"
                value={meetingTime}
                onChange={(e) => setMeetingTime(e.target.value)}
                className="w-full h-8 px-3 bg-white border border-slate-300 rounded-lg text-[13px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Type */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                Type *
              </label>
              <select
                required
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full h-8 px-3 bg-white border border-slate-300 rounded-lg text-[13px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
              >
                <option value="Call">Call</option>
                <option value="Visit">Visit</option>
                <option value="Demo">Demo</option>
                <option value="Follow-up">Follow-up</option>
              </select>
            </div>

            {/* Stage */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                Stage *
              </label>
              <select
                required
                value={stageId}
                onChange={(e) => setStageId(e.target.value ? Number(e.target.value) : '')}
                className="w-full h-8 px-3 bg-white border border-slate-300 rounded-lg text-[13px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
              >
                <option value="">Select Stage</option>
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Location Name */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
              Location Name (optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Principal Office / Campus"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              className="w-full h-8 px-3 bg-white border border-slate-300 rounded-lg text-[13px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {/* Met with (Contact) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-semibold text-slate-700 uppercase">
                Met with (Contact)
              </label>
              {!showNewContactForm && (
                <button
                  type="button"
                  onClick={() => setShowNewContactForm(true)}
                  className="text-[12px] font-semibold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New contact</span>
                </button>
              )}
            </div>

            {showNewContactForm ? (
              <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-lg space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-bold text-slate-800">Add New Contact</span>
                  <button
                    type="button"
                    onClick={() => setShowNewContactForm(false)}
                    className="text-slate-400 hover:text-slate-600 text-xs"
                  >
                    Cancel
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Name *"
                    value={newContactName}
                    onChange={(e) => setNewContactName(e.target.value)}
                    className="px-2.5 h-8 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                  <input
                    type="text"
                    placeholder="Role (e.g. Principal)"
                    value={newContactRole}
                    onChange={(e) => setNewContactRole(e.target.value)}
                    className="px-2.5 h-8 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                  <input
                    type="text"
                    placeholder="Phone"
                    value={newContactPhone}
                    onChange={(e) => setNewContactPhone(e.target.value)}
                    className="px-2.5 h-8 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleCreateContactInline}
                    disabled={savingNewContact || !newContactName.trim()}
                    className="px-3 h-7 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                  >
                    {savingNewContact ? 'Adding...' : 'Save & Select Contact'}
                  </button>
                </div>
              </div>
            ) : (
              <select
                value={contactId}
                onChange={(e) => setContactId(e.target.value ? Number(e.target.value) : '')}
                className="w-full h-8 px-3 bg-white border border-slate-300 rounded-lg text-[13px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
              >
                <option value="">None / Not specified</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.role ? `(${c.role})` : ''} {c.isPrimary ? '• Primary' : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Notes */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-[11px] font-semibold text-slate-700 uppercase">
                Notes
              </label>
              <span className={`text-[11px] ${notes.length > 2000 ? 'text-rose-600 font-semibold' : 'text-slate-400'}`}>
                {notes.length} / 2000
              </span>
            </div>
            <textarea
              rows={3}
              placeholder="Summary of discussion, requirements, next steps..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-[13px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {/* Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 h-8 text-[13px] font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saveMeetingMutation.isPending}
              className="px-3.5 h-8 text-[13px] font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {saveMeetingMutation.isPending
                ? 'Saving...'
                : meetingToEdit
                ? 'Update Meeting'
                : 'Save Meeting'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
