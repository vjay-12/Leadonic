import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { isFutureDateIST, parseDateToMidnightUTC } from '../../../lib/date.js'

export const schoolMeetingsRouter = Router()

export async function syncSchoolStage(tx: any, schoolId: number) {
  const latestMeeting = await tx.schoolMeeting.findFirst({
    where: { schoolId },
    orderBy: [
      { meetingDate: 'desc' },
      { meetingTime: 'desc' },
      { createdAt: 'desc' },
    ],
    select: { stageId: true },
  })

  await tx.school.update({
    where: { id: schoolId },
    data: { stageId: latestMeeting?.stageId ?? null },
  })
}

const UpdateMeetingSchema = z.object({
  meetingDate: z.string().min(1, 'Meeting date is required').optional(),
  meetingTime: z.string().trim().nullable().optional(),
  type: z.enum(['Call', 'Visit', 'Demo', 'Follow-up']).optional(),
  locationName: z.string().trim().nullable().optional(),
  contactId: z.number().int().positive().nullable().optional(),
  stageId: z.number().int().positive('Stage is required').optional(),
  notes: z.string().max(2000, 'Notes cannot exceed 2000 characters').nullable().optional(),
})

// PATCH /api/school-meetings/:id
schoolMeetingsRouter.patch('/:id', async (req: Request, res: Response) => {
  const id = parseInt(req.params['id'] as string, 10)
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' })

  const parsed = UpdateMeetingSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0]?.message || 'Invalid input' })
  }

  try {
    const existing = await prisma.schoolMeeting.findUnique({
      where: { id },
      include: { school: true },
    })

    if (!existing) {
      return res.status(404).json({ error: 'Meeting not found' })
    }

    if (existing.school.archivedAt) {
      return res.status(400).json({ error: 'Cannot edit meetings of an archived school' })
    }

    const data = parsed.data

    if (data.meetingDate && isFutureDateIST(data.meetingDate)) {
      return res.status(400).json({ error: 'Meeting date cannot be in the future' })
    }

    if (data.stageId) {
      const stageExists = await prisma.schoolStage.findUnique({ where: { id: data.stageId } })
      if (!stageExists) {
        return res.status(400).json({ error: 'Selected stage does not exist' })
      }
    }

    if (data.contactId) {
      const contact = await prisma.schoolContact.findFirst({
        where: { id: data.contactId, schoolId: existing.schoolId },
      })
      if (!contact) {
        return res.status(400).json({ error: 'Selected contact does not belong to this school' })
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const m = await tx.schoolMeeting.update({
        where: { id },
        data: {
          ...(data.meetingDate && { meetingDate: parseDateToMidnightUTC(data.meetingDate) }),
          ...(data.meetingTime !== undefined && { meetingTime: data.meetingTime || null }),
          ...(data.type !== undefined && { type: data.type }),
          ...(data.locationName !== undefined && { locationName: data.locationName || null }),
          ...(data.contactId !== undefined && { contactId: data.contactId }),
          ...(data.stageId !== undefined && { stageId: data.stageId }),
          ...(data.notes !== undefined && { notes: data.notes?.trim() || null }),
        },
        include: {
          stage: true,
          contact: true,
        },
      })

      await syncSchoolStage(tx, existing.schoolId)
      return m
    })

    return res.json(updated)
  } catch (err: any) {
    console.error('Error updating meeting:', err)
    return res.status(500).json({ error: 'Failed to update meeting' })
  }
})

// DELETE /api/school-meetings/:id
schoolMeetingsRouter.delete('/:id', async (req: Request, res: Response) => {
  const id = parseInt(req.params['id'] as string, 10)
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' })

  try {
    const existing = await prisma.schoolMeeting.findUnique({
      where: { id },
      include: { school: true },
    })

    if (!existing) {
      return res.status(404).json({ error: 'Meeting not found' })
    }

    if (existing.school.archivedAt) {
      return res.status(400).json({ error: 'Cannot delete meetings of an archived school' })
    }

    await prisma.$transaction(async (tx) => {
      await tx.schoolMeeting.delete({ where: { id } })
      await syncSchoolStage(tx, existing.schoolId)
    })

    return res.json({ ok: true })
  } catch (err: any) {
    console.error('Error deleting meeting:', err)
    return res.status(500).json({ error: 'Failed to delete meeting' })
  }
})
