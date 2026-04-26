import { supabase } from './supabase'
import type { Activity, Task, ColumnId } from '../types'

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
  activity_id: string
  title: string
  description: string | null
  priority: 'low' | 'medium' | 'high'
  due_date: string | null
  completed_at: string | null
  created_at: string
  status: ColumnId
  position: number
  tags: string[] | null
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

function toTask(r: TaskRow): Task {
  return {
    id: r.id,
    activityId: r.activity_id,
    title: r.title,
    description: r.description ?? undefined,
    priority: r.priority,
    dueDate: r.due_date ?? undefined,
    completedAt: r.completed_at ?? undefined,
    createdAt: r.created_at,
    column: r.status,
    tags: r.tags ?? undefined,
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
  return {
    id: t.id,
    user_id: userId,
    activity_id: t.activityId,
    title: t.title,
    description: t.description ?? null,
    priority: t.priority,
    due_date: t.dueDate ?? null,
    completed_at: t.completedAt ?? null,
    created_at: t.createdAt,
    status: t.column,
    position,
    tags: t.tags ?? null,
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
    updates: Partial<Pick<Task, 'title' | 'description' | 'priority' | 'dueDate' | 'completedAt' | 'column' | 'tags'>>,
    userId: string,
  ): Promise<void> {
    const patch: Record<string, unknown> = {}
    if (updates.title       !== undefined) patch.title        = updates.title
    if (updates.description !== undefined) patch.description  = updates.description ?? null
    if (updates.priority    !== undefined) patch.priority     = updates.priority
    if (updates.dueDate     !== undefined) patch.due_date     = updates.dueDate ?? null
    if (updates.completedAt !== undefined) patch.completed_at = updates.completedAt ?? null
    if (updates.column      !== undefined) patch.status       = updates.column
    if (updates.tags        !== undefined) patch.tags         = updates.tags ?? null
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
}
