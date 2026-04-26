import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Task, ColumnId, Activity, Priority, ViewMode, SchedulingType, RecurringType } from '../types'
import { getCurrentMonthKey, getNextOccurrence } from '../utils/date'
import { db } from '../lib/db'

interface TaskInput {
  title: string
  description?: string
  priority: Priority
  dueDate?: string
  column: ColumnId
  activityId?: string
  schedulingType?: SchedulingType
  recurringType?: RecurringType
  recurringWeekDay?: number
  recurringMonthDay?: number
  recurringEndDate?: string
  scheduledStart?: string
  scheduledEnd?: string
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
  userId: string | null
  isLoading: boolean
  activeTaskId: string | null
  activeTaskStartedAt: number | null
  loadUserData: (userId: string) => Promise<void>
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
  startTask: (id: string) => void
  stopTask: () => void
}

export const useKanbanStore = create<KanbanStore>()(
  persist(
    (set, get) => ({
  activities: [],
  tasks: [],
  activeView: 'tasks',
  selectedMonth: getCurrentMonthKey(),
  userId: null,
  isLoading: false,
  activeTaskId: null,
  activeTaskStartedAt: null,

  loadUserData: async (userId) => {
    const { tasks, activities } = get()
    const isInitialLoad = tasks.length === 0 && activities.length === 0
    set({ isLoading: isInitialLoad, userId })
    try {
      let [activities, tasks] = await Promise.all([
        db.getActivities(userId),
        db.getTasks(userId),
      ])
      // Auto-reset recurring tasks completed more than 1 day ago that still have future occurrences
      const oneDayAgo = new Date(); oneDayAgo.setDate(oneDayAgo.getDate() - 1)
      const toReset = tasks.filter((t) => {
        if (t.schedulingType !== 'recurring' || t.column !== 'completed') return false
        if (!t.completedAt || new Date(t.completedAt) >= oneDayAgo) return false
        const next = getNextOccurrence(t)
        if (!next) return false
        if (t.recurringEndDate && next > new Date(t.recurringEndDate + 'T00:00:00')) return false
        return true
      })
      if (toReset.length > 0) {
        tasks = tasks.map((t) => toReset.some((r) => r.id === t.id)
          ? { ...t, column: 'pending' as ColumnId, completedAt: undefined } : t)
        await Promise.all(toReset.map((t) =>
          db.updateTask(t.id, { column: 'pending' as ColumnId, completedAt: undefined }, userId).catch(console.error)
        ))
      }

      // Auto-move tasks with dueDate === today from 'pending' to 'thisWeek'
      const todayStr = new Date().toISOString().slice(0, 10)
      const toMoveToday = tasks.filter((t) =>
        t.column === 'pending' && t.dueDate === todayStr
      )
      if (toMoveToday.length > 0) {
        tasks = tasks.map((t) =>
          toMoveToday.some((r) => r.id === t.id)
            ? { ...t, column: 'thisWeek' as ColumnId }
            : t
        )
        await Promise.all(toMoveToday.map((t) =>
          db.updateTask(t.id, { column: 'thisWeek' as ColumnId }, userId).catch(console.error)
        ))
      }

      // Sync active task from DB tags
      const activeTaskFromDb = tasks.find(t => t.tags?.some(tag => tag.startsWith('__ACTIVE_TASK:')))
      const newActiveTaskId = activeTaskFromDb ? activeTaskFromDb.id : null
      let newActiveTaskStartedAt = null
      if (activeTaskFromDb) {
        const tagStr = activeTaskFromDb.tags!.find(tag => tag.startsWith('__ACTIVE_TASK:'))!
        newActiveTaskStartedAt = parseInt(tagStr.split(':')[1], 10) || Date.now()
      }

      set({ 
        activities, 
        tasks, 
        activeTaskId: newActiveTaskId,
        activeTaskStartedAt: newActiveTaskStartedAt,
        isLoading: false 
      })
    } catch (err) {
      console.error('Error cargando datos:', err)
      set({ isLoading: false })
    }
  },

  addActivity: (data) => {
    const { userId, activities } = get()
    if (!userId) return
    const newActivity: Activity = {
      ...data,
      id: data.id ?? crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    }
    set({ activities: [...activities, newActivity] })
    db.insertActivity(newActivity, userId, activities.length).catch((err) => {
      console.error(err)
      alert('Error al guardar actividad: ' + err.message)
    })
  },

  updateActivity: (id, updates) => {
    const { userId } = get()
    if (!userId) return
    set((state) => ({
      activities: state.activities.map((a) => (a.id === id ? { ...a, ...updates } : a)),
    }))
    db.updateActivity(id, updates, userId).catch((err) => {
      console.error(err)
      alert('Error al actualizar actividad: ' + err.message)
    })
  },

  deleteActivity: (id) => {
    const { userId } = get()
    if (!userId) return
    set((state) => ({
      activities: state.activities.filter((a) => a.id !== id),
      tasks: state.tasks.filter((t) => t.activityId !== id),
    }))
    db.deleteActivity(id, userId).catch((err) => {
      console.error(err)
      alert('Error al eliminar actividad: ' + err.message)
    })
  },

  moveActivity: (id, column) => {
    const { userId } = get()
    if (!userId) return
    const completedAt = column === 'completed' ? new Date().toISOString() : undefined
    set((state) => ({
      activities: state.activities.map((a) =>
        a.id === id ? { ...a, column, completedAt } : a,
      ),
    }))
    db.updateActivity(id, { column, completedAt }, userId).catch((err) => {
      console.error(err)
      alert('Error al mover actividad: ' + err.message)
    })
  },

  reorderActivities: (newActivities) => {
    const { userId } = get()
    if (!userId) return
    set({ activities: newActivities })
    db.reorderActivities(newActivities, userId).catch((err) => {
      console.error(err)
      alert('Error al reordenar actividades: ' + err.message)
    })
  },

  addTask: (data) => {
    const { userId, tasks } = get()
    if (!userId) return
    const newTask: Task = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    }
    set({ tasks: [...tasks, newTask] })
    db.insertTask(newTask, userId, tasks.length).catch((err) => {
      console.error(err)
      alert('Error al guardar tarea: ' + err.message)
    })
  },

  addTasks: (dataList) => {
    const { userId, tasks } = get()
    if (!userId) return
    const newTasks: Task[] = dataList.map((data) => ({
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    }))
    const startPos = tasks.length
    set({ tasks: [...tasks, ...newTasks] })
    db.insertTasks(newTasks, userId, startPos).catch((err) => {
      console.error(err)
      alert('Error al guardar tareas: ' + err.message)
    })
  },

  updateTask: (id, updates) => {
    const { userId, activeTaskId } = get()
    if (!userId) return
    const now = new Date().toISOString()
    const enriched = updates.column !== undefined
      ? { ...updates, completedAt: updates.column === 'completed' ? now : undefined }
      : updates

    // Clear active task if it's completed or moved away from thisWeek
    const clearsActive = activeTaskId === id && updates.column !== undefined && updates.column !== 'thisWeek'
    if (clearsActive) {
      const current = get().tasks.find((t) => t.id === id)
      if (current) {
        enriched.tags = current.tags?.filter((t) => !t.startsWith('__ACTIVE_TASK:')) || []
      }
    }

    set((state) => {
      const newTasks = state.tasks.map((t) => (t.id === id ? { ...t, ...enriched } : t))
      const stateUpdate: Partial<KanbanStore> = { tasks: newTasks }
      if (clearsActive) {
        stateUpdate.activeTaskId = null
        stateUpdate.activeTaskStartedAt = null
      }
      if (!updates.column) return stateUpdate
      const updated = newTasks.find((t) => t.id === id)
      if (!updated || !updated.activityId) return stateUpdate
      const activityTasks = newTasks.filter((t) => t.activityId === updated.activityId)
      const allDone = activityTasks.length > 0 && activityTasks.every((t) => t.column === 'completed')
      const activity = state.activities.find((a) => a.id === updated.activityId)
      if (allDone && activity && activity.column !== 'completed') {
        const completedAt = now
        db.updateActivity(activity.id, { column: 'completed' as ColumnId, completedAt }, userId).catch(console.error)
        return {
          ...stateUpdate,
          activities: state.activities.map((a) =>
            a.id === updated.activityId ? { ...a, column: 'completed' as ColumnId, completedAt } : a,
          ),
        }
      }
      return stateUpdate
    })
    db.updateTask(id, enriched, userId).catch((err) => {
      console.error(err)
      alert('Error al actualizar tarea: ' + err.message)
    })
  },

  deleteTask: (id) => {
    const { userId, activeTaskId } = get()
    if (!userId) return
    const clearsActive = activeTaskId === id
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== id),
      ...(clearsActive ? { activeTaskId: null, activeTaskStartedAt: null } : {}),
    }))
    db.deleteTask(id, userId).catch((err) => {
      console.error(err)
      alert('Error al eliminar tarea: ' + err.message)
    })
  },

  moveTask: (id, column) => {
    const { userId, activeTaskId } = get()
    if (!userId) return
    const now = new Date().toISOString()
    const completedAt = column === 'completed' ? now : undefined
    const clearsActive = activeTaskId === id && column !== 'thisWeek'
    let finalTags: string[] | undefined
    if (clearsActive) {
      const current = get().tasks.find((t) => t.id === id)
      if (current) {
        finalTags = current.tags?.filter((t) => !t.startsWith('__ACTIVE_TASK:')) || []
      }
    }

    set((state) => {
      const newTasks = state.tasks.map((t) =>
        t.id === id ? { ...t, column, completedAt, ...(finalTags ? { tags: finalTags } : {}) } : t,
      )
      const stateUpdate: Partial<KanbanStore> = { tasks: newTasks }
      if (clearsActive) {
        stateUpdate.activeTaskId = null
        stateUpdate.activeTaskStartedAt = null
      }
      const moved = newTasks.find((t) => t.id === id)
      if (!moved || !moved.activityId) return stateUpdate
      const activityTasks = newTasks.filter((t) => t.activityId === moved.activityId)
      const allDone = activityTasks.length > 0 && activityTasks.every((t) => t.column === 'completed')
      const activity = state.activities.find((a) => a.id === moved.activityId)
      if (allDone && activity && activity.column !== 'completed') {
        db.updateActivity(activity.id, { column: 'completed' as ColumnId, completedAt: now }, userId).catch(console.error)
        return {
          ...stateUpdate,
          activities: state.activities.map((a) =>
            a.id === moved.activityId ? { ...a, column: 'completed' as ColumnId, completedAt: now } : a,
          ),
        }
      }
      return stateUpdate
    })
    db.updateTask(id, { column, completedAt, ...(finalTags ? { tags: finalTags } : {}) }, userId).catch((err) => {
      console.error(err)
      alert('Error al mover tarea: ' + err.message)
    })
  },

  reorderTasks: (newTasks) => {
    const { userId } = get()
    if (!userId) return
    set({ tasks: newTasks })
    db.reorderTasks(newTasks, userId).catch((err) => {
      console.error(err)
      alert('Error al reordenar tareas: ' + err.message)
    })
  },

  setActiveView: (activeView) => set({ activeView }),
  setSelectedMonth: (selectedMonth) => set({ selectedMonth }),

  startTask: (id) => {
    const { userId, tasks, activeTaskId } = get()
    if (!userId) return
    const now = Date.now()
    const activeTag = `__ACTIVE_TASK:${now}__`
    
    set({ activeTaskId: id, activeTaskStartedAt: now })

    // Clear tag from previously active task if any
    if (activeTaskId && activeTaskId !== id) {
      const prev = tasks.find(t => t.id === activeTaskId)
      if (prev) {
        const newTags = prev.tags?.filter(t => !t.startsWith('__ACTIVE_TASK:')) || []
        get().updateTask(prev.id, { tags: newTags })
      }
    }
    
    // Add tag to new active task
    const current = tasks.find(t => t.id === id)
    if (current) {
      const currentTags = current.tags?.filter(t => !t.startsWith('__ACTIVE_TASK:')) || []
      get().updateTask(id, { tags: [...currentTags, activeTag] })
    }
  },

  stopTask: () => {
    const { activeTaskId, tasks } = get()
    const currentActiveId = activeTaskId
    set({ activeTaskId: null, activeTaskStartedAt: null })
    
    if (currentActiveId) {
      const prev = tasks.find(t => t.id === currentActiveId)
      if (prev) {
        const newTags = prev.tags?.filter(t => !t.startsWith('__ACTIVE_TASK:')) || []
        get().updateTask(prev.id, { tags: newTags })
      }
    }
  },
    }),
    {
      name: 'kanban-storage',
      // Solo persistimos lo esencial, evitamos persistir estados de carga o el userId
      // para que se manejen correctamente en el arranque
      partialize: (state) => ({
        activities: state.activities,
        tasks: state.tasks,
        activeView: state.activeView,
        selectedMonth: state.selectedMonth,
        activeTaskId: state.activeTaskId,
        activeTaskStartedAt: state.activeTaskStartedAt,
      }),
    }
  )
)
