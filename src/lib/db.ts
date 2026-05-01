import { supabase } from './supabase'
import type { Activity, Task, ColumnId, Holiday } from '../types'

const RECURRENCE_CONFIG_TAG_PREFIX = '__RECURRENCE_CONFIG:'

interface RecurrenceConfigTag {
  recurrenceInterval?: number
  recurrenceOrdinal?: number
  recurrenceMonth?: number
  recurrenceBusinessDayAdjustment?: Task['recurrenceBusinessDayAdjustment']
}

// ─── Row shapes returned by Supabase (snake_case) ─────────────────────────────

interface ActivityRow {
  id: string
  user_id: string
  title: string
  description: string | null
  due_date: string | null
  completed_at: string | null
  created_at: string
  status: ColumnId
  position: number
}

interface TaskRow {
  id: string
  user_id: string
  activity_id: string | null
  title: string
  description: string | null
  priority: 'low' | 'medium' | 'high'
  due_date: string | null
  completed_at: string | null
  created_at: string
  status: ColumnId
  position: number
  tags: string[] | null
  scheduling_type: string | null
  recurring_type: string | null
  recurring_week_day: number | null
  recurring_month_day: number | null
  recurring_end_date: string | null
  scheduled_start: string | null
  scheduled_end: string | null
}

interface HolidayRow {
  id: string
  user_id: string
  name: string
  date: string
  created_at: string
}

// ─── Mappers (DB ↔ TypeScript) ────────────────────────────────────────────────

function toActivity(r: ActivityRow): Activity {
  return {
    id: r.id,
    title: r.title,
    description: r.description ?? undefined,
    dueDate: r.due_date ?? undefined,
    completedAt: r.completed_at ?? undefined,
    createdAt: r.created_at,
    column: r.status,
  }
}

function parseRecurrenceConfig(tags: string[] | null): RecurrenceConfigTag {
  const encoded = tags?.find((tag) => tag.startsWith(RECURRENCE_CONFIG_TAG_PREFIX))
  if (!encoded) return {}
  try {
    return JSON.parse(decodeURIComponent(encoded.slice(RECURRENCE_CONFIG_TAG_PREFIX.length))) as RecurrenceConfigTag
  } catch {
    return {}
  }
}

function attachRecurrenceConfig(tags: string[] | undefined, task: Partial<Task>): string[] | undefined {
  const baseTags = (tags ?? []).filter((tag) => !tag.startsWith(RECURRENCE_CONFIG_TAG_PREFIX))
  const config: RecurrenceConfigTag = {}

  if (task.recurrenceInterval !== undefined) config.recurrenceInterval = task.recurrenceInterval
  if (task.recurrenceOrdinal !== undefined) config.recurrenceOrdinal = task.recurrenceOrdinal
  if (task.recurrenceMonth !== undefined) config.recurrenceMonth = task.recurrenceMonth
  if (task.recurrenceBusinessDayAdjustment !== undefined) {
    config.recurrenceBusinessDayAdjustment = task.recurrenceBusinessDayAdjustment
  }

  if (Object.keys(config).length === 0) {
    return baseTags.length > 0 ? baseTags : undefined
  }

  return [...baseTags, `${RECURRENCE_CONFIG_TAG_PREFIX}${encodeURIComponent(JSON.stringify(config))}`]
}

function toTask(r: TaskRow): Task {
  const recurrenceConfig = parseRecurrenceConfig(r.tags)
  return {
    id: r.id,
    activityId: r.activity_id ?? undefined,
    title: r.title,
    description: r.description ?? undefined,
    priority: r.priority,
    dueDate: r.due_date ?? undefined,
    completedAt: r.completed_at ?? undefined,
    createdAt: r.created_at,
    column: r.status,
    tags: r.tags ?? undefined,
    schedulingType: (r.scheduling_type as any) ?? (r.due_date ? 'fixed' : undefined),
    recurringType: (r.recurring_type as any) ?? undefined,
    recurringWeekDay: r.recurring_week_day ?? undefined,
    recurringMonthDay: r.recurring_month_day ?? undefined,
    recurringEndDate: r.recurring_end_date ?? undefined,
    recurrenceInterval: recurrenceConfig.recurrenceInterval,
    recurrenceOrdinal: recurrenceConfig.recurrenceOrdinal,
    recurrenceMonth: recurrenceConfig.recurrenceMonth,
    recurrenceBusinessDayAdjustment: recurrenceConfig.recurrenceBusinessDayAdjustment,
    scheduledStart: r.scheduled_start ?? undefined,
    scheduledEnd: r.scheduled_end ?? undefined,
  }
}

function toHoliday(r: HolidayRow): Holiday {
  return {
    id: r.id,
    name: r.name,
    date: r.date,
    createdAt: r.created_at,
  }
}

function fromActivity(a: Activity, userId: string, position: number) {
  return {
    id: a.id,
    user_id: userId,
    title: a.title,
    description: a.description ?? null,
    due_date: a.dueDate ?? null,
    completed_at: a.completedAt ?? null,
    created_at: a.createdAt,
    status: a.column,
    position,
  }
}

function fromTask(t: Task, userId: string, position: number) {
  const tags = attachRecurrenceConfig(t.tags, t)
  return {
    id: t.id,
    user_id: userId,
    activity_id: t.activityId ?? null,
    title: t.title,
    description: t.description ?? null,
    priority: t.priority,
    due_date: t.dueDate ?? null,
    completed_at: t.completedAt ?? null,
    created_at: t.createdAt,
    status: t.column,
    position,
    tags: tags ?? null,
    scheduling_type: t.schedulingType ?? null,
    recurring_type: t.recurringType ?? null,
    recurring_week_day: t.recurringWeekDay ?? null,
    recurring_month_day: t.recurringMonthDay ?? null,
    recurring_end_date: t.recurringEndDate ?? null,
    scheduled_start: t.scheduledStart ?? null,
    scheduled_end: t.scheduledEnd ?? null,
  }
}

// ─── DB operations ────────────────────────────────────────────────────────────

export const db = {
  // ── Activities ──────────────────────────────────────────────────────────────

  async getActivities(userId: string): Promise<Activity[]> {
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .eq('user_id', userId)
      .order('position', { ascending: true })
    if (error) throw error
    return (data as ActivityRow[]).map(toActivity)
  },

  async insertActivity(activity: Activity, userId: string, position: number): Promise<void> {
    const { error } = await supabase
      .from('activities')
      .insert(fromActivity(activity, userId, position))
    if (error) throw error
  },

  async updateActivity(
    id: string,
    updates: Partial<Pick<Activity, 'title' | 'description' | 'dueDate' | 'completedAt' | 'column'>>,
    userId: string,
  ): Promise<void> {
    const patch: Record<string, unknown> = {}
    if (updates.title       !== undefined) patch.title        = updates.title
    if (updates.description !== undefined) patch.description  = updates.description ?? null
    if (updates.dueDate     !== undefined) patch.due_date     = updates.dueDate ?? null
    if (updates.completedAt !== undefined) patch.completed_at = updates.completedAt ?? null
    if (updates.column      !== undefined) patch.status       = updates.column
    const { error } = await supabase
      .from('activities')
      .update(patch)
      .eq('id', id)
      .eq('user_id', userId)
    if (error) throw error
  },

  async deleteActivity(id: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('activities')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
    if (error) throw error
  },

  async reorderActivities(activities: Activity[], userId: string): Promise<void> {
    await Promise.all(
      activities.map((a, i) =>
        supabase
          .from('activities')
          .update({ position: i })
          .eq('id', a.id)
          .eq('user_id', userId),
      ),
    )
  },

  // ── Tasks ────────────────────────────────────────────────────────────────────

  async getTasks(userId: string): Promise<Task[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .order('position', { ascending: true })
    if (error) throw error
    return (data as TaskRow[]).map(toTask)
  },

  async insertTask(task: Task, userId: string, position: number): Promise<void> {
    const { error } = await supabase
      .from('tasks')
      .insert(fromTask(task, userId, position))
    if (error) throw error
  },

  async insertTasks(tasks: Task[], userId: string, startPosition: number): Promise<void> {
    const rows = tasks.map((t, i) => fromTask(t, userId, startPosition + i))
    const { error } = await supabase.from('tasks').insert(rows)
    if (error) throw error
  },

  async updateTask(
    id: string,
    updates: Partial<Pick<Task, 'title' | 'description' | 'priority' | 'dueDate' | 'completedAt' | 'column' | 'tags' | 'activityId' | 'schedulingType' | 'recurringType' | 'recurringWeekDay' | 'recurringMonthDay' | 'recurringEndDate' | 'recurrenceInterval' | 'recurrenceOrdinal' | 'recurrenceMonth' | 'recurrenceBusinessDayAdjustment' | 'scheduledStart' | 'scheduledEnd'>>,
    userId: string,
  ): Promise<void> {
    const patch: Record<string, unknown> = {}
    if (updates.title       !== undefined) patch.title        = updates.title
    if (updates.description !== undefined) patch.description  = updates.description ?? null
    if (updates.priority    !== undefined) patch.priority     = updates.priority
    if (updates.dueDate     !== undefined) patch.due_date     = updates.dueDate ?? null
    if (updates.completedAt !== undefined) patch.completed_at = updates.completedAt ?? null
    if (updates.column      !== undefined) patch.status       = updates.column
    if (updates.tags        !== undefined
      || 'recurrenceInterval' in updates
      || 'recurrenceOrdinal' in updates
      || 'recurrenceMonth' in updates
      || 'recurrenceBusinessDayAdjustment' in updates) {
      patch.tags = attachRecurrenceConfig(updates.tags, updates) ?? null
    }
    if ('activityId' in updates)          patch.activity_id  = updates.activityId ?? null
    if ('schedulingType'    in updates) patch.scheduling_type  = updates.schedulingType ?? null
    if ('recurringType'     in updates) patch.recurring_type   = updates.recurringType ?? null
    if ('recurringWeekDay'  in updates) patch.recurring_week_day = updates.recurringWeekDay ?? null
    if ('recurringMonthDay' in updates) patch.recurring_month_day = updates.recurringMonthDay ?? null
    if ('recurringEndDate'  in updates) patch.recurring_end_date = updates.recurringEndDate ?? null
    if ('scheduledStart'    in updates) patch.scheduled_start  = updates.scheduledStart ?? null
    if ('scheduledEnd'      in updates) patch.scheduled_end    = updates.scheduledEnd ?? null
    const { error } = await supabase
      .from('tasks')
      .update(patch)
      .eq('id', id)
      .eq('user_id', userId)
    if (error) throw error
  },

  async deleteTask(id: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
    if (error) throw error
  },

  async reorderTasks(tasks: Task[], userId: string): Promise<void> {
    await Promise.all(
      tasks.map((t, i) =>
        supabase
          .from('tasks')
          .update({ position: i })
          .eq('id', t.id)
          .eq('user_id', userId),
      ),
    )
  },

  async getHolidays(userId: string): Promise<Holiday[]> {
    const { data, error } = await supabase
      .from('holidays')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: true })
    if (error) throw error
    return (data as HolidayRow[]).map(toHoliday)
  },

  async insertHoliday(holiday: Holiday, userId: string): Promise<void> {
    const { error } = await supabase
      .from('holidays')
      .insert({
        id: holiday.id,
        user_id: userId,
        name: holiday.name,
        date: holiday.date,
        created_at: holiday.createdAt,
      })
    if (error) throw error
  },

  async updateHoliday(id: string, updates: Partial<Pick<Holiday, 'name' | 'date'>>, userId: string): Promise<void> {
    const patch: Record<string, unknown> = {}
    if (updates.name !== undefined) patch.name = updates.name
    if (updates.date !== undefined) patch.date = updates.date
    const { error } = await supabase
      .from('holidays')
      .update(patch)
      .eq('id', id)
      .eq('user_id', userId)
    if (error) throw error
  },

  async deleteHoliday(id: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('holidays')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
    if (error) throw error
  },
}
