import { db } from '../db/database'
import { CallLog, CallOutcome, LeadStatus } from '../types'
import { generateId, suggestFollowupDate } from '../lib/utils'
import { isToday, parseISO, subDays } from 'date-fns'

export interface LogCallParams {
  leadId: string
  outcome: CallOutcome
  notes: string
  followupDate?: string | null
}

export const callsRepo = {
  async getAll(): Promise<CallLog[]> {
    return await db.calls.reverse().sortBy('calledAt')
  },

  async getForLead(leadId: string): Promise<CallLog[]> {
    return await db.calls.where('leadId').equals(leadId).reverse().sortBy('calledAt')
  },

  async logCall(params: LogCallParams): Promise<{ call: CallLog; newStatus: LeadStatus }> {
    const { leadId, outcome, notes, followupDate } = params
    const calledAt = new Date().toISOString()
    const callId = generateId()

    const lead = await db.leads.get(leadId)
    if (!lead) {
      throw new Error(`Lead with id ${leadId} not found`)
    }

    // Determine target status according to demo plan rules:
    // Interested → Interested
    // Callback → Contacted
    // No answer → Contacted
    // Not interested → Lost
    // Wrong number → Lost
    // Do not call → Lost + flag
    let newStatus: LeadStatus = lead.status
    let doNotCall = lead.doNotCall

    switch (outcome) {
      case 'Interested':
        newStatus = 'Interested'
        break
      case 'Callback':
      case 'No answer':
        newStatus = 'Contacted'
        break
      case 'Not interested':
      case 'Wrong number':
        newStatus = 'Lost'
        break
      case 'Do not call':
        newStatus = 'Lost'
        doNotCall = true
        break
    }

    // Effective followup date: use passed date or fallback if suggested
    let effectiveFollowup = followupDate
    if (effectiveFollowup === undefined) {
      effectiveFollowup = suggestFollowupDate(outcome)
    }

    // Clear follow-up if Do not call, Not interested, or Wrong number
    if (outcome === 'Do not call' || outcome === 'Wrong number' || outcome === 'Not interested') {
      effectiveFollowup = null
    }

    const call: CallLog = {
      id: callId,
      leadId,
      outcome,
      notes: notes || '',
      calledAt,
      followupDate: effectiveFollowup,
    }

    await db.transaction('rw', db.calls, db.leads, db.tasks, db.activities, async () => {
      // 1. Save Call Log
      await db.calls.put(call)

      // 2. Update Lead
      lead.status = newStatus
      lead.doNotCall = doNotCall
      lead.callCount = (lead.callCount || 0) + 1
      lead.lastCalledAt = calledAt
      lead.nextFollowup = effectiveFollowup || null
      await db.leads.put(lead)

      // 3. Create or update Task if follow-up is scheduled
      if (effectiveFollowup) {
        const taskId = generateId()
        await db.tasks.put({
          id: taskId,
          leadId,
          title: `Follow up with ${lead.name} (${outcome})`,
          dueDate: effectiveFollowup,
          done: false,
          createdAt: calledAt,
          leadName: lead.name,
          leadPhone: lead.phone,
          leadArea: lead.area,
        })
      }

      // 4. Log Activity Event
      await db.activities.put({
        id: generateId(),
        leadId,
        type: 'call',
        text: `Call logged: "${outcome}"${notes ? ` — ${notes}` : ''}`,
        at: calledAt,
        meta: { outcome, followupDate: effectiveFollowup },
      })

      if (effectiveFollowup) {
        await db.activities.put({
          id: generateId(),
          leadId,
          type: 'task',
          text: `Follow-up task scheduled for ${new Date(effectiveFollowup).toLocaleString()}`,
          at: calledAt,
        })
      }
    })

    return { call, newStatus }
  },

  async getCallsToday(): Promise<CallLog[]> {
    const all = await db.calls.toArray()
    return all.filter((c) => {
      try {
        return isToday(parseISO(c.calledAt))
      } catch {
        return false
      }
    })
  },

  async getCallsLast7Days(): Promise<{ date: string; label: string; count: number }[]> {
    const all = await db.calls.toArray()
    const days: { date: string; label: string; count: number }[] = []
    const now = new Date()

    for (let i = 6; i >= 0; i--) {
      const d = subDays(now, i)
      const dateStr = d.toISOString().split('T')[0]
      const label = i === 0 ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' })
      const count = all.filter((c) => c.calledAt && c.calledAt.startsWith(dateStr)).length
      days.push({ date: dateStr, label, count })
    }

    return days
  },
}
