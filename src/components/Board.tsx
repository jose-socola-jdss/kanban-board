import { useState, useCallback, useEffect, useRef } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable'
import type { Task, ColumnId } from '../types'
import { COLUMNS } from '../types'
import { useKanbanStore } from '../store/kanbanStore'
import { Column } from './Column'
import { DragCard } from './DragCard'
import { InProgressBanner } from './InProgressBanner'
import { isInWeekWindow, getEffectiveDueDate } from '../utils/date'

interface BoardProps {
  onActivityCompleted?: (activity: { id: string; title: string }) => void
}

export function Board({ onActivityCompleted }: BoardProps) {
  const { tasks, activities, moveTask, reorderTasks } = useKanbanStore()
  const [activeTask, setActiveTask] = useState<Task | null>(null)

  const oneDayAgo = new Date(); oneDayAgo.setDate(oneDayAgo.getDate() - 1)
  const today = new Date(); today.setHours(0, 0, 0, 0)

  const windowTasks = tasks.filter((t) => {
    // Completed: only show if within last 24h
    if (t.column === 'completed') {
      return !!t.completedAt && new Date(t.completedAt) > oneDayAgo
    }
    // Recurring: use next occurrence for window check
    if (t.schedulingType === 'recurring') {
      const eff = getEffectiveDueDate(t)
      if (!eff) return false
      return isInWeekWindow(eff)
    }
    // Fixed date or no date
    if (!t.dueDate) return true
    const due = new Date(t.dueDate + 'T00:00:00')
    if (due < today) return true   // overdue + not completed
    return isInWeekWindow(t.dueDate)
  })
  const [celebratingIds, setCelebratingIds] = useState<Set<string>>(new Set())
  const celebrateTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const activityCelebrateTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  useEffect(() => {
    return () => {
      celebrateTimers.current.forEach((timer) => clearTimeout(timer))
      activityCelebrateTimers.current.forEach((timer) => clearTimeout(timer))
    }
  }, [])

  const triggerCelebration = useCallback((taskId: string) => {
    setCelebratingIds((prev) => new Set(prev).add(taskId))
    // Clear any existing timer for this task
    const existing = celebrateTimers.current.get(taskId)
    if (existing) clearTimeout(existing)
    const timer = setTimeout(() => {
      setCelebratingIds((prev) => {
        const next = new Set(prev)
        next.delete(taskId)
        return next
      })
      celebrateTimers.current.delete(taskId)
    }, 1400)
    celebrateTimers.current.set(taskId, timer)
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const getTaskById = (id: string) => tasks.find((t) => t.id === id) ?? null
  const isColumnId = (id: string): id is ColumnId =>
    COLUMNS.some((c) => c.id === id)

  const onDragStart = ({ active }: DragStartEvent) => {
    setActiveTask(getTaskById(active.id as string))
  }

  const onDragOver = ({ active, over }: DragOverEvent) => {
    if (!over) return
    const activeId = active.id as string
    const overId = over.id as string
    if (activeId === overId) return

    const activeTask = getTaskById(activeId)
    if (!activeTask) return

    // If dragging over a column id → move task to that column
    if (isColumnId(overId)) {
      if (activeTask.column !== overId) {
        moveTask(activeId, overId)
      }
      return
    }

    // If dragging over another task → move to that task's column
    const overTask = getTaskById(overId)
    if (overTask && overTask.column !== activeTask.column) {
      moveTask(activeId, overTask.column)
    }
  }

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveTask(null)
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string
    if (activeId === overId) return

    // Read latest state directly from the store to avoid stale closures
    // (onDragOver already called moveTask, which updated the store before this handler runs)
    const freshTasks = useKanbanStore.getState().tasks
    const currentTask = freshTasks.find((t) => t.id === activeId) ?? null
    const overTask = freshTasks.find((t) => t.id === overId) ?? null

    if (!currentTask) return

    // Trigger celebration only if the task actually ended up in completed (move wasn't blocked)
    if (currentTask.column === 'completed') {
      triggerCelebration(activeId)

      const activityTasks = currentTask.activityId
        ? freshTasks.filter((task) => task.activityId === currentTask.activityId)
        : []
      const isActivityCompleted = activityTasks.length > 0 && activityTasks.every((task) => task.column === 'completed')
      const activity = currentTask.activityId ? activities.find((item) => item.id === currentTask.activityId) : undefined

      if (isActivityCompleted && activity && onActivityCompleted) {
        const existing = activityCelebrateTimers.current.get(activity.id)
        if (existing) clearTimeout(existing)

        const timer = setTimeout(() => {
          onActivityCompleted({ id: activity.id, title: activity.title })
          activityCelebrateTimers.current.delete(activity.id)
        }, 1450)

        activityCelebrateTimers.current.set(activity.id, timer)
      }
    }

    // Reorder within same column
    if (overTask && currentTask.column === overTask.column) {
      const columnTasks = freshTasks.filter((t) => t.column === currentTask.column)
      const otherTasks = freshTasks.filter((t) => t.column !== currentTask.column)

      const oldIdx = columnTasks.findIndex((t) => t.id === activeId)
      const newIdx = columnTasks.findIndex((t) => t.id === overId)

      if (oldIdx !== -1 && newIdx !== -1) {
        const reordered = arrayMove(columnTasks, oldIdx, newIdx)
        // Reconstruct full tasks array preserving order of other columns
        const newTasks: Task[] = []
        COLUMNS.forEach((col) => {
          if (col.id === currentTask.column) {
            newTasks.push(...reordered)
          } else {
            newTasks.push(...otherTasks.filter((t) => t.column === col.id))
          }
        })
        reorderTasks(newTasks)
      }
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
    >
      <InProgressBanner mode="tasks" />
      <div className="flex gap-4 md:gap-5 px-6 md:px-10 pb-8 flex-1 min-h-0 max-w-[1400px] mx-auto w-full">
        {COLUMNS.map((col, i) => {
          const colTasks = windowTasks.filter((t) => t.column === col.id)
          return (
            <Column
              key={col.id}
              column={col}
              tasks={colTasks}
              enterIndex={(i + 1) as 1 | 2 | 3}
              celebratingIds={celebratingIds}
            />
          )
        })}
      </div>

      <DragOverlay dropAnimation={{
        duration: 220,
        easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
      }}>
        {activeTask ? <DragCard task={activeTask} /> : null}
      </DragOverlay>
    </DndContext>
  )
}
