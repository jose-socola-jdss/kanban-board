import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Pencil, Trash2, GripVertical, CalendarDays, Check, Target } from 'lucide-react'
import type { Task, ColumnConfig } from '../types'
import { PRIORITY_CONFIG } from '../types'
import { useKanbanStore } from '../store/kanbanStore'
import { getEffectiveDueDate } from '../utils/date'

interface TaskCardProps {
  task: Task
  column: ColumnConfig
  onEdit: (task: Task) => void
  isCelebrating?: boolean
}

const PRIORITY_HOVER_STYLES = {
  low: 'group-hover:bg-emerald-400/10 group-hover:text-emerald-400 group-hover:border-emerald-400/20',
  medium: 'group-hover:bg-amber-400/10 group-hover:text-amber-400 group-hover:border-amber-400/20',
  high: 'group-hover:bg-rose-400/10 group-hover:text-rose-400 group-hover:border-rose-400/20',
} as const

export function TaskCard({ task, column, onEdit, isCelebrating = false }: TaskCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const deleteTask = useKanbanStore((s) => s.deleteTask)
  const activities = useKanbanStore((s) => s.activities)
  const tasks = useKanbanStore((s) => s.tasks)
  const activity = activities.find((a) => a.id === task.activityId)
  const priority = PRIORITY_CONFIG[task.priority]
  const isCompleted = task.column === 'completed'
  const priorityHoverStyle = PRIORITY_HOVER_STYLES[task.priority]
  const effectiveDueDate = getEffectiveDueDate(task) ?? activity?.dueDate
  const activityTasks = tasks.filter((item) => item.activityId === task.activityId)
  const activityTaskIndex = activityTasks.findIndex((item) => item.id === task.id)
  const activityLabel = activity && activityTaskIndex !== -1
    ? `Tarea ${activityTaskIndex + 1} de ${activityTasks.length} del Proyecto "${activity.title}"`
    : null

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    ['--task-bg' as string]: `linear-gradient(180deg, ${column.accentColor}08 0%, transparent 100%), rgb(var(--surface-3))`,
    ['--task-bg-hover' as string]: `linear-gradient(180deg, ${column.accentColor}12 0%, transparent 100%), rgb(var(--surface-3))`,
    ['--task-bg-drag' as string]: `linear-gradient(180deg, ${column.accentColor}18 0%, transparent 100%), rgb(var(--surface-3))`,
    ['--task-border' as string]: `${column.accentColor}28`,
    ['--task-border-hover' as string]: `${column.accentColor}55`,
    ['--task-shadow' as string]: `var(--shadow-card), 0 0 0 1px ${column.accentColor}14`,
    ['--task-shadow-hover' as string]: `var(--shadow-card-hover), 0 0 0 1px ${column.accentColor}24, 0 0 26px ${column.accentColor}10`,
    ['--task-shadow-drag' as string]: `var(--shadow-drag), 0 0 0 1px ${column.accentColor}40, 0 0 34px ${column.accentColor}16`,
  }

  // Due date info for pending / in-progress
  const dueDateLabel = (() => {
    if (!effectiveDueDate || isCompleted) return null
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const target = new Date(effectiveDueDate + 'T00:00:00')
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

  // Completed-at timestamp (always present for completed tasks)
  const completedAtLabel = (() => {
    if (!isCompleted) return null
    if (!task.completedAt) return { text: null }
    const d = new Date(task.completedAt)
    const date = d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
    const time = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    return { text: `${date}, ${time}` }
  })()

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={style}
        className={`
        task-card group relative rounded-xl border
        transition-all duration-200
        ${isDragging
          ? 'dragging opacity-40 scale-95'
          : 'opacity-100 scale-100'
        }
        cursor-grab active:cursor-grabbing
      `}
    >
      {/* Column accent bar */}
      <div
        className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full"
        style={{ background: column.accentColor, opacity: 0.8 }}
      />

      <div className="px-4 py-3.5 pl-5">
        {/* Top row: drag handle + actions */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {/* Drag handle */}
            <button
              className="flex-shrink-0 text-text-muted opacity-60 group-hover:opacity-100 transition-opacity duration-150 cursor-grab active:cursor-grabbing touch-none"
              title="Arrastrar"
              type="button"
            >
              <GripVertical size={14} />
            </button>

            <div className="flex-1 min-w-0">
              {/* Title */}
              <h3
                className={`
                  text-sm font-body font-500 leading-snug text-text-primary
                  ${isCompleted ? 'line-through text-text-muted opacity-75' : ''}
                `}
              >
                {task.title}
              </h3>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => onEdit(task)}
              className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-surface-4 transition-all duration-150"
              title="Editar"
              type="button"
            >
              <Pencil size={12} />
            </button>
            <button
              onPointerDown={(e) => e.stopPropagation()}
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
        {task.description && (
          <p className={`text-xs text-text-secondary font-body leading-relaxed mb-3 ml-5 line-clamp-2 ${isCompleted ? 'line-through text-text-muted opacity-70' : ''}`}>
            {task.description}
          </p>
        )}

        {/* Priority badge (only for non-completed) */}
        {!isCompleted && (
          <div className="ml-5 mb-1">
            <span className={`
              inline-flex items-center gap-1.5 text-[10px] font-body font-500
              px-2 py-0.5 rounded-full border border-transparent
              bg-surface-4/60 text-text-muted transition-all duration-150
              ${priorityHoverStyle}
            `}>
              <span className="w-1 h-1 rounded-full bg-current opacity-50 transition-opacity duration-150 group-hover:opacity-100" />
              <span>{priority.label}</span>
            </span>
          </div>
        )}

        {activityLabel && (
          <div className="ml-5 flex items-center gap-1 mt-2 mb-1">
            <Target size={9} className="text-text-muted opacity-60 flex-shrink-0" />
            <span className="text-[9px] font-body text-text-muted opacity-70 truncate leading-none">
              {activityLabel}
            </span>
          </div>
        )}

        {/* Fecha de finalización (pending / in-progress) */}
        {dueDateLabel && (
          <div className="ml-5 flex items-start gap-1 mt-1">
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
          <div className="ml-5 flex items-start gap-1 mt-1">
            <Check size={10} className="mt-0.5 flex-shrink-0 text-text-muted opacity-60" />
            <span className="text-[10px] font-body text-text-muted leading-snug opacity-70">
              {completedAtLabel.text ? (
                <>
                  <span className="opacity-70">Finalizada el </span>
                  <span className="font-500">{completedAtLabel.text}</span>
                </>
              ) : (
                <span className="font-500">Finalizada</span>
              )}
            </span>
          </div>
        )}
      </div>

      {/* Column accent line on bottom when in that column */}
      <div
        className={`absolute bottom-0 left-4 right-4 h-px rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
        style={{ background: column.accentColor, opacity: isDragging ? 0 : undefined }}
      />

      {/* Delete confirmation overlay */}
      {confirmDelete && (
        <div className="absolute inset-0 rounded-xl bg-surface-3/95 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-10 border border-rose-400/30 animate-scale-in">
          <p className="text-xs text-text-secondary font-body text-center px-4">
            ¿Eliminar esta tarea?
          </p>
          <div className="flex gap-2">
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => setConfirmDelete(false)}
              className="px-3 py-1.5 text-xs font-body text-text-secondary hover:text-text-primary bg-surface-4 hover:bg-surface-4 rounded-lg border border-border transition-all"
              type="button"
            >
              Cancelar
            </button>
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => deleteTask(task.id)}
              className="px-3 py-1.5 text-xs font-body text-white bg-rose-500/80 hover:bg-rose-500 rounded-lg transition-all"
              type="button"
            >
              Eliminar
            </button>
          </div>
        </div>
      )}
      {/* Celebration overlay */}
      {isCelebrating && (
        <div className="absolute inset-0 rounded-xl pointer-events-none z-20 overflow-hidden celebrate-overlay">
          {/* Glow ring */}
          <div className="absolute inset-0 rounded-xl celebrate-glow" style={{ boxShadow: `inset 0 0 20px rgba(34, 197, 94, 0.25), 0 0 30px rgba(34, 197, 94, 0.15)` }} />

          {/* Checkmark badge */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 celebrate-check">
            <div className="w-9 h-9 rounded-full bg-emerald-500/90 flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <Check size={20} className="text-white" strokeWidth={3} />
            </div>
          </div>

          {/* Sparkle particles */}
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1.5 h-1.5 rounded-full celebrate-particle"
              style={{
                '--particle-angle': `${i * 45}deg`,
                '--particle-distance': `${28 + (i % 3) * 12}px`,
                '--particle-delay': `${i * 0.04}s`,
                background: i % 2 === 0 ? '#22c55e' : '#a3e635',
              } as React.CSSProperties}
            />
          ))}
        </div>
      )}
    </div>
  )
}
