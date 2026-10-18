import { db } from '../db/database'
import { ActivityEvent } from '../types'
import { generateId } from '../lib/utils'

export const activityRepo = {
  async getForLead(leadId: string): Promise<ActivityEvent[]> {
    return await db.activities.where('leadId').equals(leadId).reverse().sortBy('at')
  },

  async getRecent(limit: number = 20): Promise<ActivityEvent[]> {
    const all = await db.activities.reverse().sortBy('at')
    return all.slice(0, limit)
  },

  async log(event: Omit<ActivityEvent, 'id'>): Promise<ActivityEvent> {
    const item: ActivityEvent = {
      id: generateId(),
      ...event,
    }
    await db.activities.put(item)
    return item
  },
}
