import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  Activity,
  BusinessDayAdjustment,
  ColumnId,
  Holiday,
  Priority,
  RecurringType,
  SchedulingType,
  Task,
  ViewMode,
} from '../types'
import {
  getCurrentMonthKey,
  isTaskDueOnDate,
  shouldResetRecurringTask,
} from '../utils/date'
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
  recurrenceInterval?: number
  recurrenceOrdinal?: number
  recurrenceMonth?: number
  recurrenceBusinessDayAdjustment?: BusinessDayAdjustment
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

interface HolidayInput {
  name: string
  date: string
}

interface KanbanStore {
  activities: Activity[]
  tasks: Task[]
  holidays: Holiday[]
  holidaysAvailable: boolean
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
  addHoliday: (data: HolidayInput) => void
  updateHoliday: (id: string, updates: Partial<Pick<Holiday, 'name' | 'date'>>) => void
  deleteHoliday: (id: string) => void
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
      holidays: [],
      holidaysAvailable: true,
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
          const [activitiesResult, tasksResult, holidaysResult] = await Promise.allSettled([
            db.getActivities(userId),
            db.getTasks(userId),
            db.getHolidays(userId),
          ])

          if (activitiesResult.status !== 'fulfilled') throw activitiesResult.reason
          if (tasksResult.status !== 'fulfilled') throw tasksResult.reason

          let nextActivities = activitiesResult.value
          let nextTasks = tasksResult.value
          const nextHolidays = holidaysResult.status === 'fulfilled' ? holidaysResult.value : []
          const holidaysAvailable = holidaysResult.status === 'fulfilled'

          if (holidaysResult.status === 'rejected') {
            console.warn('No se pudo cargar la tabla holidays:', holidaysResult.reason)
          }

          const recurringToReset = nextTasks.filter((task) => shouldResetRecurringTask(task, nextHolidays))
          if (recurringToReset.length > 0) {
            nextTasks = nextTasks.map((task) => (
              recurringToReset.some((candidate) => candidate.id === task.id)
                ? { ...task, column: 'pending' as ColumnId, completedAt: undefined }
                : task
            ))

            await Promise.all(recurringToReset.map((task) =>
              db.updateTask(task.id, { column: 'pending' as ColumnId, completedAt: undefined }, userId).catch(console.error),
            ))
          }

          const today = new Date()
          const todayStr = today.toISOString().slice(0, 10)
          const toMoveToday = nextTasks.filter((task) => {
            if (task.column !== 'pending') return false
            if (task.schedulingType === 'recurring') return isTaskDueOnDate(task, today, nextHolidays)
            if (task.schedulingType === 'fixed') return task.dueDate === todayStr
            return (!!task.dueDate && task.dueDate <= todayStr)
          })

          if (toMoveToday.length > 0) {
            nextTasks = nextTasks.map((task) => (
              toMoveToday.some((candidate) => candidate.id === task.id)
                ? { ...task, column: 'thisWeek' as ColumnId }
                : task
            ))

            await Promise.all(toMoveToday.map((task) =>
              db.updateTask(task.id, { column: 'thisWeek' as ColumnId }, userId).catch(console.error),
            ))
          }

          const activeTaskFromDb = nextTasks.find((task) => task.tags?.some((tag) => tag.startsWith('__ACTIVE_TASK:')))
          const newActiveTaskId = activeTaskFromDb ? activeTaskFromDb.id : null
          let newActiveTaskStartedAt = null

          if (activeTaskFromDb) {
            const tagStr = activeTaskFromDb.tags?.find((tag) => tag.startsWith('__ACTIVE_TASK:'))
            newActiveTaskStartedAt = tagStr ? parseInt(tagStr.split(':')[1], 10) || Date.now() : Date.now()
          }

          set({
            activities: nextActivities,
            tasks: nextTasks,
            holidays: nextHolidays,
            holidaysAvailable,
            activeTaskId: newActiveTaskId,
            activeTaskStartedAt: newActiveTaskStartedAt,
            isLoading: false,
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
          activities: state.activities.map((activity) => (activity.id === id ? { ...activity, ...updates } : activity)),
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
          activities: state.activities.filter((activity) => activity.id !== id),
          tasks: state.tasks.filter((task) => task.activityId !== id),
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
          activities: state.activities.map((activity) => (
            activity.id === id ? { ...activity, column, completedAt } : activity
          )),
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
        const currentTask = get().tasks.find((task) => task.id === id)
        const hasRecurrenceMetadataUpdate = (
          'recurrenceInterval' in updates
          || 'recurrenceOrdinal' in updates
          || 'recurrenceMonth' in updates
          || 'recurrenceBusinessDayAdjustment' in updates
        )
        const enriched = updates.column !== undefined
          ? { ...updates, completedAt: updates.column === 'completed' ? now : undefined }
          : updates

        if (hasRecurrenceMetadataUpdate && enriched.tags === undefined && currentTask?.tags) {
          enriched.tags = currentTask.tags
        }

        const clearsActive = activeTaskId === id && updates.column !== undefined && updates.column !== 'thisWeek'
        if (clearsActive) {
          const current = currentTask
          if (current) {
            enriched.tags = current.tags?.filter((tag) => !tag.startsWith('__ACTIVE_TASK:')) || []
          }
        }

        set((state) => {
          const newTasks = state.tasks.map((task) => (task.id === id ? { ...task, ...enriched } : task))
          const stateUpdate: Partial<KanbanStore> = { tasks: newTasks }

          if (clearsActive) {
            stateUpdate.activeTaskId = null
            stateUpdate.activeTaskStartedAt = null
          }

          if (!updates.column) return stateUpdate

          const updated = newTasks.find((task) => task.id === id)
          if (!updated || !updated.activityId) return stateUpdate

          const activityTasks = newTasks.filter((task) => task.activityId === updated.activityId)
          const allDone = activityTasks.length > 0 && activityTasks.every((task) => task.column === 'completed')
          const activity = state.activities.find((item) => item.id === updated.activityId)

          if (allDone && activity && activity.column !== 'completed') {
            const completedAt = now
            db.updateActivity(activity.id, { column: 'completed' as ColumnId, completedAt }, userId).catch(console.error)
            return {
              ...stateUpdate,
              activities: state.activities.map((item) => (
                item.id === updated.activityId ? { ...item, column: 'completed' as ColumnId, completedAt } : item
              )),
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
          tasks: state.tasks.filter((task) => task.id !== id),
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
          const current = get().tasks.find((task) => task.id === id)
          if (current) {
            finalTags = current.tags?.filter((tag) => !tag.startsWith('__ACTIVE_TASK:')) || []
          }
        }

        set((state) => {
          const newTasks = state.tasks.map((task) => (
            task.id === id ? { ...task, column, completedAt, ...(finalTags ? { tags: finalTags } : {}) } : task
          ))
          const stateUpdate: Partial<KanbanStore> = { tasks: newTasks }

          if (clearsActive) {
            stateUpdate.activeTaskId = null
            stateUpdate.activeTaskStartedAt = null
          }

          const moved = newTasks.find((task) => task.id === id)
          if (!moved || !moved.activityId) return stateUpdate

          const activityTasks = newTasks.filter((task) => task.activityId === moved.activityId)
          const allDone = activityTasks.length > 0 && activityTasks.every((task) => task.column === 'completed')
          const activity = state.activities.find((item) => item.id === moved.activityId)

          if (allDone && activity && activity.column !== 'completed') {
            db.updateActivity(activity.id, { column: 'completed' as ColumnId, completedAt: now }, userId).catch(console.error)
            return {
              ...stateUpdate,
              activities: state.activities.map((item) => (
                item.id === moved.activityId ? { ...item, column: 'completed' as ColumnId, completedAt: now } : item
              )),
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

      addHoliday: (data) => {
        const { userId, holidays, holidaysAvailable } = get()
        if (!userId) return
        const holiday: Holiday = {
          id: crypto.randomUUID(),
          name: data.name,
          date: data.date,
          createdAt: new Date().toISOString(),
        }
        set({ holidays: [...holidays, holiday].sort((a, b) => a.date.localeCompare(b.date)) })
        db.insertHoliday(holiday, userId).catch((err) => {
          console.error(err)
          if (!holidaysAvailable) {
            alert('La tabla holidays no existe en Supabase. Aplica la migración incluida en el repositorio.')
            return
          }
          alert('Error al guardar feriado: ' + err.message)
        })
      },

      updateHoliday: (id, updates) => {
        const { userId, holidaysAvailable } = get()
        if (!userId) return
        set((state) => ({
          holidays: state.holidays
            .map((holiday) => (holiday.id === id ? { ...holiday, ...updates } : holiday))
            .sort((a, b) => a.date.localeCompare(b.date)),
        }))
        db.updateHoliday(id, updates, userId).catch((err) => {
          console.error(err)
          if (!holidaysAvailable) {
            alert('La tabla holidays no existe en Supabase. Aplica la migración incluida en el repositorio.')
            return
          }
          alert('Error al actualizar feriado: ' + err.message)
        })
      },

      deleteHoliday: (id) => {
        const { userId, holidaysAvailable } = get()
        if (!userId) return
        set((state) => ({ holidays: state.holidays.filter((holiday) => holiday.id !== id) }))
        db.deleteHoliday(id, userId).catch((err) => {
          console.error(err)
          if (!holidaysAvailable) {
            alert('La tabla holidays no existe en Supabase. Aplica la migración incluida en el repositorio.')
            return
          }
          alert('Error al eliminar feriado: ' + err.message)
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

        if (activeTaskId && activeTaskId !== id) {
          const previous = tasks.find((task) => task.id === activeTaskId)
          if (previous) {
            const newTags = previous.tags?.filter((tag) => !tag.startsWith('__ACTIVE_TASK:')) || []
            get().updateTask(previous.id, { tags: newTags })
          }
        }

        const current = tasks.find((task) => task.id === id)
        if (current) {
          const currentTags = current.tags?.filter((tag) => !tag.startsWith('__ACTIVE_TASK:')) || []
          get().updateTask(id, { tags: [...currentTags, activeTag] })
        }
      },

      stopTask: () => {
        const { activeTaskId, tasks } = get()
        const currentActiveId = activeTaskId
        set({ activeTaskId: null, activeTaskStartedAt: null })

        if (currentActiveId) {
          const previous = tasks.find((task) => task.id === currentActiveId)
          if (previous) {
            const newTags = previous.tags?.filter((tag) => !tag.startsWith('__ACTIVE_TASK:')) || []
            get().updateTask(previous.id, { tags: newTags })
          }
        }
      },
    }),
    {
      name: 'kanban-storage',
      partialize: (state) => ({
        activities: state.activities,
        tasks: state.tasks,
        holidays: state.holidays,
        holidaysAvailable: state.holidaysAvailable,
        activeView: state.activeView,
        selectedMonth: state.selectedMonth,
        activeTaskId: state.activeTaskId,
        activeTaskStartedAt: state.activeTaskStartedAt,
      }),
    },
  ),
)
