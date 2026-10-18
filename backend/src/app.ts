import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'
import { prisma } from './db.js'
import { authRouter } from './routes/auth.js'
import { statusesRouter } from './routes/statuses.js'
import { categoriesRouter } from './routes/categories.js'
import { contactsRouter } from './routes/contacts.js'
import { leadsRouter } from './routes/leads.js'
import { importRouter } from './routes/import.js'
import { dashboardRouter } from './routes/dashboard.js'
import { reportRouter } from './routes/report.js'
import { requireAuth } from './auth.js'

dotenv.config()

const app = express()

app.use(cors({ origin: true, credentials: true }))
app.use(cookieParser())
app.use(express.json({ limit: '10mb' }))

// Public auth endpoints
app.use('/api/auth', authRouter)

// Health check with database connection check
app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    res.json({ status: 'ok', database: 'connected', time: new Date().toISOString() })
  } catch (err: any) {
    console.error('[HEALTH CHECK FAILED] Database error:', err)
    res.status(500).json({
      status: 'error',
      database: 'disconnected',
      error: err?.message || 'Database error',
      time: new Date().toISOString(),
    })
  }
})

// Protected API routes
app.use('/api/lead-statuses', requireAuth, statusesRouter)
app.use('/api/lead-categories', requireAuth, categoriesRouter)
app.use('/api/contacts', requireAuth, contactsRouter)
app.use('/api/leads/import', requireAuth, importRouter)
app.use('/api/leads', requireAuth, leadsRouter)
app.use('/api/dashboard', requireAuth, dashboardRouter)
app.use('/api/report', requireAuth, reportRouter)

// Global error handler with server-side logging
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(`[API ERROR] ${req.method} ${req.originalUrl || req.url}:`, err)
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' })
})

export default app
