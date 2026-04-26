import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Plus, FolderKanban, ClipboardList, Pencil } from 'lucide-react'
import { useKanbanStore } from '../store/kanbanStore'
import { PRIORITY_CONFIG } from '../types'
import type { Task } from '../types'
import { TaskModal } from '../components/TaskModal'

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

interface CalendarPageProps {
  onNewTask: (defaultDate?: string) => void
  onNewProject: () => void
}

export function CalendarPage({ onNewTask, onNewProject }: CalendarPageProps) {
  const tasks = useKanbanStore((s) => s.tasks)
  const activities = useKanbanStore((s) => s.activities)

  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  // Task edit modal
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1) }
    else setMonth((m) => m - 1)
  }
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1) }
    else setMonth((m) => m + 1)
  }
  const goToday = () => {
    setYear(today.getFullYear())
    setMonth(today.getMonth())
    setSelectedDate(today.toISOString().slice(0, 10))
  }

  const calGrid = useMemo(() => {
    const firstDay = new Date(year, month, 1)
    const startDow = (firstDay.getDay() + 6) % 7
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const prevDays = new Date(year, month, 0).getDate()

    const cells: { date: string; isCurrentMonth: boolean; isToday: boolean }[] = []
    for (let i = startDow - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevDays - i)
      cells.push({ date: d.toISOString().slice(0, 10), isCurrentMonth: false, isToday: false })
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(year, month, d)
      const dateStr = dt.toISOString().slice(0, 10)
      const isToday = dateStr === today.toISOString().slice(0, 10)
      cells.push({ date: dateStr, isCurrentMonth: true, isToday })
    }
    let next = 1
    while (cells.length < 42) {
      const d = new Date(year, month + 1, next++)
      cells.push({ date: d.toISOString().slice(0, 10), isCurrentMonth: false, isToday: false })
    }
    return cells
  }, [year, month])

  const tasksByDate = useMemo(() => {
    const map: Record<string, typeof tasks> = {}
    tasks.forEach((t) => {
      const key = t.dueDate ?? null
      if (!key) return
      if (!map[key]) map[key] = []
      map[key].push(t)
    })
    return map
  }, [tasks])

  const selectedTasks = selectedDate ? (tasksByDate[selectedDate] ?? []) : []
  const todayStr = today.toISOString().slice(0, 10)

  const statusDot: Record<string, string> = {
    pending:   'bg-rose-400',
    thisWeek:  'bg-blue-400',
    completed: 'bg-emerald-400',
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="font-display text-2xl font-700 text-text-primary leading-none">Calendario</h2>
            <p className="text-xs font-body text-text-muted mt-1">Visualiza tus tareas por fecha de entrega</p>
          </div>
          <button
            onClick={goToday}
            className="px-3 py-2 rounded-xl text-xs font-body font-500 text-text-secondary bg-surface-3 border border-border hover:border-border-hover transition-all"
          >
            Hoy
          </button>
        </div>

        {/* Month navigation */}
        <div className="flex items-center justify-between">
          <button onClick={prevMonth} className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-3 border border-transparent hover:border-border transition-all">
            <ChevronLeft size={16} />
          </button>
          <h3 className="font-display text-lg font-600 text-text-primary">
            {MONTHS[month]} {year}
          </h3>
          <button onClick={nextMonth} className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-3 border border-transparent hover:border-border transition-all">
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Calendar grid */}
        <div className="rounded-2xl border border-border/60 bg-surface-1 overflow-hidden">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-border/40">
            {WEEKDAYS.map((d) => (
              <div key={d} className="py-3 text-center text-[10px] font-body font-600 text-text-muted uppercase tracking-wide">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {calGrid.map((cell, i) => {
              const dayTasks = tasksByDate[cell.date] ?? []
              const isSelected = selectedDate === cell.date
              const isOverdue = cell.date < todayStr && cell.isCurrentMonth && dayTasks.some((t) => t.column !== 'completed')

              return (
                <div
                  key={i}
                  onClick={() => setSelectedDate(cell.date === selectedDate ? null : cell.date)}
                  className={`
                    group/day relative flex flex-col gap-0.5 p-1.5 min-h-[90px] border-b border-r border-border/30 transition-all cursor-pointer
                    ${!cell.isCurrentMonth ? 'opacity-30' : ''}
                    ${isSelected ? 'bg-teal-500/8' : 'hover:bg-surface-3/50'}
                  `}
                >
                  {/* Day number row */}
                  <div className="flex items-center justify-between mb-0.5">
                    <span className={`
                      w-6 h-6 flex items-center justify-center rounded-full text-[11px] font-body font-600 flex-shrink-0
                      ${cell.isToday ? 'bg-teal-500 text-white' : isSelected ? 'text-teal-400' : 'text-text-secondary'}
                    `}>
                      {new Date(cell.date + 'T12:00:00').getDate()}
                    </span>

                    {/* Hover quick-create buttons — visible only on hover of current-month cells */}
                    {cell.isCurrentMonth && (
                      <div
                        className="flex items-center gap-0.5 opacity-0 group-hover/day:opacity-100 transition-opacity duration-150"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => onNewTask(cell.date)}
                          title="Nueva tarea"
                          className="flex items-center justify-center w-5 h-5 rounded-md bg-teal-500/20 text-teal-400 hover:bg-teal-500 hover:text-white transition-all"
                        >
                          <Plus size={10} />
                        </button>
                        <button
                          onClick={() => onNewProject()}
                          title="Nuevo proyecto"
                          className="flex items-center justify-center w-5 h-5 rounded-md bg-surface-4/60 text-text-muted hover:bg-surface-4 hover:text-text-primary transition-all"
                        >
                          <FolderKanban size={9} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Task chips — clickable to edit */}
                  <div className="flex flex-col gap-0.5 w-full min-w-0">
                    {dayTasks.slice(0, 3).map((t) => {
                      const pCfg = PRIORITY_CONFIG[t.priority]
                      return (
                        <button
                          key={t.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditingTask(t)
                          }}
                          title={`${t.title} — clic para editar`}
                          className={`
                            group/chip relative text-left text-[9px] font-body font-500 px-1.5 py-0.5 rounded w-full truncate leading-tight
                            transition-all duration-100
                            ${t.column === 'completed'
                              ? 'bg-emerald-400/10 text-emerald-400/70 line-through hover:bg-emerald-400/20'
                              : `${pCfg.bg} ${pCfg.color} hover:brightness-110`
                            }
                          `}
                        >
                          <span className="flex items-center gap-1 min-w-0">
                            <span className="flex-1 truncate">{t.title}</span>
                            <Pencil size={7} className="flex-shrink-0 opacity-0 group-hover/chip:opacity-70 transition-opacity" />
                          </span>
                        </button>
                      )
                    })}
                    {dayTasks.length > 3 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedDate(cell.date)
                        }}
                        className="text-[9px] font-body text-text-muted pl-1 text-left hover:text-teal-400 transition-colors"
                      >
                        +{dayTasks.length - 3} más
                      </button>
                    )}
                  </div>

                  {/* Overdue indicator */}
                  {isOverdue && (
                    <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-rose-400" />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Selected day detail panel */}
        {selectedDate && (
          <div className="animate-scale-in rounded-2xl border border-border/60 bg-surface-1 p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <h4 className="font-display text-base font-600 text-text-primary">
                {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
              </h4>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onNewTask(selectedDate)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-body font-500 text-white bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 transition-all shadow-md shadow-teal-500/20"
                >
                  <Plus size={12} />
                  Nueva tarea
                </button>
                <button
                  onClick={onNewProject}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-body font-500 text-text-secondary bg-surface-3 border border-border hover:border-border-hover hover:text-text-primary transition-all"
                >
                  <FolderKanban size={12} />
                  Nuevo proyecto
                </button>
              </div>
            </div>

            {selectedTasks.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <ClipboardList size={24} className="text-text-muted opacity-30" />
                <p className="text-xs font-body text-text-muted">
                  No hay tareas para este día.{' '}
                  <button onClick={() => onNewTask(selectedDate)} className="text-teal-400 hover:underline">
                    Crear una
                  </button>
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {selectedTasks.map((task) => {
                  const pCfg = PRIORITY_CONFIG[task.priority]
                  const activity = activities.find((a) => a.id === task.activityId)
                  return (
                    <button
                      key={task.id}
                      onClick={() => setEditingTask(task)}
                      className="group/item flex items-center gap-3 px-4 py-2.5 rounded-xl bg-surface-3 border border-border/50 hover:border-border-hover hover:bg-surface-4/50 transition-all text-left w-full"
                    >
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDot[task.column]}`} />
                      <span className={`flex-1 text-sm font-body font-500 text-text-primary truncate ${task.column === 'completed' ? 'line-through text-text-muted' : ''}`}>
                        {task.title}
                      </span>
                      {activity && (
                        <span className="flex items-center gap-1 text-[10px] font-body text-text-muted flex-shrink-0">
                          <FolderKanban size={9} />
                          {activity.title}
                        </span>
                      )}
                      <span className={`text-[10px] font-body font-500 flex-shrink-0 ${pCfg.color}`}>{pCfg.label}</span>
                      <Pencil size={12} className="flex-shrink-0 text-text-muted opacity-0 group-hover/item:opacity-60 transition-opacity" />
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Inline task edit modal */}
      {editingTask && (
        <TaskModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
        />
      )}
    </>
  )
}
