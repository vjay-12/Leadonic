import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'

export const schoolStagesRouter = Router()

const CreateStageSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  color: z.string().trim().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Valid hex color required').default('#64748B'),
})

const UpdateStageSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').optional(),
  color: z.string().trim().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Valid hex color required').optional(),
})

const ReorderSchema = z.object({
  ids: z.array(z.number()),
})

// GET /api/school-stages
schoolStagesRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const stages = await prisma.schoolStage.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: { schools: true, meetings: true },
        },
      },
    })

    const result = stages.map((s) => ({
      id: s.id,
      name: s.name,
      color: s.color,
      sortOrder: s.sortOrder,
      createdAt: s.createdAt,
      schoolCount: s._count.schools,
      meetingCount: s._count.meetings,
    }))

    return res.json(result)
  } catch (err: any) {
    console.error('Error fetching school stages:', err)
    return res.status(500).json({ error: 'Failed to fetch school stages' })
  }
})

// POST /api/school-stages
schoolStagesRouter.post('/', async (req: Request, res: Response) => {
  const parsed = CreateStageSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0]?.message || 'Invalid input' })
  }

  const { name, color } = parsed.data

  try {
    const existing = await prisma.schoolStage.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    })

    if (existing) {
      return res.status(409).json({ error: `A stage named "${name}" already exists` })
    }

    const maxSort = await prisma.schoolStage.aggregate({
      _max: { sortOrder: true },
    })
    const nextOrder = (maxSort._max.sortOrder ?? -1) + 1

    const stage = await prisma.schoolStage.create({
      data: {
        name,
        color,
        sortOrder: nextOrder,
      },
    })

    return res.status(201).json({ ...stage, schoolCount: 0, meetingCount: 0 })
  } catch (err: any) {
    console.error('Error creating school stage:', err)
    return res.status(500).json({ error: 'Failed to create school stage' })
  }
})

// PUT /api/school-stages/reorder
schoolStagesRouter.put('/reorder', async (req: Request, res: Response) => {
  const parsed = ReorderSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'ids array is required' })
  }

  const { ids } = parsed.data

  try {
    await prisma.$transaction(
      ids.map((id, index) =>
        prisma.schoolStage.update({
          where: { id },
          data: { sortOrder: index },
        })
      )
    )

    return res.json({ ok: true })
  } catch (err: any) {
    console.error('Error reordering school stages:', err)
    return res.status(500).json({ error: 'Failed to reorder school stages' })
  }
})

// PATCH /api/school-stages/:id
schoolStagesRouter.patch('/:id', async (req: Request, res: Response) => {
  const id = parseInt(req.params['id'] as string, 10)
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' })

  const parsed = UpdateStageSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0]?.message || 'Invalid input' })
  }

  const { name, color } = parsed.data

  try {
    if (name) {
      const existing = await prisma.schoolStage.findFirst({
        where: {
          name: { equals: name, mode: 'insensitive' },
          NOT: { id },
        },
      })
      if (existing) {
        return res.status(409).json({ error: `A stage named "${name}" already exists` })
      }
    }

    const updated = await prisma.schoolStage.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(color !== undefined && { color }),
      },
      include: {
        _count: { select: { schools: true, meetings: true } },
      },
    })

    return res.json({
      id: updated.id,
      name: updated.name,
      color: updated.color,
      sortOrder: updated.sortOrder,
      createdAt: updated.createdAt,
      schoolCount: updated._count.schools,
      meetingCount: updated._count.meetings,
    })
  } catch (err: any) {
    console.error('Error updating school stage:', err)
    return res.status(500).json({ error: 'Failed to update school stage' })
  }
})

// DELETE /api/school-stages/:id
// A stage that is still used by schools or meetings cannot be deleted (409)
schoolStagesRouter.delete('/:id', async (req: Request, res: Response) => {
  const id = parseInt(req.params['id'] as string, 10)
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' })

  try {
    const schoolCount = await prisma.school.count({
      where: { stageId: id },
    })
    const meetingCount = await prisma.schoolMeeting.count({
      where: { stageId: id },
    })

    if (schoolCount > 0 || meetingCount > 0) {
      const parts = []
      if (schoolCount > 0) parts.push(`${schoolCount} school${schoolCount === 1 ? '' : 's'}`)
      if (meetingCount > 0) parts.push(`${meetingCount} meeting${meetingCount === 1 ? '' : 's'}`)
      return res.status(409).json({
        error: `Stage is in use by ${parts.join(' and ')}. Change them first before deleting this stage.`,
      })
    }

    await prisma.schoolStage.delete({
      where: { id },
    })

    return res.json({ ok: true })
  } catch (err: any) {
    console.error('Error deleting school stage:', err)
    return res.status(500).json({ error: 'Failed to delete school stage' })
  }
})
