import React, { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { useToast } from '../../context/ToastContext'
import { Lead, LeadStatus, LeadCategory } from '../../types'
import { X, AlertCircle } from 'lucide-react'

interface AddLeadModalProps {
  isOpen: boolean
  onClose: () => void
  statuses: LeadStatus[]
  categories: LeadCategory[]
  leadToEdit?: Lead | null
  onOpenImport?: () => void
}

export const AddLeadModal: React.FC<AddLeadModalProps> = ({
  isOpen,
  onClose,
  statuses: _statuses,
  categories,
  leadToEdit,
}) => {
  const queryClient = useQueryClient()
  const { success, error: toastError } = useToast()

  const [title, setTitle] = useState('')
  const [phone, setPhone] = useState('')
  const [categoryId, setCategoryId] = useState<number | ''>('')
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

  const resetForm = () => {
    setTitle('')
    setPhone('')
    setCategoryId(categories[0]?.id || '')
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

  // Handle Escape key to close modal
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  useEffect(() => {
    if (isOpen) {
      if (leadToEdit) {
        setTitle(leadToEdit.title || '')
        setPhone(leadToEdit.phone || '')
        setCategoryId(leadToEdit.categoryId || '')
        setRemarks(leadToEdit.remarks || '')
        setPriority(leadToEdit.priority || '')
        setAddress(leadToEdit.address || '')
        setEmails(leadToEdit.emails || '')
        setWebsite(leadToEdit.website || '')
        setReviewRating(leadToEdit.reviewRating != null ? String(leadToEdit.reviewRating) : '')
        setReviewCount(leadToEdit.reviewCount != null ? String(leadToEdit.reviewCount) : '')
        setErpMatch(leadToEdit.erpMatch || '')
        setHasWebsite(leadToEdit.hasWebsite === true ? 'true' : leadToEdit.hasWebsite === false ? 'false' : '')
        setNeedsWebsite(leadToEdit.needsWebsite === true ? 'true' : leadToEdit.needsWebsite === false ? 'false' : '')
        setNeedsErp(leadToEdit.needsErp === true ? 'true' : leadToEdit.needsErp === false ? 'false' : '')
      } else {
        resetForm()
      }
      setErrorMessage(null)
    }
  }, [isOpen, leadToEdit, categories])

  const saveMutation = useMutation({
    mutationFn: (data: any) => {
      if (leadToEdit) {
        return api.updateLead(leadToEdit.id, data)
      }
      return api.createLead(data)
    },
    onSuccess: (savedLead) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['statuses'] })
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      if (leadToEdit) {
        queryClient.invalidateQueries({ queryKey: ['lead', leadToEdit.id] })
        queryClient.setQueryData(['lead', leadToEdit.id], savedLead)
        success('Lead updated successfully')
      } else {
        success('Lead created successfully')
      }
      onClose()
      if (!leadToEdit) {
        resetForm()
      }
    },
    onError: (err: any) => {
      const msg = err.message || (leadToEdit ? 'Failed to update lead' : 'Failed to create lead')
      setErrorMessage(msg)
      toastError(msg)
    },
  })

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setErrorMessage('Title is required')
      return
    }

    saveMutation.mutate({
      title: title.trim(),
      phone: phone.trim() || null,
      categoryId: categoryId ? Number(categoryId) : null,
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
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-[10px] max-w-2xl w-full shadow-2xl my-6 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-bold text-slate-900">
              {leadToEdit ? 'Edit Lead' : 'Add New Lead'}
            </h2>
            <p className="text-[12px] text-slate-500">
              {leadToEdit ? 'Update lead details and save changes' : 'Fill in lead details to add manually'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 inline-flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
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
            {/* Title */}
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                Title / Business Name *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Royal Silks & Boutique"
                className="w-full h-8 px-3 bg-white border border-slate-300 rounded-lg text-[13px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                Phone Number
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 9840123456 or +91 98401..."
                className="w-full h-8 px-3 bg-white border border-slate-300 rounded-lg text-[13px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                Category *
              </label>
              <select
                required
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : '')}
                className="w-full h-8 px-3 bg-white border border-slate-300 rounded-lg text-[13px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
              >
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full h-8 px-3 bg-white border border-slate-300 rounded-lg text-[13px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
              >
                <option value="">None / Unassigned</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            {/* Address */}
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Full street address or locality"
                className="w-full h-8 px-3 bg-white border border-slate-300 rounded-lg text-[13px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            {/* Emails */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={emails}
                onChange={(e) => setEmails(e.target.value)}
                placeholder="info@business.com"
                className="w-full h-8 px-3 bg-white border border-slate-300 rounded-lg text-[13px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            {/* Website */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                Website URL
              </label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://..."
                className="w-full h-8 px-3 bg-white border border-slate-300 rounded-lg text-[13px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            {/* Review Rating */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
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
                className="w-full h-8 px-3 bg-white border border-slate-300 rounded-lg text-[13px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            {/* Review Count */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                Review Count
              </label>
              <input
                type="number"
                value={reviewCount}
                onChange={(e) => setReviewCount(e.target.value)}
                placeholder="120"
                className="w-full h-8 px-3 bg-white border border-slate-300 rounded-lg text-[13px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            {/* ERP Match */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                ERP Match
              </label>
              <input
                type="text"
                value={erpMatch}
                onChange={(e) => setErpMatch(e.target.value)}
                placeholder="Tally, Zoho, etc."
                className="w-full h-8 px-3 bg-white border border-slate-300 rounded-lg text-[13px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            {/* Needs ERP */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                Needs ERP
              </label>
              <select
                value={needsErp}
                onChange={(e) => setNeedsErp(e.target.value)}
                className="w-full h-8 px-3 bg-white border border-slate-300 rounded-lg text-[13px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
              >
                <option value="">Not specified</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>

            {/* Has Website */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                Has Website
              </label>
              <select
                value={hasWebsite}
                onChange={(e) => setHasWebsite(e.target.value)}
                className="w-full h-8 px-3 bg-white border border-slate-300 rounded-lg text-[13px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
              >
                <option value="">Not specified</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>

            {/* Needs Website */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                Needs Website
              </label>
              <select
                value={needsWebsite}
                onChange={(e) => setNeedsWebsite(e.target.value)}
                className="w-full h-8 px-3 bg-white border border-slate-300 rounded-lg text-[13px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
              >
                <option value="">Not specified</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>

            {/* Remarks */}
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                Remarks / Calling Notes
              </label>
              <textarea
                rows={2}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Add initial notes or caller observations..."
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
                : leadToEdit
                ? 'Save Changes'
                : 'Create Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
