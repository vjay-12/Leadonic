import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'

export const categoriesRouter = Router()

const CreateCategorySchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
})

const UpdateCategorySchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
})

const ReorderSchema = z.object({
  ids: z.array(z.number()),
})

// GET /api/lead-categories
categoriesRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const categories = await prisma.leadCategory.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: { leads: true },
        },
      },
    })

    const result = categories.map((c) => ({
      id: c.id,
      name: c.name,
      sortOrder: c.sortOrder,
      createdAt: c.createdAt,
      leadCount: c._count.leads,
    }))

    return res.json(result)
  } catch (err: any) {
    console.error('Error fetching categories:', err)
    return res.status(500).json({ error: 'Failed to fetch categories' })
  }
})

// POST /api/lead-categories
categoriesRouter.post('/', async (req: Request, res: Response) => {
  const parsed = CreateCategorySchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0]?.message || 'Invalid input' })
  }

  const { name } = parsed.data

  try {
    const existing = await prisma.leadCategory.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    })

    if (existing) {
      return res.status(409).json({ error: `A category named "${name}" already exists` })
    }

    const maxSort = await prisma.leadCategory.aggregate({
      _max: { sortOrder: true },
    })
    const nextOrder = (maxSort._max.sortOrder ?? -1) + 1

    const category = await prisma.leadCategory.create({
      data: {
        name,
        sortOrder: nextOrder,
      },
    })

    return res.status(201).json({ ...category, leadCount: 0 })
  } catch (err: any) {
    console.error('Error creating category:', err)
    return res.status(500).json({ error: 'Failed to create category' })
  }
})

// PUT /api/lead-categories/reorder
categoriesRouter.put('/reorder', async (req: Request, res: Response) => {
  const parsed = ReorderSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'ids array is required' })
  }

  const { ids } = parsed.data

  try {
    await prisma.$transaction(
      ids.map((id, index) =>
        prisma.leadCategory.update({
          where: { id },
          data: { sortOrder: index },
        })
      )
    )

    return res.json({ ok: true })
  } catch (err: any) {
    console.error('Error reordering categories:', err)
    return res.status(500).json({ error: 'Failed to reorder categories' })
  }
})

// PATCH /api/lead-categories/:id
categoriesRouter.patch('/:id', async (req: Request, res: Response) => {
  const id = parseInt(req.params['id'] as string, 10)
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' })

  const parsed = UpdateCategorySchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0]?.message || 'Invalid input' })
  }

  const { name } = parsed.data

  try {
    const existing = await prisma.leadCategory.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        NOT: { id },
      },
    })
    if (existing) {
      return res.status(409).json({ error: `A category named "${name}" already exists` })
    }

    const updated = await prisma.leadCategory.update({
      where: { id },
      data: { name },
      include: {
        _count: { select: { leads: true } },
      },
    })

    return res.json({
      id: updated.id,
      name: updated.name,
      sortOrder: updated.sortOrder,
      createdAt: updated.createdAt,
      leadCount: updated._count.leads,
    })
  } catch (err: any) {
    console.error('Error updating category:', err)
    return res.status(500).json({ error: 'Failed to update category' })
  }
})

// DELETE /api/lead-categories/:id
categoriesRouter.delete('/:id', async (req: Request, res: Response) => {
  const id = parseInt(req.params['id'] as string, 10)
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' })

  try {
    const leadCount = await prisma.lead.count({
      where: { categoryId: id },
    })

    if (leadCount > 0) {
      return res.status(409).json({
        error: `${leadCount} lead${leadCount === 1 ? '' : 's'} use this category. Move them first.`,
      })
    }

    await prisma.leadCategory.delete({
      where: { id },
    })

    return res.json({ ok: true })
  } catch (err: any) {
    console.error('Error deleting category:', err)
    return res.status(500).json({ error: 'Failed to delete category' })
  }
})
