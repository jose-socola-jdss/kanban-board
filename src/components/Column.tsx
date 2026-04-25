import { useState, type CSSProperties } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus, CheckCircle2, Circle, Clock } from 'lucide-react'
import type { Task, ColumnConfig } from '../types'
import { TaskCard } from './TaskCard'
import { TaskModal } from './TaskModal'

const COLUMN_ICONS = {
  pending: Circle,
  thisWeek: Clock,
  completed: CheckCircle2,
}

interface ColumnProps {
  column: ColumnConfig
  tasks: Task[]
  enterIndex: 1 | 2 | 3
  celebratingIds?: Set<string>
}

export function Column({ column, tasks, enterIndex, celebratingIds }: ColumnProps) {
  const [showModal, setShowModal] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  const { setNodeRef, isOver } = useDroppable({ id: column.id })

  const Icon = COLUMN_ICONS[column.id]
  const canAddTasks = column.id === 'pending'
  const panelStyle: CSSProperties = {
    ['--column-border' as string]: `${column.accentColor}26`,
    ['--column-border-hover' as string]: `${column.accentColor}50`,
    ['--column-bg' as string]: `linear-gradient(180deg, ${column.accentColor}08 0%, transparent 100%), rgb(var(--surface-1) / 0.58)`,
    ['--column-bg-hover' as string]: `linear-gradient(180deg, ${column.accentColor}12 0%, transparent 100%), rgb(var(--surface-2) / 0.84)`,
    ['--column-shadow' as string]: `0 10px 28px rgba(0,0,0,0.16), 0 0 0 1px ${column.accentColor}10`,
    ['--column-shadow-hover' as string]: `0 16px 40px rgba(0,0,0,0.22), 0 0 0 1px ${column.accentColor}24, 0 0 34px ${column.accentColor}10`,
  }

  return (
    <>
      <div
        className={`col-enter-${enterIndex} flex flex-col min-h-0 flex-1`}
        style={{ minWidth: 0 }}
      >
        {/* Column panel */}
        <div
          className={`
            column-panel flex flex-col min-h-0 rounded-2xl border transition-all duration-200
            ${isOver
              ? 'is-over'
              : ''
            }
          `}
          style={panelStyle}
        >
          {/* Column header */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-border flex-shrink-0">
            <div className="flex items-center gap-2.5">
              {/* Accent dot + icon */}
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: `${column.accentColor}18` }}
              >
                <Icon
                  size={14}
                  style={{ color: column.accentColor }}
                />
              </div>

              <div>
                <h2 className="font-display text-sm font-600 text-text-primary leading-none">
                  {column.label}
                </h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {/* Accent underline */}
                  <div
                    className="h-0.5 w-4 rounded-full opacity-70"
                    style={{ background: column.accentColor }}
                  />
                  <span className="text-[10px] font-body text-text-muted">
                    {tasks.length} {tasks.length === 1 ? 'tarea' : 'tareas'}
                  </span>
                </div>
              </div>
            </div>

            {/* Add task button */}
            {canAddTasks ? (
              <button
                onClick={() => setShowModal(true)}
                className={`
                  p-1.5 rounded-lg border transition-all duration-150 group
                  text-text-muted border-border
                  hover:border-border-hover hover:text-text-primary
                `}
                title="Agregar tarea"
                style={{
                  ['--hover-bg' as string]: `${column.accentColor}15`,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = `${column.accentColor}15`
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'transparent'
                }}
              >
                <Plus size={14} />
              </button>
            ) : (
              <div className="w-8 h-8" aria-hidden="true" />
            )}
          </div>

          {/* Task list — droppable area */}
          <div
            ref={setNodeRef}
            className={`
              column-scroll flex-1 p-3 space-y-2.5 overflow-y-auto
              min-h-[120px]
              transition-all duration-200
              ${isOver ? 'bg-white/[0.02]' : ''}
            `}
            style={{ maxHeight: 'calc(100vh - 260px)' }}
          >
            <SortableContext
              items={tasks.map((t) => t.id)}
              strategy={verticalListSortingStrategy}
            >
              {tasks.length > 0 ? (
                tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    column={column}
                    onEdit={(t) => setEditingTask(t)}
                    isCelebrating={celebratingIds?.has(task.id) ?? false}
                  />
                ))
              ) : (
                <EmptyState column={column} isOver={isOver} />
              )}
            </SortableContext>
          </div>

        </div>
      </div>

      {/* Modals */}
      {showModal && (
        <TaskModal
          defaultColumn={column.id}
          onClose={() => setShowModal(false)}
        />
      )}
      {editingTask && (
        <TaskModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
        />
      )}
    </>
  )
}

function EmptyState({ column, isOver }: { column: ColumnConfig; isOver: boolean }) {
  return (
    <div
      className={`
        flex flex-col items-center justify-center py-10 rounded-xl
        border border-dashed transition-all duration-200
        ${isOver
          ? 'border-border-hover bg-white/[0.02]'
          : 'border-border/50'
        }
      `}
      style={isOver ? { borderColor: `${column.accentColor}50` } : {}}
    >
      <div
        className="w-8 h-8 rounded-full mb-3 flex items-center justify-center"
        style={{ background: `${column.accentColor}15` }}
      >
        <div
          className="w-2 h-2 rounded-full"
          style={{ background: column.accentColor, opacity: 0.6 }}
        />
      </div>
      <p className="text-xs font-body text-text-muted text-center px-4">
        {isOver ? 'Suelta aquí' : column.emptyMsg}
      </p>
    </div>
  )
}
