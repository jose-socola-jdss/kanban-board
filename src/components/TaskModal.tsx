import { useEffect, useRef, useState } from 'react'
import { X, Sparkles, Target } from 'lucide-react'
import type { Task, ColumnId, Priority } from '../types'
import { COLUMNS, PRIORITY_CONFIG } from '../types'
import type { SchedulingType, RecurringType } from '../types'
import { useKanbanStore } from '../store/kanbanStore'
import { getTodayString } from '../utils/date'

interface TaskModalProps {
  task?: Task | null
  defaultColumn?: ColumnId
  defaultDueDate?: string
  onClose: () => void
}

export function TaskModal({ task, defaultColumn = 'pending', defaultDueDate, onClose }: TaskModalProps) {
  const addTask = useKanbanStore((s) => s.addTask)
  const updateTask = useKanbanStore((s) => s.updateTask)
  const activities = useKanbanStore((s) => s.activities)

  // Only used when editing to display the project name (read-only)
  const taskProject = task?.activityId ? activities.find((a) => a.id === task.activityId) : null

  const isParaHoyDefault = !task && defaultColumn === 'thisWeek'
  const todayStr = getTodayString()

  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [priority, setPriority] = useState<Priority>(task?.priority ?? 'medium')
  const [column, setColumn] = useState<ColumnId>(task?.column ?? defaultColumn)
  const [error, setError] = useState('')

  // Scheduling state — for new Para hoy tasks, default to fixed + today
  const defaultSchedulingType: SchedulingType = isParaHoyDefault
    ? 'fixed'
    : (task?.schedulingType ?? (task?.dueDate ? 'fixed' : 'none'))
  const defaultDueDateValue = isParaHoyDefault
    ? todayStr
    : (defaultDueDate ?? task?.dueDate ?? '')

  const [schedulingType, setSchedulingType] = useState<SchedulingType>(defaultSchedulingType)
  const [dueDate, setDueDate] = useState(defaultDueDateValue)
  const [recurringType, setRecurringType] = useState<RecurringType>(
    task?.recurringType ?? 'daily'
  )
  const [recurringWeekDay, setRecurringWeekDay] = useState(task?.recurringWeekDay ?? 1)
  const [recurringMonthDay, setRecurringMonthDay] = useState<number | ''>(task?.recurringMonthDay ?? 15)
  const [recurringHasEndDate, setRecurringHasEndDate] = useState(!!task?.recurringEndDate)
  const [recurringEndDate, setRecurringEndDate] = useState(task?.recurringEndDate ?? '')

  // Scheduled time fields (for thisWeek column)
  const [scheduledStart, setScheduledStart] = useState(task?.scheduledStart ?? '')
  const [scheduledEnd, setScheduledEnd] = useState(task?.scheduledEnd ?? '')

  // Show time fields when column is thisWeek (for editing) or when defaultColumn is thisWeek
  const showTimePickers = column === 'thisWeek'

  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('El título es requerido')
      inputRef.current?.focus()
      return
    }

    let taskData: Partial<Omit<Task, 'id' | 'createdAt'>> & { title: string; priority: Priority; column: ColumnId }

    const timeFields = showTimePickers
      ? {
          scheduledStart: scheduledStart || undefined,
          scheduledEnd: scheduledEnd || undefined,
        }
      : {
          scheduledStart: undefined,
          scheduledEnd: undefined,
        }

    if (schedulingType === 'none') {
      taskData = {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        column,
        dueDate: undefined,
        schedulingType: 'none',
        recurringType: undefined,
        recurringWeekDay: undefined,
        recurringMonthDay: undefined,
        recurringEndDate: undefined,
        ...timeFields,
      }
    } else if (schedulingType === 'fixed') {
      taskData = {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        column,
        dueDate: dueDate || undefined,
        schedulingType: 'fixed',
        recurringType: undefined,
        recurringWeekDay: undefined,
        recurringMonthDay: undefined,
        recurringEndDate: undefined,
        ...timeFields,
      }
    } else {
      // recurring
      const monthDay = typeof recurringMonthDay === 'number' ? recurringMonthDay : undefined
      taskData = {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        column,
        dueDate: undefined,
        schedulingType: 'recurring',
        recurringType,
        recurringWeekDay: recurringType === 'weekly' ? recurringWeekDay : undefined,
        recurringMonthDay: recurringType === 'monthly' ? monthDay : undefined,
        recurringEndDate: recurringHasEndDate && recurringEndDate ? recurringEndDate : undefined,
        ...timeFields,
      }
    }

    if (task) {
      updateTask(task.id, taskData)
    } else {
      addTask(taskData as Parameters<typeof addTask>[0])
    }
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md bg-surface-2 rounded-2xl border border-border shadow-drag animate-scale-in overflow-hidden">
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-surface-3 border border-border flex items-center justify-center">
              <Sparkles size={13} className="text-text-secondary" />
            </div>
            <h2 className="font-display text-base font-600 text-text-primary">
              {task ? 'Editar tarea' : 'Nueva tarea'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-3 transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 overflow-y-auto max-h-[calc(100vh-160px)]">
          {/* Project badge — read-only, only shown when editing a task that belongs to a project */}
          {task && taskProject && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-3 border border-border">
              <Target size={12} className="text-text-muted flex-shrink-0" />
              <span className="text-xs font-body text-text-muted">Proyecto:</span>
              <span className="text-xs font-body font-500 text-text-secondary truncate">{taskProject.title}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-body font-500 text-text-secondary mb-1.5">
              Título <span className="text-rose-400">*</span>
            </label>
            <input
              ref={inputRef}
              type="text"
              value={title}
              onChange={(e) => { setTitle(e.target.value); setError('') }}
              placeholder="¿Qué necesitas hacer?"
              className="form-input w-full px-3.5 py-2.5 rounded-xl text-sm font-body"
              maxLength={120}
            />
            {error && <p className="text-xs text-rose-400 mt-1.5">{error}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-body font-500 text-text-secondary mb-1.5">
              Descripción <span className="text-text-muted">(opcional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalles adicionales..."
              rows={3}
              className="form-input w-full px-3.5 py-2.5 rounded-xl text-sm font-body resize-none"
              maxLength={400}
            />
          </div>

          {/* Priority + Column row */}
          <div className="grid grid-cols-2 gap-3">
            {/* Priority */}
            <div>
              <label className="block text-xs font-body font-500 text-text-secondary mb-1.5">
                Prioridad
              </label>
              <div className="flex flex-col gap-1.5">
                {(Object.entries(PRIORITY_CONFIG) as [Priority, (typeof PRIORITY_CONFIG)[Priority]][]).map(
                  ([key, cfg]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setPriority(key)}
                      className={`
                        flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-body
                        border transition-all duration-150
                        ${priority === key
                          ? `${cfg.bg} ${cfg.color} border-current/30`
                          : 'bg-surface-3 text-text-secondary border-border hover:border-border-hover'
                        }
                      `}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                      {cfg.label}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Column */}
            <div>
              <label className="block text-xs font-body font-500 text-text-secondary mb-1.5">
                Columna
              </label>
              <select
                value={column}
                onChange={(e) => setColumn(e.target.value as ColumnId)}
                className="form-input w-full px-3 py-2 rounded-xl text-xs font-body cursor-pointer"
              >
                {COLUMNS.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Time pickers — only shown for Para hoy (thisWeek) column */}
          {showTimePickers && (
            <div>
              <label className="block text-xs font-body font-500 text-text-secondary mb-2">
                Horario <span className="text-text-muted">(opcional)</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-body text-text-muted mb-1">
                    Inicio (HH:mm)
                  </label>
                  <input
                    type="time"
                    value={scheduledStart}
                    onChange={(e) => setScheduledStart(e.target.value)}
                    className="form-input w-full px-3 py-2 rounded-xl text-sm font-body cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-body text-text-muted mb-1">
                    Fin (HH:mm)
                  </label>
                  <input
                    type="time"
                    value={scheduledEnd}
                    onChange={(e) => setScheduledEnd(e.target.value)}
                    className="form-input w-full px-3 py-2 rounded-xl text-sm font-body cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Programación */}
          <div>
            <label className="block text-xs font-body font-500 text-text-secondary mb-2">
              Programación
            </label>

            {/* Type selector */}
            <div className="flex gap-1.5 mb-3">
              {(['none', 'fixed', 'recurring'] as const).map((type) => {
                const labels = { none: 'Sin fecha', fixed: 'Fecha fija', recurring: 'Programación especial' }
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSchedulingType(type)}
                    className={`flex-1 px-2 py-1.5 rounded-lg text-[11px] font-body border transition-all duration-150 ${
                      schedulingType === type
                        ? 'bg-surface-0 text-text-primary border-border shadow-sm'
                        : 'text-text-muted border-border hover:text-text-secondary hover:border-border-hover bg-surface-3'
                    }`}
                  >
                    {labels[type]}
                  </button>
                )
              })}
            </div>

            {/* Fixed: date picker */}
            {schedulingType === 'fixed' && (
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="form-input w-full px-3 py-2 rounded-xl text-sm font-body cursor-pointer"
              />
            )}

            {/* Recurring: options */}
            {schedulingType === 'recurring' && (
              <div className="space-y-3">
                {/* Frequency */}
                <div className="p-3 rounded-xl bg-surface-3 border border-border space-y-2">
                  <p className="text-[10px] font-body font-500 text-text-muted uppercase tracking-wide">Repetir</p>
                  <div className="space-y-1.5">
                    {/* Daily */}
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="recurringType" value="daily"
                        checked={recurringType === 'daily'}
                        onChange={() => setRecurringType('daily')}
                        className="accent-teal-500"
                      />
                      <span className="text-xs font-body text-text-secondary">Todos los días</span>
                    </label>
                    {/* Weekly */}
                    <label className="flex items-center gap-2 cursor-pointer flex-wrap">
                      <input type="radio" name="recurringType" value="weekly"
                        checked={recurringType === 'weekly'}
                        onChange={() => setRecurringType('weekly')}
                        className="accent-teal-500"
                      />
                      <span className="text-xs font-body text-text-secondary">Cada semana, el</span>
                      <select
                        value={recurringWeekDay}
                        onChange={(e) => { setRecurringType('weekly'); setRecurringWeekDay(Number(e.target.value)) }}
                        className="form-input px-2 py-1 rounded-lg text-xs font-body cursor-pointer"
                      >
                        {[{v:1,l:'Lunes'},{v:2,l:'Martes'},{v:3,l:'Miércoles'},{v:4,l:'Jueves'},{v:5,l:'Viernes'},{v:6,l:'Sábado'},{v:0,l:'Domingo'}].map(({v,l}) => (
                          <option key={v} value={v}>{l}</option>
                        ))}
                      </select>
                    </label>
                    {/* Monthly */}
                    <label className="flex items-center gap-2 cursor-pointer flex-wrap">
                      <input type="radio" name="recurringType" value="monthly"
                        checked={recurringType === 'monthly'}
                        onChange={() => setRecurringType('monthly')}
                        className="accent-teal-500"
                      />
                      <span className="text-xs font-body text-text-secondary">Cada mes, el día</span>
                      <input
                        type="number"
                        min={1} max={31}
                        value={recurringMonthDay}
                        onChange={(e) => { setRecurringType('monthly'); setRecurringMonthDay(Number(e.target.value) || '') }}
                        className="form-input w-14 px-2 py-1 rounded-lg text-xs font-body text-center"
                      />
                    </label>
                  </div>
                </div>

                {/* End date */}
                <div className="p-3 rounded-xl bg-surface-3 border border-border space-y-2">
                  <p className="text-[10px] font-body font-500 text-text-muted uppercase tracking-wide">Termina</p>
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="recurringEnd" value="never"
                        checked={!recurringHasEndDate}
                        onChange={() => setRecurringHasEndDate(false)}
                        className="accent-teal-500"
                      />
                      <span className="text-xs font-body text-text-secondary">Indefinidamente</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer flex-wrap">
                      <input type="radio" name="recurringEnd" value="until"
                        checked={recurringHasEndDate}
                        onChange={() => setRecurringHasEndDate(true)}
                        className="accent-teal-500"
                      />
                      <span className="text-xs font-body text-text-secondary">Hasta</span>
                      {recurringHasEndDate && (
                        <input
                          type="date"
                          value={recurringEndDate}
                          onChange={(e) => setRecurringEndDate(e.target.value)}
                          className="form-input px-2 py-1 rounded-lg text-xs font-body cursor-pointer"
                        />
                      )}
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-body text-text-secondary bg-surface-3 hover:bg-surface-4 border border-border hover:border-border-hover transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-body font-500 text-white bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 transition-all shadow-lg shadow-teal-500/20"
            >
              {task ? 'Guardar cambios' : 'Crear tarea'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
