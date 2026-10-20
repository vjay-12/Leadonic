import { Router, Request, Response } from 'express'
import { z } from 'zod'
import path from 'path'
import fs from 'fs'
import { prisma } from '../db.js'
import { normalizePhone, makeDedupeKey, parseBool, parseNum } from '../../../lib/normalize.js'

export const importRouter = Router()

const ImportRequestSchema = z.object({
  fileName: z.string().default('leads.xlsx'),
  categoryId: z.number({ required_error: 'Category is required' }),
  dryRun: z.boolean().default(false),
  batchId: z.number().optional().nullable(),
  rows: z.array(z.record(z.any())),
})

// GET /api/leads/sample.xlsx
importRouter.get('/sample.xlsx', (_req: Request, res: Response) => {
  const samplePath = path.join(process.cwd(), 'samples', 'sample-leads.xlsx')
  if (fs.existsSync(samplePath)) {
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', 'attachment; filename="sample-leads.xlsx"')
    return res.sendFile(samplePath)
  }
  return res.status(404).json({ error: 'Sample file not found' })
})

// POST /api/leads/import
importRouter.post('/', async (req: Request, res: Response) => {
  const parsed = ImportRequestSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0]?.message || 'Invalid input' })
  }

  const { fileName, categoryId, dryRun, rows } = parsed.data
  let batchId = parsed.data.batchId

  try {
    // Verify category exists
    const category = await prisma.leadCategory.findUnique({
      where: { id: categoryId },
    })
    if (!category) {
      return res.status(400).json({ error: 'Selected category does not exist' })
    }

    // Step 1: Pre-process rows, validate titles, compute dedupe keys
    const validRowsToInsert: any[] = []
    const errors: { row: number; reason: string }[] = []
    const seenDedupeKeysInFile = new Map<string, number>()
    let fileDuplicatesCount = 0

    // Collect dedupe keys to query existing DB leads in one batch
    const candidateDedupeKeys: string[] = []
    const rowResults: {
      index: number
      check: 'ready' | 'duplicate' | 'duplicate_in_file' | 'error'
      reason?: string
      existingLeadId?: number
      existingTitle?: string
      firstRowIndex?: number
    }[] = Array.from({ length: rows.length })

    rows.forEach((row, idx) => {
      const rowNum = idx + 1
      const title = (row['title'] || row['name'] || '').toString().trim()
      if (!title) {
        const reason = 'Missing title / name'
        errors.push({ row: rowNum, reason })
        rowResults[idx] = {
          index: idx,
          check: 'error',
          reason,
        }
        return
      }

      const phoneRaw = row['phone'] != null ? String(row['phone']).trim() : null
      const address = row['address'] != null ? String(row['address']).trim() : null
      const phoneNormalized = normalizePhone(phoneRaw)
      const dedupeKey = makeDedupeKey(title, address, phoneNormalized)

      if (seenDedupeKeysInFile.has(dedupeKey)) {
        fileDuplicatesCount++
        const firstIdx = seenDedupeKeysInFile.get(dedupeKey)!
        rowResults[idx] = {
          index: idx,
          check: 'duplicate_in_file',
          reason: `Duplicate of row #${firstIdx + 1}`,
          firstRowIndex: firstIdx,
        }
        return
      }

      seenDedupeKeysInFile.set(dedupeKey, idx)
      candidateDedupeKeys.push(dedupeKey)

      validRowsToInsert.push({
        idx,
        rowNum,
        title,
        phone: phoneRaw,
        phoneNormalized,
        dedupeKey,
        emails: row['emails'] != null ? String(row['emails']).trim() : null,
        website: row['website'] != null ? String(row['website']).trim() : null,
        mapsCategory: row['mapsCategory'] != null ? String(row['mapsCategory']).trim() : null,
        address,
        reviewRating: row['reviewRating'] != null ? parseNum(row['reviewRating']) : null,
        reviewCount: row['reviewCount'] != null ? Math.round(parseNum(row['reviewCount']) || 0) : null,
        hasWebsite: row['hasWebsite'] != null ? parseBool(row['hasWebsite']) : null,
        needsWebsite: row['needsWebsite'] != null ? parseBool(row['needsWebsite']) : null,
        erpMatch: row['erpMatch'] != null ? String(row['erpMatch']).trim() : null,
        needsErp: row['needsErp'] != null ? parseBool(row['needsErp']) : null,
        priorityScore: row['priorityScore'] != null ? parseNum(row['priorityScore']) : null,
        priority: row['priority'] != null ? String(row['priority']).trim() : null,
        remarks: row['remarks'] != null ? String(row['remarks']).trim() : null,
        statusId: null,
        categoryId,
      })
    })

    // Step 2: Query DB for already existing dedupeKeys in one batched query
    const existingDbLeads: { id: number; title: string; dedupeKey: string; archivedAt: Date | null }[] = []
    const QUERY_CHUNK_SIZE = 1000
    for (let i = 0; i < candidateDedupeKeys.length; i += QUERY_CHUNK_SIZE) {
      const keysSlice = candidateDedupeKeys.slice(i, i + QUERY_CHUNK_SIZE)
      const found = await prisma.lead.findMany({
        where: { dedupeKey: { in: keysSlice } },
        select: { id: true, title: true, dedupeKey: true, archivedAt: true },
      })
      existingDbLeads.push(...found)
    }

    const existingDbMap = new Map<string, { id: number; title: string; archivedAt: Date | null }>()
    for (const l of existingDbLeads) {
      existingDbMap.set(l.dedupeKey, l)
    }

    let skippedArchivedCount = 0
    let dbDuplicatesCount = 0

    validRowsToInsert.forEach((r) => {
      const existing = existingDbMap.get(r.dedupeKey)
      if (existing) {
        dbDuplicatesCount++
        if (existing.archivedAt != null) skippedArchivedCount++
        rowResults[r.idx] = {
          index: r.idx,
          check: 'duplicate',
          reason: existing.archivedAt
            ? `Matches archived lead #${existing.id} "${existing.title}"`
            : `Matches existing lead #${existing.id} "${existing.title}"`,
          existingLeadId: existing.id,
          existingTitle: existing.title,
        }
      } else {
        rowResults[r.idx] = {
          index: r.idx,
          check: 'ready',
        }
      }
    })

    const totalDuplicates = fileDuplicatesCount + dbDuplicatesCount
    const rowsToCreate = validRowsToInsert.filter((r) => !existingDbMap.has(r.dedupeKey))
    const willAdd = rowsToCreate.length

    if (dryRun) {
      return res.json({
        willAdd,
        duplicates: totalDuplicates,
        skippedArchivedCount,
        errors,
        rows: rowResults,
      })
    }

    // Step 3: Write to database
    // Create or reuse ImportBatch
    if (!batchId) {
      const batch = await prisma.importBatch.create({
        data: {
          fileName,
          categoryId,
          addedCount: 0,
          skippedCount: 0,
          errorCount: 0,
        },
      })
      batchId = batch.id
    }

    if (rowsToCreate.length > 0) {
      const leadsData = rowsToCreate.map((r) => ({
        title: r.title,
        phone: r.phone,
        phoneNormalized: r.phoneNormalized,
        dedupeKey: r.dedupeKey,
        emails: r.emails,
        website: r.website,
        mapsCategory: r.mapsCategory,
        address: r.address,
        reviewRating: r.reviewRating,
        reviewCount: r.reviewCount,
        hasWebsite: r.hasWebsite,
        needsWebsite: r.needsWebsite,
        erpMatch: r.erpMatch,
        needsErp: r.needsErp,
        priorityScore: r.priorityScore,
        priority: r.priority,
        remarks: r.remarks,
        categoryId,
        batchId: batchId ?? null,
      }))

      await prisma.lead.createMany({
        data: leadsData,
        skipDuplicates: true,
      })
    }

    // Update batch counts
    await prisma.importBatch.update({
      where: { id: batchId },
      data: {
        addedCount: { increment: willAdd },
        skippedCount: { increment: totalDuplicates },
        errorCount: { increment: errors.length },
      },
    })

    return res.json({
      added: willAdd,
      skipped: totalDuplicates,
      skippedArchivedCount,
      errors,
      batchId,
    })
  } catch (err: any) {
    console.error('Error during import:', err)
    return res.status(500).json({ error: 'Import failed' })
  }
})
