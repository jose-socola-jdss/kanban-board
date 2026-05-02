import { useState, useMemo } from 'react'
import { Plus, Search, Filter, FolderKanban, ClipboardList, Trash2, CheckSquare, Square, X } from 'lucide-react'
import { useKanbanStore } from '../store/kanbanStore'
import { PRIORITY_CONFIG, COLUMNS } from '../types'
import type { ColumnId, Priority, Task } from '../types'
import { getTaskDateForSorting } from '../utils/date'

type SortKey = 'createdAt' | 'dueDate' | 'priority' | 'title'
type GroupKey = 'status' | 'project' | 'priority' | 'scheduling' | 'none'

const PRIORITY_ORDER: Record<Priority, number> = { high: 0, medium: 1, low: 2 }
const SCHEDULING_GROUP_LABELS = {
  none: 'Sin fecha',
  fixed: 'Fecha fija',
  recurring: 'Programacion especial',
} as const

interface OverviewPageProps {
  onNewTask: () => void
  onNewProject: () => void
  onEditTask: (task: Task) => void
}

export function OverviewPage({ onNewTask, onNewProject, onEditTask }: OverviewPageProps) {
  const tasks = useKanbanStore((s) => s.tasks)
  const activities = useKanbanStore((s) => s.activities)
  const holidays = useKanbanStore((s) => s.holidays)
  const deleteTask = useKanbanStore((s) => s.deleteTask)
  const moveTask = useKanbanStore((s) => s.moveTask)

  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<ColumnId | 'all'>('all')
  const [filterPriority, setFilterPriority] = useState<Priority | 'all'>('all')
  const [filterProject, setFilterProject] = useState<string>('all')
  const [sortKey, setSortKey] = useState<SortKey>('createdAt')
  const [groupBy, setGroupBy] = useState<GroupKey>('scheduling')
  const [showFilters, setShowFilters] = useState(false)

  // Bulk selection
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const today = new Date(); today.setHours(0, 0, 0, 0)

  const filtered = useMemo(() => {
    return tasks
      .filter((t) => {
        if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false
        if (filterStatus !== 'all' && t.column !== filterStatus) return false
        if (filterPriority !== 'all' && t.priority !== filterPriority) return false
        if (filterProject !== 'all' && (t.activityId ?? 'none') !== filterProject) return false
        return true
      })
      .sort((a, b) => {
        if (sortKey === 'priority') return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
        if (sortKey === 'title') return a.title.localeCompare(b.title)
        if (sortKey === 'dueDate') {
          const aDate = getTaskDateForSorting(a, holidays)
          const bDate = getTaskDateForSorting(b, holidays)
          if (!aDate && !bDate) return 0
          if (!aDate) return 1
          if (!bDate) return -1
          return aDate.localeCompare(bDate)
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })
  }, [tasks, search, filterStatus, filterPriority, filterProject, sortKey, holidays])

  const grouped = useMemo(() => {
    if (groupBy === 'none') return { 'Todas': filtered }
    return filtered.reduce<Record<string, typeof filtered>>((acc, t) => {
      let key = ''
      if (groupBy === 'status') key = COLUMNS.find((c) => c.id === t.column)?.label ?? t.column
      else if (groupBy === 'priority') key = PRIORITY_CONFIG[t.priority].label
      else if (groupBy === 'scheduling') {
        key = SCHEDULING_GROUP_LABELS[t.schedulingType ?? 'none']
      }
      else if (groupBy === 'project') {
        const act = activities.find((a) => a.id === t.activityId)
        key = act ? act.title : 'Sin proyecto'
      }
      if (!acc[key]) acc[key] = []
      acc[key].push(t)
      return acc
    }, {})
  }, [filtered, groupBy, activities])

  const allFilteredIds = filtered.map((t) => t.id)
  const allSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => selected.has(id))
  const someSelected = selected.size > 0

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(allFilteredIds))
    }
  }

  const handleBulkDelete = () => {
    if (!confirm(`¿Eliminar ${selected.size} tarea${selected.size > 1 ? 's' : ''}? Esta acción no se puede deshacer.`)) return
    selected.forEach((id) => deleteTask(id))
    setSelected(new Set())
  }

  const handleBulkMove = (column: ColumnId) => {
    selected.forEach((id) => moveTask(id, column))
    setSelected(new Set())
  }

  const statusColor: Record<ColumnId, string> = {
    pending:   'bg-rose-400/15 text-rose-400 border-rose-400/20',
    thisWeek:  'bg-blue-400/15 text-blue-400 border-blue-400/20',
    completed: 'bg-emerald-400/15 text-emerald-400 border-emerald-400/20',
  }
  const statusLabel: Record<ColumnId, string> = {
    pending:   'Pendiente',
    thisWeek:  'Para hoy',
    completed: 'Finalizada',
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-display text-2xl font-700 text-text-primary leading-none">Vista General</h2>
          <p className="text-xs font-body text-text-muted mt-1">{tasks.length} tareas · {activities.length} proyectos</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onNewProject}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-body font-500 text-text-secondary bg-surface-3 border border-border hover:border-border-hover hover:text-text-primary transition-all"
          >
            <FolderKanban size={13} />
            Nuevo proyecto
          </button>
          <button
            onClick={onNewTask}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-body font-500 text-white bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 transition-all shadow-lg shadow-teal-500/20"
          >
            <Plus size={13} />
            Nueva tarea
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar tarea..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 rounded-xl text-xs font-body text-text-primary bg-surface-3 border border-border hover:border-border-hover focus:outline-none focus:border-teal-500/40 transition-all placeholder:text-text-muted"
          />
        </div>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-body font-500 border transition-all ${showFilters ? 'bg-teal-500/10 border-teal-500/30 text-teal-400' : 'bg-surface-3 border-border text-text-muted hover:text-text-secondary'}`}
        >
          <Filter size={12} />
          Filtros
        </button>
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-3 border border-border">
          <span className="text-[10px] font-body text-text-muted uppercase tracking-wide">Agrupar</span>
          <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as GroupKey)} className="text-xs font-body text-text-primary bg-transparent outline-none cursor-pointer">
            <option value="status">Estado</option>
            <option value="project">Proyecto</option>
            <option value="priority">Prioridad</option>
            <option value="scheduling">Tipo de programacion</option>
            <option value="none">Sin agrupar</option>
          </select>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-3 border border-border">
          <span className="text-[10px] font-body text-text-muted uppercase tracking-wide">Ordenar</span>
          <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} className="text-xs font-body text-text-primary bg-transparent outline-none cursor-pointer">
            <option value="createdAt">Creación</option>
            <option value="dueDate">Fecha límite</option>
            <option value="priority">Prioridad</option>
            <option value="title">Título</option>
          </select>
        </div>
      </div>

      {/* Expanded filters */}
      {showFilters && (
        <div className="flex items-center gap-3 flex-wrap p-4 rounded-2xl bg-surface-1 border border-border/50">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-body text-text-muted uppercase tracking-wide">Estado</span>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as ColumnId | 'all')} className="text-xs font-body text-text-primary bg-surface-3 border border-border rounded-lg px-2 py-1 outline-none">
              <option value="all">Todos</option>
              <option value="pending">Pendiente</option>
              <option value="thisWeek">Para hoy</option>
              <option value="completed">Finalizada</option>
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-body text-text-muted uppercase tracking-wide">Prioridad</span>
            <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value as Priority | 'all')} className="text-xs font-body text-text-primary bg-surface-3 border border-border rounded-lg px-2 py-1 outline-none">
              <option value="all">Todas</option>
              <option value="high">Alta</option>
              <option value="medium">Media</option>
              <option value="low">Baja</option>
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-body text-text-muted uppercase tracking-wide">Proyecto</span>
            <select value={filterProject} onChange={(e) => setFilterProject(e.target.value)} className="text-xs font-body text-text-primary bg-surface-3 border border-border rounded-lg px-2 py-1 outline-none">
              <option value="all">Todos</option>
              <option value="none">Sin proyecto</option>
              {activities.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
            </select>
          </div>
          <button onClick={() => { setFilterStatus('all'); setFilterPriority('all'); setFilterProject('all') }} className="text-[10px] font-body text-text-muted hover:text-rose-400 transition-colors ml-auto">
            Limpiar filtros
          </button>
        </div>
      )}

      {/* Bulk action bar */}
      {someSelected && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-teal-500/8 border border-teal-500/20 animate-scale-in">
          <button onClick={() => setSelected(new Set())} className="text-text-muted hover:text-text-primary transition-colors">
            <X size={14} />
          </button>
          <span className="text-xs font-body font-500 text-teal-400">{selected.size} seleccionada{selected.size > 1 ? 's' : ''}</span>
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            <span className="text-[10px] font-body text-text-muted">Mover a:</span>
            {(['pending', 'thisWeek', 'completed'] as ColumnId[]).map((col) => (
              <button
                key={col}
                onClick={() => handleBulkMove(col)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-body font-500 border transition-all ${statusColor[col]}`}
              >
                {statusLabel[col]}
              </button>
            ))}
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-body font-500 bg-rose-400/10 text-rose-400 border border-rose-400/20 hover:bg-rose-400/20 transition-all"
            >
              <Trash2 size={10} />
              Eliminar
            </button>
          </div>
        </div>
      )}

      {/* Task groups */}
      {Object.entries(grouped).map(([groupName, groupTasks]) => (
        <div key={groupName} className="flex flex-col gap-2">
          <div className="flex items-center gap-2 mb-1">
            {/* Select-all per group not implemented, but global select-all below */}
            <span className="text-[10px] font-body font-600 text-text-muted uppercase tracking-widest">{groupName}</span>
            <span className="text-[10px] font-body text-text-muted bg-surface-3 border border-border px-1.5 py-0.5 rounded-full">{groupTasks.length}</span>
            <div className="flex-1 h-px bg-border/50 ml-1" />
          </div>

          <div className="rounded-2xl border border-border/60 bg-surface-1 overflow-hidden">
            {/* Group header with select-all */}
            <div className="flex items-center gap-3 px-5 py-2 border-b border-border/30 bg-surface-3/20">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  const groupIds = groupTasks.map((t) => t.id)
                  const allGroupSelected = groupIds.every((id) => selected.has(id))
                  setSelected((prev) => {
                    const next = new Set(prev)
                    if (allGroupSelected) groupIds.forEach((id) => next.delete(id))
                    else groupIds.forEach((id) => next.add(id))
                    return next
                  })
                }}
                className="text-text-muted hover:text-teal-400 transition-colors flex-shrink-0"
                title="Seleccionar grupo"
              >
                {groupTasks.every((t) => selected.has(t.id)) && groupTasks.length > 0
                  ? <CheckSquare size={13} className="text-teal-400" />
                  : <Square size={13} />
                }
              </button>
              <span className="text-[10px] font-body text-text-muted">Seleccionar todo el grupo</span>
            </div>

            {groupTasks.length === 0 ? (
              <div className="px-5 py-6 text-center text-xs font-body text-text-muted">No hay tareas en este grupo</div>
            ) : (
              groupTasks.map((task, i) => {
                const activity = activities.find((a) => a.id === task.activityId)
                const pCfg = PRIORITY_CONFIG[task.priority]
                const effectiveDueDate = getTaskDateForSorting(task, holidays)
                const dueDate = effectiveDueDate ? new Date(effectiveDueDate + 'T00:00:00') : null
                const isOverdue = dueDate && dueDate < today && task.column !== 'completed'
                const dueDays = dueDate ? Math.round((dueDate.getTime() - today.getTime()) / 86400000) : null
                const isSelected = selected.has(task.id)

                return (
                  <div
                    key={task.id}
                    onClick={() => onEditTask(task)}
                    className={`
                      group/row flex items-center gap-4 px-5 py-3 transition-all cursor-pointer
                      ${i < groupTasks.length - 1 ? 'border-b border-border/40' : ''}
                      ${isSelected ? 'bg-teal-500/5' : 'hover:bg-surface-3/40'}
                    `}
                  >
                    {/* Checkbox */}
                    <button
                      onClick={(e) => toggleSelect(task.id, e)}
                      className="flex-shrink-0 text-text-muted hover:text-teal-400 transition-colors"
                      title="Seleccionar"
                    >
                      {isSelected
                        ? <CheckSquare size={14} className="text-teal-400" />
                        : <Square size={14} className="opacity-0 group-hover/row:opacity-100 transition-opacity" />
                      }
                    </button>

                    {/* Status chip */}
                    <span className={`inline-flex items-center text-[10px] font-body font-500 px-2 py-0.5 rounded-full border flex-shrink-0 ${statusColor[task.column]}`}>
                      {statusLabel[task.column]}
                    </span>

                    {/* Title */}
                    <span className={`flex-1 text-sm font-body font-500 text-text-primary min-w-0 truncate ${task.column === 'completed' ? 'line-through text-text-muted' : ''}`}>
                      {task.title}
                    </span>

                    {/* Project */}
                    {activity ? (
                      <span className="hidden md:flex items-center gap-1 text-[10px] font-body text-text-muted flex-shrink-0">
                        <FolderKanban size={9} />
                        <span className="max-w-[100px] truncate">{activity.title}</span>
                      </span>
                    ) : (
                      <span className="hidden md:flex items-center gap-1 text-[10px] font-body text-text-muted/40 flex-shrink-0">
                        <ClipboardList size={9} />
                        Sin proyecto
                      </span>
                    )}

                    {/* Priority */}
                    <span className={`hidden sm:inline text-[10px] font-body font-500 flex-shrink-0 ${pCfg.color}`}>
                      {pCfg.label}
                    </span>

                    {/* Due date */}
                    {dueDate && (
                      <span className={`hidden md:inline text-[10px] font-body flex-shrink-0 ${isOverdue ? 'text-rose-400' : 'text-text-muted'}`}>
                        {dueDays === 0 ? 'Hoy' : dueDays === 1 ? 'Mañana' : dueDays && dueDays < 0 ? `Hace ${Math.abs(dueDays)}d` : `${dueDays}d`}
                      </span>
                    )}

                    {/* Delete on hover */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (confirm(`¿Eliminar "${task.title}"?`)) deleteTask(task.id)
                      }}
                      title="Eliminar tarea"
                      className="flex-shrink-0 p-1 rounded-lg text-text-muted opacity-0 group-hover/row:opacity-100 hover:text-rose-400 hover:bg-rose-400/10 transition-all"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </div>
      ))}

      {/* Global select-all */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between">
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-2 text-xs font-body text-text-muted hover:text-text-primary transition-colors"
          >
            {allSelected
              ? <CheckSquare size={13} className="text-teal-400" />
              : <Square size={13} />
            }
            {allSelected ? 'Deseleccionar todo' : 'Seleccionar todo'}
          </button>
          <span className="text-[10px] font-body text-text-muted">{filtered.length} de {tasks.length} tareas</span>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <ClipboardList size={32} className="text-text-muted opacity-30" />
          <p className="text-sm font-body text-text-muted">No se encontraron tareas con los filtros actuales</p>
        </div>
      )}

      {/* Project summary */}
      {activities.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-body font-600 text-text-muted uppercase tracking-widest">Proyectos</span>
            <div className="flex-1 h-px bg-border/50" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {activities.map((activity) => {
              const actTasks = tasks.filter((t) => t.activityId === activity.id)
              const done = actTasks.filter((t) => t.column === 'completed').length
              const pct = actTasks.length > 0 ? Math.round((done / actTasks.length) * 100) : 0
              const isCompleted = activity.column === 'completed'
              return (
                <div key={activity.id} className="flex flex-col gap-3 p-4 rounded-2xl bg-surface-1 border border-border/60 hover:border-border transition-all">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-lg bg-teal-500/10 flex items-center justify-center flex-shrink-0">
                        <FolderKanban size={11} className="text-teal-400" />
                      </div>
                      <span className="text-sm font-body font-500 text-text-primary truncate">{activity.title}</span>
                    </div>
                    <span className={`text-[10px] font-body font-500 px-2 py-0.5 rounded-full border flex-shrink-0 ${isCompleted ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' : 'bg-blue-400/10 text-blue-400 border-blue-400/20'}`}>
                      {isCompleted ? 'Completado' : 'En curso'}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-body text-text-muted">{done} / {actTasks.length} tareas</span>
                      <span className="text-[10px] font-body font-600 text-text-primary">{pct}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-surface-4">
                      <div className="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-400 transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  {activity.dueDate && (
                    <span className="text-[10px] font-body text-text-muted">
                      Fecha límite: {new Date(activity.dueDate + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
