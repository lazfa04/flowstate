import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { requireAuth, type AuthedRequest } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

/** Assignable users for tasks (solo app: current user only). */
router.get('/', async (req: AuthedRequest, res) => {
  const users = await prisma.user.findMany({
    where: { id: req.userId! },
    select: { id: true, email: true, name: true },
    orderBy: { email: 'asc' },
  })
  res.json({ users })
})

export default router
