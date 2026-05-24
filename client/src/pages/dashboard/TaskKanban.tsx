import {
  DndContext,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import { cn } from '../../lib/cn'
import { api } from '../../lib/api'
import { toastError } from '../../lib/toast'
import type { TaskPriority, TaskStatus, TaskWithProject } from '../../types/dashboard'

const COLUMNS: { id: TaskStatus; title: string }[] = [
  { id: 'TODO', title: 'To Do' },
  { id: 'IN_PROGRESS', title: 'In Progress' },
  { id: 'DONE', title: 'Done' },
]

const COLUMN_HEADER_BG: Record<TaskStatus, string> = {
  TODO: 'bg-accent4/10',
  IN_PROGRESS: 'bg-accent1/10',
  DONE: 'bg-accent2/10',
}

function priorityBadgeClass(p: TaskPriority): string {
  switch (p) {
    case 'LOW':
      return 'border border-accent5/40 bg-accent5/15 text-accent5'
    case 'MEDIUM':
      return 'border border-accent4/40 bg-accent4/15 text-accent4'
    case 'HIGH':
      return 'border border-accent3/40 bg-accent3/15 text-accent3'
    default:
      return 'border border-border bg-surface2 text-text-muted'
  }
}

function priorityLeftBorder(p: TaskPriority): string {
  switch (p) {
    case 'HIGH':
      return 'border-l-accent3'
    case 'MEDIUM':
      return 'border-l-accent4'
    case 'LOW':
      return 'border-l-accent2'
    default:
      return 'border-l-border'
  }
}

function TaskCardBody({ task }: { task: TaskWithProject }) {
  return (
    <>
      <p className="text-sm font-medium text-text-primary">{task.title}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${priorityBadgeClass(task.priority)}`}>
          {task.priority}
        </span>
        <span className="truncate text-xs text-text-muted">{task.project?.name ?? 'Project'}</span>
      </div>
    </>
  )
}

function KanbanCard({ task }: { task: TaskWithProject }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        'w-full min-w-0 max-w-full cursor-grab touch-none rounded-lg border border-border border-l-4 bg-background px-5 py-3 shadow-sm outline-none ring-0 focus:outline-none focus-visible:outline-none active:cursor-grabbing',
        priorityLeftBorder(task.priority),
        isDragging && 'opacity-35',
      )}
    >
      <TaskCardBody task={task} />
    </div>
  )
}

function KanbanColumn({
  id,
  title,
  children,
}: {
  id: TaskStatus
  title: string
  children: React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-surface/50 shadow-sm">
      <div className={`border-b border-border px-4 py-3 ${COLUMN_HEADER_BG[id]}`}>
        <h3 className="fs-eyebrow text-text-primary">{title}</h3>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          'flex min-h-[280px] flex-col gap-2 p-3 transition-colors',
          isOver && 'bg-accent1/5 ring-1 ring-inset ring-accent1/20',
        )}
      >
        {children}
      </div>
    </div>
  )
}

type Props = {
  tasks: TaskWithProject[]
  token: string | null
  onTasksChange: Dispatch<SetStateAction<TaskWithProject[]>>
}

export function TaskKanban({ tasks, token, onTasksChange }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  )

  const grouped = useMemo(() => {
    const g: Record<TaskStatus, TaskWithProject[]> = { TODO: [], IN_PROGRESS: [], DONE: [] }
    for (const t of tasks) {
      if (t.status in g) g[t.status as TaskStatus].push(t)
    }
    return g
  }, [tasks])

  const activeTask = activeId ? (tasks.find((t) => t.id === activeId) ?? null) : null

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const { active, over } = event
    if (!over || !token) return
    const taskId = String(active.id)
    const nextStatus = over.id as TaskStatus
    if (nextStatus !== 'TODO' && nextStatus !== 'IN_PROGRESS' && nextStatus !== 'DONE') return

    const task = tasks.find((t) => t.id === taskId)
    if (!task || task.status === nextStatus) return

    const prev = tasks
    const optimistic = tasks.map((t) =>
      t.id === taskId
        ? {
            ...t,
            status: nextStatus,
            completedAt: nextStatus === 'DONE' ? new Date().toISOString() : null,
          }
        : t,
    )
    onTasksChange(optimistic)

    try {
      const res = await api<{ task: TaskWithProject }>(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ status: nextStatus }),
      })
      onTasksChange((cur) => cur.map((t) => (t.id === taskId ? res.task : t)))
    } catch (e) {
      onTasksChange(prev)
      toastError(e instanceof Error ? e.message : 'Could not update task')
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragCancel={() => setActiveId(null)}
      onDragEnd={(e) => void handleDragEnd(e)}
    >
      <div className="flex min-h-0 flex-col gap-3 md:flex-row">
        {COLUMNS.map((col) => (
          <KanbanColumn key={col.id} id={col.id} title={col.title}>
            {grouped[col.id].map((task) => (
              <KanbanCard key={task.id} task={task} />
            ))}
          </KanbanColumn>
        ))}
      </div>

      <DragOverlay adjustScale={false} dropAnimation={null} zIndex={9999}>
        {activeTask ? (
          <div
            className={cn(
              'pointer-events-none w-72 max-w-[calc(100vw-2rem)] cursor-grabbing rounded-lg border border-border border-l-4 bg-background px-5 py-3 shadow-2xl ring-1 ring-black/40',
              priorityLeftBorder(activeTask.priority),
            )}
          >
            <TaskCardBody task={activeTask} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
