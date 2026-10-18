import React, { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { useToast } from '../../context/ToastContext'
import { Lead, LeadStatus, LeadCategory } from '../../types'
import { X, Phone, Mail, Globe, Trash2, Save, AlertCircle } from 'lucide-react'

interface LeadSidePanelProps {
  lead: Lead | null
  isOpen: boolean
  onClose: () => void
  statuses: LeadStatus[]
  categories: LeadCategory[]
}

export const LeadSidePanel: React.FC<LeadSidePanelProps> = ({
  lead,
  isOpen,
  onClose,
  statuses,
  categories,
}) => {
  const queryClient = useQueryClient()
  const { success, error: toastError } = useToast()

  const [title, setTitle] = useState('')
  const [phone, setPhone] = useState('')
  const [categoryId, setCategoryId] = useState<number | ''>('')
  const [statusId, setStatusId] = useState<number | ''>('')
  const [remarks, setRemarks] = useState('')
  const [priority, setPriority] = useState('')
  const [address, setAddress] = useState('')
  const [emails, setEmails] = useState('')
  const [website, setWebsite] = useState('')
  const [reviewRating, setReviewRating] = useState<string>('')
  const [reviewCount, setReviewCount] = useState<string>('')
  const [erpMatch, setErpMatch] = useState('')
  const [hasWebsite, setHasWebsite] = useState<string>('')
  const [needsWebsite, setNeedsWebsite] = useState<string>('')
  const [needsErp, setNeedsErp] = useState<string>('')

  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (lead) {
      setTitle(lead.title || '')
      setPhone(lead.phone || '')
      setCategoryId(lead.categoryId || '')
      setStatusId(lead.statusId || '')
      setRemarks(lead.remarks || '')
      setPriority(lead.priority || '')
      setAddress(lead.address || '')
      setEmails(lead.emails || '')
      setWebsite(lead.website || '')
      setReviewRating(lead.reviewRating != null ? String(lead.reviewRating) : '')
      setReviewCount(lead.reviewCount != null ? String(lead.reviewCount) : '')
      setErpMatch(lead.erpMatch || '')
      setHasWebsite(lead.hasWebsite === true ? 'true' : lead.hasWebsite === false ? 'false' : '')
      setNeedsWebsite(lead.needsWebsite === true ? 'true' : lead.needsWebsite === false ? 'false' : '')
      setNeedsErp(lead.needsErp === true ? 'true' : lead.needsErp === false ? 'false' : '')
      setErrorMessage(null)
    }
  }, [lead])

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Lead>) => api.updateLead(lead!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['statuses'] })
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      success('Lead updated successfully')
    },
    onError: (err: any) => {
      setErrorMessage(err.message || 'Failed to update lead')
      toastError(err.message || 'Failed to update lead')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteLead(lead!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['statuses'] })
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      success('Lead deleted')
      onClose()
    },
    onError: (err: any) => {
      setErrorMessage(err.message || 'Failed to delete lead')
      toastError(err.message || 'Failed to delete lead')
    },
  })

  if (!isOpen || !lead) return null

  const handleSave = () => {
    if (!title.trim()) {
      setErrorMessage('Title is required')
      return
    }

    updateMutation.mutate({
      title: title.trim(),
      phone: phone.trim() || null,
      categoryId: categoryId ? Number(categoryId) : null,
      statusId: statusId ? Number(statusId) : null,
      remarks: remarks.trim() || null,
      priority: priority || null,
      address: address.trim() || null,
      emails: emails.trim() || null,
      website: website.trim() || null,
      reviewRating: reviewRating ? parseFloat(reviewRating) : null,
      reviewCount: reviewCount ? parseInt(reviewCount, 10) : null,
      erpMatch: erpMatch.trim() || null,
      hasWebsite: hasWebsite === 'true' ? true : hasWebsite === 'false' ? false : null,
      needsWebsite: needsWebsite === 'true' ? true : needsWebsite === 'false' ? false : null,
      needsErp: needsErp === 'true' ? true : needsErp === 'false' ? false : null,
    })
  }

  const currentStatus = statuses.find((s) => s.id === (statusId ? Number(statusId) : null))

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white border-l border-slate-200 shadow-xl flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Lead Details #{lead.id}
              </span>
              <h2 className="text-base font-bold text-slate-900 truncate max-w-[260px]">
                {lead.title}
              </h2>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick Action Bar (Call, Email, Website) */}
          <div className="px-6 py-3 border-b border-slate-100 flex items-center gap-3 bg-white text-xs">
            {lead.phone ? (
              <a
                href={`tel:${lead.phone}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-md font-medium hover:bg-blue-100 transition-colors"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call {lead.phone}</span>
              </a>
            ) : (
              <span className="text-slate-400 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5" /> No Phone
              </span>
            )}

            {lead.emails && (
              <a
                href={`mailto:${lead.emails}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-md font-medium hover:bg-slate-200 transition-colors"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Email</span>
              </a>
            )}

            {lead.website && (
              <a
                href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-md font-medium hover:bg-slate-200 transition-colors"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Website</span>
              </a>
            )}
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="mx-6 mt-3 p-3 bg-rose-50 border border-rose-200 rounded-md text-xs font-medium text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Content (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Title / Business Name *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            {/* Status & Category */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Status
                </label>
                <select
                  value={statusId}
                  onChange={(e) => setStatusId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="">Not called</option>
                  {statuses.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                {currentStatus && (
                  <div className="mt-1 flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: currentStatus.color }}
                    />
                    <span className="text-[11px] text-slate-500">{currentStatus.name}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Category
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="">None</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Phone Number
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="No phone"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            {/* Remarks */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Remarks / Calling Notes
              </label>
              <textarea
                rows={3}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Log notes, responses, follow-up intent..."
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            {/* Priority & Ratings */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-2 py-1.5 text-sm bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="">None</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Rating
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={reviewRating}
                  onChange={(e) => setReviewRating(e.target.value)}
                  placeholder="0.0"
                  className="w-full px-2 py-1.5 text-sm bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Reviews
                </label>
                <input
                  type="number"
                  value={reviewCount}
                  onChange={(e) => setReviewCount(e.target.value)}
                  placeholder="0"
                  className="w-full px-2 py-1.5 text-sm bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Full address"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            {/* Email & Website */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Emails
              </label>
              <input
                type="text"
                value={emails}
                onChange={(e) => setEmails(e.target.value)}
                placeholder="e.g. contact@business.com"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Website
              </label>
              <input
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            {/* ERP info */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  ERP Match
                </label>
                <input
                  type="text"
                  value={erpMatch}
                  onChange={(e) => setErpMatch(e.target.value)}
                  placeholder="Tally, etc."
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Needs ERP
                </label>
                <select
                  value={needsErp}
                  onChange={(e) => setNeedsErp(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="">Not set</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>
            </div>

            {/* Metadata info */}
            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400 space-y-1">
              <div>Added: {new Date(lead.createdAt).toLocaleString()}</div>
              <div>Last Updated: {new Date(lead.updatedAt).toLocaleString()}</div>
              {lead.mapsCategory && <div>Scraper Category: {lead.mapsCategory}</div>}
            </div>
          </div>

          {/* Footer with Save and Delete */}
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
            <button
              onClick={() => {
                if (confirm(`Are you sure you want to delete "${lead.title}"?`)) {
                  deleteMutation.mutate()
                }
              }}
              disabled={deleteMutation.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 rounded-md transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>Delete Lead</span>
            </button>

            <button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors cursor-pointer shadow-xs disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              <span>{updateMutation.isPending ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
