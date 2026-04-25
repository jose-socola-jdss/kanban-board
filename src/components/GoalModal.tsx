import { useEffect, useRef, useState } from 'react'
import { X, Target, Plus, Trash2, CheckCircle2, Circle } from 'lucide-react'
import type { Activity, ColumnId, Priority } from '../types'
import { PRIORITY_CONFIG } from '../types'
import { useKanbanStore } from '../store/kanbanStore'

// Unified row for both existing tasks and new drafts
interface TaskRow {
  tempId: string       // React key — always present
  storeId?: string     // present only for existing tasks from the store
  title: string
  priority: Priority
  dueDate: string
  column: ColumnId     // 'pending' for new drafts; actual column for existing
  markedForDelete: boolean
}

interface ActivityModalProps {
  activity?: Activity | null
  defaultColumn?: ColumnId
  onClose: () => void
}

export function ActivityModal({ activity, defaultColumn = 'pending', onClose }: ActivityModalProps) {
  const addActivity    = useKanbanStore((s) => s.addActivity)
  const updateActivity = useKanbanStore((s) => s.updateActivity)
  const addTasks       = useKanbanStore((s) => s.addTasks)
  const updateTask     = useKanbanStore((s) => s.updateTask)
  const deleteTask     = useKanbanStore((s) => s.deleteTask)
  const allTasks       = useKanbanStore((s) => s.tasks)

  const [title, setTitle]             = useState(activity?.title ?? '')
  const [description, setDescription] = useState(activity?.description ?? '')
  const [dueDate, setDueDate]         = useState(activity?.dueDate ?? '')
  const [titleError, setTitleError]   = useState('')
  const [tasksError, setTasksError]   = useState('')

  // Build initial task rows
  const [taskRows, setTaskRows] = useState<TaskRow[]>(() => {
    if (activity) {
      return allTasks
        .filter((t) => t.activityId === activity.id)
        .map((t) => ({
          tempId: t.id,
          storeId: t.id,
          title: t.title,
          priority: t.priority,
          dueDate: t.dueDate ?? '',
          column: t.column,
          markedForDelete: false,
        }))
    }
    return [{ tempId: crypto.randomUUID(), title: '', priority: 'medium', dueDate: '', column: 'pending', markedForDelete: false }]
  })

  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => { titleRef.current?.focus() }, [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const addNewRow = () => {
    setTaskRows((prev) => [
      ...prev,
      { tempId: crypto.randomUUID(), title: '', priority: 'medium', dueDate: '', column: 'pending', markedForDelete: false },
    ])
    setTasksError('')
  }

  const updateRow = (tempId: string, updates: Partial<TaskRow>) => {
    setTaskRows((prev) => prev.map((r) => (r.tempId === tempId ? { ...r, ...updates } : r)))
    if (updates.title) setTasksError('')
  }

  const removeRow = (tempId: string) => {
    setTaskRows((prev) => {
      const row = prev.find((r) => r.tempId === tempId)
      if (!row) return prev
      if (row.storeId) {
        return prev.map((r) => r.tempId === tempId ? { ...r, markedForDelete: true } : r)
      }
      return prev.filter((r) => r.tempId !== tempId)
    })
  }

  const restoreRow = (tempId: string) => {
    setTaskRows((prev) => prev.map((r) => r.tempId === tempId ? { ...r, markedForDelete: false } : r))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      setTitleError('El título es requerido')
      titleRef.current?.focus()
      return
    }

    if (activity) {
      // ── Edit mode ──────────────────────────────────────────────
      updateActivity(activity.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        dueDate: dueDate || undefined,
      })

      for (const row of taskRows) {
        if (row.storeId) {
          if (row.markedForDelete) {
            deleteTask(row.storeId)
          } else {
            updateTask(row.storeId, {
              title: row.title.trim() || undefined,
              priority: row.priority,
              dueDate: row.dueDate || undefined,
            })
          }
        }
      }

      const newRows = taskRows.filter((r) => !r.storeId && !r.markedForDelete && r.title.trim())
      if (newRows.length > 0) {
        addTasks(newRows.map((r) => ({
          title: r.title.trim(),
          priority: r.priority,
          dueDate: r.dueDate || undefined,
          column: 'pending' as ColumnId,
          activityId: activity.id,
        })))
      }

      onClose()
      return
    }

    // ── Create mode ────────────────────────────────────────────
    const validRows = taskRows.filter((r) => r.title.trim())
    if (validRows.length === 0) {
      setTasksError('Agrega al menos una tarea para esta actividad')
      return
    }

    const newActivityId = crypto.randomUUID()
    addActivity({
      id: newActivityId,
      title: title.trim(),
      description: description.trim() || undefined,
      dueDate: dueDate || undefined,
      column: defaultColumn,
    })

    addTasks(validRows.map((r) => ({
      title: r.title.trim(),
      priority: r.priority,
      dueDate: r.dueDate || undefined,
      column: 'pending' as ColumnId,
      activityId: newActivityId,
    })))

    onClose()
  }

  const visibleRows = taskRows.filter((r) => !r.markedForDelete)
  const deletedRows = taskRows.filter((r) => r.markedForDelete)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg bg-surface-2 rounded-2xl border border-border shadow-drag animate-scale-in overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-surface-3 border border-border flex items-center justify-center">
              <Target size={13} className="text-text-secondary" />
            </div>
            <h2 className="font-display text-base font-600 text-text-primary">
              {activity ? 'Editar actividad' : 'Nueva actividad'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-3 transition-all">
            <X size={16} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1">
          <form id="activity-form" onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

            {/* Title */}
            <div>
              <label className="block text-xs font-body font-500 text-text-secondary mb-1.5">
                Título <span className="text-rose-400">*</span>
              </label>
              <input
                ref={titleRef}
                type="text"
                value={title}
                onChange={(e) => { setTitle(e.target.value); setTitleError('') }}
                placeholder="¿Cuál es la actividad del mes?"
                className="form-input w-full px-3.5 py-2.5 rounded-xl text-sm font-body"
                maxLength={120}
              />
              {titleError && <p className="text-xs text-rose-400 mt-1.5">{titleError}</p>}
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-body font-500 text-text-secondary mb-1.5">
                Descripción <span className="text-text-muted">(opcional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="¿En qué consiste esta actividad?"
                rows={2}
                className="form-input w-full px-3.5 py-2.5 rounded-xl text-sm font-body resize-none"
                maxLength={400}
              />
            </div>

            {/* Due date */}
            <div>
              <label className="block text-xs font-body font-500 text-text-secondary mb-1.5">
                Fecha de entrega <span className="text-text-muted">(opcional)</span>
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="form-input w-full px-3.5 py-2.5 rounded-xl text-sm font-body cursor-pointer"
              />
            </div>

            {/* Tasks section */}
            <div>
              <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent my-2" />
              <div className="flex items-center justify-between mb-3 mt-4">
                <div>
                  <p className="text-xs font-body font-500 text-text-secondary">
                    Tareas de la actividad
                    {!activity && <span className="text-rose-400"> *</span>}
                  </p>
                  <p className="text-[10px] font-body text-text-muted mt-0.5">
                    {activity
                      ? 'Edita, elimina o añade tareas para esta actividad'
                      : 'Define las tareas que debes completar para esta actividad'}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {visibleRows.map((row, index) => (
                  <TaskDraftRow
                    key={row.tempId}
                    row={row}
                    index={index}
                    canRemove={!activity ? taskRows.filter((r) => !r.markedForDelete).length > 1 : true}
                    onChange={(updates) => updateRow(row.tempId, updates)}
                    onRemove={() => removeRow(row.tempId)}
                  />
                ))}

                {visibleRows.length === 0 && (
                  <p className="text-xs text-text-muted text-center py-3 italic">
                    Sin tareas — añade al menos una
                  </p>
                )}
              </div>

              {/* Deleted tasks (undo area) */}
              {deletedRows.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {deletedRows.map((row) => (
                    <div key={row.tempId} className="flex items-center justify-between px-3 py-2 rounded-lg bg-rose-400/5 border border-rose-400/20">
                      <span className="text-xs font-body text-text-muted line-through">{row.title || '(sin título)'}</span>
                      <button
                        type="button"
                        onClick={() => restoreRow(row.tempId)}
                        className="text-[10px] font-body text-rose-400 hover:text-rose-300 transition-colors ml-3 flex-shrink-0"
                      >
                        Deshacer
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {tasksError && <p className="text-xs text-rose-400 mt-2">{tasksError}</p>}

              <button
                type="button"
                onClick={addNewRow}
                className="mt-3 flex items-center gap-1.5 text-xs font-body text-text-muted hover:text-text-primary transition-colors group"
              >
                <span className="w-5 h-5 rounded-md border border-dashed border-border group-hover:border-border-hover flex items-center justify-center transition-colors">
                  <Plus size={10} />
                </span>
                Añadir tarea
              </button>
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="flex gap-2.5 px-6 py-4 border-t border-border flex-shrink-0">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-body text-text-secondary bg-surface-3 hover:bg-surface-4 border border-border hover:border-border-hover transition-all">
            Cancelar
          </button>
          <button type="submit" form="activity-form" className="flex-1 px-4 py-2.5 rounded-xl text-sm font-body font-500 text-white bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-400 hover:to-purple-400 transition-all shadow-lg shadow-violet-500/20">
            {activity ? 'Guardar cambios' : 'Crear actividad'}
          </button>
        </div>
      </div>
    </div>
  )
}

interface TaskDraftRowProps {
  row: TaskRow
  index: number
  canRemove: boolean
  onChange: (updates: Partial<TaskRow>) => void
  onRemove: () => void
}

function TaskDraftRow({ row, index, canRemove, onChange, onRemove }: TaskDraftRowProps) {
  const isCompleted = row.column === 'completed'

  return (
    <div className={`flex gap-2 items-start p-3 rounded-xl border transition-all ${isCompleted ? 'bg-emerald-400/5 border-emerald-400/20' : 'bg-surface-3 border-border'}`}>
      {/* Completion indicator for existing tasks */}
      {row.storeId && (
        <div className="flex-shrink-0 mt-2.5">
          {isCompleted
            ? <CheckCircle2 size={13} className="text-emerald-400" />
            : <Circle size={13} className="text-text-muted opacity-40" />
          }
        </div>
      )}

      <div className="flex-1 min-w-0 space-y-2">
        <input
          type="text"
          value={row.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder={`Tarea ${index + 1}...`}
          className={`form-input w-full px-3 py-2 rounded-lg text-xs font-body ${isCompleted ? 'line-through text-text-muted' : ''}`}
          maxLength={120}
        />
        <div className="flex gap-2 flex-wrap">
          {/* Priority pills */}
          <div className="flex gap-1">
            {(Object.entries(PRIORITY_CONFIG) as [Priority, (typeof PRIORITY_CONFIG)[Priority]][]).map(([key, cfg]) => (
              <button
                key={key}
                type="button"
                onClick={() => onChange({ priority: key })}
                title={cfg.label}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-body border transition-all duration-150 ${row.priority === key ? `${cfg.bg} ${cfg.color} border-current/30` : 'bg-surface-4 text-text-muted border-border hover:border-border-hover'}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                {cfg.label}
              </button>
            ))}
          </div>
          {/* Due date */}
          <input
            type="date"
            value={row.dueDate}
            onChange={(e) => onChange({ dueDate: e.target.value })}
            className="form-input px-2 py-1 rounded-lg text-[10px] font-body cursor-pointer flex-shrink-0"
          />
        </div>
      </div>

      {canRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="p-1.5 rounded-lg text-text-muted hover:text-rose-400 hover:bg-rose-400/10 transition-all flex-shrink-0 mt-0.5"
          title="Eliminar tarea"
        >
          <Trash2 size={12} />
        </button>
      )}
    </div>
  )
}
