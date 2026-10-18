import { db } from '../db/database'
import { ScoringRules } from '../types'
import { DEFAULT_SCORING_RULES } from '../lib/scoring'
import { generateSeedData } from '../db/seedData'
import { leadsRepo } from './leadsRepo'

export const settingsRepo = {
  async getScoringRules(): Promise<ScoringRules> {
    const record = await db.settings.get('scoringRules')
    if (record && record.value) {
      return record.value as ScoringRules
    }
    return DEFAULT_SCORING_RULES
  },

  async saveScoringRules(rules: ScoringRules): Promise<void> {
    await db.settings.put({ key: 'scoringRules', value: rules })
    // Automatically recalculate all lead scores using new rules!
    await leadsRepo.recalculateAllScores(rules)
  },

  async ensureInitialized(): Promise<void> {
    const leadCount = await db.leads.count()
    if (leadCount === 0) {
      await this.seedDemoData()
    }
  },

  async seedDemoData(): Promise<void> {
    const data = generateSeedData()
    await db.transaction(
      'rw',
      [
        db.leads,
        db.calls,
        db.tasks,
        db.templates,
        db.batches,
        db.activities,
        db.settings,
      ],
      async () => {
        await db.leads.clear()
        await db.calls.clear()
        await db.tasks.clear()
        await db.templates.clear()
        await db.batches.clear()
        await db.activities.clear()

        await db.leads.bulkPut(data.leads)
        await db.calls.bulkPut(data.calls)
        await db.tasks.bulkPut(data.tasks)
        await db.templates.bulkPut(data.templates)
        await db.batches.bulkPut(data.batches)
        await db.activities.bulkPut(data.activities)
        await db.settings.put({ key: 'scoringRules', value: DEFAULT_SCORING_RULES })
      }
    )
  },

  async resetAll(): Promise<void> {
    await db.transaction(
      'rw',
      [
        db.leads,
        db.calls,
        db.tasks,
        db.templates,
        db.batches,
        db.activities,
        db.settings,
      ],
      async () => {
        await db.leads.clear()
        await db.calls.clear()
        await db.tasks.clear()
        await db.templates.clear()
        await db.batches.clear()
        await db.activities.clear()
        await db.settings.clear()
      }
    )
  },

  async exportBackupJson(): Promise<string> {
    const leads = await db.leads.toArray()
    const calls = await db.calls.toArray()
    const tasks = await db.tasks.toArray()
    const templates = await db.templates.toArray()
    const batches = await db.batches.toArray()
    const activities = await db.activities.toArray()
    const rules = await this.getScoringRules()

    const backup = {
      app: 'Leadonic',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      data: {
        leads,
        calls,
        tasks,
        templates,
        batches,
        activities,
        scoringRules: rules,
      },
    }

    return JSON.stringify(backup, null, 2)
  },

  async importBackupJson(jsonString: string): Promise<boolean> {
    try {
      const parsed = JSON.parse(jsonString)
      if (!parsed || !parsed.data) {
        throw new Error('Invalid Leadonic backup JSON format')
      }

      const { leads, calls, tasks, templates, batches, activities, scoringRules } = parsed.data

      await db.transaction(
        'rw',
        [
          db.leads,
          db.calls,
          db.tasks,
          db.templates,
          db.batches,
          db.activities,
          db.settings,
        ],
        async () => {
          if (Array.isArray(leads)) {
            await db.leads.clear()
            await db.leads.bulkPut(leads)
          }
          if (Array.isArray(calls)) {
            await db.calls.clear()
            await db.calls.bulkPut(calls)
          }
          if (Array.isArray(tasks)) {
            await db.tasks.clear()
            await db.tasks.bulkPut(tasks)
          }
          if (Array.isArray(templates)) {
            await db.templates.clear()
            await db.templates.bulkPut(templates)
          }
          if (Array.isArray(batches)) {
            await db.batches.clear()
            await db.batches.bulkPut(batches)
          }
          if (Array.isArray(activities)) {
            await db.activities.clear()
            await db.activities.bulkPut(activities)
          }
          if (scoringRules) {
            await db.settings.put({ key: 'scoringRules', value: scoringRules })
          }
        }
      )

      return true
    } catch (err) {
      console.error('Import failed:', err)
      throw err
    }
  },
}
