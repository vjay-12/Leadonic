import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const DEFAULT_STATUSES = [
  { name: 'Confirm', color: '#15803D', sortOrder: 0 },
  { name: 'Not Interested', color: '#B91C1C', sortOrder: 1 },
  { name: 'Interested - follow back', color: '#1D4ED8', sortOrder: 2 },
  { name: 'Unavailable - follow back', color: '#92400E', sortOrder: 3 },
  { name: 'Not Sure', color: '#CA8A04', sortOrder: 4 },
]

const DEFAULT_CATEGORIES = [
  { name: 'School', sortOrder: 0 },
  { name: 'Boutique', sortOrder: 1 },
]

const DEFAULT_SCHOOL_STAGES = [
  { name: 'Contacted', color: '#1D4ED8', sortOrder: 0 },
  { name: 'Meeting done', color: '#7C3AED', sortOrder: 1 },
  { name: 'Demo given', color: '#2563EB', sortOrder: 2 },
  { name: 'Proposal sent', color: '#CA8A04', sortOrder: 3 },
  { name: 'Won', color: '#15803D', sortOrder: 4 },
  { name: 'Lost', color: '#B91C1C', sortOrder: 5 },
]

async function main() {
  console.log('Seeding default statuses...')
  for (const s of DEFAULT_STATUSES) {
    await prisma.leadStatus.upsert({
      where: { name: s.name },
      update: { color: s.color, sortOrder: s.sortOrder },
      create: { name: s.name, color: s.color, sortOrder: s.sortOrder },
    })
  }

  console.log('Seeding default categories...')
  for (const c of DEFAULT_CATEGORIES) {
    await prisma.leadCategory.upsert({
      where: { name: c.name },
      update: { sortOrder: c.sortOrder },
      create: { name: c.name, sortOrder: c.sortOrder },
    })
  }

  console.log('Seeding default school stages...')
  for (const st of DEFAULT_SCHOOL_STAGES) {
    await prisma.schoolStage.upsert({
      where: { name: st.name },
      update: { color: st.color, sortOrder: st.sortOrder },
      create: { name: st.name, color: st.color, sortOrder: st.sortOrder },
    })
  }

  console.log('Seeding completed successfully.')
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
