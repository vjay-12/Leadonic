import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { isFutureDateIST, parseDateToMidnightUTC } from '../../../lib/date.js'

export const contactsRouter = Router()

export async function syncLeadStatus(tx: any, leadId: number) {
  const latestLog = await tx.contactLog.findFirst({
    where: { leadId },
    orderBy: [
      { contactDate: 'desc' },
      { createdAt: 'desc' },
    ],
    select: { statusId: true },
  })

  const newStatusId = latestLog ? latestLog.statusId : null

  await tx.lead.update({
    where: { id: leadId },
    data: { statusId: newStatusId },
  })

  return newStatusId
}

const UpdateContactSchema = z.object({
  contactDate: z.string().optional(),
  statusId: z.number().int().positive().optional(),
  notes: z.string().max(1000, 'Notes cannot exceed 1000 characters').nullable().optional(),
})

// PATCH /api/contacts/:id
contactsRouter.patch('/:id', async (req: Request, res: Response) => {
  const id = parseInt(req.params['id'] as string, 10)
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' })

  const parsed = UpdateContactSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0]?.message || 'Invalid input' })
  }

  const { contactDate, statusId, notes } = parsed.data

  if (contactDate && isFutureDateIST(contactDate)) {
    return res.status(400).json({ error: 'Contact date cannot be in the future' })
  }

  try {
    const existing = await prisma.contactLog.findUnique({
      where: { id },
      include: { lead: true },
    })

    if (!existing) {
      return res.status(404).json({ error: 'Contact log not found' })
    }

    if (existing.lead.archivedAt) {
      return res.status(400).json({ error: 'Cannot edit contact log for an archived lead' })
    }

    if (statusId) {
      const statusExists = await prisma.leadStatus.findUnique({ where: { id: statusId } })
      if (!statusExists) {
        return res.status(400).json({ error: 'Selected status does not exist' })
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const log = await tx.contactLog.update({
        where: { id },
        data: {
          contactDate: contactDate ? parseDateToMidnightUTC(contactDate) : undefined,
          statusId: statusId !== undefined ? statusId : undefined,
          notes: notes !== undefined ? (notes?.trim() || null) : undefined,
        },
        include: {
          status: true,
        },
      })

      await syncLeadStatus(tx, existing.leadId)
      return log
    })

    return res.json(updated)
  } catch (err: any) {
    console.error('Error updating contact log:', err)
    return res.status(500).json({ error: 'Failed to update contact log' })
  }
})

// DELETE /api/contacts/:id
contactsRouter.delete('/:id', async (req: Request, res: Response) => {
  const id = parseInt(req.params['id'] as string, 10)
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' })

  try {
    const existing = await prisma.contactLog.findUnique({
      where: { id },
      include: { lead: true },
    })

    if (!existing) {
      return res.status(404).json({ error: 'Contact log not found' })
    }

    if (existing.lead.archivedAt) {
      return res.status(400).json({ error: 'Cannot delete contact log for an archived lead' })
    }

    await prisma.$transaction(async (tx) => {
      await tx.contactLog.delete({
        where: { id },
      })

      await syncLeadStatus(tx, existing.leadId)
    })

    return res.json({ ok: true, id })
  } catch (err: any) {
    console.error('Error deleting contact log:', err)
    return res.status(500).json({ error: 'Failed to delete contact log' })
  }
})
