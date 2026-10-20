import { prisma } from '../backend/src/db.js'
import { priorityFromScore, priorityFromLabel, Priority } from '../lib/priority.js'

const VALID_PRIORITIES = new Set(['High', 'Medium', 'Low'])

interface NormalizeSample {
  id: number
  title: string
  score: string | number
  oldPriority: string | null
  newPriority: Priority | null
  source: string
}

async function main() {
  const isApply = process.argv.includes('--apply')

  console.log('='.repeat(70))
  console.log(`Leadonic Priority Normalization Script [${isApply ? 'APPLY MODE' : 'DRY RUN'}]`)
  console.log('='.repeat(70))

  const leads = await prisma.lead.findMany({
    select: {
      id: true,
      title: true,
      priority: true,
      priorityScore: true,
    },
    orderBy: { id: 'asc' },
  })

  console.log(`Total leads in database: ${leads.length}`)

  const targets = leads.filter((lead) => {
    const p = lead.priority ? lead.priority.trim() : null
    const hasScore = lead.priorityScore !== null
    if (!p) {
      return hasScore
    }
    return !VALID_PRIORITIES.has(p)
  })

  console.log(`Leads needing priority normalization: ${targets.length}`)

  const counts: Record<string, number> = {
    High: 0,
    Medium: 0,
    Low: 0,
    none: 0,
  }

  const updates: { id: number; priority: Priority | null }[] = []
  const samples: NormalizeSample[] = []

  for (const lead of targets) {
    let newPriority: Priority | null = null
    let source = 'none'

    if (lead.priorityScore !== null) {
      const sc = Number(lead.priorityScore)
      const fromSc = priorityFromScore(sc, 2, 4)
      if (fromSc) {
        newPriority = fromSc
        source = 'score'
      }
    }

    if (!newPriority && lead.priority) {
      const fromLbl = priorityFromLabel(lead.priority)
      if (fromLbl) {
        newPriority = fromLbl
        source = 'label'
      }
    }

    if (newPriority) {
      counts[newPriority]++
    } else {
      counts['none']++
    }

    updates.push({ id: lead.id, priority: newPriority })

    if (samples.length < 10) {
      samples.push({
        id: lead.id,
        title: lead.title.length > 30 ? lead.title.slice(0, 27) + '...' : lead.title,
        score: lead.priorityScore != null ? Number(lead.priorityScore) : '—',
        oldPriority: lead.priority || '—',
        newPriority: newPriority,
        source,
      })
    }
  }

  console.log('\n--- Normalization Summary by Outcome ---')
  console.log(`  High:   ${counts.High}`)
  console.log(`  Medium: ${counts.Medium}`)
  console.log(`  Low:    ${counts.Low}`)
  console.log(`  None:   ${counts.none}`)
  console.log(`  Total:  ${updates.length}`)

  console.log('\n--- 10 Sample Rows ---')
  console.table(samples)

  if (isApply) {
    console.log('\nApplying updates to database...')
    let appliedCount = 0
    for (const update of updates) {
      await prisma.lead.update({
        where: { id: update.id },
        data: { priority: update.priority },
      })
      appliedCount++
    }
    console.log(`Successfully updated ${appliedCount} leads in database.`)
  } else {
    console.log('\n[DRY RUN] No database changes were made. Pass --apply to commit updates.')
  }
}

main()
  .catch((err) => {
    console.error('Error running normalize-priorities:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
