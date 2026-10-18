import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'

export const schoolContactsRouter = Router()

const UpdateContactSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').optional(),
  role: z.string().trim().nullable().optional(),
  phone: z.string().trim().nullable().optional(),
  email: z.string().trim().nullable().optional(),
  notes: z.string().trim().nullable().optional(),
  isPrimary: z.boolean().optional(),
})

// PATCH /api/school-contacts/:id
schoolContactsRouter.patch('/:id', async (req: Request, res: Response) => {
  const id = parseInt(req.params['id'] as string, 10)
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' })

  const parsed = UpdateContactSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0]?.message || 'Invalid input' })
  }

  try {
    const existing = await prisma.schoolContact.findUnique({
      where: { id },
      include: { school: true },
    })

    if (!existing) {
      return res.status(404).json({ error: 'Contact not found' })
    }

    if (existing.school.archivedAt) {
      return res.status(400).json({ error: 'Cannot edit contacts of an archived school' })
    }

    const data = parsed.data

    const updated = await prisma.$transaction(async (tx) => {
      // If setting this contact as primary, unset any other primary contact
      if (data.isPrimary === true) {
        await tx.schoolContact.updateMany({
          where: { schoolId: existing.schoolId, NOT: { id } },
          data: { isPrimary: false },
        })
      }

      return tx.schoolContact.update({
        where: { id },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.role !== undefined && { role: data.role || null }),
          ...(data.phone !== undefined && { phone: data.phone || null }),
          ...(data.email !== undefined && { email: data.email || null }),
          ...(data.notes !== undefined && { notes: data.notes || null }),
          ...(data.isPrimary !== undefined && { isPrimary: data.isPrimary }),
        },
      })
    })

    return res.json(updated)
  } catch (err: any) {
    console.error('Error updating contact:', err)
    return res.status(500).json({ error: 'Failed to update contact' })
  }
})

// DELETE /api/school-contacts/:id
// Deleting the primary contact promotes the oldest remaining contact
schoolContactsRouter.delete('/:id', async (req: Request, res: Response) => {
  const id = parseInt(req.params['id'] as string, 10)
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' })

  try {
    const existing = await prisma.schoolContact.findUnique({
      where: { id },
      include: { school: true },
    })

    if (!existing) {
      return res.status(404).json({ error: 'Contact not found' })
    }

    if (existing.school.archivedAt) {
      return res.status(400).json({ error: 'Cannot delete contacts of an archived school' })
    }

    await prisma.$transaction(async (tx) => {
      await tx.schoolContact.delete({ where: { id } })

      if (existing.isPrimary) {
        const oldest = await tx.schoolContact.findFirst({
          where: { schoolId: existing.schoolId },
          orderBy: { createdAt: 'asc' },
        })

        if (oldest) {
          await tx.schoolContact.update({
            where: { id: oldest.id },
            data: { isPrimary: true },
          })
        }
      }
    })

    return res.json({ ok: true })
  } catch (err: any) {
    console.error('Error deleting contact:', err)
    return res.status(500).json({ error: 'Failed to delete contact' })
  }
})
