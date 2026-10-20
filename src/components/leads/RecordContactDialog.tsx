import React, { useState, useEffect, useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { useToast } from '../../context/ToastContext'
import { LeadStatus, ContactLog } from '../../types'
import { getTodayIST, isFutureDateIST } from '../../../lib/date'
import { X, AlertCircle, PhoneCall } from 'lucide-react'
import { Select, SelectOption } from '../common/Select'

interface RecordContactDialogProps {
  isOpen: boolean
  onClose: () => void
  leadId: number
  leadTitle: string
  statuses: LeadStatus[]
  contactToEdit?: ContactLog | null
  onSuccess?: () => void
}

export const RecordContactDialog: React.FC<RecordContactDialogProps> = ({
  isOpen,
  onClose,
  leadId,
  leadTitle,
  statuses,
  contactToEdit,
  onSuccess,
}) => {
  const queryClient = useQueryClient()
  const { success, error: toastError } = useToast()

  const [contactDate, setContactDate] = useState(getTodayIST())
  const [statusId, setStatusId] = useState<number | ''>(statuses[0]?.id || '')
  const [notes, setNotes] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const today = getTodayIST()

  const statusOptions: SelectOption<number | ''>[] = useMemo(
    () => [
      { value: '', label: 'Select Status' },
      ...statuses.map((s) => ({
        value: s.id,
        label: s.name,
        color: s.color,
      })),
    ],
    [statuses]
  )

  useEffect(() => {
    if (isOpen) {
      if (contactToEdit) {
        setContactDate(contactToEdit.contactDate.slice(0, 10))
        setStatusId(contactToEdit.statusId)
        setNotes(contactToEdit.notes || '')
      } else {
        setContactDate(getTodayIST())
        setStatusId(statuses[0]?.id || '')
        setNotes('')
      }
      setErrorMessage(null)
    }
  }, [isOpen, contactToEdit, statuses])

  // Handle Escape key to close
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const saveMutation = useMutation({
    mutationFn: (data: { contactDate: string; statusId: number; notes: string | null }) => {
      if (contactToEdit) {
        return api.updateContact(contactToEdit.id, data)
      }
      return api.createLeadContact(leadId, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] })
      queryClient.invalidateQueries({ queryKey: ['leadContacts', leadId] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['statuses'] })
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      success(contactToEdit ? 'Contact updated successfully' : 'Contact recorded successfully')
      if (onSuccess) onSuccess()
      onClose()
    },
    onError: (err: any) => {
      const msg = err.message || (contactToEdit ? 'Failed to update contact' : 'Failed to record contact')
      setErrorMessage(msg)
      toastError(msg)
    },
  })

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!contactDate) {
      setErrorMessage('Contact date is required')
      return
    }

    if (isFutureDateIST(contactDate)) {
      setErrorMessage('Contact date cannot be in the future')
      return
    }

    if (!statusId) {
      setErrorMessage('Status is required')
      return
    }

    if (notes.length > 1000) {
      setErrorMessage('Notes cannot exceed 1000 characters')
      return
    }

    saveMutation.mutate({
      contactDate,
      statusId: Number(statusId),
      notes: notes.trim() || null,
    })
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-[10px] max-w-lg w-full shadow-2xl my-6 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 shrink-0">
              <PhoneCall className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2 className="text-[14px] font-bold text-slate-900">
                {contactToEdit ? 'Edit Contact' : 'Record Contact'}
              </h2>
              <p className="text-[11px] text-slate-500 truncate max-w-xs sm:max-w-sm" title={leadTitle}>
                {leadTitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 inline-flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="mx-4 mt-3 p-2.5 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-[12px] font-medium text-rose-800">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Contact Date */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                Date *
              </label>
              <input
                type="date"
                required
                max={today}
                value={contactDate}
                onChange={(e) => setContactDate(e.target.value)}
                className="w-full h-8 px-3 bg-white border border-slate-300 rounded-lg text-[13px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
              />
              <span className="text-[10.5px] text-slate-400 mt-0.5 block">Defaults to today</span>
            </div>

            {/* Status Dropdown */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                Status *
              </label>
              <Select
                value={statusId}
                onChange={(val) => setStatusId(val)}
                options={statusOptions}
                width="w-full"
                ariaLabel="Status"
              />
            </div>

            {/* Notes */}
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-semibold text-slate-700 uppercase">
                  Notes
                </label>
                <span className="text-[10px] text-slate-400">
                  {notes.length}/1000 characters
                </span>
              </div>
              <textarea
                rows={3}
                maxLength={1000}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Log cold calling outcome, objections, feedback, or follow-up details..."
                className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-[13px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="h-8 px-3 text-[13px] font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="h-8 px-3.5 text-[13px] font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-60 shadow-xs cursor-pointer"
            >
              {saveMutation.isPending
                ? 'Saving...'
                : contactToEdit
                ? 'Update Contact'
                : 'Save Contact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
