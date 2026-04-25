import { create } from 'zustand'
import type { Task, ColumnId, Activity, Priority, ViewMode } from '../types'
import { getCurrentMonthKey } from '../utils/date'
import { db } from '../lib/db'

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
  userId: string | null
  isLoading: boolean
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
}

export const useKanbanStore = create<KanbanStore>()((set, get) => ({
  activities: [],
  tasks: [],
  activeView: 'tasks',
  selectedMonth: getCurrentMonthKey(),
  userId: null,
  isLoading: false,

  // ── Carga inicial desde Supabase ───────────────────────────────────────────

  loadUserData: async (userId) => {
    set({ isLoading: true, userId })
    try {
      const [activities, tasks] = await Promise.all([
        db.getActivities(userId),
        db.getTasks(userId),
      ])
      set({ activities, tasks, isLoading: false })
    } catch (err) {
      console.error('Error cargando datos:', err)
      set({ isLoading: false })
    }
  },

  // ── Actividades ────────────────────────────────────────────────────────────

  addActivity: (data) => {
    const { userId, activities } = get()
    if (!userId) return
    const newActivity: Activity = {
      ...data,
      id: data.id ?? crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    }
    set({ activities: [...activities, newActivity] })
    db.insertActivity(newActivity, userId, activities.length).catch(console.error)
  },

  updateActivity: (id, updates) => {
    const { userId } = get()
    if (!userId) return
    set((state) => ({
      activities: state.activities.map((a) => (a.id === id ? { ...a, ...updates } : a)),
    }))
    db.updateActivity(id, updates, userId).catch(console.error)
  },

  deleteActivity: (id) => {
    const { userId } = get()
    if (!userId) return
    set((state) => ({
      activities: state.activities.filter((a) => a.id !== id),
      tasks: state.tasks.filter((t) => t.activityId !== id),
    }))
    db.deleteActivity(id, userId).catch(console.error)
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
    db.updateActivity(id, { column, completedAt }, userId).catch(console.error)
  },

  reorderActivities: (newActivities) => {
    const { userId } = get()
    if (!userId) return
    set({ activities: newActivities })
    db.reorderActivities(newActivities, userId).catch(console.error)
  },

  // ── Tareas ─────────────────────────────────────────────────────────────────

  addTask: (data) => {
    const { userId, tasks } = get()
    if (!userId) return
    const newTask: Task = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    }
    set({ tasks: [...tasks, newTask] })
    db.insertTask(newTask, userId, tasks.length).catch(console.error)
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
    db.insertTasks(newTasks, userId, startPos).catch(console.error)
  },

  updateTask: (id, updates) => {
    const { userId } = get()
    if (!userId) return
    const now = new Date().toISOString()
    const enriched = updates.column !== undefined
      ? { ...updates, completedAt: updates.column === 'completed' ? now : undefined }
      : updates

    set((state) => {
      const newTasks = state.tasks.map((t) => (t.id === id ? { ...t, ...enriched } : t))
      if (!updates.column) return { tasks: newTasks }
      const updated = newTasks.find((t) => t.id === id)
      if (!updated) return { tasks: newTasks }
      const activityTasks = newTasks.filter((t) => t.activityId === updated.activityId)
      const allDone = activityTasks.length > 0 && activityTasks.every((t) => t.column === 'completed')
      const activity = state.activities.find((a) => a.id === updated.activityId)
      if (allDone && activity && activity.column !== 'completed') {
        const completedAt = now
        db.updateActivity(activity.id, { column: 'completed' as ColumnId, completedAt }, userId).catch(console.error)
        return {
          tasks: newTasks,
          activities: state.activities.map((a) =>
            a.id === updated.activityId ? { ...a, column: 'completed' as ColumnId, completedAt } : a,
          ),
        }
      }
      return { tasks: newTasks }
    })
    db.updateTask(id, enriched, userId).catch(console.error)
  },

  deleteTask: (id) => {
    const { userId } = get()
    if (!userId) return
    set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) }))
    db.deleteTask(id, userId).catch(console.error)
  },

  moveTask: (id, column) => {
    const { userId } = get()
    if (!userId) return
    const now = new Date().toISOString()
    const completedAt = column === 'completed' ? now : undefined

    set((state) => {
      const newTasks = state.tasks.map((t) =>
        t.id === id ? { ...t, column, completedAt } : t,
      )
      const moved = newTasks.find((t) => t.id === id)
      if (!moved) return { tasks: newTasks }
      const activityTasks = newTasks.filter((t) => t.activityId === moved.activityId)
      const allDone = activityTasks.length > 0 && activityTasks.every((t) => t.column === 'completed')
      const activity = state.activities.find((a) => a.id === moved.activityId)
      if (allDone && activity && activity.column !== 'completed') {
        db.updateActivity(activity.id, { column: 'completed' as ColumnId, completedAt: now }, userId).catch(console.error)
        return {
          tasks: newTasks,
          activities: state.activities.map((a) =>
            a.id === moved.activityId ? { ...a, column: 'completed' as ColumnId, completedAt: now } : a,
          ),
        }
      }
      return { tasks: newTasks }
    })
    db.updateTask(id, { column, completedAt }, userId).catch(console.error)
  },

  reorderTasks: (newTasks) => {
    const { userId } = get()
    if (!userId) return
    set({ tasks: newTasks })
    db.reorderTasks(newTasks, userId).catch(console.error)
  },

  setActiveView: (activeView) => set({ activeView }),
  setSelectedMonth: (selectedMonth) => set({ selectedMonth }),
}))
