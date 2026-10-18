import Dexie, { type Table } from 'dexie'
import {
  Lead,
  CallLog,
  Task,
  Template,
  ImportBatch,
  ActivityEvent,
} from '../types'

export class LeadonicDB extends Dexie {
  leads!: Table<Lead, string>
  calls!: Table<CallLog, string>
  tasks!: Table<Task, string>
  templates!: Table<Template, string>
  batches!: Table<ImportBatch, string>
  activities!: Table<ActivityEvent, string>
  settings!: Table<{ key: string; value: any }, string>

  constructor() {
    super('LeadonicDatabase')
    this.version(1).stores({
      leads: 'id, phone, status, area, category, batchId, score, doNotCall, nextFollowup, lastCalledAt, createdAt',
      calls: 'id, leadId, outcome, calledAt',
      tasks: 'id, leadId, dueDate, done, createdAt',
      templates: 'id, type, name',
      batches: 'id, date',
      activities: 'id, leadId, type, at',
      settings: 'key',
    })
  }
}

export const db = new LeadonicDB()
