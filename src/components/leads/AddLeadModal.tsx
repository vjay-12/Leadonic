import React, { useState } from 'react'
import { X, Plus, UserPlus } from 'lucide-react'
import { useLeadonic } from '../../context/LeadonicContext'
import { leadsRepo } from '../../repos/leadsRepo'
import { LeadStatus } from '../../types'

export const AddLeadModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { rules, refreshData, showToast } = useLeadonic()

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [area, setArea] = useState('Indiranagar')
  const [category, setCategory] = useState('Dental Clinic')
  const [address, setAddress] = useState('')
  const [website, setWebsite] = useState('')
  const [rating, setRating] = useState('4.5')
  const [reviews, setReviews] = useState('40')
  const [status, setStatus] = useState<LeadStatus>('New')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !phone.trim()) {
      showToast('Name and phone are required', 'warning')
      return
    }

    try {
      await leadsRepo.create(
        {
          name: name.trim(),
          phone: phone.trim(),
          rawPhone: phone.trim(),
          area,
          category,
          address: address.trim(),
          website: website.trim(),
          rating: parseFloat(rating) || 0,
          reviews: parseInt(reviews, 10) || 0,
          status,
        },
        rules
      )

      showToast(`Added "${name}" to leads directory!`, 'success')
      await refreshData()
      onClose()
    } catch (err) {
      showToast('Failed to create lead', 'error')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Add Single Lead</h3>
              <p className="text-xs text-slate-400">Instantly registers into local Dexie database</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Business / Lead Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Apex Dental Care"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Phone Number (+91) *
              </label>
              <input
                type="text"
                required
                placeholder="+91 98451 22334"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Locality / Area</label>
              <select
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
              >
                <option value="Indiranagar">Indiranagar</option>
                <option value="Koramangala">Koramangala</option>
                <option value="HSR Layout">HSR Layout</option>
                <option value="Whitefield">Whitefield</option>
                <option value="Jayanagar">Jayanagar</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
              >
                <option value="Dental Clinic">Dental Clinic</option>
                <option value="Real Estate Agency">Real Estate Agency</option>
                <option value="Boutique Cafe">Boutique Cafe</option>
                <option value="Gym & Fitness">Gym & Fitness</option>
                <option value="Coaching Institute">Coaching Institute</option>
                <option value="Salon & Spa">Salon & Spa</option>
                <option value="Auto Services">Auto Services</option>
                <option value="IT Consulting">IT Consulting</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Pipeline Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as LeadStatus)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
              >
                <option value="New">New</option>
                <option value="Contacted">Contacted</option>
                <option value="Interested">Interested</option>
                <option value="Lost">Lost</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Website URL</label>
            <input
              type="text"
              placeholder="https://example.com"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Rating (1-5)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="5"
                value={rating}
                onChange={(e) => setRating(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Review Count</label>
              <input
                type="number"
                min="0"
                value={reviews}
                onChange={(e) => setReviews(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Address</label>
            <input
              type="text"
              placeholder="e.g. 100ft Road, HAL 2nd Stage"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Save Lead</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
