export type Priority = 'low' | 'medium' | 'high'
export type ColumnId = 'pending' | 'thisWeek' | 'completed'
export type ViewMode = 'tasks' | 'projects' | 'overview' | 'calendar' | 'stats'
export type SchedulingType = 'none' | 'fixed' | 'recurring'
export type RecurringType = 'daily' | 'weekly' | 'monthly'

export interface Activity {
  id: string
  title: string
  description?: string
  dueDate?: string
  completedAt?: string
  createdAt: string
  column: ColumnId
}

export interface Task {
  id: string
  title: string
  description?: string
  priority: Priority
  createdAt: string
  dueDate?: string
  completedAt?: string
  column: ColumnId
  activityId?: string
  tags?: string[]
  schedulingType?: SchedulingType
  recurringType?: RecurringType
  recurringWeekDay?: number    // 0-6 (JS: 0=Dom, 1=Lun, ..., 6=Sáb)
  recurringMonthDay?: number   // 1-31
  recurringEndDate?: string    // YYYY-MM-DD
  scheduledStart?: string      // HH:mm
  scheduledEnd?: string        // HH:mm
}

export interface ColumnConfig {
  id: ColumnId
  label: string
  accentClass: string
  accentColor: string
  dimClass: string
  borderClass: string
  glowClass: string
  textClass: string
  emptyMsg: string
}

export const COLUMNS: ColumnConfig[] = [
  {
    id: 'pending',
    label: 'Pendientes',
    accentClass: 'bg-pending',
    accentColor: '#ff6b6b',
    dimClass: 'bg-pending-dim',
    borderClass: 'border-pending',
    glowClass: 'shadow-pending-glow',
    textClass: 'text-pending',
    emptyMsg: 'Sin tareas pendientes',
  },
  {
    id: 'thisWeek',
    label: 'Para hoy',
    accentClass: 'bg-week',
    accentColor: '#5da8ff',
    dimClass: 'bg-week-dim',
    borderClass: 'border-week',
    glowClass: 'shadow-week-glow',
    textClass: 'text-week',
    emptyMsg: 'Sin tareas para hoy',
  },
  {
    id: 'completed',
    label: 'Finalizadas',
    accentClass: 'bg-done',
    accentColor: '#8b949e',
    dimClass: 'bg-done-dim',
    borderClass: 'border-done',
    glowClass: 'shadow-done-glow',
    textClass: 'text-done',
    emptyMsg: 'Aún sin completar — ¡adelante!',
  },
]

export const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; bg: string; dot: string }> = {
  low: { label: 'Baja', color: 'text-emerald-400', bg: 'bg-emerald-400/10', dot: 'bg-emerald-400' },
  medium: { label: 'Media', color: 'text-amber-400', bg: 'bg-amber-400/10', dot: 'bg-amber-400' },
  high: { label: 'Alta', color: 'text-rose-400', bg: 'bg-rose-400/10', dot: 'bg-rose-400' },
}
