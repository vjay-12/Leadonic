import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import {
  Lead,
  CallLog,
  Task,
  Template,
  ImportBatch,
  ActivityEvent,
  ScoringRules,
  CallOutcome,
} from '../types'
import { leadsRepo } from '../repos/leadsRepo'
import { callsRepo } from '../repos/callsRepo'
import { tasksRepo } from '../repos/tasksRepo'
import { templatesRepo } from '../repos/templatesRepo'
import { batchesRepo } from '../repos/batchesRepo'
import { activityRepo } from '../repos/activityRepo'
import { settingsRepo } from '../repos/settingsRepo'
import { DEFAULT_SCORING_RULES } from '../lib/scoring'
import { fireInterestedConfetti, playOutcomeSound } from '../lib/feedback'
import { isToday, isPast, parseISO } from 'date-fns'

interface ToastState {
  id: string
  message: string
  type: 'success' | 'info' | 'warning' | 'error'
}

interface StatsState {
  callsToday: number
  followupsDue: number
  newLeads: number
  contactedLeads: number
  interestedLeads: number
  lostLeads: number
  totalLeads: number
}

interface LeadonicContextType {
  leads: Lead[]
  queueLeads: Lead[]
  calls: CallLog[]
  tasks: Task[]
  templates: Template[]
  batches: ImportBatch[]
  activities: ActivityEvent[]
  rules: ScoringRules
  stats: StatsState
  loading: boolean
  toasts: ToastState[]
  detailLeadId: string | null
  openLeadDetail: (id: string | null) => void
  showToast: (message: string, type?: ToastState['type']) => void
  dismissToast: (id: string) => void
  refreshData: () => Promise<void>
  logCallOutcome: (params: {
    leadId: string
    outcome: CallOutcome
    notes: string
    followupDate?: string | null
  }) => Promise<void>
}

const LeadonicContext = createContext<LeadonicContextType | null>(null)

export const LeadonicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [leads, setLeads] = useState<Lead[]>([])
  const [queueLeads, setQueueLeads] = useState<Lead[]>([])
  const [calls, setCalls] = useState<CallLog[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [batches, setBatches] = useState<ImportBatch[]>([])
  const [activities, setActivities] = useState<ActivityEvent[]>([])
  const [rules, setRules] = useState<ScoringRules>(DEFAULT_SCORING_RULES)
  const [loading, setLoading] = useState(true)
  const [toasts, setToasts] = useState<ToastState[]>([])
  const [detailLeadId, setDetailLeadId] = useState<string | null>(null)

  const showToast = useCallback((message: string, type: ToastState['type'] = 'success') => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const refreshData = useCallback(async () => {
    try {
      await settingsRepo.ensureInitialized()
      const [
        allLeads,
        queue,
        allCalls,
        allTasks,
        allTemplates,
        allBatches,
        recentActivities,
        scoringRules,
      ] = await Promise.all([
        leadsRepo.getAll(),
        leadsRepo.getQueueLeads(),
        callsRepo.getAll(),
        tasksRepo.getAll(),
        templatesRepo.getAll(),
        batchesRepo.getAll(),
        activityRepo.getRecent(30),
        settingsRepo.getScoringRules(),
      ])

      setLeads(allLeads)
      setQueueLeads(queue)
      setCalls(allCalls)
      setTasks(allTasks)
      setTemplates(allTemplates)
      setBatches(allBatches)
      setActivities(recentActivities)
      setRules(scoringRules)
    } catch (err) {
      console.error('Error refreshing data:', err)
      showToast('Error syncing database records', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    refreshData()
  }, [refreshData])

  // Log Call Outcome handler
  const logCallOutcome = useCallback(
    async (params: {
      leadId: string
      outcome: CallOutcome
      notes: string
      followupDate?: string | null
    }) => {
      try {
        const { outcome } = params
        const result = await callsRepo.logCall(params)

        if (outcome === 'Interested') {
          fireInterestedConfetti()
          playOutcomeSound('success')
          showToast(`Marked as Interested! Status updated to Interested.`, 'success')
        } else if (outcome === 'Do not call') {
          playOutcomeSound('next')
          showToast(`Marked Do Not Call. Lead flagged & moved to Lost.`, 'warning')
        } else {
          playOutcomeSound('call')
          showToast(`Call logged: ${outcome}. Status: ${result.newStatus}`, 'info')
        }

        await refreshData()
      } catch (err) {
        console.error('Failed to log call:', err)
        showToast('Failed to save call outcome', 'error')
      }
    },
    [refreshData, showToast]
  )

  // Calculate live stats
  const callsToday = calls.filter((c) => {
    try {
      return isToday(parseISO(c.calledAt))
    } catch {
      return false
    }
  }).length

  const followupsDue = leads.filter((l) => {
    if (!l.nextFollowup || l.doNotCall || l.status === 'Lost') return false
    try {
      const d = parseISO(l.nextFollowup)
      return isToday(d) || isPast(d)
    } catch {
      return false
    }
  }).length

  const newLeads = leads.filter((l) => l.status === 'New').length
  const contactedLeads = leads.filter((l) => l.status === 'Contacted').length
  const interestedLeads = leads.filter((l) => l.status === 'Interested').length
  const lostLeads = leads.filter((l) => l.status === 'Lost').length
  const totalLeads = leads.length

  const stats: StatsState = {
    callsToday,
    followupsDue,
    newLeads,
    contactedLeads,
    interestedLeads,
    lostLeads,
    totalLeads,
  }

  return (
    <LeadonicContext.Provider
      value={{
        leads,
        queueLeads,
        calls,
        tasks,
        templates,
        batches,
        activities,
        rules,
        stats,
        loading,
        toasts,
        detailLeadId,
        openLeadDetail: setDetailLeadId,
        showToast,
        dismissToast,
        refreshData,
        logCallOutcome,
      }}
    >
      {children}
    </LeadonicContext.Provider>
  )
}

export function useLeadonic() {
  const context = useContext(LeadonicContext)
  if (!context) {
    throw new Error('useLeadonic must be used within a LeadonicProvider')
  }
  return context
}
