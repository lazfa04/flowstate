import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../lib/prisma.js'
import { requireAuth, type AuthedRequest } from '../middleware/auth.js'

const router = Router()

const SALT_ROUNDS = 10

function signToken(userId: string, email: string) {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET is not set')
  return jwt.sign({ sub: userId, email }, secret, { expiresIn: '7d' })
}

router.post('/register', async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : ''
  const password = typeof req.body?.password === 'string' ? req.body.password : ''
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' })
    return
  }
  if (password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters' })
    return
  }
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    res.status(409).json({ error: 'Email already registered' })
    return
  }
  const hash = await bcrypt.hash(password, SALT_ROUNDS)
  const user = await prisma.user.create({
    data: { email, password: hash, name: name || email.split('@')[0] || 'User' },
  })
  const token = signToken(user.id, user.email)
  res.status(201).json({ token, user: { id: user.id, email: user.email, name: user.name } })
})

router.post('/login', async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : ''
  const password = typeof req.body?.password === 'string' ? req.body.password : ''
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' })
    return
  }
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    res.status(401).json({ error: 'Invalid credentials' })
    return
  }
  const ok = await bcrypt.compare(password, user.password)
  if (!ok) {
    res.status(401).json({ error: 'Invalid credentials' })
    return
  }
  const token = signToken(user.id, user.email)
  res.json({ token, user: { id: user.id, email: user.email, name: user.name } })
})

router.get('/me', requireAuth, async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { id: true, email: true, name: true },
  })
  if (!user) {
    res.status(404).json({ error: 'User not found' })
    return
  }
  res.json({ user })
})

router.put('/me', requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.userId!
  const existing = await prisma.user.findUnique({ where: { id: userId } })
  if (!existing) {
    res.status(404).json({ error: 'User not found' })
    return
  }

  const data: { name?: string; email?: string; password?: string } = {}

  if (req.body?.name !== undefined) {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : ''
    data.name = name
  }

  if (req.body?.email !== undefined) {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : ''
    if (!email) {
      res.status(400).json({ error: 'email must be a non-empty string' })
      return
    }
    if (email !== existing.email) {
      const taken = await prisma.user.findUnique({ where: { email }, select: { id: true } })
      if (taken) {
        res.status(409).json({ error: 'Email already in use' })
        return
      }
    }
    data.email = email
  }

  const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : ''
  if (newPassword) {
    if (newPassword.length < 8) {
      res.status(400).json({ error: 'New password must be at least 8 characters' })
      return
    }
    const currentPassword = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : ''
    if (!currentPassword) {
      res.status(400).json({ error: 'currentPassword is required to set a new password' })
      return
    }
    const ok = await bcrypt.compare(currentPassword, existing.password)
    if (!ok) {
      res.status(401).json({ error: 'Current password is incorrect' })
      return
    }
    data.password = await bcrypt.hash(newPassword, SALT_ROUNDS)
  }

  if (Object.keys(data).length === 0) {
    res.status(400).json({ error: 'No valid fields to update' })
    return
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: { id: true, email: true, name: true },
  })
  const token = signToken(user.id, user.email)
  res.json({ user, token })
})

router.delete('/me', requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.userId!
  const password = typeof req.body?.password === 'string' ? req.body.password : ''
  if (!password) {
    res.status(400).json({ error: 'password is required to delete your account' })
    return
  }
  const existing = await prisma.user.findUnique({ where: { id: userId } })
  if (!existing) {
    res.status(404).json({ error: 'User not found' })
    return
  }
  const ok = await bcrypt.compare(password, existing.password)
  if (!ok) {
    res.status(401).json({ error: 'Invalid password' })
    return
  }
  await prisma.user.delete({ where: { id: userId } })
  res.status(204).send()
})

export default router
