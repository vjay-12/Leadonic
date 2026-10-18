import { db } from '../db/database'
import { ImportBatch } from '../types'
import { generateId } from '../lib/utils'

export const batchesRepo = {
  async getAll(): Promise<ImportBatch[]> {
    return await db.batches.reverse().sortBy('date')
  },

  async getById(id: string): Promise<ImportBatch | undefined> {
    return await db.batches.get(id)
  },

  async create(data: Partial<ImportBatch>): Promise<ImportBatch> {
    const id = data.id || generateId()
    const batch: ImportBatch = {
      id,
      fileName: data.fileName || 'imported_file.xlsx',
      area: data.area || 'Bangalore',
      date: data.date || new Date().toISOString(),
      added: data.added || 0,
      skipped: data.skipped || 0,
      errors: data.errors || 0,
      leadsCount: data.leadsCount || data.added || 0,
    }
    await db.batches.put(batch)
    return batch
  },
}
