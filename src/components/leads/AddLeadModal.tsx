import React, { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { useToast } from '../../context/ToastContext'
import { LeadStatus, LeadCategory } from '../../types'
import { X, AlertCircle } from 'lucide-react'

interface AddLeadModalProps {
  isOpen: boolean
  onClose: () => void
  statuses: LeadStatus[]
  categories: LeadCategory[]
  onOpenImport?: () => void
}

export const AddLeadModal: React.FC<AddLeadModalProps> = ({
  isOpen,
  onClose,
  statuses,
  categories,
}) => {
  const queryClient = useQueryClient()
  const { success, error: toastError } = useToast()

  const [title, setTitle] = useState('')
  const [phone, setPhone] = useState('')
  const [categoryId, setCategoryId] = useState<number | ''>(categories[0]?.id || '')
  const [statusId, setStatusId] = useState<number | ''>('')
  const [remarks, setRemarks] = useState('')
  const [priority, setPriority] = useState<string>('')
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

  const createMutation = useMutation({
    mutationFn: (data: any) => api.createLead(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['statuses'] })
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      success('Lead created successfully')
      onClose()
      resetForm()
    },
    onError: (err: any) => {
      setErrorMessage(err.message || 'Failed to create lead')
      toastError(err.message || 'Failed to create lead')
    },
  })

  const resetForm = () => {
    setTitle('')
    setPhone('')
    setCategoryId(categories[0]?.id || '')
    setStatusId('')
    setRemarks('')
    setPriority('')
    setAddress('')
    setEmails('')
    setWebsite('')
    setReviewRating('')
    setReviewCount('')
    setErpMatch('')
    setHasWebsite('')
    setNeedsWebsite('')
    setNeedsErp('')
    setErrorMessage(null)
  }

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setErrorMessage('Title is required')
      return
    }

    createMutation.mutate({
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

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full shadow-xl my-8 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Add New Lead</h2>
            <p className="text-xs text-slate-500">Fill in lead details to add manually</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2.5 text-sm font-medium text-rose-800">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Title */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Title / Business Name *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Royal Silks & Boutique"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Phone Number
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 9840123456 or +91 98401..."
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Category *
              </label>
              <select
                required
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Status (Optional)
              </label>
              <select
                value={statusId}
                onChange={(e) => setStatusId(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="">Not called (No status)</option>
                {statuses.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="">None / Unassigned</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            {/* Address */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Full street address or locality"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            {/* Emails */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={emails}
                onChange={(e) => setEmails(e.target.value)}
                placeholder="info@business.com"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            {/* Website */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Website URL
              </label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            {/* Review Rating */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Review Rating (0-5)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="5"
                value={reviewRating}
                onChange={(e) => setReviewRating(e.target.value)}
                placeholder="4.5"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            {/* Review Count */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Review Count
              </label>
              <input
                type="number"
                value={reviewCount}
                onChange={(e) => setReviewCount(e.target.value)}
                placeholder="120"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            {/* ERP Match */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                ERP Match
              </label>
              <input
                type="text"
                value={erpMatch}
                onChange={(e) => setErpMatch(e.target.value)}
                placeholder="Tally, Zoho, etc."
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            {/* Needs ERP */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Needs ERP
              </label>
              <select
                value={needsErp}
                onChange={(e) => setNeedsErp(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="">Not specified</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>

            {/* Has Website */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Has Website
              </label>
              <select
                value={hasWebsite}
                onChange={(e) => setHasWebsite(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="">Not specified</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>

            {/* Needs Website */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Needs Website
              </label>
              <select
                value={needsWebsite}
                onChange={(e) => setNeedsWebsite(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="">Not specified</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>

            {/* Remarks */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Remarks / Calling Notes
              </label>
              <textarea
                rows={2}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Add initial notes or caller observations..."
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-5 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-60 shadow-xs cursor-pointer"
            >
              {createMutation.isPending ? 'Saving...' : 'Create Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
