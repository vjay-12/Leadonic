import { db } from '../db/database'
import { Task } from '../types'
import { generateId } from '../lib/utils'

export const tasksRepo = {
  async getAll(): Promise<Task[]> {
    return await db.tasks.reverse().sortBy('dueDate')
  },

  async getForLead(leadId: string): Promise<Task[]> {
    return await db.tasks.where('leadId').equals(leadId).reverse().sortBy('dueDate')
  },

  async create(data: Partial<Task>): Promise<Task> {
    const id = data.id || generateId()
    const now = new Date().toISOString()

    const task: Task = {
      id,
      leadId: data.leadId || '',
      title: data.title || 'Follow up with lead',
      dueDate: data.dueDate || now,
      done: Boolean(data.done),
      createdAt: data.createdAt || now,
      leadName: data.leadName,
      leadPhone: data.leadPhone,
      leadArea: data.leadArea,
    }

    await db.tasks.put(task)

    if (task.leadId) {
      await db.activities.put({
        id: generateId(),
        leadId: task.leadId,
        type: 'task',
        text: `New task added: "${task.title}"`,
        at: now,
      })
    }

    return task
  },

  async toggleDone(id: string, explicitDone?: boolean): Promise<Task | undefined> {
    const task = await db.tasks.get(id)
    if (!task) return undefined

    task.done = explicitDone !== undefined ? explicitDone : !task.done
    await db.tasks.put(task)

    if (task.leadId) {
      await db.activities.put({
        id: generateId(),
        leadId: task.leadId,
        type: 'task',
        text: `Task "${task.title}" marked as ${task.done ? 'completed' : 'pending'}`,
        at: new Date().toISOString(),
      })
    }

    return task
  },

  async delete(id: string): Promise<void> {
    await db.tasks.delete(id)
  },
}
