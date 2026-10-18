import { Router, Request, Response } from 'express'
import { prisma } from '../db'

export const reportRouter = Router()

interface MatrixRow {
  categoryId: number | null
  categoryName: string
  counts: Record<string, number> // statusId string or 'not_called'
  total: number
}

async function generateReportData(categoryIdParam?: string, fromParam?: string, toParam?: string) {
  const where: any = {}

  if (categoryIdParam) {
    const cid = parseInt(categoryIdParam, 10)
    if (!isNaN(cid)) where.categoryId = cid
  }

  if (fromParam || toParam) {
    where.createdAt = {}
    if (fromParam) {
      const d = new Date(fromParam)
      if (!isNaN(d.getTime())) where.createdAt.gte = d
    }
    if (toParam) {
      const d = new Date(toParam)
      if (!isNaN(d.getTime())) {
        d.setHours(23, 59, 59, 999)
        where.createdAt.lte = d
      }
    }
  }

  const [statuses, categories, leads] = await Promise.all([
    prisma.leadStatus.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.leadCategory.findMany({
      where: categoryIdParam ? { id: parseInt(categoryIdParam, 10) } : {},
      orderBy: { sortOrder: 'asc' },
    }),
    prisma.lead.findMany({
      where,
      select: {
        id: true,
        categoryId: true,
        statusId: true,
      },
    }),
  ])

  // Build matrix rows
  const rows: MatrixRow[] = categories.map((cat) => {
    const counts: Record<string, number> = { not_called: 0 }
    for (const s of statuses) {
      counts[String(s.id)] = 0
    }

    const catLeads = leads.filter((l) => l.categoryId === cat.id)
    for (const lead of catLeads) {
      if (lead.statusId == null) {
        counts['not_called'] = (counts['not_called'] ?? 0) + 1
      } else if (counts[String(lead.statusId)] !== undefined) {
        counts[String(lead.statusId)] = (counts[String(lead.statusId)] ?? 0) + 1
      }
    }

    return {
      categoryId: cat.id,
      categoryName: cat.name,
      counts,
      total: catLeads.length,
    }
  })

  // Check if there are leads without category
  const uncategorizedLeads = leads.filter((l) => l.categoryId == null)
  if (uncategorizedLeads.length > 0 && !categoryIdParam) {
    const counts: Record<string, number> = { not_called: 0 }
    for (const s of statuses) {
      counts[String(s.id)] = 0
    }
    for (const lead of uncategorizedLeads) {
      if (lead.statusId == null) {
        counts['not_called'] = (counts['not_called'] ?? 0) + 1
      } else if (counts[String(lead.statusId)] !== undefined) {
        counts[String(lead.statusId)] = (counts[String(lead.statusId)] ?? 0) + 1
      }
    }
    rows.push({
      categoryId: null,
      categoryName: 'Uncategorized',
      counts,
      total: uncategorizedLeads.length,
    })
  }

  // Summary / Totals row
  const totalCounts: Record<string, number> = { not_called: 0 }
  for (const s of statuses) {
    totalCounts[String(s.id)] = 0
  }
  for (const r of rows) {
    totalCounts['not_called'] = (totalCounts['not_called'] ?? 0) + (r.counts['not_called'] ?? 0)
    for (const s of statuses) {
      totalCounts[String(s.id)] = (totalCounts[String(s.id)] ?? 0) + (r.counts[String(s.id)] ?? 0)
    }
  }

  return {
    statuses,
    rows,
    totalCounts,
    grandTotal: leads.length,
  }
}

// GET /api/report
reportRouter.get('/', async (req: Request, res: Response) => {
  try {
    const categoryId = typeof req.query['categoryId'] === 'string' ? req.query['categoryId'] : undefined
    const from = typeof req.query['from'] === 'string' ? req.query['from'] : undefined
    const to = typeof req.query['to'] === 'string' ? req.query['to'] : undefined

    const report = await generateReportData(categoryId, from, to)
    return res.json(report)
  } catch (err: any) {
    console.error('Error generating report:', err)
    return res.status(500).json({ error: 'Failed to generate report' })
  }
})

// GET /api/report.csv
reportRouter.get('/csv', async (req: Request, res: Response) => {
  try {
    const categoryId = typeof req.query['categoryId'] === 'string' ? req.query['categoryId'] : undefined
    const from = typeof req.query['from'] === 'string' ? req.query['from'] : undefined
    const to = typeof req.query['to'] === 'string' ? req.query['to'] : undefined

    const report = await generateReportData(categoryId, from, to)

    const headers = ['Category', ...report.statuses.map((s) => s.name), 'Not called', 'Total']

    const rows = report.rows.map((row) => [
      row.categoryName,
      ...report.statuses.map((s) => String(row.counts[String(s.id)] || 0)),
      String(row.counts['not_called'] || 0),
      String(row.total),
    ])

    // Total row
    rows.push([
      'Total',
      ...report.statuses.map((s) => String(report.totalCounts[String(s.id)] || 0)),
      String(report.totalCounts['not_called'] || 0),
      String(report.grandTotal),
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
    res.setHeader('Content-Disposition', 'attachment; filename="leads_report.csv"')
    return res.send(csvContent)
  } catch (err: any) {
    console.error('Error exporting report CSV:', err)
    return res.status(500).json({ error: 'Failed to export report CSV' })
  }
})
