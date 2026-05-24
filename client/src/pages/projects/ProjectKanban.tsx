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
import { GripVertical } from 'lucide-react'
import {
  forwardRef,
  useMemo,
  useState,
  type ComponentPropsWithoutRef,
  type Dispatch,
  type SetStateAction,
} from 'react'
import { api } from '../../lib/api'
import { cn } from '../../lib/cn'
import { toastError } from '../../lib/toast'
import { isTaskOverdue } from '../../lib/taskDates'
import type { TaskPriority, TaskStatus } from '../../types/dashboard'
import type { ProjectTask } from '../../types/projects'

const COLUMNS: { id: TaskStatus; title: string; dotClass: string; headerBg: string }[] = [
  { id: 'TODO', title: 'To Do', dotClass: 'bg-accent4', headerBg: 'bg-accent4/10' },
  { id: 'IN_PROGRESS', title: 'In Progress', dotClass: 'bg-accent1', headerBg: 'bg-accent1/10' },
  { id: 'DONE', title: 'Done', dotClass: 'bg-accent2', headerBg: 'bg-accent2/10' },
]

function priorityBadgeClass(p: TaskPriority): string {
  switch (p) {
    case 'HIGH':
      return 'border border-red-500/50 bg-red-500/15 text-red-300'
    case 'MEDIUM':
      return 'border border-accent4/50 bg-accent4/15 text-accent4'
    case 'LOW':
      return 'border border-accent2/50 bg-accent2/15 text-accent2'
    default:
      return 'border border-border bg-surface2 text-text-muted'
  }
}

function userInitials(name: string, email: string): string {
  const n = name.trim()
  if (n.length >= 2) return n.slice(0, 2).toUpperCase()
  if (n.length === 1) return n.toUpperCase()
  const e = email.trim()
  if (e.length >= 2) return e.slice(0, 2).toUpperCase()
  return '?'
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

function TaskCardText({ task }: { task: ProjectTask }) {
  const overdue = isTaskOverdue(task.dueDate, task.status)
  const dueLabel =
    task.dueDate &&
    new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <>
      <p className="text-sm font-medium text-text-primary">{task.title}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${priorityBadgeClass(task.priority)}`}>
          {task.priority}
        </span>
        {dueLabel ? (
          <span className={`text-xs ${overdue ? 'font-medium text-red-400' : 'text-text-muted'}`}>{dueLabel}</span>
        ) : null}
        {task.assignee ? (
          <span
            className="ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-accent1/20 text-[10px] font-semibold text-accent1"
            title={task.assignee.name || task.assignee.email}
          >
            {userInitials(task.assignee.name, task.assignee.email)}
          </span>
        ) : (
          <span
            className="ml-auto h-7 w-7 shrink-0 rounded-full border border-dashed border-border bg-surface2/50"
            title="Unassigned"
          />
        )}
      </div>
    </>
  )
}

type TaskCardChromeProps = {
  task: ProjectTask
  className?: string
  inner: React.ReactNode
} & Omit<ComponentPropsWithoutRef<'div'>, 'children'>

const TaskCardChrome = forwardRef<HTMLDivElement, TaskCardChromeProps>(function TaskCardChrome(
  { task, className, inner, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      {...rest}
      className={cn(
        'flex gap-2 rounded-lg border border-border border-l-4 bg-background px-3 py-3 shadow-sm',
        priorityLeftBorder(task.priority),
        className,
      )}
    >
      <span className="pointer-events-none mt-0.5 shrink-0 text-text-muted/80" aria-hidden>
        <GripVertical className="h-4 w-4" />
      </span>
      {inner}
    </div>
  )
})

function KanbanCard({
  task,
  onOpen,
}: {
  task: ProjectTask
  onOpen: (t: ProjectTask) => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id })

  return (
    <TaskCardChrome
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      task={task}
      className={cn(
        'w-full min-w-0 max-w-full touch-none outline-none ring-0 ring-offset-0 focus:outline-none focus-visible:outline-none',
        'cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-35',
      )}
      inner={
        <button
          type="button"
          className="min-w-0 flex-1 cursor-grab text-left outline-none ring-0 focus:outline-none focus-visible:outline-none active:cursor-grabbing"
          onClick={() => onOpen(task)}
        >
          <TaskCardText task={task} />
        </button>
      }
    />
  )
}

function KanbanColumn({
  id,
  title,
  dotClass,
  headerBg,
  count,
  onAddTask,
  children,
}: {
  id: TaskStatus
  title: string
  dotClass: string
  headerBg: string
  count: number
  onAddTask: () => void
  children: React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-surface2 shadow-sm">
      <div className={`flex items-center justify-between gap-2 border-b border-border px-4 py-3 ${headerBg}`}>
        <div className="flex min-w-0 items-center gap-2">
          <span className={`h-2 w-2 shrink-0 rounded-full ${dotClass}`} aria-hidden />
          <h3 className="fs-eyebrow text-text-primary">{title}</h3>
          <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-medium text-text-primary">
            {count}
          </span>
        </div>
        <button
          type="button"
          onClick={onAddTask}
          className="shrink-0 rounded-lg border border-border bg-surface px-2 py-1 text-[11px] font-medium text-accent1 transition hover:bg-accent1/10"
        >
          + Add Task
        </button>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          'flex min-h-[320px] flex-col gap-2 p-3 transition-colors',
          isOver && 'bg-accent1/5 ring-1 ring-inset ring-accent1/20',
        )}
      >
        {children}
      </div>
    </div>
  )
}

type Props = {
  tasks: ProjectTask[]
  token: string | null
  onTasksChange: Dispatch<SetStateAction<ProjectTask[]>>
  onTaskOpen: (task: ProjectTask) => void
  onAddTaskForStatus: (status: TaskStatus) => void
}

export function ProjectKanban({ tasks, token, onTasksChange, onTaskOpen, onAddTaskForStatus }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  )

  const grouped = useMemo(() => {
    const g: Record<TaskStatus, ProjectTask[]> = { TODO: [], IN_PROGRESS: [], DONE: [] }
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
      const res = await api<{ task: ProjectTask }>(`/api/tasks/${taskId}`, {
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
      <div className="flex min-h-0 flex-col gap-3 lg:flex-row">
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.id}
            id={col.id}
            title={col.title}
            dotClass={col.dotClass}
            headerBg={col.headerBg}
            count={grouped[col.id].length}
            onAddTask={() => onAddTaskForStatus(col.id)}
          >
            {grouped[col.id].map((task) => (
              <KanbanCard key={task.id} task={task} onOpen={onTaskOpen} />
            ))}
          </KanbanColumn>
        ))}
      </div>

      <DragOverlay adjustScale={false} dropAnimation={null} zIndex={9999}>
        {activeTask ? (
          <TaskCardChrome
            task={activeTask}
            className="pointer-events-none w-72 max-w-[calc(100vw-2rem)] cursor-grabbing shadow-2xl ring-1 ring-black/40"
            inner={
              <div className="min-w-0 flex-1 text-left">
                <TaskCardText task={activeTask} />
              </div>
            }
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
