import { db } from '../db/database'
import { Lead, LeadStatus, ScoringRules } from '../types'
import { calculateLeadScore, DEFAULT_SCORING_RULES } from '../lib/scoring'
import { normalizePhone } from '../lib/phone'
import { generateId } from '../lib/utils'
import { parseISO, isPast, isToday } from 'date-fns'

export const leadsRepo = {
  async getAll(): Promise<Lead[]> {
    return await db.leads.toArray()
  },

  async getById(id: string): Promise<Lead | undefined> {
    return await db.leads.get(id)
  },

  async getExistingPhonesSet(): Promise<Set<string>> {
    const leads = await db.leads.toArray()
    const set = new Set<string>()
    leads.forEach((l) => {
      if (l.phone) set.add(l.phone)
      if (l.rawPhone) set.add(l.rawPhone)
    })
    return set
  },

  async create(data: Partial<Lead>, rules: ScoringRules = DEFAULT_SCORING_RULES): Promise<Lead> {
    const id = data.id || generateId()
    const norm = normalizePhone(data.phone || data.rawPhone || '')
    const phone = norm.e164 || data.phone || ''

    const scoreResult = calculateLeadScore(
      {
        rating: data.rating,
        website: data.website,
        category: data.category,
        status: data.status || 'New',
      },
      rules
    )

    const lead: Lead = {
      id,
      name: data.name || 'Untitled Lead',
      phone,
      rawPhone: data.rawPhone || data.phone || '',
      address: data.address || '',
      category: data.category || 'General',
      website: data.website || '',
      rating: data.rating ?? 0,
      reviews: data.reviews ?? 0,
      area: data.area || 'Indiranagar',
      batchId: data.batchId,
      status: data.status || 'New',
      score: data.score !== undefined ? data.score : scoreResult.total,
      doNotCall: Boolean(data.doNotCall),
      nextFollowup: data.nextFollowup || null,
      lastCalledAt: data.lastCalledAt || null,
      callCount: data.callCount || 0,
      createdAt: data.createdAt || new Date().toISOString(),
      notes: data.notes || '',
    }

    await db.leads.put(lead)

    await db.activities.put({
      id: generateId(),
      leadId: id,
      type: 'status',
      text: `Lead created with status "${lead.status}"`,
      at: lead.createdAt,
    })

    return lead
  },

  async update(id: string, updates: Partial<Lead>): Promise<Lead | undefined> {
    const existing = await db.leads.get(id)
    if (!existing) return undefined

    const merged = { ...existing, ...updates }
    await db.leads.put(merged)
    return merged
  },

  async bulkUpdateStatus(ids: string[], status: LeadStatus): Promise<void> {
    const now = new Date().toISOString()
    await db.transaction('rw', db.leads, db.activities, async () => {
      for (const id of ids) {
        const lead = await db.leads.get(id)
        if (lead) {
          lead.status = status
          await db.leads.put(lead)
          await db.activities.put({
            id: generateId(),
            leadId: id,
            type: 'status',
            text: `Status bulk changed to "${status}"`,
            at: now,
          })
        }
      }
    })
  },

  async bulkDelete(ids: string[]): Promise<void> {
    await db.transaction('rw', db.leads, db.calls, db.tasks, db.activities, async () => {
      await db.leads.bulkDelete(ids)
      for (const id of ids) {
        await db.calls.where('leadId').equals(id).delete()
        await db.tasks.where('leadId').equals(id).delete()
        await db.activities.where('leadId').equals(id).delete()
      }
    })
  },

  async delete(id: string): Promise<void> {
    await db.transaction('rw', db.leads, db.calls, db.tasks, db.activities, async () => {
      await db.leads.delete(id)
      await db.calls.where('leadId').equals(id).delete()
      await db.tasks.where('leadId').equals(id).delete()
      await db.activities.where('leadId').equals(id).delete()
    })
  },

  /**
   * Main Call Queue algorithm:
   * 1. Exclude do-not-call leads
   * 2. Exclude lost leads (unless requested)
   * 3. Sort by:
   *    - Follow-ups due (Overdue / Today) first!
   *    - Then score (highest first)
   *    - Then created date
   */
  async getQueueLeads(): Promise<Lead[]> {
    const leads = await db.leads.toArray()
    const active = leads.filter((l) => !l.doNotCall && l.status !== 'Lost')

    return active.sort((a, b) => {
      const aDue = a.nextFollowup ? parseISO(a.nextFollowup) : null
      const bDue = b.nextFollowup ? parseISO(b.nextFollowup) : null

      const aIsUrgent = aDue && (isPast(aDue) || isToday(aDue))
      const bIsUrgent = bDue && (isPast(bDue) || isToday(bDue))

      if (aIsUrgent && !bIsUrgent) return -1
      if (!aIsUrgent && bIsUrgent) return 1

      // If both are urgent, earliest due date first
      if (aIsUrgent && bIsUrgent && aDue && bDue) {
        return aDue.getTime() - bDue.getTime()
      }

      // Next criteria: highest lead score first
      if (b.score !== a.score) {
        return b.score - a.score
      }

      // Then call count (uncalled first)
      if (a.callCount !== b.callCount) {
        return a.callCount - b.callCount
      }

      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  },

  async recalculateAllScores(rules: ScoringRules): Promise<void> {
    const leads = await db.leads.toArray()
    const calls = await db.calls.toArray()

    const noAnswerCountMap = new Map<string, number>()
    calls.forEach((c) => {
      if (c.outcome === 'No answer') {
        noAnswerCountMap.set(c.leadId, (noAnswerCountMap.get(c.leadId) || 0) + 1)
      }
    })

    await db.transaction('rw', db.leads, async () => {
      for (const lead of leads) {
        const noAnswers = noAnswerCountMap.get(lead.id) || 0
        const result = calculateLeadScore(lead, rules, noAnswers)
        lead.score = result.total
        await db.leads.put(lead)
      }
    })
  },
}
