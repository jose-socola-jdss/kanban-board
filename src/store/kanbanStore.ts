import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Task, ColumnId, Activity, Priority, ViewMode } from '../types'
import { getCurrentMonthKey } from '../utils/date'

interface TaskInput {
  title: string
  description?: string
  priority: Priority
  dueDate?: string
  column: ColumnId
  activityId: string
}

interface ActivityInput {
  id?: string
  title: string
  description?: string
  dueDate?: string
  column: ColumnId
}

interface KanbanStore {
  activities: Activity[]
  tasks: Task[]
  activeView: ViewMode
  selectedMonth: string
  addActivity: (data: ActivityInput) => void
  updateActivity: (id: string, updates: Partial<Omit<Activity, 'id' | 'createdAt'>>) => void
  deleteActivity: (id: string) => void
  moveActivity: (id: string, column: ColumnId) => void
  reorderActivities: (newActivities: Activity[]) => void
  addTask: (data: TaskInput) => void
  addTasks: (dataList: TaskInput[]) => void
  updateTask: (id: string, updates: Partial<Omit<Task, 'id' | 'createdAt'>>) => void
  deleteTask: (id: string) => void
  moveTask: (id: string, column: ColumnId) => void
  reorderTasks: (newTasks: Task[]) => void
  setActiveView: (view: ViewMode) => void
  setSelectedMonth: (monthKey: string) => void
}

function createInitialData() {
  const currentMonth = getCurrentMonthKey()
  const createdAt = new Date().toISOString()
  const lastDay = new Date(
    parseInt(currentMonth.slice(0, 4)),
    parseInt(currentMonth.slice(5, 7)),
    0
  ).toISOString().slice(0, 10)

  const activities: Activity[] = [
    {
      id: 'sample-activity-1',
      title: 'Lanzar la nueva experiencia del tablero',
      description: 'Definir mejoras visuales y dejar lista la base para el sprint.',
      dueDate: lastDay,
      createdAt,
      column: 'pending',
    },
    {
      id: 'sample-activity-2',
      title: 'Ordenar el flujo de trabajo del equipo',
      description: 'Agrupar prioridades y cerrar pendientes repetitivos del mes.',
      dueDate: lastDay,
      createdAt,
      column: 'thisWeek',
    },
  ]

  const tasks: Task[] = [
    {
      id: 'sample-1',
      title: 'Revisar diseno del proyecto',
      description: 'Verificar los mockups y dar feedback al equipo de diseno.',
      priority: 'high',
      createdAt,
      column: 'pending',
      activityId: 'sample-activity-1',
    },
    {
      id: 'sample-2',
      title: 'Configurar entorno de desarrollo',
      description: 'Instalar dependencias y dejar lista la base tecnica.',
      priority: 'medium',
      createdAt,
      column: 'thisWeek',
      activityId: 'sample-activity-2',
    },
    {
      id: 'sample-3',
      title: 'Leer documentacion de la API',
      priority: 'low',
      createdAt,
      column: 'completed',
      activityId: 'sample-activity-2',
    },
  ]

  return { activities, tasks, currentMonth }
}

function mapView(view: string | undefined): ViewMode {
  if (view === 'weekly' || view === 'tasks') return 'tasks'
  if (view === 'monthly' || view === 'activities') return 'activities'
  return 'tasks'
}

/** Converts a "YYYY-MM" monthKey to the first day of that month ("YYYY-MM-01"). */
function monthKeyToDueDate(monthKey: string): string {
  return `${monthKey}-01`
}

function migrateState(persistedState: unknown) {
  const state = (persistedState ?? {}) as Record<string, unknown>
  const currentMonth = getCurrentMonthKey()

  const rawTasks = Array.isArray(state['tasks']) ? (state['tasks'] as Record<string, unknown>[]) : []
  const rawActivities: Record<string, unknown>[] = Array.isArray(state['activities'])
    ? (state['activities'] as Record<string, unknown>[])
    : Array.isArray(state['goals'])
    ? (state['goals'] as Record<string, unknown>[])
    : []
  const storedSelectedMonth = state['selectedMonth'] as string | undefined
  const storedActiveView = state['activeView'] as string | undefined

  // Migrate activities: monthKey → dueDate
  const migratedActivities: Activity[] = rawActivities.map((a) => {
    const base = { ...a } as Record<string, unknown>
    if (!base['dueDate'] && base['monthKey']) {
      base['dueDate'] = monthKeyToDueDate(base['monthKey'] as string)
    }
    delete base['monthKey']
    return base as unknown as Activity
  })

  // Migrate tasks: goalId → activityId
  const normalizedTasks = rawTasks.map((task) => {
    const t = { ...task }
    if (!t['activityId'] && t['goalId']) {
      t['activityId'] = t['goalId']
    }
    delete t['goalId']
    return t
  })

  if (normalizedTasks.some((task) => !task['activityId'])) {
    const fallbackActivityId = `migrated-activity-${currentMonth}`
    const fallbackActivity: Activity = {
      id: fallbackActivityId,
      title: 'Actividad general',
      description: 'Actividad creada automáticamente para vincular tareas existentes.',
      dueDate: monthKeyToDueDate(storedSelectedMonth ?? currentMonth),
      createdAt: new Date().toISOString(),
      column: 'pending',
    }

    return {
      ...state,
      activities: migratedActivities.length > 0 ? migratedActivities : [fallbackActivity],
      tasks: normalizedTasks.map((task) => ({
        ...task,
        activityId: task['activityId'] ?? fallbackActivityId,
      })),
      activeView: mapView(storedActiveView),
      selectedMonth: storedSelectedMonth ?? currentMonth,
    }
  }

  return {
    ...state,
    activities: migratedActivities,
    tasks: normalizedTasks as unknown as Task[],
    activeView: mapView(storedActiveView),
    selectedMonth: storedSelectedMonth ?? currentMonth,
  }
}

export const useKanbanStore = create<KanbanStore>()(
  persist(
    (set) => ({
      ...createInitialData(),
      activeView: 'tasks',
      selectedMonth: getCurrentMonthKey(),

      addActivity: (data) =>
        set((state) => ({
          activities: [
            ...state.activities,
            {
              ...data,
              id: data.id ?? crypto.randomUUID(),
              createdAt: new Date().toISOString(),
            },
          ],
        })),

      updateActivity: (id, updates) =>
        set((state) => ({
          activities: state.activities.map((a) => (a.id === id ? { ...a, ...updates } : a)),
        })),

      deleteActivity: (id) =>
        set((state) => ({
          activities: state.activities.filter((a) => a.id !== id),
          tasks: state.tasks.filter((task) => task.activityId !== id),
        })),

      moveActivity: (id, column) =>
        set((state) => ({
          activities: state.activities.map((a) =>
            a.id === id
              ? { ...a, column, completedAt: column === 'completed' ? new Date().toISOString() : undefined }
              : a
          ),
        })),

      reorderActivities: (newActivities) => set({ activities: newActivities }),

      addTask: (data) =>
        set((state) => ({
          tasks: [
            ...state.tasks,
            {
              ...data,
              id: crypto.randomUUID(),
              createdAt: new Date().toISOString(),
            },
          ],
        })),

      addTasks: (dataList) =>
        set((state) => ({
          tasks: [
            ...state.tasks,
            ...dataList.map((data) => ({
              ...data,
              id: crypto.randomUUID(),
              createdAt: new Date().toISOString(),
            })),
          ],
        })),

      updateTask: (id, updates) =>
        set((state) => {
          const now = new Date().toISOString()
          const enriched = updates.column !== undefined
            ? { ...updates, completedAt: updates.column === 'completed' ? now : undefined }
            : updates
          const newTasks = state.tasks.map((t) => (t.id === id ? { ...t, ...enriched } : t))
          if (!updates.column) return { tasks: newTasks }
          const updated = newTasks.find((t) => t.id === id)
          if (!updated) return { tasks: newTasks }
          const activityTasks = newTasks.filter((t) => t.activityId === updated.activityId)
          const allDone = activityTasks.length > 0 && activityTasks.every((t) => t.column === 'completed')
          const activity = state.activities.find((a) => a.id === updated.activityId)
          if (allDone && activity && activity.column !== 'completed') {
            return {
              tasks: newTasks,
              activities: state.activities.map((a) =>
                a.id === updated.activityId ? { ...a, column: 'completed' as ColumnId, completedAt: now } : a
              ),
            }
          }
          return { tasks: newTasks }
        }),

      deleteTask: (id) =>
        set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== id),
        })),

      moveTask: (id, column) =>
        set((state) => {
          const now = new Date().toISOString()
          const newTasks = state.tasks.map((t) =>
            t.id === id
              ? { ...t, column, completedAt: column === 'completed' ? now : undefined }
              : t
          )
          const moved = newTasks.find((t) => t.id === id)
          if (!moved) return { tasks: newTasks }
          const activityTasks = newTasks.filter((t) => t.activityId === moved.activityId)
          const allDone = activityTasks.length > 0 && activityTasks.every((t) => t.column === 'completed')
          const activity = state.activities.find((a) => a.id === moved.activityId)
          if (allDone && activity && activity.column !== 'completed') {
            return {
              tasks: newTasks,
              activities: state.activities.map((a) =>
                a.id === moved.activityId ? { ...a, column: 'completed' as ColumnId, completedAt: now } : a
              ),
            }
          }
          return { tasks: newTasks }
        }),

      reorderTasks: (newTasks) => set({ tasks: newTasks }),

      setActiveView: (activeView) => set({ activeView }),

      setSelectedMonth: (selectedMonth) => set({ selectedMonth }),
    }),
    {
      name: 'kanban-board-v1',
      version: 4,
      migrate: (persistedState, version) => {
        if (version < 4) {
          return migrateState(persistedState) as KanbanStore
        }
        const ps = persistedState as Partial<KanbanStore>
        return {
          ...ps,
          activeView: mapView(ps?.activeView),
          selectedMonth: ps?.selectedMonth ?? getCurrentMonthKey(),
        } as KanbanStore
      },
    }
  )
)
