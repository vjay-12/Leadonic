import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { createSessionToken, setSessionCookie, clearSessionCookie, requireAuth } from '../auth.js'

export const authRouter = Router()

const LoginSchema = z.object({
  password: z.string().min(1, 'Password is required'),
})

authRouter.post('/login', (req: Request, res: Response) => {
  const result = LoginSchema.safeParse(req.body)
  if (!result.success) {
    return res.status(400).json({ error: result.error.errors[0]?.message || 'Invalid request' })
  }

  const expectedPassword = process.env['APP_PASSWORD']
  if (!expectedPassword) {
    console.error('APP_PASSWORD is not set in environment')
    return res.status(500).json({ error: 'Server configuration error' })
  }

  if (result.data.password !== expectedPassword) {
    return res.status(401).json({ error: 'Incorrect password' })
  }

  const token = createSessionToken()
  setSessionCookie(res, token)
  return res.json({ ok: true })
})

authRouter.post('/logout', (_req: Request, res: Response) => {
  clearSessionCookie(res)
  return res.json({ ok: true })
})

authRouter.get('/me', requireAuth, (_req: Request, res: Response) => {
  return res.json({ ok: true })
})
