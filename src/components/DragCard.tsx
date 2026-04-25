import type { Task } from '../types'
import { PRIORITY_CONFIG, COLUMNS } from '../types'
import { GripVertical } from 'lucide-react'

interface DragCardProps {
  task: Task
}

export function DragCard({ task }: DragCardProps) {
  const priority = PRIORITY_CONFIG[task.priority]
  const column = COLUMNS.find((c) => c.id === task.column)!
  const isCompleted = task.column === 'completed'

  return (
    <div
      className="rounded-xl border border-border-hover bg-surface-3 shadow-drag rotate-2"
      style={{
        boxShadow: `var(--shadow-drag), 0 0 0 1px var(--color-border-hover), 0 0 36px ${column.accentColor}18`,
        transform: 'rotate(2deg) scale(1.02)',
      }}
    >
      <div className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full" style={{ background: column.accentColor, opacity: 0.8 }} />
      <div className="px-4 py-3.5 pl-5">
        <div className="flex items-center gap-2 mb-2">
          <GripVertical size={14} className="text-text-muted flex-shrink-0" />
          <h3 className={`text-sm font-body font-500 text-text-primary leading-snug line-clamp-2 ${isCompleted ? 'line-through text-text-muted opacity-75' : ''}`}>
            {task.title}
          </h3>
        </div>
        {task.description && (
          <p className={`text-xs text-text-secondary font-body leading-relaxed mb-3 ml-5 line-clamp-1 ${isCompleted ? 'line-through text-text-muted opacity-70' : ''}`}>
            {task.description}
          </p>
        )}
        {!isCompleted && (
          <div className="ml-5">
            <span className={`
              inline-flex items-center gap-1.5 text-[10px] font-body font-500
              px-2 py-0.5 rounded-full ${priority.bg} ${priority.color}
            `}>
              <span className={`w-1 h-1 rounded-full ${priority.dot}`} />
              <span>{priority.label}</span>
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
