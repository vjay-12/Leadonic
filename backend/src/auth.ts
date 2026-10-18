import crypto from 'crypto'
import { Request, Response, NextFunction } from 'express'

const SESSION_COOKIE_NAME = 'leadonic_session'
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

function getSecret(): string {
  const secret = process.env.SESSION_SECRET || 'dev-secret-leadonic-change-in-prod-1234'
  return secret
}

export function createSessionToken(): string {
  const payload = {
    exp: Date.now() + THIRTY_DAYS_MS,
    v: 1,
  }
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = crypto.createHmac('sha256', getSecret()).update(data).digest('base64url')
  return `${data}.${sig}`
}

export function verifySessionToken(token: string | undefined): boolean {
  if (!token) return false
  const parts = token.split('.')
  if (parts.length !== 2) return false
  const [data, sig] = parts
  const expectedSig = crypto.createHmac('sha256', getSecret()).update(data).digest('base64url')

  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
      return false
    }
  } catch {
    return false
  }

  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'))
    if (!payload.exp || Date.now() > payload.exp) {
      return false
    }
    return true
  } catch {
    return false
  }
}

export function setSessionCookie(res: Response, token: string) {
  const isProd = process.env.NODE_ENV === 'production'
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: THIRTY_DAYS_MS,
    path: '/',
  })
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  })
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[SESSION_COOKIE_NAME]
  if (verifySessionToken(token)) {
    return next()
  }
  return res.status(401).json({ error: 'Unauthorized. Please log in.' })
}
