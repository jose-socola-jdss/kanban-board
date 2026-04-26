import { useEffect, useRef, useState } from 'react'
import { X, Sparkles, Target } from 'lucide-react'
import type { Task, ColumnId, Priority } from '../types'
import { COLUMNS, PRIORITY_CONFIG } from '../types'
import { useKanbanStore } from '../store/kanbanStore'

interface TaskModalProps {
  task?: Task | null
  defaultColumn?: ColumnId
  onClose: () => void
}

export function TaskModal({ task, defaultColumn = 'pending', onClose }: TaskModalProps) {
  const addTask = useKanbanStore((s) => s.addTask)
  const updateTask = useKanbanStore((s) => s.updateTask)
  const activities = useKanbanStore((s) => s.activities)

  // Only used when editing to display the project name (read-only)
  const taskProject = task?.activityId ? activities.find((a) => a.id === task.activityId) : null

  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [priority, setPriority] = useState<Priority>(task?.priority ?? 'medium')
  const [dueDate, setDueDate] = useState(task?.dueDate ?? '')
  const [column, setColumn] = useState<ColumnId>(task?.column ?? defaultColumn)
  const [error, setError] = useState('')

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

    if (task) {
      updateTask(task.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        dueDate: dueDate || undefined,
        column,
      })
    } else {
      addTask({
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        dueDate: dueDate || undefined,
        column,
      })
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
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
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

          {/* Priority + Date row */}
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

            {/* Column + Due date */}
            <div className="flex flex-col gap-3">
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

              <div>
                <label className="block text-xs font-body font-500 text-text-secondary mb-1.5">
                  Fecha límite
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="form-input w-full px-3 py-2 rounded-xl text-xs font-body cursor-pointer"
                />
              </div>
            </div>
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
