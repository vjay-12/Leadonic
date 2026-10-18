import { db } from '../db/database'
import { Template } from '../types'
import { generateId } from '../lib/utils'
import { DEFAULT_TEMPLATES } from '../db/seedData'

export const templatesRepo = {
  async getAll(): Promise<Template[]> {
    const list = await db.templates.toArray()
    if (list.length === 0) {
      await db.templates.bulkPut(DEFAULT_TEMPLATES)
      return DEFAULT_TEMPLATES
    }
    return list
  },

  async getById(id: string): Promise<Template | undefined> {
    return await db.templates.get(id)
  },

  async save(template: Partial<Template>): Promise<Template> {
    const id = template.id || generateId()
    const item: Template = {
      id,
      type: template.type || 'script',
      name: template.name || 'Untitled Template',
      body: template.body || '',
      isDefault: Boolean(template.isDefault),
    }
    await db.templates.put(item)
    return item
  },

  async delete(id: string): Promise<void> {
    await db.templates.delete(id)
  },

  async resetDefaults(): Promise<void> {
    await db.templates.clear()
    await db.templates.bulkPut(DEFAULT_TEMPLATES)
  },
}
