import cors from 'cors'
import express from 'express'
import authRoutes from './routes/auth.js'
import goalsRoutes from './routes/goals.js'
import yearProgressRoutes from './routes/yearProgress.js'
import habitsRoutes from './routes/habits.js'
import mindsetRoutes from './routes/mindset.js'
import projectsRoutes from './routes/projects.js'
import dailyTasksRoutes from './routes/dailyTasks.js'
import tasksRoutes from './routes/tasks.js'
import usersRoutes from './routes/users.js'

function allowedOrigins(): string[] {
  const origins = new Set<string>()
  const client = process.env.CLIENT_ORIGIN?.trim()
  if (client) origins.add(client)
  if (process.env.VERCEL_URL) origins.add(`https://${process.env.VERCEL_URL}`)
  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim()
  if (production) origins.add(production.startsWith('http') ? production : `https://${production}`)
  return [...origins]
}

export function createApp() {
  const app = express()
  const origins = allowedOrigins()

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) { callback(null, true); return }
        const isLocalhost = /^https?:\/\/localhost(:\d+)?$/.test(origin)
        if (isLocalhost || origins.length === 0 || origins.includes(origin)) {
          callback(null, true)
          return
        }
        callback(new Error('Not allowed by CORS'))
      },
      credentials: true,
    }),
  )
  app.use(express.json())

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'flowstate-api' })
  })

  app.use('/api/auth', authRoutes)
  app.use('/api/projects', projectsRoutes)
  app.use('/api/tasks', tasksRoutes)
  app.use('/api/daily-tasks', dailyTasksRoutes)
  app.use('/api/users', usersRoutes)
  app.use('/api/habits', habitsRoutes)
  app.use('/api/mindset', mindsetRoutes)
  app.use('/api/goals', goalsRoutes)
  app.use('/api/year-progress', yearProgressRoutes)

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' })
  })

  return app
}
