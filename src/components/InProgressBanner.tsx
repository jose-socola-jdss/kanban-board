import { useEffect, useState } from 'react'
import { Timer, CheckCircle2, ChevronsDown, Play } from 'lucide-react'
import { useKanbanStore } from '../store/kanbanStore'
import type { ViewMode } from '../types'

interface InProgressBannerProps {
  mode: ViewMode
}

function formatSeconds(totalSeconds: number): string {
  const absSeconds = Math.abs(totalSeconds)
  const h = Math.floor(absSeconds / 3600)
  const m = Math.floor((absSeconds % 3600) / 60)
  const s = absSeconds % 60
  const sign = totalSeconds < 0 ? '-' : ''
  if (h > 0) {
    return `${sign}${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${sign}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function getScheduledEndMs(scheduledEnd: string): number {
  const [h, m] = scheduledEnd.split(':').map(Number)
  const now = new Date()
  const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0)
  return target.getTime()
}

export function InProgressBanner({ mode }: InProgressBannerProps) {
  const tasks = useKanbanStore((s) => s.tasks)
  const activities = useKanbanStore((s) => s.activities)
  const activeTaskId = useKanbanStore((s) => s.activeTaskId)
  const activeTaskStartedAt = useKanbanStore((s) => s.activeTaskStartedAt)
  const moveTask = useKanbanStore((s) => s.moveTask)
  const reorderTasks = useKanbanStore((s) => s.reorderTasks)
  const startTask = useKanbanStore((s) => s.startTask)
  const stopTask = useKanbanStore((s) => s.stopTask)

  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const activeTask = activeTaskId ? tasks.find((t) => t.id === activeTaskId) ?? null : null

  // In projects mode: show active project info (no timer, no buttons)
  if (mode === 'projects') {
    if (!activeTask) {
      return (
        <div className="px-6 md:px-10 max-w-[1400px] mx-auto w-full mb-4">
          <div className="w-full rounded-2xl border border-dashed border-border/40 bg-surface-1/30 px-5 py-3 flex items-center gap-3">
            <div className="w-6 h-6 rounded-lg bg-teal-500/10 flex items-center justify-center flex-shrink-0">
              <Play size={11} className="text-teal-400" />
            </div>
            <span className="text-xs font-body text-text-muted">
              Ningún proyecto activo en este momento
            </span>
          </div>
        </div>
      )
    }
    const projectActivity = activeTask.activityId
      ? activities.find((a) => a.id === activeTask.activityId)
      : null
    const displayName = projectActivity ? projectActivity.title : activeTask.title
    return (
      <div className="px-6 md:px-10 max-w-[1400px] mx-auto w-full mb-4">
        <div className="w-full rounded-2xl border border-teal-500/30 bg-gradient-to-r from-teal-500/10 to-cyan-500/5 px-5 py-3 flex items-center gap-3">
          <div className="w-6 h-6 rounded-lg bg-teal-500/20 flex items-center justify-center flex-shrink-0">
            <Play size={11} className="text-teal-400" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-body text-teal-400/70 uppercase tracking-wide">En progreso</span>
            <p className="text-sm font-body font-500 text-text-primary truncate">{displayName}</p>
          </div>
        </div>
      </div>
    )
  }

  // Tasks mode
  const paraHoyTasks = tasks.filter((t) => t.column === 'thisWeek')

  if (!activeTask) {
    return (
      <div className="px-6 md:px-10 max-w-[1400px] mx-auto w-full mb-4">
        <div className="w-full rounded-2xl border border-dashed border-border/40 bg-surface-1/30 px-5 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-teal-500/10 flex items-center justify-center flex-shrink-0">
              <Play size={11} className="text-teal-400" />
            </div>
            <span className="text-xs font-body text-text-muted">
              Ninguna tarea en progreso — presiona ▶ en "Para hoy" para comenzar
            </span>
          </div>
          {paraHoyTasks.length > 0 && (
            <button
              onClick={() => startTask(paraHoyTasks[0].id)}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-body font-500 text-teal-300 bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/30 hover:border-teal-500/50 transition-all"
            >
              <Play size={11} />
              Iniciar
            </button>
          )}
        </div>
      </div>
    )
  }

  // Compute timer
  let timerSeconds: number
  let isOverdue = false

  if (activeTask.scheduledEnd) {
    const endMs = getScheduledEndMs(activeTask.scheduledEnd)
    timerSeconds = Math.floor((endMs - now) / 1000)
    isOverdue = timerSeconds < 0
  } else {
    const startMs = activeTaskStartedAt ?? now
    timerSeconds = Math.floor((now - startMs) / 1000)
    isOverdue = false
  }

  const handleFinalizar = () => {
    const taskId = activeTask.id
    // Find next task in Para hoy (excluding the current active)
    const remaining = paraHoyTasks.filter((t) => t.id !== taskId)
    moveTask(taskId, 'completed')
    stopTask()
    if (remaining.length > 0) {
      startTask(remaining[0].id)
    }
  }

  const handleAlaCola = () => {
    const taskId = activeTask.id
    // Send to bottom of Para hoy
    const paraHoyOthers = paraHoyTasks.filter((t) => t.id !== taskId)
    const reordered = [
      ...tasks.filter((t) => t.column !== 'thisWeek'),
      ...paraHoyOthers,
      activeTask,
    ]
    reorderTasks(reordered)
    stopTask()
    if (paraHoyOthers.length > 0) {
      startTask(paraHoyOthers[0].id)
    }
  }

  const timeDisplay = activeTask.scheduledEnd
    ? formatSeconds(timerSeconds)
    : formatSeconds(timerSeconds)

  const scheduledLabel = activeTask.scheduledStart || activeTask.scheduledEnd
    ? [
        activeTask.scheduledStart ? `${activeTask.scheduledStart}` : '',
        activeTask.scheduledEnd ? `→ ${activeTask.scheduledEnd}` : '',
      ].filter(Boolean).join(' ')
    : null

  return (
    <div className="px-6 md:px-10 max-w-[1400px] mx-auto w-full mb-4">
      <div className="w-full rounded-2xl border border-teal-500/30 bg-gradient-to-r from-teal-500/10 to-cyan-500/5 px-5 py-3.5 flex items-center gap-4 flex-wrap">
        {/* Icon + label */}
        <div className="w-7 h-7 rounded-lg bg-teal-500/20 flex items-center justify-center flex-shrink-0">
          <Play size={13} className="text-teal-400" />
        </div>

        {/* Task info */}
        <div className="flex-1 min-w-0">
          <span className="text-[10px] font-body text-teal-400/70 uppercase tracking-wide">En progreso</span>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-body font-500 text-text-primary truncate max-w-xs">
              {activeTask.title}
            </p>
            {scheduledLabel && (
              <span className="text-[10px] font-body text-text-muted opacity-70">
                ({scheduledLabel})
              </span>
            )}
          </div>
        </div>

        {/* Timer */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Timer size={14} className={isOverdue ? 'text-rose-400' : 'text-teal-400'} />
          <span
            className={`font-display text-lg font-600 tabular-nums ${
              isOverdue ? 'text-rose-400' : 'text-teal-300'
            }`}
          >
            {timeDisplay}
          </span>
          {isOverdue && (
            <span className="text-[10px] font-body text-rose-400 opacity-80">vencida</span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleAlaCola}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-body text-text-secondary bg-surface-3 hover:bg-surface-4 border border-border hover:border-border-hover transition-all"
            title="Enviar al final de Para hoy e iniciar la siguiente"
          >
            <ChevronsDown size={12} />
            A la cola
          </button>
          <button
            onClick={handleFinalizar}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-body font-500 text-white bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 transition-all shadow-lg shadow-teal-500/20"
            title="Marcar como finalizada"
          >
            <CheckCircle2 size={12} />
            Finalizar
          </button>
        </div>
      </div>
    </div>
  )
}
