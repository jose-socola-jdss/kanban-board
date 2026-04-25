import type { Activity, Task } from '../types'
import { COLUMNS } from '../types'
import { GripVertical } from 'lucide-react'

interface ActivityDragCardProps {
  activity: Activity
  tasks: Task[]
}

export function ActivityDragCard({ activity, tasks }: ActivityDragCardProps) {
  const column = COLUMNS.find((c) => c.id === activity.column)!
  const completedCount = tasks.filter((t) => t.column === 'completed').length
  const totalCount = tasks.length
  const isCompleted = activity.column === 'completed'

  return (
    <div
      className="rounded-xl border border-border-hover bg-surface-3 shadow-drag"
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
            {activity.title}
          </h3>
        </div>
        {activity.description && (
          <p className="text-xs text-text-secondary font-body leading-relaxed mb-3 ml-5 line-clamp-1">
            {activity.description}
          </p>
        )}
        {totalCount > 0 && (
          <div className="ml-5">
            <span className="text-[10px] font-body text-text-muted">
              {completedCount}/{totalCount} tareas
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
