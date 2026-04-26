import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid,
} from 'recharts'
import { CheckCircle2, Clock, Flame, Target, TrendingUp, Zap, Award, AlertTriangle } from 'lucide-react'
import { useKanbanStore } from '../store/kanbanStore'

const COLORS = {
  pending:   '#ff6b6b',
  thisWeek:  '#5da8ff',
  completed: '#4dd0a8',
  low:       '#4ade80',
  medium:    '#fbbf24',
  high:      '#f87171',
}

function StatCard({ icon: Icon, label, value, sub, color = 'teal' }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color?: string
}) {
  const colorMap: Record<string, string> = {
    teal:    'bg-teal-500/10 text-teal-400',
    rose:    'bg-rose-500/10 text-rose-400',
    amber:   'bg-amber-500/10 text-amber-400',
    emerald: 'bg-emerald-500/10 text-emerald-400',
    blue:    'bg-blue-500/10 text-blue-400',
    violet:  'bg-violet-500/10 text-violet-400',
  }
  return (
    <div className="flex items-start gap-4 p-5 rounded-2xl bg-surface-1 border border-border/60 hover:border-border transition-all">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${colorMap[color]}`}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-body text-text-muted">{label}</p>
        <p className="font-display text-2xl font-700 text-text-primary leading-none mt-0.5">{value}</p>
        {sub && <p className="text-[11px] font-body text-text-muted mt-1 leading-snug">{sub}</p>}
      </div>
    </div>
  )
}

export function StatsPage() {
  const tasks = useKanbanStore((s) => s.tasks)
  const activities = useKanbanStore((s) => s.activities)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const stats = useMemo(() => {
    const total = tasks.length
    const completed = tasks.filter((t) => t.column === 'completed')
    const pending = tasks.filter((t) => t.column === 'pending')
    const inProgress = tasks.filter((t) => t.column === 'thisWeek')
    const overdue = tasks.filter((t) => {
      if (t.column === 'completed' || !t.dueDate) return false
      return new Date(t.dueDate + 'T00:00:00') < today
    })

    // Completion rate
    const completionRate = total > 0 ? Math.round((completed.length / total) * 100) : 0

    // This week completions
    const weekStart = new Date(today)
    weekStart.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1))
    const completedThisWeek = completed.filter((t) => t.completedAt && new Date(t.completedAt) >= weekStart)

    // Last week completions (for comparison)
    const lastWeekStart = new Date(weekStart); lastWeekStart.setDate(lastWeekStart.getDate() - 7)
    const completedLastWeek = completed.filter((t) =>
      t.completedAt && new Date(t.completedAt) >= lastWeekStart && new Date(t.completedAt) < weekStart
    )
    const weekGrowth = completedLastWeek.length > 0
      ? Math.round(((completedThisWeek.length - completedLastWeek.length) / completedLastWeek.length) * 100)
      : completedThisWeek.length > 0 ? 100 : 0

    // Last 7 days bar data
    const last7: { day: string; completadas: number; creadas: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      const dateStr = d.toISOString().slice(0, 10)
      const dayLabel = d.toLocaleDateString('es-ES', { weekday: 'short' })
      const dayCompleted = completed.filter((t) => t.completedAt?.slice(0, 10) === dateStr).length
      const dayCreated = tasks.filter((t) => t.createdAt.slice(0, 10) === dateStr).length
      last7.push({ day: dayLabel, completadas: dayCompleted, creadas: dayCreated })
    }

    // Last 4 weeks trend
    const last4Weeks: { semana: string; completadas: number }[] = []
    for (let w = 3; w >= 0; w--) {
      const wStart = new Date(weekStart); wStart.setDate(wStart.getDate() - w * 7)
      const wEnd = new Date(wStart); wEnd.setDate(wEnd.getDate() + 7)
      const wCompleted = completed.filter((t) =>
        t.completedAt && new Date(t.completedAt) >= wStart && new Date(t.completedAt) < wEnd
      ).length
      last4Weeks.push({
        semana: `Sem ${4 - w}`,
        completadas: wCompleted,
      })
    }

    // Priority distribution
    const byPriority = [
      { name: 'Alta', value: tasks.filter((t) => t.priority === 'high').length, color: COLORS.high },
      { name: 'Media', value: tasks.filter((t) => t.priority === 'medium').length, color: COLORS.medium },
      { name: 'Baja', value: tasks.filter((t) => t.priority === 'low').length, color: COLORS.low },
    ]

    // Status distribution
    const byStatus = [
      { name: 'Pendientes', value: pending.length, color: COLORS.pending },
      { name: 'Para hoy', value: inProgress.length, color: COLORS.thisWeek },
      { name: 'Finalizadas', value: completed.length, color: COLORS.completed },
    ]

    // Avg tasks completed per day (last 30 days)
    const month30 = completed.filter((t) => {
      if (!t.completedAt) return false
      const d = new Date(t.completedAt)
      const diff = (today.getTime() - d.getTime()) / 86400000
      return diff <= 30
    })
    const avgPerDay = month30.length > 0 ? (month30.length / 30).toFixed(1) : '0'

    // Streak: consecutive days with at least 1 completion
    let streak = 0
    let checkDate = new Date(today)
    while (true) {
      const ds = checkDate.toISOString().slice(0, 10)
      const hasCompletion = completed.some((t) => t.completedAt?.slice(0, 10) === ds)
      if (!hasCompletion) break
      streak++
      checkDate.setDate(checkDate.getDate() - 1)
    }

    // Most productive day
    const completionsByDow: Record<number, number> = {}
    completed.forEach((t) => {
      if (!t.completedAt) return
      const dow = new Date(t.completedAt).getDay()
      completionsByDow[dow] = (completionsByDow[dow] ?? 0) + 1
    })
    const DOW_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
    const bestDow = Object.entries(completionsByDow).sort((a, b) => b[1] - a[1])[0]
    const bestDayName = bestDow ? DOW_NAMES[parseInt(bestDow[0])] : null

    // Insight messages
    const insights: { icon: React.ElementType; text: string; color: string }[] = []
    if (streak >= 3) insights.push({ icon: Flame, text: `¡Llevas ${streak} días seguidos completando tareas! Mantén el ritmo.`, color: 'amber' })
    if (weekGrowth > 0) insights.push({ icon: TrendingUp, text: `Esta semana completaste ${weekGrowth}% más que la semana pasada.`, color: 'emerald' })
    if (overdue.length > 0) insights.push({ icon: AlertTriangle, text: `Tienes ${overdue.length} tarea${overdue.length > 1 ? 's' : ''} vencida${overdue.length > 1 ? 's' : ''}. Revísalas en Vista General.`, color: 'rose' })
    if (bestDayName) insights.push({ icon: Award, text: `Tu día más productivo es el ${bestDayName}. ¡Aprovéchalo!`, color: 'violet' })
    if (completionRate >= 80) insights.push({ icon: Zap, text: `Tasa de completado ${completionRate}% — ¡excelente rendimiento!`, color: 'teal' })
    if (inProgress.length > 5) insights.push({ icon: Target, text: `Tienes ${inProgress.length} tareas para hoy. Considera priorizar.`, color: 'blue' })

    // Project stats
    const projectStats = activities.map((a) => {
      const actTasks = tasks.filter((t) => t.activityId === a.id)
      const done = actTasks.filter((t) => t.column === 'completed').length
      const pct = actTasks.length > 0 ? Math.round((done / actTasks.length) * 100) : 0
      return { title: a.title, total: actTasks.length, done, pct }
    }).sort((a, b) => b.pct - a.pct)

    return {
      total, completed: completed.length, pending: pending.length, inProgress: inProgress.length,
      overdue: overdue.length, completionRate, completedThisWeek: completedThisWeek.length,
      weekGrowth, last7, last4Weeks, byPriority, byStatus, avgPerDay, streak, bestDayName,
      insights, projectStats,
    }
  }, [tasks, activities])

  const insightColors: Record<string, string> = {
    amber:   'bg-amber-500/8 border-amber-500/20 text-amber-400',
    emerald: 'bg-emerald-500/8 border-emerald-500/20 text-emerald-400',
    rose:    'bg-rose-500/8 border-rose-500/20 text-rose-400',
    violet:  'bg-violet-500/8 border-violet-500/20 text-violet-400',
    teal:    'bg-teal-500/8 border-teal-500/20 text-teal-400',
    blue:    'bg-blue-500/8 border-blue-500/20 text-blue-400',
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Title */}
      <div>
        <h2 className="font-display text-2xl font-700 text-text-primary leading-none">Estadísticas</h2>
        <p className="text-xs font-body text-text-muted mt-1">Tu actividad y progreso a lo largo del tiempo</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={CheckCircle2} label="Completadas en total" value={stats.completed} sub={`${stats.completionRate}% del total`} color="emerald" />
        <StatCard icon={Flame}        label="Racha actual" value={`${stats.streak}d`} sub={stats.streak > 0 ? 'días consecutivos' : 'Sin racha activa'} color="amber" />
        <StatCard icon={TrendingUp}   label="Esta semana" value={stats.completedThisWeek} sub={stats.weekGrowth >= 0 ? `+${stats.weekGrowth}% vs semana anterior` : `${stats.weekGrowth}% vs semana anterior`} color="teal" />
        <StatCard icon={Clock}        label="Promedio/día" value={stats.avgPerDay} sub="tareas completadas (30d)" color="blue" />
        <StatCard icon={AlertTriangle} label="Vencidas" value={stats.overdue} sub="sin completar y atrasadas" color="rose" />
        <StatCard icon={Target}       label="Para hoy" value={stats.inProgress} sub="en la columna Para hoy" color="blue" />
        <StatCard icon={Zap}          label="Pendientes" value={stats.pending} sub="aún sin comenzar" color="amber" />
        <StatCard icon={Award}        label="Día más productivo" value={stats.bestDayName ?? '—'} sub="mayor cantidad de completadas" color="violet" />
      </div>

      {/* Insights */}
      {stats.insights.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-body font-600 text-text-muted uppercase tracking-widest">Insights</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {stats.insights.map((insight, i) => {
              const Icon = insight.icon
              return (
                <div key={i} className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${insightColors[insight.color]}`}>
                  <Icon size={14} className="mt-0.5 flex-shrink-0" />
                  <span className="text-xs font-body leading-snug">{insight.text}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Last 7 days bar */}
        <div className="p-5 rounded-2xl bg-surface-1 border border-border/60">
          <h3 className="text-sm font-body font-600 text-text-primary mb-4">Actividad últimos 7 días</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.last7} barGap={4}>
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: 'DM Sans' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: 'DM Sans' }} axisLine={false} tickLine={false} width={24} />
              <Tooltip
                contentStyle={{ background: 'rgb(var(--surface-3))', border: '1px solid var(--color-border)', borderRadius: '12px', fontSize: '11px', fontFamily: 'DM Sans' }}
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
              />
              <Bar dataKey="completadas" fill={COLORS.completed} radius={[4, 4, 0, 0]} name="Completadas" />
              <Bar dataKey="creadas" fill={COLORS.thisWeek} radius={[4, 4, 0, 0]} name="Creadas" fillOpacity={0.6} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Weekly trend line */}
        <div className="p-5 rounded-2xl bg-surface-1 border border-border/60">
          <h3 className="text-sm font-body font-600 text-text-primary mb-4">Tendencia semanal</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={stats.last4Weeks}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="semana" tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: 'DM Sans' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: 'DM Sans' }} axisLine={false} tickLine={false} width={24} />
              <Tooltip
                contentStyle={{ background: 'rgb(var(--surface-3))', border: '1px solid var(--color-border)', borderRadius: '12px', fontSize: '11px', fontFamily: 'DM Sans' }}
              />
              <Line type="monotone" dataKey="completadas" stroke={COLORS.completed} strokeWidth={2} dot={{ fill: COLORS.completed, r: 4 }} name="Completadas" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Priority donut */}
        <div className="p-5 rounded-2xl bg-surface-1 border border-border/60">
          <h3 className="text-sm font-body font-600 text-text-primary mb-4">Distribución por prioridad</h3>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width={140} height={140}>
              <PieChart>
                <Pie data={stats.byPriority} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={3} dataKey="value">
                  {stats.byPriority.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: 'rgb(var(--surface-3))', border: '1px solid var(--color-border)', borderRadius: '12px', fontSize: '11px', fontFamily: 'DM Sans' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-2">
              {stats.byPriority.map((p) => (
                <div key={p.name} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: p.color }} />
                  <span className="text-xs font-body text-text-secondary">{p.name}</span>
                  <span className="text-xs font-body font-600 text-text-primary ml-auto">{p.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Status donut */}
        <div className="p-5 rounded-2xl bg-surface-1 border border-border/60">
          <h3 className="text-sm font-body font-600 text-text-primary mb-4">Distribución por estado</h3>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width={140} height={140}>
              <PieChart>
                <Pie data={stats.byStatus} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={3} dataKey="value">
                  {stats.byStatus.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: 'rgb(var(--surface-3))', border: '1px solid var(--color-border)', borderRadius: '12px', fontSize: '11px', fontFamily: 'DM Sans' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-2">
              {stats.byStatus.map((s) => (
                <div key={s.name} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
                  <span className="text-xs font-body text-text-secondary">{s.name}</span>
                  <span className="text-xs font-body font-600 text-text-primary ml-auto">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Project progress */}
      {stats.projectStats.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-body font-600 text-text-muted uppercase tracking-widest">Progreso por proyecto</h3>
          <div className="rounded-2xl border border-border/60 bg-surface-1 overflow-hidden">
            {stats.projectStats.map((p, i) => (
              <div
                key={p.title}
                className={`flex items-center gap-5 px-5 py-4 ${i < stats.projectStats.length - 1 ? 'border-b border-border/40' : ''}`}
              >
                <span className="text-sm font-body font-500 text-text-primary flex-1 min-w-0 truncate">{p.title}</span>
                <span className="text-xs font-body text-text-muted flex-shrink-0 w-16 text-right">{p.done}/{p.total}</span>
                <div className="w-32 h-2 rounded-full bg-surface-4 flex-shrink-0">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-400 transition-all duration-700"
                    style={{ width: `${p.pct}%` }}
                  />
                </div>
                <span className="text-sm font-body font-700 text-text-primary flex-shrink-0 w-10 text-right">{p.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
