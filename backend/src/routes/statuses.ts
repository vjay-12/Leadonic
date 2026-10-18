import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../db'

export const statusesRouter = Router()

const CreateStatusSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  color: z.string().trim().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Valid hex color required').default('#64748B'),
})

const UpdateStatusSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').optional(),
  color: z.string().trim().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Valid hex color required').optional(),
})

const ReorderSchema = z.object({
  ids: z.array(z.number()),
})

// GET /api/lead-statuses
statusesRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const statuses = await prisma.leadStatus.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: { leads: true },
        },
      },
    })

    const result = statuses.map((s) => ({
      id: s.id,
      name: s.name,
      color: s.color,
      sortOrder: s.sortOrder,
      createdAt: s.createdAt,
      leadCount: s._count.leads,
    }))

    return res.json(result)
  } catch (err: any) {
    console.error('Error fetching statuses:', err)
    return res.status(500).json({ error: 'Failed to fetch statuses' })
  }
})

// POST /api/lead-statuses
statusesRouter.post('/', async (req: Request, res: Response) => {
  const parsed = CreateStatusSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0]?.message || 'Invalid input' })
  }

  const { name, color } = parsed.data

  try {
    const existing = await prisma.leadStatus.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    })

    if (existing) {
      return res.status(409).json({ error: `A status named "${name}" already exists` })
    }

    const maxSort = await prisma.leadStatus.aggregate({
      _max: { sortOrder: true },
    })
    const nextOrder = (maxSort._max.sortOrder ?? -1) + 1

    const status = await prisma.leadStatus.create({
      data: {
        name,
        color,
        sortOrder: nextOrder,
      },
    })

    return res.status(201).json({ ...status, leadCount: 0 })
  } catch (err: any) {
    console.error('Error creating status:', err)
    return res.status(500).json({ error: 'Failed to create status' })
  }
})

// PUT /api/lead-statuses/reorder
statusesRouter.put('/reorder', async (req: Request, res: Response) => {
  const parsed = ReorderSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'ids array is required' })
  }

  const { ids } = parsed.data

  try {
    await prisma.$transaction(
      ids.map((id, index) =>
        prisma.leadStatus.update({
          where: { id },
          data: { sortOrder: index },
        })
      )
    )

    return res.json({ ok: true })
  } catch (err: any) {
    console.error('Error reordering statuses:', err)
    return res.status(500).json({ error: 'Failed to reorder statuses' })
  }
})

// PATCH /api/lead-statuses/:id
statusesRouter.patch('/:id', async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string, 10)
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' })

  const parsed = UpdateStatusSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0]?.message || 'Invalid input' })
  }

  const { name, color } = parsed.data

  try {
    if (name) {
      const existing = await prisma.leadStatus.findFirst({
        where: {
          name: { equals: name, mode: 'insensitive' },
          NOT: { id },
        },
      })
      if (existing) {
        return res.status(409).json({ error: `A status named "${name}" already exists` })
      }
    }

    const updated = await prisma.leadStatus.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(color !== undefined && { color }),
      },
      include: {
        _count: { select: { leads: true } },
      },
    })

    return res.json({
      id: updated.id,
      name: updated.name,
      color: updated.color,
      sortOrder: updated.sortOrder,
      createdAt: updated.createdAt,
      leadCount: updated._count.leads,
    })
  } catch (err: any) {
    console.error('Error updating status:', err)
    return res.status(500).json({ error: 'Failed to update status' })
  }
})

// DELETE /api/lead-statuses/:id
statusesRouter.delete('/:id', async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string, 10)
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' })

  try {
    const leadCount = await prisma.lead.count({
      where: { statusId: id },
    })

    if (leadCount > 0) {
      return res.status(409).json({
        error: `${leadCount} lead${leadCount === 1 ? '' : 's'} use this status. Move them first.`,
      })
    }

    await prisma.leadStatus.delete({
      where: { id },
    })

    return res.json({ ok: true })
  } catch (err: any) {
    console.error('Error deleting status:', err)
    return res.status(500).json({ error: 'Failed to delete status' })
  }
})
