/**
 * Demo seed for interview walkthrough.
 * Login: afzaljunaidd@gmail.com / 12345678
 *
 * Run from /server: npx tsx prisma/seed.ts
 */
import { config } from 'dotenv'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import bcrypt from 'bcryptjs'
import { PrismaClient, TaskPriority, TaskStatus } from '@prisma/client'

config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../.env') })

const prisma = new PrismaClient()

const DEMO_EMAIL = 'afzaljunaidd@gmail.com'
const DEMO_PASSWORD = '12345678'
const DEMO_NAME = 'Afzal Junaid'

/** ~2 months of planner, habits, and mindset history */
const DAYS = 62

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0)
}

function addDays(d: Date, n: number): Date {
  const x = startOfLocalDay(d)
  x.setDate(x.getDate() + n)
  return x
}

function mondayOf(d: Date): Date {
  const x = startOfLocalDay(d)
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7))
  return x
}

function unit(n: number, salt: number): number {
  return ((n * 9301 + salt * 49297) % 233280) / 233280
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, Math.round(n)))
}

async function main() {
  const today = startOfLocalDay(new Date())
  const start = addDays(today, -(DAYS - 1))

  const existing = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } })
  if (existing) {
    await prisma.user.delete({ where: { id: existing.id } })
  }

  const user = await prisma.user.create({
    data: {
      email: DEMO_EMAIL,
      name: DEMO_NAME,
      password: await bcrypt.hash(DEMO_PASSWORD, 10),
      createdAt: start,
    },
  })

  const [health, focus, career] = await prisma.$transaction([
    prisma.habitCategory.create({
      data: { userId: user.id, name: 'Health', emoji: '💪', color: '#00D4AA' },
    }),
    prisma.habitCategory.create({
      data: { userId: user.id, name: 'Focus', emoji: '🎯', color: '#6C63FF' },
    }),
    prisma.habitCategory.create({
      data: { userId: user.id, name: 'Career', emoji: '🚀', color: '#FFB84C' },
    }),
  ])

  const habitDefs = [
    { name: 'Morning walk', emoji: '🏃', color: '#00D4AA', categoryId: health.id, weekdayRate: 0.88, weekendRate: 0.55 },
    { name: 'Drink 2L water', emoji: '💧', color: '#4FC3F7', categoryId: health.id, weekdayRate: 0.92, weekendRate: 0.8 },
    { name: 'Sleep by 11pm', emoji: '🌙', color: '#9C88FF', categoryId: health.id, weekdayRate: 0.7, weekendRate: 0.45 },
    { name: 'Deep work 2h', emoji: '🧠', color: '#6C63FF', categoryId: focus.id, weekdayRate: 0.86, weekendRate: 0.35 },
    { name: 'Read 20 minutes', emoji: '📚', color: '#26C6DA', categoryId: focus.id, weekdayRate: 0.78, weekendRate: 0.72 },
    { name: 'Journal', emoji: '📝', color: '#FF6B9D', categoryId: focus.id, weekdayRate: 0.55, weekendRate: 0.62 },
    { name: 'LeetCode / DSA', emoji: '💻', color: '#FFB84C', categoryId: career.id, weekdayRate: 0.82, weekendRate: 0.5 },
    { name: 'System design notes', emoji: '📐', color: '#FFD54F', categoryId: career.id, weekdayRate: 0.6, weekendRate: 0.4 },
  ] as const

  const habits = []
  for (const h of habitDefs) {
    habits.push(
      await prisma.habit.create({
        data: {
          userId: user.id,
          categoryId: h.categoryId,
          name: h.name,
          emoji: h.emoji,
          color: h.color,
          createdAt: start,
          isActive: true,
        },
      }),
    )
  }

  const sickDay = addDays(today, -11)
  const travelDay = addDays(today, -19)

  const habitLogs: {
    habitId: string
    userId: string
    date: Date
    completed: boolean
    note: string | null
  }[] = []

  for (let i = 0; i < DAYS; i++) {
    const date = addDays(start, i)
    const isFuture = date.getTime() > today.getTime()
    if (isFuture) continue
    const weekend = date.getDay() === 0 || date.getDay() === 6
    const isSick = date.getTime() === sickDay.getTime()
    const isTravel = date.getTime() === travelDay.getTime()
    const daysFromToday = Math.round((today.getTime() - date.getTime()) / 86_400_000)

    for (let hi = 0; hi < habitDefs.length; hi++) {
      const def = habitDefs[hi]!
      const habit = habits[hi]!
      let rate = weekend ? def.weekendRate : def.weekdayRate
      if (isSick) rate *= 0.25
      if (isTravel) rate *= 0.4
      // Strong recent streak so dashboard looks lived-in
      if (daysFromToday <= 5 && hi < 5) rate = 0.97
      // Leave journal + system design open today so you can toggle live
      if (daysFromToday === 0 && (def.name === 'Journal' || def.name === 'System design notes')) {
        habitLogs.push({
          habitId: habit.id,
          userId: user.id,
          date,
          completed: false,
          note: null,
        })
        continue
      }
      const done = unit(i * 17 + hi, hi + 3) < rate
      habitLogs.push({
        habitId: habit.id,
        userId: user.id,
        date,
        completed: done,
        note:
          done && def.name === 'LeetCode / DSA' && !weekend && unit(i, 9) > 0.82
            ? 'Graphs + BFS review'
            : null,
      })
    }
  }

  await prisma.habitLog.createMany({ data: habitLogs })

  const mindsetNotes: Record<number, string> = {
    0: 'Kicked off a focused two-month push on FlowState.',
    7: 'Mock interview went better than expected — communicate the tradeoffs.',
    14: 'Low energy day. Protected sleep instead of forcing a grind.',
    21: 'Shipped the habit heatmap. Charts finally feel like the product.',
    28: 'System design: rate limiter + consistent hashing notes.',
    35: 'Dashboard week view is the demo opener.',
    42: 'Mindset scores climbing after better sleep.',
    49: 'UI polish pass — sidebar feels like Linear.',
    56: 'Keep the current week full for the walkthrough.',
    61: 'Ready to show two months of real-looking history.',
  }

  const mindsetLogs = []
  for (let i = 0; i < DAYS; i++) {
    const date = addDays(start, i)
    if (date.getTime() > today.getTime()) continue
    const weekend = date.getDay() === 0 || date.getDay() === 6
    const isSick = date.getTime() === sickDay.getTime()
    const wave = Math.sin(i / 4.2) * 1.4
    const base = weekend ? 6.4 : 7.3
    const dip = isSick ? -2.4 : 0
    mindsetLogs.push({
      userId: user.id,
      date,
      mood: clamp(base + wave + dip + unit(i, 1) * 1.2, 4, 10),
      energy: clamp(base - 0.3 + wave * 0.8 + dip + unit(i, 2) * 1.4, 3, 10),
      focus: clamp((weekend ? 6.1 : 7.6) + wave * 0.6 + dip + unit(i, 3) * 1.1, 3, 10),
      motivation: clamp(7.2 + Math.sin(i / 6) + (isSick ? -2 : 0) + unit(i, 4), 4, 10),
      note: mindsetNotes[i] ?? null,
    })
  }
  await prisma.mindsetLog.createMany({ data: mindsetLogs })

  const weekStarts: Date[] = []
  let cursor = mondayOf(start)
  const lastMonday = mondayOf(today)
  while (cursor.getTime() <= lastMonday.getTime()) {
    weekStarts.push(new Date(cursor))
    cursor = addDays(cursor, 7)
  }

  const weeklyByOffset: string[][] = [
    [
      'Stand up local FlowState + Prisma',
      'Define dashboard week view',
      'Write auth (register / login / me)',
      'Ship first habit tracker grid',
    ],
    [
      'Kanban for project tasks',
      'Mindset check-in + charts',
      'Daily planner with progress rings',
      'Polish dark theme tokens',
    ],
    [
      'Year-in-progress heatmap',
      'Weekly goals + streak insights',
      'Mock interview: backend round',
      'DSA: trees and heaps',
    ],
    [
      'Settings profile + account delete',
      'Tighten empty / loading states',
      'System design: news feed',
      'Record 90s product walkthrough',
    ],
    [
      'Rehearse demo path (login → week → habits)',
      'Seed two months of realistic data',
      'Review failure modes (offline, empty week)',
      'Sleep well the night before',
    ],
    [
      'Mobile layout pass',
      'Habit analysis sidebar',
      'System design: chat app',
      'Two mock interviews',
    ],
    [
      'UI polish (cards, type, sidebar)',
      'Keep the current-week dashboard full',
      'Review talking points',
      'Keep habits streak alive',
    ],
    [
      'Ship interview-ready build',
      'Close leftover TODOs',
      'Walk through year-in-progress',
      'Protect sleep and water habits',
    ],
  ]

  const weeklyGoals = []
  for (let w = 0; w < weekStarts.length; w++) {
    const titles = weeklyByOffset[Math.min(w, weeklyByOffset.length - 1)]!
    const isCurrent = weekStarts[w]!.getTime() === lastMonday.getTime()
    for (let gi = 0; gi < titles.length; gi++) {
      weeklyGoals.push({
        userId: user.id,
        weekStart: weekStarts[w]!,
        title: titles[gi]!,
        completed: isCurrent ? gi < 2 : gi < titles.length - (w === 1 ? 1 : 0),
        createdAt: weekStarts[w]!,
      })
    }
  }
  await prisma.weeklyGoal.createMany({ data: weeklyGoals })

  const weekdayTasks = [
    { title: 'Deep work: FlowState feature', priority: TaskPriority.HIGH },
    { title: 'Review PRs / notes', priority: TaskPriority.MEDIUM },
    { title: 'DSA set (2 problems)', priority: TaskPriority.HIGH },
    { title: 'Inbox zero + calendar', priority: TaskPriority.LOW },
    { title: 'Walk + stretch', priority: TaskPriority.MEDIUM },
    { title: 'Write standup notes', priority: TaskPriority.LOW },
  ]
  const fridayExtras = [
    { title: 'Weekly retro in FlowState', priority: TaskPriority.MEDIUM },
    { title: 'Plan next week goals', priority: TaskPriority.HIGH },
  ]
  const weekendTasks = [
    { title: 'Read 20 pages', priority: TaskPriority.LOW },
    { title: 'Light LeetCode or rest', priority: TaskPriority.LOW },
    { title: 'Meal prep / errands', priority: TaskPriority.MEDIUM },
  ]
  const extraByDow: Record<number, { title: string; priority: TaskPriority }[]> = {
    1: [{ title: 'Plan the week on the dashboard', priority: TaskPriority.HIGH }],
    2: [{ title: 'System design flashcards', priority: TaskPriority.MEDIUM }],
    3: [{ title: 'Mock interview notes', priority: TaskPriority.HIGH }],
    4: [{ title: 'Polish habit heatmap', priority: TaskPriority.MEDIUM }],
    5: [{ title: 'Demo dry-run (10 min)', priority: TaskPriority.HIGH }],
  }

  const dailyTasks: {
    userId: string
    title: string
    description: string | null
    status: TaskStatus
    priority: TaskPriority
    dueDate: Date
    completedAt: Date | null
    createdAt: Date
  }[] = []

  for (let i = 0; i < DAYS + 3; i++) {
    const date = addDays(start, i)
    const dow = date.getDay()
    const isPast = date.getTime() < today.getTime()
    const isToday = date.getTime() === today.getTime()
    const isFuture = date.getTime() > today.getTime()
    const extras = extraByDow[dow] ?? []
    const pool =
      dow === 0 || dow === 6
        ? weekendTasks
        : dow === 5
          ? [...weekdayTasks, ...fridayExtras, ...extras]
          : [...weekdayTasks, ...extras]

    const count = dow === 0 || dow === 6 ? 3 : 6
    for (let t = 0; t < count; t++) {
      const item = pool[t % pool.length]!
      let status: TaskStatus = TaskStatus.TODO
      let completedAt: Date | null = null
      if (isPast) {
        status = unit(i * 5 + t, 8) > 0.08 ? TaskStatus.DONE : TaskStatus.TODO
        if (status === TaskStatus.DONE) completedAt = new Date(date.getTime() + 18 * 3600_000)
      } else if (isToday) {
        if (t === 0) {
          status = TaskStatus.DONE
          completedAt = new Date()
        } else if (t === 1) status = TaskStatus.IN_PROGRESS
        else status = TaskStatus.TODO
      } else if (isFuture) {
        status = TaskStatus.TODO
      }
      dailyTasks.push({
        userId: user.id,
        title: item.title,
        description: null,
        status,
        priority: item.priority,
        dueDate: date,
        completedAt,
        createdAt: date,
      })
    }
  }

  dailyTasks.push(
    {
      userId: user.id,
      title: 'Rehearse FlowState interview demo',
      description: 'Login → dashboard week → habits heatmap → mindset → weekly goals → year grid.',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
      dueDate: today,
      completedAt: null,
      createdAt: today,
    },
    {
      userId: user.id,
      title: 'Prep talking points: stack + tradeoffs',
      description: 'React + Vite, Express, Prisma, JWT, Postgres/SQLite, Recharts, Zustand.',
      status: TaskStatus.TODO,
      priority: TaskPriority.HIGH,
      dueDate: today,
      completedAt: null,
      createdAt: today,
    },
  )

  await prisma.dailyTask.createMany({ data: dailyTasks })

  const flowstate = await prisma.project.create({
    data: {
      ownerId: user.id,
      name: 'FlowState',
      description: 'Personal productivity OS — dashboard, habits, mindset, and weekly goals.',
      color: '#6C63FF',
      emoji: '🌊',
      status: 'ACTIVE',
      createdAt: start,
    },
  })
  const interview = await prisma.project.create({
    data: {
      ownerId: user.id,
      name: 'Interview prep',
      description: 'DSA, system design, and behavioral stories for upcoming interviews.',
      color: '#FFB84C',
      emoji: '🎯',
      status: 'ACTIVE',
      createdAt: start,
    },
  })
  const learning = await prisma.project.create({
    data: {
      ownerId: user.id,
      name: 'Learning track',
      description: 'Reading list and notes that feed back into FlowState.',
      color: '#00D4AA',
      emoji: '📚',
      status: 'ACTIVE',
      createdAt: addDays(start, 4),
    },
  })
  const archived = await prisma.project.create({
    data: {
      ownerId: user.id,
      name: 'Q2 experiments',
      description: 'Parked prototypes — kept for the archive view.',
      color: '#9C88FF',
      emoji: '🧪',
      status: 'ARCHIVED',
      createdAt: addDays(start, -20),
    },
  })

  const projectTasks = [
    // FlowState
    {
      projectId: flowstate.id,
      title: 'JWT auth + protected API routes',
      status: TaskStatus.DONE,
      priority: TaskPriority.HIGH,
      dueDate: addDays(start, 3),
      completedAt: addDays(start, 3),
    },
    {
      projectId: flowstate.id,
      title: 'Week planner with per-day progress rings',
      status: TaskStatus.DONE,
      priority: TaskPriority.HIGH,
      dueDate: addDays(start, 8),
      completedAt: addDays(start, 7),
    },
    {
      projectId: flowstate.id,
      title: 'Habit heatmap (month grid)',
      status: TaskStatus.DONE,
      priority: TaskPriority.MEDIUM,
      dueDate: addDays(start, 14),
      completedAt: addDays(start, 13),
    },
    {
      projectId: flowstate.id,
      title: 'Mindset charts (mood / energy / focus)',
      status: TaskStatus.DONE,
      priority: TaskPriority.MEDIUM,
      dueDate: addDays(start, 16),
      completedAt: addDays(start, 16),
    },
    {
      projectId: flowstate.id,
      title: 'Year-in-progress contribution grid',
      status: TaskStatus.DONE,
      priority: TaskPriority.MEDIUM,
      dueDate: addDays(start, 21),
      completedAt: addDays(start, 20),
    },
    {
      projectId: flowstate.id,
      title: 'Polish empty states + skeletons',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.MEDIUM,
      dueDate: today,
      completedAt: null,
    },
    {
      projectId: flowstate.id,
      title: 'Demo seed + walkthrough script',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
      dueDate: today,
      completedAt: null,
    },
    {
      projectId: flowstate.id,
      title: 'Mobile layout pass on dashboard',
      status: TaskStatus.TODO,
      priority: TaskPriority.LOW,
      dueDate: addDays(today, 4),
      completedAt: null,
    },
    // Interview
    {
      projectId: interview.id,
      title: 'DSA: arrays, hashing, two pointers',
      status: TaskStatus.DONE,
      priority: TaskPriority.HIGH,
      dueDate: addDays(start, 6),
      completedAt: addDays(start, 6),
    },
    {
      projectId: interview.id,
      title: 'DSA: graphs + BFS/DFS',
      status: TaskStatus.DONE,
      priority: TaskPriority.HIGH,
      dueDate: addDays(start, 15),
      completedAt: addDays(start, 15),
    },
    {
      projectId: interview.id,
      title: 'System design: URL shortener',
      status: TaskStatus.DONE,
      priority: TaskPriority.MEDIUM,
      dueDate: addDays(start, 18),
      completedAt: addDays(start, 18),
    },
    {
      projectId: interview.id,
      title: 'System design: rate limiter',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
      dueDate: addDays(today, 1),
      completedAt: null,
    },
    {
      projectId: interview.id,
      title: 'Behavioral: STAR stories (ownership, conflict)',
      status: TaskStatus.TODO,
      priority: TaskPriority.HIGH,
      dueDate: addDays(today, 1),
      completedAt: null,
    },
    {
      projectId: interview.id,
      title: 'Mock interview — backend round',
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      dueDate: addDays(today, 2),
      completedAt: null,
    },
    // Learning
    {
      projectId: learning.id,
      title: 'Designing Data-Intensive Applications — ch. 1–3',
      status: TaskStatus.DONE,
      priority: TaskPriority.MEDIUM,
      dueDate: addDays(start, 10),
      completedAt: addDays(start, 10),
    },
    {
      projectId: learning.id,
      title: 'Prisma + serverless connection pooling notes',
      status: TaskStatus.DONE,
      priority: TaskPriority.LOW,
      dueDate: addDays(start, 12),
      completedAt: addDays(start, 12),
    },
    {
      projectId: learning.id,
      title: 'Recharts composition patterns',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.LOW,
      dueDate: addDays(today, 3),
      completedAt: null,
    },
    {
      projectId: learning.id,
      title: 'Write “how I built FlowState” post',
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      dueDate: addDays(today, 7),
      completedAt: null,
    },
    {
      projectId: archived.id,
      title: 'Abandoned Notion clone spike',
      status: TaskStatus.DONE,
      priority: TaskPriority.LOW,
      dueDate: addDays(start, -5),
      completedAt: addDays(start, -5),
    },
  ]

  await prisma.task.createMany({
    data: projectTasks.map((t) => ({
      ...t,
      assignedToId: user.id,
      description: null,
      createdAt: t.dueDate ?? start,
    })),
  })

  console.log('Seeded FlowState demo account')
  console.log(`  email:    ${DEMO_EMAIL}`)
  console.log(`  password: ${DEMO_PASSWORD}`)
  console.log(`  range:    ${start.toDateString()} → ${today.toDateString()}`)
  console.log(
    `  counts:   habits ${habits.length}, habitLogs ${habitLogs.length}, mindset ${mindsetLogs.length}, daily ${dailyTasks.length}, weekly ${weeklyGoals.length}, projects 4`,
  )
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
