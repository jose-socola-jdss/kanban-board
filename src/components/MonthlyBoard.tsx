import { useState, type CSSProperties } from 'react'
import { CheckCircle2, Circle, Clock } from 'lucide-react'
import { Plus } from 'lucide-react'
import type { Activity, ColumnConfig, ColumnId, Task } from '../types'
import { COLUMNS } from '../types'
import { useKanbanStore } from '../store/kanbanStore'
import { ActivityCard } from './GoalCard'
import { ActivityModal } from './GoalModal'

const COLUMN_ICONS = {
  pending: Circle,
  thisWeek: Clock,
  completed: CheckCircle2,
}

/** Derives which column an activity belongs to based purely on task completion. */
function computeActivityColumn(activityId: string, tasks: Task[]): ColumnId {
  const activityTasks = tasks.filter((t) => t.activityId === activityId)
  if (activityTasks.length === 0) return 'pending'
  const completed = activityTasks.filter((t) => t.column === 'completed').length
  if (completed === 0) return 'pending'
  if (completed === activityTasks.length) return 'completed'
  return 'thisWeek'
}

export function ActivitiesBoard() {
  const { activities, tasks } = useKanbanStore()

  const oneDayAgo = new Date(); oneDayAgo.setDate(oneDayAgo.getDate() - 1)
  const visibleActivities = activities.filter((a) => {
    const col = computeActivityColumn(a.id, tasks)
    if (col !== 'completed') return true
    return !!a.completedAt && new Date(a.completedAt) > oneDayAgo
  })

  return (
    <div className="flex gap-4 md:gap-5 px-6 md:px-10 pb-8 flex-1 min-h-0 max-w-[1400px] mx-auto w-full">
      {COLUMNS.map((col, i) => {
        const colActivities = visibleActivities.filter(
          (a) => computeActivityColumn(a.id, tasks) === col.id
        )
        return (
          <ActivityColumn
            key={col.id}
            column={col}
            activities={colActivities}
            tasks={tasks}
            enterIndex={(i + 1) as 1 | 2 | 3}
          />
        )
      })}
    </div>
  )
}

interface ActivityColumnProps {
  column: ColumnConfig
  activities: Activity[]
  tasks: Task[]
  enterIndex: 1 | 2 | 3
}

function ActivityColumn({ column, activities, tasks, enterIndex }: ActivityColumnProps) {
  const [showModal, setShowModal] = useState(false)
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null)

  const Icon = COLUMN_ICONS[column.id]
  const canAdd = column.id === 'pending'

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
      <div className={`col-enter-${enterIndex} flex flex-col min-h-0 flex-1`} style={{ minWidth: 0 }}>
        <div className="column-panel flex flex-col min-h-0 rounded-2xl border transition-all duration-200" style={panelStyle}>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-border flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${column.accentColor}18` }}>
                <Icon size={14} style={{ color: column.accentColor }} />
              </div>
              <div>
                <h2 className="font-display text-sm font-600 text-text-primary leading-none">{column.label}</h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="h-0.5 w-4 rounded-full opacity-70" style={{ background: column.accentColor }} />
                  <span className="text-[10px] font-body text-text-muted">
                    {activities.length} {activities.length === 1 ? 'proyecto' : 'proyectos'}
                  </span>
                </div>
              </div>
            </div>

            {canAdd ? (
              <button
                onClick={() => setShowModal(true)}
                className="p-1.5 rounded-lg border transition-all duration-150 text-text-muted border-border hover:border-border-hover hover:text-text-primary"
                title="Agregar proyecto"
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = `${column.accentColor}15` }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                <Plus size={14} />
              </button>
            ) : (
              <div className="w-8 h-8" aria-hidden="true" />
            )}
          </div>

          {/* Activity list */}
          <div
            className="column-scroll flex-1 p-3 space-y-2.5 overflow-y-auto min-h-[120px]"
            style={{ maxHeight: 'calc(100vh - 260px)' }}
          >
            {activities.length > 0 ? (
              activities.map((activity) => (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  column={column}
                  tasks={tasks.filter((t) => t.activityId === activity.id)}
                  onEdit={(a) => setEditingActivity(a)}
                />
              ))
            ) : (
              <ActivityEmptyState column={column} />
            )}
          </div>

        </div>
      </div>

      {showModal && (
        <ActivityModal defaultColumn={column.id} onClose={() => setShowModal(false)} />
      )}
      {editingActivity && (
        <ActivityModal activity={editingActivity} onClose={() => setEditingActivity(null)} />
      )}
    </>
  )
}

function ActivityEmptyState({ column }: { column: ColumnConfig }) {
  const messages: Record<ColumnId, string> = {
    pending:   'Sin proyectos pendientes',
    thisWeek:  'Ningún proyecto en progreso',
    completed: 'Aún sin proyectos completados',
  }
  return (
    <div className="flex flex-col items-center justify-center py-10 rounded-xl border border-dashed border-border/50">
      <div className="w-8 h-8 rounded-full mb-3 flex items-center justify-center" style={{ background: `${column.accentColor}15` }}>
        <div className="w-2 h-2 rounded-full" style={{ background: column.accentColor, opacity: 0.6 }} />
      </div>
      <p className="text-xs font-body text-text-muted text-center px-4">
        {messages[column.id]}
      </p>
    </div>
  )
}
