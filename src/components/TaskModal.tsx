import { useEffect, useRef, useState } from 'react'
import { X, Sparkles, Target } from 'lucide-react'
import type {
  BusinessDayAdjustment,
  ColumnId,
  Priority,
  RecurringType,
  SchedulingType,
  Task,
} from '../types'
import { COLUMNS, PRIORITY_CONFIG } from '../types'
import { useKanbanStore } from '../store/kanbanStore'
import { getTodayString } from '../utils/date'

interface TaskModalProps {
  task?: Task | null
  defaultColumn?: ColumnId
  defaultDueDate?: string
  onClose: () => void
}

const WEEKDAY_OPTIONS = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miercoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sabado' },
  { value: 0, label: 'Domingo' },
]

const RECURRING_LABELS: Record<RecurringType, string> = {
  daily: 'Todos los dias',
  weekly: 'Cada semana',
  monthly: 'Cada mes, el mismo dia',
  yearly: 'Misma fecha todos los anos',
  monthlyFirstDay: 'Primer dia de cada mes',
  monthlyLastDay: 'Ultimo dia de cada mes',
  monthlyNthWeekday: 'Primer lunes de cada mes',
  monthlyLastWeekday: 'Ultimo viernes de cada mes',
  intervalDays: 'Cada X dias',
  intervalWeeks: 'Cada X semanas',
  intervalMonths: 'Cada X meses',
}

export function TaskModal({ task, defaultColumn = 'pending', defaultDueDate, onClose }: TaskModalProps) {
  const addTask = useKanbanStore((state) => state.addTask)
  const updateTask = useKanbanStore((state) => state.updateTask)
  const activities = useKanbanStore((state) => state.activities)

  const taskProject = task?.activityId ? activities.find((activity) => activity.id === task.activityId) : null
  const isParaHoyDefault = !task && defaultColumn === 'thisWeek'
  const todayStr = getTodayString()

  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [priority, setPriority] = useState<Priority>(task?.priority ?? 'medium')
  const [column, setColumn] = useState<ColumnId>(task?.column ?? defaultColumn)
  const [error, setError] = useState('')

  const defaultSchedulingType: SchedulingType = isParaHoyDefault
    ? 'fixed'
    : (task?.schedulingType ?? (task?.dueDate ? 'fixed' : 'none'))

  const defaultDateValue = isParaHoyDefault
    ? todayStr
    : (defaultDueDate ?? task?.dueDate ?? '')

  const [schedulingType, setSchedulingType] = useState<SchedulingType>(defaultSchedulingType)
  const [dueDate, setDueDate] = useState(defaultDateValue)
  const [recurringType, setRecurringType] = useState<RecurringType>(task?.recurringType ?? 'daily')
  const [recurringWeekDay, setRecurringWeekDay] = useState(task?.recurringWeekDay ?? 1)
  const [recurringMonthDay, setRecurringMonthDay] = useState<number | ''>(task?.recurringMonthDay ?? 15)
  const [recurrenceInterval, setRecurrenceInterval] = useState(task?.recurrenceInterval ?? 2)
  const [businessDayAdjustment, setBusinessDayAdjustment] = useState<BusinessDayAdjustment>(
    task?.recurrenceBusinessDayAdjustment ?? 'none',
  )
  const [recurringHasEndDate, setRecurringHasEndDate] = useState(!!task?.recurringEndDate)
  const [recurringEndDate, setRecurringEndDate] = useState(task?.recurringEndDate ?? '')
  const [scheduledStart, setScheduledStart] = useState(task?.scheduledStart ?? '')
  const [scheduledEnd, setScheduledEnd] = useState(task?.scheduledEnd ?? '')

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

  useEffect(() => {
    if (schedulingType === 'recurring' && !dueDate) {
      setDueDate(defaultDueDate ?? todayStr)
    }
  }, [defaultDueDate, dueDate, schedulingType, todayStr])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      setError('El titulo es requerido')
      inputRef.current?.focus()
      return
    }

    if (schedulingType === 'fixed' && !dueDate) {
      setError('La fecha fija es requerida')
      return
    }

    if (schedulingType === 'recurring' && !dueDate) {
      setError('La fecha base es requerida para esta programacion')
      return
    }

    const timeFields = showTimePickers
      ? { scheduledStart: scheduledStart || undefined, scheduledEnd: scheduledEnd || undefined }
      : { scheduledStart: undefined, scheduledEnd: undefined }

    let taskData: Partial<Omit<Task, 'id' | 'createdAt'>> & { title: string; priority: Priority; column: ColumnId }

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
        recurrenceInterval: undefined,
        recurrenceOrdinal: undefined,
        recurrenceMonth: undefined,
        recurrenceBusinessDayAdjustment: undefined,
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
        recurrenceInterval: undefined,
        recurrenceOrdinal: undefined,
        recurrenceMonth: undefined,
        recurrenceBusinessDayAdjustment: undefined,
        ...timeFields,
      }
    } else {
      const [, baseMonth] = dueDate.split('-').map(Number)
      const monthDay = typeof recurringMonthDay === 'number' ? recurringMonthDay : undefined
      const recurringBase: Partial<Omit<Task, 'id' | 'createdAt'>> = {
        dueDate,
        schedulingType: 'recurring',
        recurringType,
        recurringWeekDay: recurringType === 'weekly' ? recurringWeekDay : undefined,
        recurringMonthDay:
          recurringType === 'monthly' ? monthDay
          : recurringType === 'yearly' ? (monthDay ?? Number(dueDate.slice(-2)))
          : undefined,
        recurringEndDate: recurringHasEndDate && recurringEndDate ? recurringEndDate : undefined,
        recurrenceInterval:
          recurringType === 'intervalDays' || recurringType === 'intervalWeeks' || recurringType === 'intervalMonths'
            ? Math.max(1, recurrenceInterval)
            : undefined,
        recurrenceOrdinal: recurringType === 'monthlyNthWeekday' ? 1 : undefined,
        recurrenceMonth: recurringType === 'yearly' ? baseMonth : undefined,
        recurrenceBusinessDayAdjustment: businessDayAdjustment,
      }

      if (recurringType === 'monthlyNthWeekday') {
        recurringBase.recurringWeekDay = 1
      }

      if (recurringType === 'monthlyLastWeekday') {
        recurringBase.recurringWeekDay = 5
      }

      taskData = {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        column,
        ...recurringBase,
        ...timeFields,
      }

      if (recurringType === 'yearly') {
        taskData.recurringMonthDay = Number(dueDate.slice(-2))
        taskData.recurrenceMonth = baseMonth
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
      <div className="w-full max-w-xl bg-surface-2 rounded-2xl border border-border shadow-drag animate-scale-in overflow-hidden">
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

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 overflow-y-auto max-h-[calc(100vh-120px)]">
          {task && taskProject && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-3 border border-border">
              <Target size={12} className="text-text-muted flex-shrink-0" />
              <span className="text-xs font-body text-text-muted">Proyecto:</span>
              <span className="text-xs font-body font-500 text-text-secondary truncate">{taskProject.title}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-body font-500 text-text-secondary mb-1.5">
              Titulo <span className="text-rose-400">*</span>
            </label>
            <input
              ref={inputRef}
              type="text"
              value={title}
              onChange={(e) => { setTitle(e.target.value); setError('') }}
              placeholder="Que necesitas hacer?"
              className="form-input w-full px-3.5 py-2.5 rounded-xl text-sm font-body"
              maxLength={120}
            />
            {error && <p className="text-xs text-rose-400 mt-1.5">{error}</p>}
          </div>

          <div>
            <label className="block text-xs font-body font-500 text-text-secondary mb-1.5">
              Descripcion <span className="text-text-muted">(opcional)</span>
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-body font-500 text-text-secondary mb-1.5">Prioridad</label>
              <div className="flex flex-col gap-1.5">
                {(Object.entries(PRIORITY_CONFIG) as [Priority, (typeof PRIORITY_CONFIG)[Priority]][]).map(([key, cfg]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setPriority(key)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-body border transition-all duration-150 ${
                      priority === key
                        ? `${cfg.bg} ${cfg.color} border-current/30`
                        : 'bg-surface-3 text-text-secondary border-border hover:border-border-hover'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                    {cfg.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-body font-500 text-text-secondary mb-1.5">Columna</label>
              <select
                value={column}
                onChange={(e) => setColumn(e.target.value as ColumnId)}
                className="form-input w-full px-3 py-2 rounded-xl text-xs font-body cursor-pointer"
              >
                {COLUMNS.map((col) => (
                  <option key={col.id} value={col.id}>{col.label}</option>
                ))}
              </select>
            </div>
          </div>

          {showTimePickers && (
            <div>
              <label className="block text-xs font-body font-500 text-text-secondary mb-2">
                Horario <span className="text-text-muted">(opcional)</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-body text-text-muted mb-1">Inicio</label>
                  <input
                    type="time"
                    value={scheduledStart}
                    onChange={(e) => setScheduledStart(e.target.value)}
                    className="form-input w-full px-3 py-2 rounded-xl text-sm font-body cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-body text-text-muted mb-1">Fin</label>
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

          <div>
            <label className="block text-xs font-body font-500 text-text-secondary mb-2">Programacion</label>

            <div className="flex gap-1.5 mb-3">
              {(['none', 'fixed', 'recurring'] as const).map((type) => {
                const labels = { none: 'Sin fecha', fixed: 'Fecha fija', recurring: 'Programacion especial' }
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

            {schedulingType === 'fixed' && (
              <input
                type="date"
                value={dueDate}
                onChange={(e) => { setDueDate(e.target.value); setError('') }}
                className="form-input w-full px-3 py-2 rounded-xl text-sm font-body cursor-pointer"
              />
            )}

            {schedulingType === 'recurring' && (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-surface-3 border border-border space-y-3">
                  <div>
                    <p className="text-[10px] font-body font-500 text-text-muted uppercase tracking-wide mb-1.5">Tipo</p>
                    <select
                      value={recurringType}
                      onChange={(e) => setRecurringType(e.target.value as RecurringType)}
                      className="form-input w-full px-3 py-2 rounded-xl text-sm font-body cursor-pointer"
                    >
                      {Object.entries(RECURRING_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-body font-500 text-text-muted uppercase tracking-wide mb-1.5">
                      Fecha base
                    </label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="form-input w-full px-3 py-2 rounded-xl text-sm font-body cursor-pointer"
                    />
                    <p className="text-[10px] font-body text-text-muted mt-1.5">
                      Marca desde cuando comienza la recurrencia. En anual se usa el dia y mes de esta fecha.
                    </p>
                  </div>

                  {recurringType === 'weekly' && (
                    <div>
                      <label className="block text-[10px] font-body font-500 text-text-muted uppercase tracking-wide mb-1.5">Dia de la semana</label>
                      <select
                        value={recurringWeekDay}
                        onChange={(e) => setRecurringWeekDay(Number(e.target.value))}
                        className="form-input w-full px-3 py-2 rounded-xl text-sm font-body cursor-pointer"
                      >
                        {WEEKDAY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {recurringType === 'monthly' && (
                    <div>
                      <label className="block text-[10px] font-body font-500 text-text-muted uppercase tracking-wide mb-1.5">Dia del mes</label>
                      <input
                        type="number"
                        min={1}
                        max={31}
                        value={recurringMonthDay}
                        onChange={(e) => setRecurringMonthDay(Number(e.target.value) || '')}
                        className="form-input w-full px-3 py-2 rounded-xl text-sm font-body"
                      />
                    </div>
                  )}

                  {(recurringType === 'intervalDays' || recurringType === 'intervalWeeks' || recurringType === 'intervalMonths') && (
                    <div>
                      <label className="block text-[10px] font-body font-500 text-text-muted uppercase tracking-wide mb-1.5">Intervalo</label>
                      <input
                        type="number"
                        min={1}
                        value={recurrenceInterval}
                        onChange={(e) => setRecurrenceInterval(Math.max(1, Number(e.target.value) || 1))}
                        className="form-input w-full px-3 py-2 rounded-xl text-sm font-body"
                      />
                    </div>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-surface-3 border border-border space-y-2">
                  <p className="text-[10px] font-body font-500 text-text-muted uppercase tracking-wide">Ajuste a dia habil</p>
                  <select
                    value={businessDayAdjustment}
                    onChange={(e) => setBusinessDayAdjustment(e.target.value as BusinessDayAdjustment)}
                    className="form-input w-full px-3 py-2 rounded-xl text-sm font-body cursor-pointer"
                  >
                    <option value="none">No ajustar</option>
                    <option value="previous">Dia habil anterior</option>
                    <option value="next">Dia habil siguiente</option>
                  </select>
                  <p className="text-[10px] font-body text-text-muted">
                    Considera sabados, domingos y los feriados que registres en la vista de Feriados.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-surface-3 border border-border space-y-2">
                  <p className="text-[10px] font-body font-500 text-text-muted uppercase tracking-wide">Termina</p>
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="recurringEnd"
                        value="never"
                        checked={!recurringHasEndDate}
                        onChange={() => setRecurringHasEndDate(false)}
                        className="accent-teal-500"
                      />
                      <span className="text-xs font-body text-text-secondary">Indefinidamente</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer flex-wrap">
                      <input
                        type="radio"
                        name="recurringEnd"
                        value="until"
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
