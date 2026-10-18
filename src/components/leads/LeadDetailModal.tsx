import React, { useState, useEffect } from 'react'
import {
  X,
  PhoneCall,
  MessageCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Star,
  Globe,
  MapPin,
  ExternalLink,
  ShieldAlert,
  Plus,
  Trash2,
  Edit2,
  Save,
  Flame,
} from 'lucide-react'
import { useLeadonic } from '../../context/LeadonicContext'
import { Lead, Task, ActivityEvent, CallLog, LeadStatus, CallOutcome } from '../../types'
import { leadsRepo } from '../../repos/leadsRepo'
import { tasksRepo } from '../../repos/tasksRepo'
import { activityRepo } from '../../repos/activityRepo'
import { callsRepo } from '../../repos/callsRepo'
import { displayPhone, whatsappDigits } from '../../lib/phone'
import { calculateLeadScore } from '../../lib/scoring'
import { formatDate, formatShortDate, replacePlaceholders } from '../../lib/utils'

export const LeadDetailModal: React.FC<{ leadId: string; onClose: () => void }> = ({
  leadId,
  onClose,
}) => {
  const { rules, templates, showToast, refreshData, logCallOutcome } = useLeadonic()

  const [lead, setLead] = useState<Lead | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [activities, setActivities] = useState<ActivityEvent[]>([])
  const [calls, setCalls] = useState<CallLog[]>([])
  const [isEditing, setIsEditing] = useState<boolean>(false)
  const [formData, setFormData] = useState<Partial<Lead>>({})
  const [newTaskTitle, setNewTaskTitle] = useState<string>('')
  const [newTaskDueDate, setNewTaskDueDate] = useState<string>('')
  const [showLogCall, setShowLogCall] = useState<boolean>(false)
  const [callOutcome, setCallOutcome] = useState<CallOutcome>('Callback')
  const [callNotes, setCallNotes] = useState<string>('')

  const loadDetails = async () => {
    const l = await leadsRepo.getById(leadId)
    if (l) {
      setLead(l)
      setFormData(l)
    }
    const [t, a, c] = await Promise.all([
      tasksRepo.getForLead(leadId),
      activityRepo.getForLead(leadId),
      callsRepo.getForLead(leadId),
    ])
    setTasks(t)
    setActivities(a)
    setCalls(c)
  }

  useEffect(() => {
    loadDetails()
  }, [leadId])

  if (!lead) return null

  const scoreResult = calculateLeadScore(lead, rules)

  // Save edited fields
  const handleSaveEdit = async () => {
    try {
      await leadsRepo.update(lead.id, formData)
      showToast('Lead details updated successfully', 'success')
      setIsEditing(false)
      await loadDetails()
      await refreshData()
    } catch {
      showToast('Failed to update lead', 'error')
    }
  }

  // Create new task
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTaskTitle.trim()) return

    const dueDate = newTaskDueDate
      ? new Date(newTaskDueDate).toISOString()
      : new Date(Date.now() + 86400000).toISOString()

    await tasksRepo.create({
      leadId: lead.id,
      title: newTaskTitle.trim(),
      dueDate,
      leadName: lead.name,
      leadPhone: lead.phone,
      leadArea: lead.area,
    })

    setNewTaskTitle('')
    setNewTaskDueDate('')
    showToast('Follow-up task created', 'success')
    await loadDetails()
    await refreshData()
  }

  // Toggle task done
  const handleToggleTask = async (taskId: string) => {
    await tasksRepo.toggleDone(taskId)
    await loadDetails()
    await refreshData()
  }

  // Quick call log
  const handleQuickLogCall = async () => {
    await logCallOutcome({
      leadId: lead.id,
      outcome: callOutcome,
      notes: callNotes,
    })
    setShowLogCall(false)
    setCallNotes('')
    await loadDetails()
  }

  // WhatsApp link with filled template
  const waTemplate = templates.find((t) => t.type === 'whatsapp') || templates[0]
  const waText = replacePlaceholders(waTemplate?.body || '', {
    name: lead.name,
    area: lead.area,
    category: lead.category,
  })
  const whatsappUrl = `https://wa.me/${whatsappDigits(lead.phone)}?text=${encodeURIComponent(
    waText
  )}`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-lg">
              {lead.name[0]}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">{lead.name}</h2>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    lead.status === 'Interested'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : lead.status === 'Contacted'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : lead.status === 'Lost'
                      ? 'bg-slate-700 text-slate-300'
                      : 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                  }`}
                >
                  {lead.status}
                </span>
                {lead.doNotCall && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-rose-900/40 text-rose-300 border border-rose-600/50">
                    DND Flagged
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                {lead.category} · {lead.area}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Edit Details</span>
              </button>
            ) : (
              <button
                onClick={handleSaveEdit}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Changes</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Quick Actions Bar */}
          <div className="flex flex-wrap items-center gap-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
            <a
              href={`tel:${lead.phone}`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Tap to Call ({displayPhone(lead.phone)})</span>
            </a>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-600/40 text-xs font-semibold transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>Send WhatsApp (Prefilled)</span>
            </a>

            <button
              onClick={() => setShowLogCall(!showLogCall)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold ml-auto"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Log Manual Call</span>
            </button>
          </div>

          {/* Quick Manual Call Popover */}
          {showLogCall && (
            <div className="p-4 rounded-xl bg-slate-950 border border-indigo-500/30 space-y-3 animate-in fade-in">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Log Call Outcome for {lead.name}
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(['Callback', 'Interested', 'No answer', 'Not interested', 'Wrong number', 'Do not call'] as CallOutcome[]).map(
                  (outcome) => (
                    <button
                      key={outcome}
                      type="button"
                      onClick={() => setCallOutcome(outcome)}
                      className={`p-2 rounded-lg text-xs font-medium border text-left ${
                        callOutcome === outcome
                          ? 'bg-indigo-600/30 border-indigo-500 text-white'
                          : 'bg-slate-900 border-slate-800 text-slate-300'
                      }`}
                    >
                      {outcome}
                    </button>
                  )
                )}
              </div>
              <textarea
                rows={2}
                placeholder="Call notes..."
                value={callNotes}
                onChange={(e) => setCallNotes(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowLogCall(false)}
                  className="px-3 py-1.5 rounded text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleQuickLogCall}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                >
                  Confirm & Save
                </button>
              </div>
            </div>
          )}

          {/* Lead Details Grid & Score Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Editable Fields (2 Cols) */}
            <div className="md:col-span-2 bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Lead Information
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Business Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                    />
                  ) : (
                    <div className="font-semibold text-slate-200">{lead.name}</div>
                  )}
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Phone Number</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.phone || ''}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                    />
                  ) : (
                    <div className="font-semibold text-slate-200">{displayPhone(lead.phone)}</div>
                  )}
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Category / Industry</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.category || ''}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                    />
                  ) : (
                    <div className="font-semibold text-slate-200">{lead.category}</div>
                  )}
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Area / Locality</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.area || ''}
                      onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                    />
                  ) : (
                    <div className="font-semibold text-slate-200">{lead.area}</div>
                  )}
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Website</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.website || ''}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                    />
                  ) : lead.website ? (
                    <a
                      href={lead.website}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-400 hover:underline flex items-center gap-1"
                    >
                      {lead.website} <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-slate-500">None</span>
                  )}
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Google Rating & Reviews</label>
                  <div className="font-semibold text-amber-400 flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    <span>{lead.rating} ★</span>
                    <span className="text-slate-400">({lead.reviews} reviews)</span>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-slate-400 block mb-1">Full Address</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.address || ''}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                    />
                  ) : (
                    <div className="text-slate-300">{lead.address || '—'}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Score Breakdown Card */}
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Score Calculation
                </span>
                <span className="text-base font-black text-emerald-400">
                  {scoreResult.total} pts
                </span>
              </div>

              <div className="space-y-2 text-xs">
                {scoreResult.breakdown.map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span
                      className={
                        item.matched ? 'text-slate-200 font-medium' : 'text-slate-500 line-through'
                      }
                    >
                      {item.label}
                    </span>
                    <span
                      className={`font-mono text-[11px] ${
                        item.matched
                          ? item.points >= 0
                            ? 'text-emerald-400 font-bold'
                            : 'text-rose-400 font-bold'
                          : 'text-slate-600'
                      }`}
                    >
                      {item.matched ? (item.points >= 0 ? `+${item.points}` : item.points) : '0'}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-800/80 text-[10px] text-slate-500">
                Determines queue sorting and dial urgency
              </div>
            </div>
          </div>

          {/* Follow-up Tasks Section */}
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-400" />
                <span>Scheduled Tasks & Callbacks ({tasks.length})</span>
              </h3>
            </div>

            {/* Add Task Form */}
            <form onSubmit={handleAddTask} className="flex flex-wrap gap-2 text-xs">
              <input
                type="text"
                placeholder="Add new task (e.g. Call owner for quotation discussion)..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                className="flex-1 min-w-[200px] bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
              />
              <input
                type="datetime-local"
                value={newTaskDueDate}
                onChange={(e) => setNewTaskDueDate(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
              />
              <button
                type="submit"
                className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </form>

            <div className="space-y-1.5 pt-1">
              {tasks.length === 0 ? (
                <div className="text-slate-500 text-xs py-2">No tasks for this lead yet.</div>
              ) : (
                tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={task.done}
                        onChange={() => handleToggleTask(task.id)}
                        className="rounded border-slate-700 text-indigo-600 focus:ring-0"
                      />
                      <span className={task.done ? 'line-through text-slate-500' : 'text-slate-200'}>
                        {task.title}
                      </span>
                    </div>
                    <span className="text-[11px] text-amber-400">
                      Due: {formatShortDate(task.dueDate)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Activity Timeline Feed */}
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span>Activity History & Call Logs ({activities.length})</span>
            </h3>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
              {activities.length === 0 ? (
                <div className="text-slate-500 text-xs py-2">No activity recorded yet.</div>
              ) : (
                activities.map((act) => (
                  <div key={act.id} className="flex items-start gap-3 text-xs">
                    <div className="w-2 h-2 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                    <div className="flex-1">
                      <div className="text-slate-200 font-medium leading-relaxed">{act.text}</div>
                      <div className="text-[10px] text-slate-500">{formatDate(act.at)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
