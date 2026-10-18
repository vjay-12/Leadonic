import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'
import { authRouter } from './routes/auth'
import { statusesRouter } from './routes/statuses'
import { categoriesRouter } from './routes/categories'
import { leadsRouter } from './routes/leads'
import { importRouter } from './routes/import'
import { dashboardRouter } from './routes/dashboard'
import { reportRouter } from './routes/report'
import { requireAuth } from './auth'

dotenv.config()

const app = express()

app.use(cors({ origin: true, credentials: true }))
app.use(cookieParser())
app.use(express.json({ limit: '10mb' }))

// Public auth endpoints
app.use('/api/auth', authRouter)

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() })
})

// Protected API routes
app.use('/api/lead-statuses', requireAuth, statusesRouter)
app.use('/api/lead-categories', requireAuth, categoriesRouter)
app.use('/api/leads/import', requireAuth, importRouter)
app.use('/api/leads', requireAuth, leadsRouter)
app.use('/api/dashboard', requireAuth, dashboardRouter)
app.use('/api/report', requireAuth, reportRouter)

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err)
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' })
})

export default app
