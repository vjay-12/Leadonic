import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  PhoneCall,
  PhoneForwarded,
  CheckCircle,
  XCircle,
  HelpCircle,
  ShieldAlert,
  Calendar,
  MessageCircle,
  Copy,
  ChevronRight,
  ChevronLeft,
  Search,
  Sparkles,
  ExternalLink,
  Flame,
  Star,
  Clock,
  Send,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react'
import { useLeadonic } from '../../context/LeadonicContext'
import { Lead, CallOutcome, Template } from '../../types'
import { displayPhone, whatsappDigits } from '../../lib/phone'
import {
  formatShortDate,
  getFollowupStatus,
  getQuickFollowupDate,
  replacePlaceholders,
  suggestFollowupDate,
} from '../../lib/utils'
import { calculateLeadScore } from '../../lib/scoring'

export const CallQueueView: React.FC = () => {
  const { queueLeads, templates, logCallOutcome, showToast, openLeadDetail, rules } = useLeadonic()

  // Active lead index in the sorted queue
  const [currentIndex, setCurrentIndex] = useState<number>(0)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [selectedOutcome, setSelectedOutcome] = useState<CallOutcome | null>(null)
  const [callNotes, setCallNotes] = useState<string>('')
  const [followupDate, setFollowupDate] = useState<string>('')
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [mobileQueueOpen, setMobileQueueOpen] = useState<boolean>(false)
  const notesInputRef = useRef<HTMLTextAreaElement>(null)

  // Filtered queue based on local search within queue
  const filteredQueue = useMemo(() => {
    if (!searchQuery.trim()) return queueLeads
    const q = searchQuery.toLowerCase()
    return queueLeads.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.category.toLowerCase().includes(q) ||
        l.area.toLowerCase().includes(q) ||
        l.phone.includes(q)
    )
  }, [queueLeads, searchQuery])

  // Active lead
  const currentLead: Lead | undefined = filteredQueue[currentIndex] || filteredQueue[0]

  // Default to primary cold pitch script
  useEffect(() => {
    if (templates.length > 0 && !selectedTemplateId) {
      const script = templates.find((t) => t.type === 'script') || templates[0]
      setSelectedTemplateId(script.id)
    }
  }, [templates, selectedTemplateId])

  // When active lead changes, reset inputs and prep suggested follow-up
  useEffect(() => {
    setSelectedOutcome(null)
    setCallNotes('')
    setFollowupDate('')
  }, [currentLead?.id])

  // Set outcome and automatically suggest follow-up date as defined in plan
  const handleSelectOutcome = (outcome: CallOutcome) => {
    setSelectedOutcome(outcome)
    const suggested = suggestFollowupDate(outcome)
    if (suggested) {
      setFollowupDate(suggested.slice(0, 16)) // Format for datetime-local
    } else {
      setFollowupDate('')
    }
  }

  // Handle Save & Next
  const handleSaveAndNext = async () => {
    if (!currentLead) return

    if (!selectedOutcome) {
      showToast('Please select a call outcome before saving', 'warning')
      return
    }

    const isoFollowup = followupDate ? new Date(followupDate).toISOString() : null

    await logCallOutcome({
      leadId: currentLead.id,
      outcome: selectedOutcome,
      notes: callNotes.trim(),
      followupDate: isoFollowup,
    })

    // Advance to next lead in queue
    setSelectedOutcome(null)
    setCallNotes('')
    setFollowupDate('')

    // Queue updates automatically via context. Keep index within range
    if (currentIndex >= filteredQueue.length - 1) {
      setCurrentIndex(0)
    }
  }

  // Handle Skip
  const handleSkipNext = () => {
    if (filteredQueue.length === 0) return
    setCurrentIndex((prev) => (prev + 1) % filteredQueue.length)
  }

  // Handle Previous
  const handlePrev = () => {
    if (filteredQueue.length === 0) return
    setCurrentIndex((prev) => (prev - 1 + filteredQueue.length) % filteredQueue.length)
  }

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing inside textarea or text input
      const target = e.target as HTMLElement
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA'

      // Enter or Ctrl+Enter to Save & Next
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        handleSaveAndNext()
        return
      }

      if (e.key === 'Enter' && !isInput && selectedOutcome) {
        e.preventDefault()
        handleSaveAndNext()
        return
      }

      if (!isInput) {
        if (e.key === '1') handleSelectOutcome('No answer')
        else if (e.key === '2') handleSelectOutcome('Callback')
        else if (e.key === '3') handleSelectOutcome('Interested')
        else if (e.key === '4') handleSelectOutcome('Not interested')
        else if (e.key === '5') handleSelectOutcome('Wrong number')
        else if (e.key === '6') handleSelectOutcome('Do not call')
        else if (e.altKey && (e.key === 'n' || e.key === 'N')) {
          e.preventDefault()
          handleSkipNext()
        } else if (e.altKey && (e.key === 'p' || e.key === 'P')) {
          e.preventDefault()
          handlePrev()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentLead, selectedOutcome, callNotes, followupDate, filteredQueue.length])

  // Selected script text with placeholders replaced
  const activeTemplate = templates.find((t) => t.id === selectedTemplateId) || templates[0]
  const scriptText = currentLead
    ? replacePlaceholders(activeTemplate?.body || '', {
        name: currentLead.name,
        area: currentLead.area,
        category: currentLead.category,
      })
    : ''

  const scoreDetails = currentLead ? calculateLeadScore(currentLead, rules) : null

  // WhatsApp quick link
  const whatsappUrl = currentLead
    ? `https://wa.me/${whatsappDigits(currentLead.phone)}?text=${encodeURIComponent(
        replacePlaceholders(
          templates.find((t) => t.type === 'whatsapp')?.body ||
            `Hi {business_name} Team! Connecting from Leadonic regarding your business in {area}.`,
          { name: currentLead.name, area: currentLead.area }
        )
      )}`
    : '#'

  const copyPhoneNumber = () => {
    if (!currentLead) return
    navigator.clipboard.writeText(currentLead.phone)
    showToast('Copied phone number to clipboard!', 'info')
  }

  return (
    <div className="h-[calc(100vh-5.5rem)] flex flex-col max-w-7xl mx-auto">
      {/* Top Queue Bar & Mobile Toggle */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileQueueOpen(!mobileQueueOpen)}
            className="md:hidden px-3 py-1.5 rounded-lg bg-slate-800 text-xs font-medium text-slate-200 border border-slate-700"
          >
            {mobileQueueOpen ? 'Hide Queue' : `Queue (${filteredQueue.length})`}
          </button>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <PhoneCall className="w-5 h-5 text-indigo-400" />
              <span>Smart Call Workstation</span>
            </h1>
            <p className="text-xs text-slate-400 hidden sm:block">
              Priority queue sorted by follow-ups due, high scores, and response intent
            </p>
          </div>
        </div>

        {/* Queue Navigator Controls */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium hidden sm:inline">
            Lead {filteredQueue.length > 0 ? currentIndex + 1 : 0} of {filteredQueue.length}
          </span>
          <button
            onClick={handlePrev}
            disabled={filteredQueue.length <= 1}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition-colors"
            title="Previous lead (Alt+P)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleSkipNext}
            disabled={filteredQueue.length <= 1}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition-colors"
            title="Skip to next lead (Alt+N)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Dual-Column Layout */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 pt-3 overflow-hidden">
        {/* Left Column: Sorted Call Queue List (4 cols) */}
        <div
          className={`md:col-span-4 lg:col-span-4 flex flex-col bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden ${
            mobileQueueOpen ? 'fixed inset-4 z-40 md:relative md:inset-auto' : 'hidden md:flex'
          }`}
        >
          {/* Queue Header & Search */}
          <div className="p-3 border-b border-slate-800 space-y-2 bg-slate-950/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Up Next ({filteredQueue.length})
              </span>
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-medium">
                Auto-Prioritized
              </span>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search leads in queue..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/70 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Queue Item List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 p-1">
            {filteredQueue.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-500/50" />
                No active leads in queue! Import new leads or check completed tasks.
              </div>
            ) : (
              filteredQueue.map((lead, idx) => {
                const isActive = currentLead?.id === lead.id
                const followupStatus = getFollowupStatus(lead.nextFollowup)

                return (
                  <div
                    key={lead.id}
                    onClick={() => {
                      setCurrentIndex(idx)
                      setMobileQueueOpen(false)
                    }}
                    className={`p-3 rounded-xl cursor-pointer transition-all ${
                      isActive
                        ? 'bg-indigo-600/20 border border-indigo-500/40 shadow-sm'
                        : 'hover:bg-slate-800/60 border border-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold text-xs text-white truncate flex items-center gap-1.5">
                          <span>{lead.name}</span>
                          {lead.status === 'Interested' && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              Interested
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <span className="truncate">{lead.category}</span>
                          <span>·</span>
                          <span className="text-slate-400">{lead.area}</span>
                        </div>
                      </div>

                      {/* Lead Score Badge */}
                      <div className="shrink-0 flex flex-col items-end gap-1">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                          ★ {lead.score} pts
                        </span>
                      </div>
                    </div>

                    {/* Followup due alert if applicable */}
                    {lead.nextFollowup && (
                      <div className="mt-2 flex items-center gap-1 text-[10px]">
                        <Clock className="w-3 h-3 text-amber-400" />
                        <span
                          className={
                            followupStatus === 'overdue'
                              ? 'text-rose-400 font-semibold'
                              : 'text-amber-400 font-medium'
                          }
                        >
                          {followupStatus === 'overdue' ? 'Overdue: ' : 'Follow-up: '}
                          {formatShortDate(lead.nextFollowup)}
                        </span>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Right Column: Active Lead Dialing Workstation (8 cols) */}
        <div className="md:col-span-8 lg:col-span-8 flex flex-col bg-slate-900/90 border border-slate-800 rounded-2xl overflow-y-auto p-4 sm:p-6 space-y-5">
          {!currentLead ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
              <Sparkles className="w-12 h-12 text-indigo-400 mb-3 animate-pulse" />
              <h3 className="text-base font-bold text-white mb-1">Queue Completed!</h3>
              <p className="text-xs max-w-sm mb-4">
                You have reached the end of the priority call queue.
              </p>
            </div>
          ) : (
            <>
              {/* Active Lead Header Card */}
              <div className="bg-slate-950/80 p-4 sm:p-5 rounded-2xl border border-slate-800/80 shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                        {currentLead.name}
                      </h2>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                        {currentLead.category}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 text-slate-300">
                        {currentLead.area}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 mt-1">{currentLead.address}</p>

                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-400 flex-wrap">
                      <span className="flex items-center gap-1 text-amber-300">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span className="font-semibold">{currentLead.rating}</span>
                        <span className="text-slate-400">({currentLead.reviews} reviews)</span>
                      </span>

                      {currentLead.website && (
                        <a
                          href={currentLead.website}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 text-xs"
                        >
                          <span>{currentLead.website.replace('https://', '')}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}

                      <span className="text-slate-400">
                        Calls made: <strong className="text-slate-200">{currentLead.callCount}</strong>
                      </span>

                      <button
                        onClick={() => openLeadDetail(currentLead.id)}
                        className="text-indigo-400 hover:text-indigo-300 font-semibold text-xs ml-auto"
                      >
                        Inspect History →
                      </button>
                    </div>
                  </div>

                  {/* Smart Score Pill with breakdown tooltip */}
                  <div className="shrink-0 bg-slate-900 p-2.5 rounded-xl border border-indigo-500/30 text-right">
                    <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                      Lead Score
                    </div>
                    <div className="text-xl font-black text-emerald-400">
                      {currentLead.score} pts
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {scoreDetails?.breakdown.filter((b) => b.matched).length} rules matched
                    </div>
                  </div>
                </div>

                {/* Dialing & Outreach Action Buttons */}
                <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-3">
                  {/* Tap to Call Main Action */}
                  <a
                    href={`tel:${currentLead.phone}`}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md shadow-emerald-950 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <PhoneCall className="w-4 h-4 animate-bounce" />
                    <span>Tap to Call ({displayPhone(currentLead.phone)})</span>
                  </a>

                  {/* Copy Number */}
                  <button
                    onClick={copyPhoneNumber}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                    title="Copy phone"
                  >
                    <Copy className="w-4 h-4" />
                  </button>

                  {/* WhatsApp Quick Message */}
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-600/40 text-xs font-semibold transition-colors"
                  >
                    <MessageCircle className="w-4 h-4 text-emerald-400" />
                    <span>WhatsApp Pitch</span>
                  </a>
                </div>
              </div>

              {/* Dynamic Call Script with Live Placeholders */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                      Interactive Call Script
                    </span>
                    <span className="text-[10px] text-slate-400">
                      ({currentLead.name} · {currentLead.area})
                    </span>
                  </div>

                  {/* Script Selector */}
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    className="bg-slate-900 text-xs text-slate-300 border border-slate-700 rounded-lg px-2.5 py-1 focus:outline-none focus:border-indigo-500"
                  >
                    {templates
                      .filter((t) => t.type === 'script')
                      .map((tmpl) => (
                        <option key={tmpl.id} value={tmpl.id}>
                          {tmpl.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="p-3.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs text-slate-200 leading-relaxed font-sans whitespace-pre-wrap select-text">
                  {scriptText}
                </div>
              </div>

              {/* Outcomes Matrix (6 Outcomes per Plan) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Call Outcome (Press Hotkey 1–6)
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Selects automated next status
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {/* 1. No answer */}
                  <button
                    type="button"
                    onClick={() => handleSelectOutcome('No answer')}
                    className={`flex items-center justify-between p-3 rounded-xl border text-xs font-semibold transition-all ${
                      selectedOutcome === 'No answer'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 ring-2 ring-amber-500/40 shadow-lg'
                        : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-400" />
                      <span>No answer</span>
                    </div>
                    <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 font-mono">
                      1
                    </kbd>
                  </button>

                  {/* 2. Callback */}
                  <button
                    type="button"
                    onClick={() => handleSelectOutcome('Callback')}
                    className={`flex items-center justify-between p-3 rounded-xl border text-xs font-semibold transition-all ${
                      selectedOutcome === 'Callback'
                        ? 'bg-sky-500/20 border-sky-500 text-sky-300 ring-2 ring-sky-500/40 shadow-lg'
                        : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <PhoneForwarded className="w-4 h-4 text-sky-400" />
                      <span>Callback</span>
                    </div>
                    <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 font-mono">
                      2
                    </kbd>
                  </button>

                  {/* 3. Interested (Hot Lead!) */}
                  <button
                    type="button"
                    onClick={() => handleSelectOutcome('Interested')}
                    className={`flex items-center justify-between p-3 rounded-xl border text-xs font-semibold transition-all ${
                      selectedOutcome === 'Interested'
                        ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300 ring-2 ring-emerald-500/50 shadow-xl'
                        : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Flame className="w-4 h-4 text-emerald-400 animate-pulse" />
                      <span>Interested 🔥</span>
                    </div>
                    <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 font-mono">
                      3
                    </kbd>
                  </button>

                  {/* 4. Not interested */}
                  <button
                    type="button"
                    onClick={() => handleSelectOutcome('Not interested')}
                    className={`flex items-center justify-between p-3 rounded-xl border text-xs font-semibold transition-all ${
                      selectedOutcome === 'Not interested'
                        ? 'bg-slate-700/50 border-slate-500 text-slate-200 ring-2 ring-slate-500/40 shadow-lg'
                        : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-slate-400" />
                      <span>Not interested</span>
                    </div>
                    <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 font-mono">
                      4
                    </kbd>
                  </button>

                  {/* 5. Wrong number */}
                  <button
                    type="button"
                    onClick={() => handleSelectOutcome('Wrong number')}
                    className={`flex items-center justify-between p-3 rounded-xl border text-xs font-semibold transition-all ${
                      selectedOutcome === 'Wrong number'
                        ? 'bg-rose-500/20 border-rose-500 text-rose-300 ring-2 ring-rose-500/40 shadow-lg'
                        : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-rose-400" />
                      <span>Wrong number</span>
                    </div>
                    <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 font-mono">
                      5
                    </kbd>
                  </button>

                  {/* 6. Do not call */}
                  <button
                    type="button"
                    onClick={() => handleSelectOutcome('Do not call')}
                    className={`flex items-center justify-between p-3 rounded-xl border text-xs font-semibold transition-all ${
                      selectedOutcome === 'Do not call'
                        ? 'bg-rose-900/40 border-rose-600 text-rose-200 ring-2 ring-rose-600/50 shadow-lg'
                        : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-rose-500" />
                      <span>Do not call</span>
                    </div>
                    <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 font-mono">
                      6
                    </kbd>
                  </button>
                </div>
              </div>

              {/* Call Notes Box */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Call Notes / Objection Log
                </label>
                <textarea
                  ref={notesInputRef}
                  rows={2}
                  value={callNotes}
                  onChange={(e) => setCallNotes(e.target.value)}
                  placeholder="e.g. Spoke with manager Rajesh. Asked to call tomorrow after 3 PM when clinic is quiet..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              {/* Follow-up Pickers (Tomorrow, 3 days, Next week, Custom) */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-slate-300">
                      Follow-up Reminder Schedule
                    </span>
                  </div>
                  {followupDate && (
                    <button
                      onClick={() => setFollowupDate('')}
                      className="text-[10px] text-slate-400 hover:text-rose-400"
                    >
                      Clear reminder
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFollowupDate(getQuickFollowupDate('tomorrow').slice(0, 16))}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 transition-colors"
                  >
                    Tomorrow (11 AM)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFollowupDate(getQuickFollowupDate('3days').slice(0, 16))}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 transition-colors"
                  >
                    In 3 Days (2 PM)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFollowupDate(getQuickFollowupDate('nextWeek').slice(0, 16))}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 transition-colors"
                  >
                    Next Week
                  </button>

                  <div className="flex items-center gap-2 ml-auto">
                    <span className="text-[11px] text-slate-400">Custom:</span>
                    <input
                      type="datetime-local"
                      value={followupDate}
                      onChange={(e) => setFollowupDate(e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Bottom Action Footer: Save & Next */}
              <div className="pt-2 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSkipNext}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                  >
                    Skip to Next (Alt+N)
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleSaveAndNext}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-950 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Send className="w-4 h-4" />
                  <span>Save & Next Lead</span>
                  <kbd className="hidden sm:inline px-1.5 py-0.5 rounded bg-indigo-800 text-[10px] text-indigo-200 font-mono">
                    Ctrl+Enter
                  </kbd>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
