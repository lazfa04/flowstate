import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'

export type AuthedRequest = Request & { userId?: string }

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing bearer token' })
    return
  }
  const secret = process.env.JWT_SECRET
  if (!secret) {
    res.status(500).json({ error: 'Server misconfiguration' })
    return
  }
  const token = header.slice(7)
  try {
    const payload = jwt.verify(token, secret) as { sub: string }
    req.userId = payload.sub
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}
