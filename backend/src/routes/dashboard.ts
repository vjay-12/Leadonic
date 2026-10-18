import { Router, Request, Response } from 'express'
import { prisma } from '../db.js'

export const dashboardRouter = Router()

// GET /api/dashboard
dashboardRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

    const [total, newThisWeek, notCalled, allStatuses, allCategories, rawLeads] = await Promise.all([
      prisma.lead.count(),
      prisma.lead.count({
        where: { createdAt: { gte: oneWeekAgo } },
      }),
      prisma.lead.count({
        where: { statusId: null },
      }),
      prisma.leadStatus.findMany({
        orderBy: { sortOrder: 'asc' },
        include: { _count: { select: { leads: true } } },
      }),
      prisma.leadCategory.findMany({
        orderBy: { sortOrder: 'asc' },
        include: { _count: { select: { leads: true } } },
      }),
      prisma.lead.groupBy({
        by: ['priority'],
        _count: { id: true },
      }),
    ])

    const byStatus = allStatuses.map((s) => ({
      id: s.id,
      name: s.name,
      color: s.color,
      count: s._count.leads,
    }))

    const byCategory = allCategories.map((c) => ({
      id: c.id,
      name: c.name,
      count: c._count.leads,
    }))

    const priorityOrder = ['High', 'Medium', 'Low']
    const byPriority = priorityOrder.map((p) => {
      const match = rawLeads.find((r) => r.priority?.toLowerCase() === p.toLowerCase())
      return {
        priority: p,
        count: match ? match._count.id : 0,
      }
    })

    // Also check for any uncategorized or other priorities
    const otherPrioritiesCount = rawLeads
      .filter((r) => !r.priority || !priorityOrder.some((p) => p.toLowerCase() === r.priority?.toLowerCase()))
      .reduce((acc, curr) => acc + curr._count.id, 0)

    if (otherPrioritiesCount > 0) {
      byPriority.push({
        priority: 'None / Other',
        count: otherPrioritiesCount,
      })
    }

    return res.json({
      total,
      newThisWeek,
      notCalled,
      byStatus,
      byCategory,
      byPriority,
    })
  } catch (err: any) {
    console.error('Error fetching dashboard stats:', err)
    return res.status(500).json({ error: 'Failed to fetch dashboard stats' })
  }
})
