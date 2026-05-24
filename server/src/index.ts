import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import authRoutes from './routes/auth.js'
import goalsRoutes from './routes/goals.js'
import habitsRoutes from './routes/habits.js'
import mindsetRoutes from './routes/mindset.js'
import projectsRoutes from './routes/projects.js'
import dailyTasksRoutes from './routes/dailyTasks.js'
import tasksRoutes from './routes/tasks.js'
import usersRoutes from './routes/users.js'

const PORT = Number(process.env.PORT) || 4000
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173'

const app = express()
app.use(
  cors({
    origin: CLIENT_ORIGIN,
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

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' })
})

app.listen(PORT, () => {
  console.log(`FlowState API listening on http://localhost:${PORT}`)
})
