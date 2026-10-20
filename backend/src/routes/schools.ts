import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { normalizePhone, makeSchoolDedupeKey, parseNum } from '../../../lib/normalize.js'
import { isFutureDateIST, parseDateToMidnightUTC } from '../../../lib/date.js'
import { syncSchoolStage } from './schoolMeetings.js'
import { isDeleteEnabled } from '../config.js'

export const schoolsRouter = Router()

const CreateSchoolSchema = z.object({
  name: z.string().trim().min(1, 'School name is required'),
  area: z.string().trim().nullable().optional(),
  address: z.string().trim().nullable().optional(),
  phone: z.string().trim().nullable().optional(),
  email: z.string().trim().nullable().optional(),
  website: z.string().trim().nullable().optional(),
  studentStrength: z.union([z.number(), z.string()]).nullable().optional(),
  notes: z.string().trim().nullable().optional(),
  primaryContact: z
    .object({
      name: z.string().trim().min(1, 'Contact name is required'),
      role: z.string().trim().nullable().optional(),
      phone: z.string().trim().nullable().optional(),
      email: z.string().trim().nullable().optional(),
      notes: z.string().trim().nullable().optional(),
    })
    .nullable()
    .optional(),
})

const UpdateSchoolSchema = z.object({
  name: z.string().trim().min(1, 'School name is required').optional(),
  area: z.string().trim().nullable().optional(),
  address: z.string().trim().nullable().optional(),
  phone: z.string().trim().nullable().optional(),
  email: z.string().trim().nullable().optional(),
  website: z.string().trim().nullable().optional(),
  studentStrength: z.union([z.number(), z.string()]).nullable().optional(),
  notes: z.string().trim().nullable().optional(),
  // stageId is strictly ignored here: stages change only through meetings
  stageId: z.any().optional(),
})

const CreateContactSchema = z.object({
  name: z.string().trim().min(1, 'Contact name is required'),
  role: z.string().trim().nullable().optional(),
  phone: z.string().trim().nullable().optional(),
  email: z.string().trim().nullable().optional(),
  notes: z.string().trim().nullable().optional(),
  isPrimary: z.boolean().optional(),
})

const CreateMeetingSchema = z.object({
  meetingDate: z.string().min(1, 'Meeting date is required'),
  meetingTime: z.string().trim().nullable().optional(),
  type: z.enum(['Call', 'Visit', 'Demo', 'Follow-up']),
  locationName: z.string().trim().nullable().optional(),
  contactId: z.number().int().positive().nullable().optional(),
  stageId: z.number().int().positive('Stage is required'),
  notes: z.string().max(2000, 'Notes cannot exceed 2000 characters').nullable().optional(),
})

// GET /api/schools/areas - Distinct non-empty areas for filtering
schoolsRouter.get('/areas', async (_req: Request, res: Response) => {
  try {
    const rawAreas = await prisma.school.findMany({
      where: {
        archivedAt: null,
        area: { not: null },
      },
      select: { area: true },
      distinct: ['area'],
      orderBy: { area: 'asc' },
    })

    const areas = rawAreas
      .map((r) => r.area?.trim())
      .filter((a): a is string => Boolean(a && a.length > 0))

    return res.json(Array.from(new Set(areas)))
  } catch (err: any) {
    console.error('Error fetching school areas:', err)
    return res.status(500).json({ error: 'Failed to fetch school areas' })
  }
})

// GET /api/schools
schoolsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const search = typeof req.query['search'] === 'string' ? req.query['search'].trim() : ''
    const stageIdParam = typeof req.query['stageId'] === 'string' ? req.query['stageId'].trim() : ''
    const areaParam = typeof req.query['area'] === 'string' ? req.query['area'].trim() : ''
    const archivedParam = typeof req.query['archived'] === 'string' ? req.query['archived'] : 'active'
    const page = Math.max(1, parseInt(typeof req.query['page'] === 'string' ? req.query['page'] : '1', 10) || 1)
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(typeof req.query['pageSize'] === 'string' ? req.query['pageSize'] : '50', 10) || 50)
    )

    const where: any = {}

    if (archivedParam === 'archived') {
      where.archivedAt = { not: null }
    } else {
      where.archivedAt = null
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { area: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (stageIdParam) {
      if (stageIdParam === 'none') {
        where.stageId = null
      } else {
        const sid = parseInt(stageIdParam, 10)
        if (!isNaN(sid)) where.stageId = sid
      }
    }

    if (areaParam) {
      where.area = { equals: areaParam, mode: 'insensitive' }
    }

    const [total, schools] = await Promise.all([
      prisma.school.count({ where }),
      prisma.school.findMany({
        where,
        include: {
          stage: true,
          contacts: {
            orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
            select: { id: true, name: true, role: true, phone: true, isPrimary: true },
          },
          meetings: {
            take: 1,
            orderBy: [{ meetingDate: 'desc' }, { meetingTime: 'desc' }, { createdAt: 'desc' }],
            select: { meetingDate: true, meetingTime: true, type: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])

    const items = schools.map((s) => {
      const primaryContact = s.contacts.find((c) => c.isPrimary) || s.contacts[0] || null
      const lastMeeting = s.meetings[0] || null

      return {
        id: s.id,
        name: s.name,
        area: s.area,
        address: s.address,
        phone: s.phone,
        email: s.email,
        website: s.website,
        studentStrength: s.studentStrength,
        notes: s.notes,
        stageId: s.stageId,
        stage: s.stage,
        leadId: s.leadId,
        dedupeKey: s.dedupeKey,
        archivedAt: s.archivedAt,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        primaryContact: primaryContact
          ? {
              id: primaryContact.id,
              name: primaryContact.name,
              role: primaryContact.role,
              phone: primaryContact.phone,
            }
          : null,
        lastMeetingDate: lastMeeting?.meetingDate ?? null,
      }
    })

    return res.json({
      items,
      total,
      page,
      pageSize,
    })
  } catch (err: any) {
    console.error('Error fetching schools:', err)
    return res.status(500).json({ error: 'Failed to fetch schools' })
  }
})

// POST /api/schools
// New schools start with no stage (stageId: null); stages change only through meetings
schoolsRouter.post('/', async (req: Request, res: Response) => {
  const parsed = CreateSchoolSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0]?.message || 'Invalid input' })
  }

  const data = parsed.data
  const phoneNormalized = normalizePhone(data.phone)
  const dedupeKey = makeSchoolDedupeKey(data.name, data.area, phoneNormalized)

  try {
    const existing = await prisma.school.findUnique({
      where: { dedupeKey },
    })

    if (existing) {
      return res.status(409).json({
        error: phoneNormalized
          ? 'A school with this phone already exists'
          : 'A school with this name and area already exists',
        existingId: existing.id,
      })
    }

    const strength = data.studentStrength != null ? Math.round(parseNum(data.studentStrength) || 0) : null

    const school = await prisma.$transaction(async (tx) => {
      const created = await tx.school.create({
        data: {
          name: data.name,
          area: data.area || null,
          address: data.address || null,
          phone: data.phone || null,
          email: data.email || null,
          website: data.website || null,
          studentStrength: strength,
          notes: data.notes || null,
          stageId: null, // Read-only; set exclusively by meetings
          dedupeKey,
        },
        include: {
          stage: true,
        },
      })

      if (data.primaryContact && data.primaryContact.name) {
        await tx.schoolContact.create({
          data: {
            schoolId: created.id,
            name: data.primaryContact.name,
            role: data.primaryContact.role || null,
            phone: data.primaryContact.phone || null,
            email: data.primaryContact.email || null,
            notes: data.primaryContact.notes || null,
            isPrimary: true,
          },
        })
      }

      const fullSchool = await tx.school.findUnique({
        where: { id: created.id },
        include: {
          stage: true,
          contacts: {
            orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
          },
        },
      })

      return fullSchool
    })

    if (!school) {
      return res.status(500).json({ error: 'Failed to create school' })
    }

    const primaryContact = school.contacts.find((c) => c.isPrimary) || null

    return res.status(201).json({
      ...school,
      primaryContact: primaryContact
        ? {
            id: primaryContact.id,
            name: primaryContact.name,
            role: primaryContact.role,
            phone: primaryContact.phone,
          }
        : null,
    })
  } catch (err: any) {
    console.error('Error creating school:', err)
    return res.status(500).json({ error: 'Failed to create school' })
  }
})

// GET /api/schools/:id
schoolsRouter.get('/:id', async (req: Request, res: Response) => {
  const id = parseInt(req.params['id'] as string, 10)
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' })

  try {
    const school = await prisma.school.findUnique({
      where: { id },
      include: {
        stage: true,
        lead: {
          select: { id: true, title: true, phone: true },
        },
        contacts: {
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        },
        meetings: {
          orderBy: [{ meetingDate: 'desc' }, { meetingTime: 'desc' }, { createdAt: 'desc' }],
          include: {
            stage: true,
            contact: true,
          },
        },
      },
    })

    if (!school) {
      return res.status(404).json({ error: 'School not found' })
    }

    return res.json(school)
  } catch (err: any) {
    console.error('Error fetching school details:', err)
    return res.status(500).json({ error: 'Failed to fetch school details' })
  }
})

// PATCH /api/schools/:id
// Stage is read-only; stage_id is ignored
schoolsRouter.patch('/:id', async (req: Request, res: Response) => {
  const id = parseInt(req.params['id'] as string, 10)
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' })

  const parsed = UpdateSchoolSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0]?.message || 'Invalid input' })
  }

  try {
    const existing = await prisma.school.findUnique({ where: { id } })
    if (!existing) {
      return res.status(404).json({ error: 'School not found' })
    }

    if (existing.archivedAt) {
      return res.status(400).json({ error: 'Cannot edit an archived school' })
    }

    const data = parsed.data
    const updateData: any = {}

    if (data.name !== undefined) updateData.name = data.name
    if (data.area !== undefined) updateData.area = data.area || null
    if (data.address !== undefined) updateData.address = data.address || null
    if (data.phone !== undefined) updateData.phone = data.phone || null
    if (data.email !== undefined) updateData.email = data.email || null
    if (data.website !== undefined) updateData.website = data.website || null
    if (data.studentStrength !== undefined) {
      updateData.studentStrength =
        data.studentStrength != null ? Math.round(parseNum(data.studentStrength) || 0) : null
    }
    if (data.notes !== undefined) updateData.notes = data.notes || null

    // Check if dedupeKey changes
    const newName = data.name !== undefined ? data.name : existing.name
    const newArea = data.area !== undefined ? data.area : existing.area
    const newPhone = data.phone !== undefined ? data.phone : existing.phone

    if (data.name !== undefined || data.area !== undefined || data.phone !== undefined) {
      const phoneNorm = normalizePhone(newPhone)
      const dedupe = makeSchoolDedupeKey(newName, newArea, phoneNorm)
      if (dedupe !== existing.dedupeKey) {
        const duplicate = await prisma.school.findUnique({ where: { dedupeKey: dedupe } })
        if (duplicate && duplicate.id !== id) {
          return res.status(409).json({
            error: phoneNorm
              ? 'A school with this phone already exists'
              : 'A school with this name and area already exists',
            existingId: duplicate.id,
          })
        }
        updateData.dedupeKey = dedupe
      }
    }

    const updated = await prisma.school.update({
      where: { id },
      data: updateData,
      include: {
        stage: true,
      },
    })

    return res.json(updated)
  } catch (err: any) {
    console.error('Error updating school:', err)
    return res.status(500).json({ error: 'Failed to update school' })
  }
})

// POST /api/schools/:id/archive
schoolsRouter.post('/:id/archive', async (req: Request, res: Response) => {
  const id = parseInt(req.params['id'] as string, 10)
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' })

  try {
    const existing = await prisma.school.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ error: 'School not found' })

    const updated = await prisma.school.update({
      where: { id },
      data: { archivedAt: new Date() },
      include: { stage: true },
    })

    return res.json(updated)
  } catch (err: any) {
    console.error('Error archiving school:', err)
    return res.status(500).json({ error: 'Failed to archive school' })
  }
})

// POST /api/schools/:id/restore
schoolsRouter.post('/:id/restore', async (req: Request, res: Response) => {
  const id = parseInt(req.params['id'] as string, 10)
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' })

  try {
    const existing = await prisma.school.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ error: 'School not found' })

    const updated = await prisma.school.update({
      where: { id },
      data: { archivedAt: null },
      include: { stage: true },
    })

    return res.json(updated)
  } catch (err: any) {
    console.error('Error restoring school:', err)
    return res.status(500).json({ error: 'Failed to restore school' })
  }
})

// DELETE /api/schools/:id
// DELETE works only on archived schools (409 "Archive this school first.")
schoolsRouter.delete('/:id', async (req: Request, res: Response) => {
  if (!isDeleteEnabled()) {
    return res.status(403).json({ error: 'Delete is disabled' })
  }

  const id = parseInt(req.params['id'] as string, 10)
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' })

  try {
    const existing = await prisma.school.findUnique({
      where: { id },
      include: {
        _count: {
          select: { contacts: true, meetings: true },
        },
      },
    })

    if (!existing) return res.status(404).json({ error: 'School not found' })

    if (!existing.archivedAt) {
      return res.status(409).json({ error: 'Archive this school first.' })
    }

    await prisma.school.delete({ where: { id } })

    return res.json({
      ok: true,
      deletedContactsCount: existing._count.contacts,
      deletedMeetingsCount: existing._count.meetings,
    })
  } catch (err: any) {
    console.error('Error deleting school:', err)
    return res.status(500).json({ error: 'Failed to delete school' })
  }
})

// GET /api/schools/:id/contacts
schoolsRouter.get('/:id/contacts', async (req: Request, res: Response) => {
  const id = parseInt(req.params['id'] as string, 10)
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' })

  try {
    const contacts = await prisma.schoolContact.findMany({
      where: { schoolId: id },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    })

    return res.json(contacts)
  } catch (err: any) {
    console.error('Error fetching contacts:', err)
    return res.status(500).json({ error: 'Failed to fetch contacts' })
  }
})

// POST /api/schools/:id/contacts
// Primary contact rule: first contact becomes primary; setting primary unsets old one
schoolsRouter.post('/:id/contacts', async (req: Request, res: Response) => {
  const id = parseInt(req.params['id'] as string, 10)
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' })

  const parsed = CreateContactSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0]?.message || 'Invalid input' })
  }

  try {
    const school = await prisma.school.findUnique({ where: { id } })
    if (!school) return res.status(404).json({ error: 'School not found' })

    if (school.archivedAt) {
      return res.status(400).json({ error: 'Cannot add contacts to an archived school' })
    }

    const data = parsed.data

    const contact = await prisma.$transaction(async (tx) => {
      const existingCount = await tx.schoolContact.count({ where: { schoolId: id } })
      const shouldBePrimary = existingCount === 0 || data.isPrimary === true

      if (shouldBePrimary && existingCount > 0) {
        await tx.schoolContact.updateMany({
          where: { schoolId: id },
          data: { isPrimary: false },
        })
      }

      return tx.schoolContact.create({
        data: {
          schoolId: id,
          name: data.name,
          role: data.role || null,
          phone: data.phone || null,
          email: data.email || null,
          notes: data.notes || null,
          isPrimary: shouldBePrimary,
        },
      })
    })

    return res.status(201).json(contact)
  } catch (err: any) {
    console.error('Error adding contact:', err)
    return res.status(500).json({ error: 'Failed to add contact' })
  }
})

// GET /api/schools/:id/meetings
schoolsRouter.get('/:id/meetings', async (req: Request, res: Response) => {
  const id = parseInt(req.params['id'] as string, 10)
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' })

  try {
    const meetings = await prisma.schoolMeeting.findMany({
      where: { schoolId: id },
      orderBy: [{ meetingDate: 'desc' }, { meetingTime: 'desc' }, { createdAt: 'desc' }],
      include: {
        stage: true,
        contact: true,
      },
    })

    return res.json(meetings)
  } catch (err: any) {
    console.error('Error fetching meetings:', err)
    return res.status(500).json({ error: 'Failed to fetch meetings' })
  }
})

// POST /api/schools/:id/meetings
// Rejects future dates; syncs school stage in transaction
schoolsRouter.post('/:id/meetings', async (req: Request, res: Response) => {
  const id = parseInt(req.params['id'] as string, 10)
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' })

  const parsed = CreateMeetingSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0]?.message || 'Invalid input' })
  }

  const { meetingDate, meetingTime, type, locationName, contactId, stageId, notes } = parsed.data

  if (isFutureDateIST(meetingDate)) {
    return res.status(400).json({ error: 'Meeting date cannot be in the future' })
  }

  try {
    const school = await prisma.school.findUnique({ where: { id } })
    if (!school) return res.status(404).json({ error: 'School not found' })

    if (school.archivedAt) {
      return res.status(400).json({ error: 'Cannot record meetings for an archived school' })
    }

    const stageExists = await prisma.schoolStage.findUnique({ where: { id: stageId } })
    if (!stageExists) {
      return res.status(400).json({ error: 'Selected stage does not exist' })
    }

    if (contactId) {
      const contact = await prisma.schoolContact.findFirst({
        where: { id: contactId, schoolId: id },
      })
      if (!contact) {
        return res.status(400).json({ error: 'Selected contact does not belong to this school' })
      }
    }

    const meeting = await prisma.$transaction(async (tx) => {
      const created = await tx.schoolMeeting.create({
        data: {
          schoolId: id,
          meetingDate: parseDateToMidnightUTC(meetingDate),
          meetingTime: meetingTime || null,
          type,
          locationName: locationName || null,
          contactId: contactId || null,
          stageId,
          notes: notes?.trim() || null,
        },
        include: {
          stage: true,
          contact: true,
        },
      })

      await syncSchoolStage(tx, id)
      return created
    })

    return res.status(201).json(meeting)
  } catch (err: any) {
    console.error('Error creating meeting:', err)
    return res.status(500).json({ error: 'Failed to record meeting' })
  }
})
