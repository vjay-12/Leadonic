import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../db'
import { normalizePhone, makeDedupeKey, parseBool, parseNum } from '../../../lib/normalize'

export const leadsRouter = Router()

const CreateLeadSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  phone: z.string().trim().optional().nullable(),
  emails: z.string().trim().optional().nullable(),
  website: z.string().trim().optional().nullable(),
  mapsCategory: z.string().trim().optional().nullable(),
  address: z.string().trim().optional().nullable(),
  reviewRating: z.union([z.number(), z.string()]).optional().nullable(),
  reviewCount: z.union([z.number(), z.string()]).optional().nullable(),
  hasWebsite: z.union([z.boolean(), z.string()]).optional().nullable(),
  needsWebsite: z.union([z.boolean(), z.string()]).optional().nullable(),
  erpMatch: z.string().trim().optional().nullable(),
  needsErp: z.union([z.boolean(), z.string()]).optional().nullable(),
  priorityScore: z.union([z.number(), z.string()]).optional().nullable(),
  priority: z.string().trim().optional().nullable(),
  remarks: z.string().trim().optional().nullable(),
  statusId: z.number().optional().nullable(),
  categoryId: z.number().optional().nullable(),
})

const UpdateLeadSchema = CreateLeadSchema.partial()

// GET /api/leads
leadsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const search = typeof req.query['search'] === 'string' ? req.query['search'].trim() : ''
    const statusIdParam = typeof req.query['statusId'] === 'string' ? req.query['statusId'] : ''
    const categoryIdParam = typeof req.query['categoryId'] === 'string' ? req.query['categoryId'] : ''
    const priorityParam = typeof req.query['priority'] === 'string' ? req.query['priority'] : ''
    const page = Math.max(1, parseInt(req.query['page'] as string, 10) || 1)
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query['pageSize'] as string, 10) || 50))
    const sortParam = typeof req.query['sort'] === 'string' ? req.query['sort'] : 'createdAt:desc'

    const [sortField, sortOrder] = sortParam.split(':')
    const validSortFields: Record<string, string> = {
      createdAt: 'createdAt',
      title: 'title',
      reviewRating: 'reviewRating',
      priorityScore: 'priorityScore',
    }
    const orderBy: any = {}
    const field = sortField && validSortFields[sortField] ? validSortFields[sortField] : 'createdAt'
    orderBy[field] = sortOrder === 'asc' ? 'asc' : 'desc'

    const where: any = {}

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { phoneNormalized: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
        { emails: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (statusIdParam) {
      if (statusIdParam === 'none') {
        where.statusId = null
      } else {
        const sid = parseInt(statusIdParam, 10)
        if (!isNaN(sid)) where.statusId = sid
      }
    }

    if (categoryIdParam) {
      const cid = parseInt(categoryIdParam, 10)
      if (!isNaN(cid)) where.categoryId = cid
    }

    if (priorityParam) {
      where.priority = priorityParam
    }

    const [items, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        include: {
          status: true,
          category: true,
        },
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.lead.count({ where }),
    ])

    return res.json({
      items,
      total,
      page,
      pageSize,
    })
  } catch (err: any) {
    console.error('Error fetching leads:', err)
    return res.status(500).json({ error: 'Failed to fetch leads' })
  }
})

// GET /api/leads/export.csv
leadsRouter.get('/export.csv', async (req: Request, res: Response) => {
  try {
    const search = typeof req.query['search'] === 'string' ? req.query['search'].trim() : ''
    const statusIdParam = typeof req.query['statusId'] === 'string' ? req.query['statusId'] : ''
    const categoryIdParam = typeof req.query['categoryId'] === 'string' ? req.query['categoryId'] : ''
    const priorityParam = typeof req.query['priority'] === 'string' ? req.query['priority'] : ''

    const where: any = {}

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { phoneNormalized: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
        { emails: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (statusIdParam) {
      if (statusIdParam === 'none') {
        where.statusId = null
      } else {
        const sid = parseInt(statusIdParam, 10)
        if (!isNaN(sid)) where.statusId = sid
      }
    }

    if (categoryIdParam) {
      const cid = parseInt(categoryIdParam, 10)
      if (!isNaN(cid)) where.categoryId = cid
    }

    if (priorityParam) {
      where.priority = priorityParam
    }

    const leads = await prisma.lead.findMany({
      where,
      include: {
        status: true,
        category: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    const headers = [
      'Title',
      'Phone',
      'Normalized Phone',
      'Category',
      'Status',
      'Remarks',
      'Priority',
      'Priority Score',
      'Review Rating',
      'Review Count',
      'Website',
      'Has Website',
      'Needs Website',
      'ERP Match',
      'Needs ERP',
      'Address',
      'Emails',
      'Created At',
    ]

    const rows = leads.map((l) => [
      l.title,
      l.phone || '',
      l.phoneNormalized || '',
      l.category?.name || '',
      l.status?.name || 'Not called',
      l.remarks || '',
      l.priority || '',
      l.priorityScore != null ? String(l.priorityScore) : '',
      l.reviewRating != null ? String(l.reviewRating) : '',
      l.reviewCount != null ? String(l.reviewCount) : '',
      l.website || '',
      l.hasWebsite === true ? 'Yes' : l.hasWebsite === false ? 'No' : '',
      l.needsWebsite === true ? 'Yes' : l.needsWebsite === false ? 'No' : '',
      l.erpMatch || '',
      l.needsErp === true ? 'Yes' : l.needsErp === false ? 'No' : '',
      l.address || '',
      l.emails || '',
      l.createdAt.toISOString(),
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row
          .map((cell) => {
            const escaped = String(cell).replace(/"/g, '""')
            return `"${escaped}"`
          })
          .join(',')
      ),
    ].join('\r\n')

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="leads_export.csv"')
    return res.send(csvContent)
  } catch (err: any) {
    console.error('Error exporting leads:', err)
    return res.status(500).json({ error: 'Failed to export leads' })
  }
})

// POST /api/leads
leadsRouter.post('/', async (req: Request, res: Response) => {
  const parsed = CreateLeadSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0]?.message || 'Invalid input' })
  }

  const data = parsed.data
  const phoneNormalized = normalizePhone(data.phone)
  const dedupeKey = makeDedupeKey(data.title, data.address, phoneNormalized)

  try {
    const existing = await prisma.lead.findUnique({
      where: { dedupeKey },
    })

    if (existing) {
      const msg = phoneNormalized
        ? 'A lead with this phone already exists'
        : 'A lead with this title and address already exists'
      return res.status(409).json({ error: msg, existingId: existing.id })
    }

    const lead = await prisma.lead.create({
      data: {
        title: data.title,
        phone: data.phone || null,
        phoneNormalized,
        dedupeKey,
        emails: data.emails || null,
        website: data.website || null,
        mapsCategory: data.mapsCategory || null,
        address: data.address || null,
        reviewRating: data.reviewRating != null ? parseNum(data.reviewRating) : null,
        reviewCount: data.reviewCount != null ? Math.round(parseNum(data.reviewCount) || 0) : null,
        hasWebsite: data.hasWebsite != null ? parseBool(data.hasWebsite) : null,
        needsWebsite: data.needsWebsite != null ? parseBool(data.needsWebsite) : null,
        erpMatch: data.erpMatch || null,
        needsErp: data.needsErp != null ? parseBool(data.needsErp) : null,
        priorityScore: data.priorityScore != null ? parseNum(data.priorityScore) : null,
        priority: data.priority || null,
        remarks: data.remarks || null,
        statusId: data.statusId || null,
        categoryId: data.categoryId || null,
      },
      include: {
        status: true,
        category: true,
      },
    })

    return res.status(201).json(lead)
  } catch (err: any) {
    console.error('Error creating lead:', err)
    return res.status(500).json({ error: 'Failed to create lead' })
  }
})

// PATCH /api/leads/:id
leadsRouter.patch('/:id', async (req: Request, res: Response) => {
  const id = parseInt(req.params['id'] as string, 10)
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' })

  const parsed = UpdateLeadSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0]?.message || 'Invalid input' })
  }

  try {
    const existing = await prisma.lead.findUnique({
      where: { id },
    })
    if (!existing) {
      return res.status(404).json({ error: 'Lead not found' })
    }

    const data = parsed.data
    const updateData: any = {}

    if (data.title !== undefined) updateData.title = data.title
    if (data.phone !== undefined) updateData.phone = data.phone || null
    if (data.emails !== undefined) updateData.emails = data.emails || null
    if (data.website !== undefined) updateData.website = data.website || null
    if (data.mapsCategory !== undefined) updateData.mapsCategory = data.mapsCategory || null
    if (data.address !== undefined) updateData.address = data.address || null
    if (data.reviewRating !== undefined) updateData.reviewRating = data.reviewRating != null ? parseNum(data.reviewRating) : null
    if (data.reviewCount !== undefined) updateData.reviewCount = data.reviewCount != null ? Math.round(parseNum(data.reviewCount) || 0) : null
    if (data.hasWebsite !== undefined) updateData.hasWebsite = data.hasWebsite != null ? parseBool(data.hasWebsite) : null
    if (data.needsWebsite !== undefined) updateData.needsWebsite = data.needsWebsite != null ? parseBool(data.needsWebsite) : null
    if (data.erpMatch !== undefined) updateData.erpMatch = data.erpMatch || null
    if (data.needsErp !== undefined) updateData.needsErp = data.needsErp != null ? parseBool(data.needsErp) : null
    if (data.priorityScore !== undefined) updateData.priorityScore = data.priorityScore != null ? parseNum(data.priorityScore) : null
    if (data.priority !== undefined) updateData.priority = data.priority || null
    if (data.remarks !== undefined) updateData.remarks = data.remarks || null
    if (data.statusId !== undefined) updateData.statusId = data.statusId || null
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId || null

    // If title, phone, or address changed, recompute dedupe fields
    const newTitle = data.title !== undefined ? data.title : existing.title
    const newAddress = data.address !== undefined ? data.address : existing.address
    const newPhone = data.phone !== undefined ? data.phone : existing.phone

    if (data.title !== undefined || data.phone !== undefined || data.address !== undefined) {
      const phoneNorm = normalizePhone(newPhone)
      const dedupe = makeDedupeKey(newTitle, newAddress, phoneNorm)
      if (dedupe !== existing.dedupeKey) {
        const duplicate = await prisma.lead.findUnique({
          where: { dedupeKey: dedupe },
        })
        if (duplicate && duplicate.id !== id) {
          const msg = phoneNorm
            ? 'A lead with this phone already exists'
            : 'A lead with this title and address already exists'
          return res.status(409).json({ error: msg, existingId: duplicate.id })
        }
        updateData.phoneNormalized = phoneNorm
        updateData.dedupeKey = dedupe
      }
    }

    const updated = await prisma.lead.update({
      where: { id },
      data: updateData,
      include: {
        status: true,
        category: true,
      },
    })

    return res.json(updated)
  } catch (err: any) {
    console.error('Error updating lead:', err)
    return res.status(500).json({ error: 'Failed to update lead' })
  }
})

// DELETE /api/leads/:id
leadsRouter.delete('/:id', async (req: Request, res: Response) => {
  const id = parseInt(req.params['id'] as string, 10)
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' })

  try {
    await prisma.lead.delete({
      where: { id },
    })
    return res.json({ ok: true })
  } catch (err: any) {
    console.error('Error deleting lead:', err)
    return res.status(500).json({ error: 'Failed to delete lead' })
  }
})
