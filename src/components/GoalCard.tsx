import { useState } from 'react'
import { Pencil, Trash2, CheckCircle2, CalendarDays } from 'lucide-react'
import type { Activity, ColumnConfig, Task } from '../types'
import { useKanbanStore } from '../store/kanbanStore'

interface ActivityCardProps {
  activity: Activity
  column: ColumnConfig
  tasks: Task[]
  onEdit: (activity: Activity) => void
}

export function ActivityCard({ activity, column, tasks, onEdit }: ActivityCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const deleteActivity = useKanbanStore((s) => s.deleteActivity)

  const completedCount = tasks.filter((t) => t.column === 'completed').length
  const totalCount = tasks.length
  const progress = totalCount > 0 ? completedCount / totalCount : 0
  const isCompleted = column.id === 'completed'
  const derivedCompletedAt = tasks
    .filter((task) => task.completedAt)
    .sort((a, b) => new Date(b.completedAt as string).getTime() - new Date(a.completedAt as string).getTime())[0]?.completedAt

  // Due date info for pending / in-progress
  const dueDateLabel = (() => {
    if (!activity.dueDate || isCompleted) return null
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const target = new Date(activity.dueDate + 'T00:00:00')
    const days = Math.round((target.getTime() - today.getTime()) / 86400000)
    const formatted = target.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
    let countdown: string
    if (days === 0) countdown = 'hoy'
    else if (days === 1) countdown = 'falta 1 día'
    else if (days > 1) countdown = `faltan ${days} días`
    else if (days === -1) countdown = 'hace 1 día'
    else countdown = `hace ${Math.abs(days)} días`
    return { formatted, countdown, overdue: days < 0 }
  })()

  // Completed-at timestamp (always present for completed activities)
  const completedAtLabel = (() => {
    if (!isCompleted) return null
    const completedAt = activity.completedAt ?? derivedCompletedAt
    if (!completedAt) return { text: null }
    const d = new Date(completedAt)
    const date = d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
    const time = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    return { text: `${date}, ${time}` }
  })()

  const style = {
    ['--task-bg' as string]: `linear-gradient(180deg, ${column.accentColor}08 0%, transparent 100%), rgb(var(--surface-3))`,
    ['--task-bg-hover' as string]: `linear-gradient(180deg, ${column.accentColor}12 0%, transparent 100%), rgb(var(--surface-3))`,
    ['--task-border' as string]: `${column.accentColor}28`,
    ['--task-border-hover' as string]: `${column.accentColor}55`,
    ['--task-shadow' as string]: `var(--shadow-card), 0 0 0 1px ${column.accentColor}14`,
    ['--task-shadow-hover' as string]: `var(--shadow-card-hover), 0 0 0 1px ${column.accentColor}24, 0 0 26px ${column.accentColor}10`,
  }

  return (
    <div
      style={style}
      className="task-card group relative rounded-xl border transition-all duration-200"
    >
      {/* Column accent bar */}
      <div
        className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full"
        style={{ background: column.accentColor, opacity: 0.8 }}
      />

      <div className="px-4 py-3.5 pl-5">
        {/* Top row: title + actions */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3
            className={`text-sm font-body font-500 leading-snug text-text-primary flex-1 min-w-0 ${isCompleted ? 'line-through text-text-muted opacity-75' : ''}`}
          >
            {activity.title}
          </h3>

          <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            <button
              onClick={() => onEdit(activity)}
              className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-surface-4 transition-all duration-150"
              title="Editar"
              type="button"
            >
              <Pencil size={12} />
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-1 rounded-md text-text-muted hover:text-rose-400 hover:bg-rose-400/10 transition-all duration-150"
              title="Eliminar"
              type="button"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        {/* Description */}
        {activity.description && (
          <p className={`text-xs text-text-secondary font-body leading-relaxed mb-3 line-clamp-2 ${isCompleted ? 'line-through text-text-muted opacity-70' : ''}`}>
            {activity.description}
          </p>
        )}

        {/* Task progress */}
        {totalCount > 0 && (
          <div className="mt-2.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-body text-text-muted">
                {completedCount} de {totalCount} {totalCount === 1 ? 'tarea' : 'tareas'}
              </span>
              {isCompleted && (
                <span className="flex items-center gap-1 text-[10px] font-body text-emerald-400">
                  <CheckCircle2 size={10} />
                  Completada
                </span>
              )}
            </div>
            <div className="h-1 rounded-full bg-surface-4 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${progress * 100}%`,
                  background: isCompleted ? '#22c55e' : column.accentColor,
                  opacity: isCompleted ? 1 : 0.75,
                }}
              />
            </div>
          </div>
        )}

        {totalCount === 0 && (
          <p className="text-[10px] font-body text-text-muted mt-1 italic">
            Sin tareas asignadas
          </p>
        )}

        {/* Fecha de finalización (pending / in-progress) */}
        {dueDateLabel && (
          <div className="mt-2.5 flex items-start gap-1">
            <CalendarDays size={10} className={`mt-0.5 flex-shrink-0 ${dueDateLabel.overdue ? 'text-rose-400' : 'text-text-muted opacity-60'}`} />
            <span className={`text-[10px] font-body leading-snug ${dueDateLabel.overdue ? 'text-rose-400' : 'text-text-muted'}`}>
              <span className="opacity-70">Fecha de finalización: </span>
              <span className="font-500">{dueDateLabel.formatted}</span>
              <span className={`ml-1 ${dueDateLabel.overdue ? '' : 'opacity-60'}`}>({dueDateLabel.countdown})</span>
            </span>
          </div>
        )}

        {/* Finalizada el (completed) */}
        {completedAtLabel && (
          <div className="mt-2.5 flex items-start gap-1">
            <CheckCircle2 size={10} className="mt-0.5 flex-shrink-0 text-emerald-400" />
            <span className="text-[10px] font-body text-text-muted leading-snug">
              {completedAtLabel.text ? (
                <>
                  <span className="opacity-70">Finalizada el </span>
                  <span className="font-500 text-emerald-400">{completedAtLabel.text}</span>
                </>
              ) : (
                <span className="font-500 text-emerald-400">Finalizada</span>
              )}
            </span>
          </div>
        )}
      </div>

      {/* Delete confirmation overlay */}
      {confirmDelete && (
        <div className="absolute inset-0 rounded-xl bg-surface-3/95 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-10 border border-rose-400/30 animate-scale-in">
          <p className="text-xs text-text-secondary font-body text-center px-4">
            ¿Eliminar esta actividad y sus tareas?
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-3 py-1.5 text-xs font-body text-text-secondary hover:text-text-primary bg-surface-4 rounded-lg border border-border transition-all"
              type="button"
            >
              Cancelar
            </button>
            <button
              onClick={() => deleteActivity(activity.id)}
              className="px-3 py-1.5 text-xs font-body text-white bg-rose-500/80 hover:bg-rose-500 rounded-lg transition-all"
              type="button"
            >
              Eliminar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
