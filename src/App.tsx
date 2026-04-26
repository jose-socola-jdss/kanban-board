import { useCallback, useEffect, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, supabaseConfigured } from './lib/supabase'
import { Header } from './components/Header'
import { Sidebar } from './components/Sidebar'
import { Board } from './components/Board'
import { ActivitiesBoard } from './components/MonthlyBoard'
import { ActivityCelebration } from './components/ActivityCelebration'
import { Login } from './components/Login'
import { TaskModal } from './components/TaskModal'
import { ActivityModal } from './components/GoalModal'
import { OverviewPage } from './pages/OverviewPage'
import { CalendarPage } from './pages/CalendarPage'
import { StatsPage } from './pages/StatsPage'
import { useTheme } from './hooks/useTheme'
import { useKanbanStore } from './store/kanbanStore'
import type { ColumnId } from './types'

interface ActivityCelebrationItem {
  id: string
  title: string
}

// undefined = todavía verificando sesión | null = sin sesión | Session = autenticado
type SessionState = Session | null | undefined

// Pages that use the board's own header
const BOARD_VIEWS = ['tasks', 'projects'] as const

export default function App() {
  const { theme, toggle } = useTheme()
  const isDark = theme === 'dark'
  const activeView = useKanbanStore((s) => s.activeView)
  const loadUserData = useKanbanStore((s) => s.loadUserData)
  const isLoading = useKanbanStore((s) => s.isLoading)

  const [session, setSession] = useState<SessionState>(undefined)
  const [activityCelebration, setActivityCelebration] = useState<ActivityCelebrationItem | null>(null)
  const celebrationQueue = useRef<ActivityCelebrationItem[]>([])

  // Quick-create state for new views
  const [showNewTask, setShowNewTask] = useState(false)
  const [newTaskDefaultColumn, setNewTaskDefaultColumn] = useState<ColumnId>('pending')
  const [newTaskDefaultDate, setNewTaskDefaultDate] = useState<string | undefined>()
  const [showNewProject, setShowNewProject] = useState(false)

  // ── Escucha cambios de sesión ──────────────────────────────────────────────
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession)
      if (currentSession?.user) {
        loadUserData(currentSession.user.id)
      }
    })
    return () => subscription.unsubscribe()
  }, [loadUserData])

  // ── Cola de celebraciones ──────────────────────────────────────────────────
  const enqueueActivityCelebration = useCallback((activity: ActivityCelebrationItem) => {
    const queuedIds = new Set(
      [activityCelebration?.id, ...celebrationQueue.current.map((i) => i.id)].filter(Boolean) as string[],
    )
    if (queuedIds.has(activity.id)) return
    celebrationQueue.current.push(activity)
    if (!activityCelebration) setActivityCelebration(celebrationQueue.current.shift() ?? null)
  }, [activityCelebration])

  useEffect(() => {
    if (activityCelebration) {
      const t = setTimeout(() => setActivityCelebration(null), 3200)
      return () => clearTimeout(t)
    }
    if (celebrationQueue.current.length > 0) {
      setActivityCelebration(celebrationQueue.current.shift() ?? null)
    }
  }, [activityCelebration])

  // ── Helpers to open modals from new pages ─────────────────────────────────
  const handleNewTask = (defaultDate?: string) => {
    setNewTaskDefaultDate(defaultDate)
    setNewTaskDefaultColumn('pending')
    setShowNewTask(true)
  }

  const handleNewProject = () => {
    setShowNewProject(true)
  }

  // ── Variables de entorno no configuradas ──────────────────────────────────
  if (!supabaseConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black px-6">
        <div className="max-w-md text-center">
          <p className="text-rose-400 text-sm font-mono bg-rose-400/10 border border-rose-400/20 rounded-xl px-5 py-4">
            ⚠️ Variables de entorno no encontradas.<br />
            Añade <strong>VITE_SUPABASE_URL</strong> y <strong>VITE_SUPABASE_ANON_KEY</strong> en Vercel → Settings → Environment Variables y haz redeploy.
          </p>
        </div>
      </div>
    )
  }

  // ── Pantalla de carga inicial (verificando sesión) ─────────────────────────
  if (session === undefined || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="w-8 h-8 rounded-full border-2 border-teal-500/30 border-t-teal-500 animate-spin" />
      </div>
    )
  }

  // ── Sin sesión → mostrar login ─────────────────────────────────────────────
  if (session === null) {
    return <Login />
  }

  const isBoardView = (BOARD_VIEWS as readonly string[]).includes(activeView)

  // ── Autenticado → mostrar tablero + navegación ────────────────────────────
  return (
    <div
      className="grain min-h-screen bg-surface-0 relative"
      style={{ backgroundColor: 'rgb(var(--surface-0))' }}
    >
      {/* Background radial glow */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background: isDark
            ? `
                radial-gradient(ellipse 80% 50% at 20% -10%, rgba(255,107,107,0.035) 0%, transparent 60%),
                radial-gradient(ellipse 60% 40% at 80% 10%, rgba(0,191,165,0.05) 0%, transparent 50%),
                radial-gradient(ellipse 50% 60% at 50% 100%, rgba(77,208,225,0.03) 0%, transparent 60%)
              `
            : `
                radial-gradient(ellipse 80% 50% at 20% -10%, rgba(255,107,107,0.06) 0%, transparent 55%),
                radial-gradient(ellipse 60% 40% at 80% 10%, rgba(0,191,165,0.07) 0%, transparent 50%),
                radial-gradient(ellipse 50% 60% at 50% 105%, rgba(77,208,225,0.05) 0%, transparent 55%)
              `,
        }}
      />

      {/* Dot pattern */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={
          isDark
            ? { backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.18) 1.2px, transparent 1.2px)', backgroundSize: '32px 32px', opacity: 0.65 }
            : { backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.14) 1.2px, transparent 1.2px)', backgroundSize: '32px 32px', opacity: 0.55 }
        }
      />

      {activityCelebration && <ActivityCelebration title={activityCelebration.title} />}

      {/* Sidebar — always visible when logged in */}
      <Sidebar />

      {/* Main layout pushed right by sidebar width (56px = w-14) */}
      <div className="relative z-10 flex flex-col min-h-screen pl-14">
        {/* Header — only for board views */}
        {isBoardView && (
          <Header
            isDark={isDark}
            onToggleTheme={toggle}
            onSignOut={() => supabase.auth.signOut()}
          />
        )}

        {/* Global header for non-board pages */}
        {!isBoardView && (
          <header className="px-6 md:px-10 pt-8 pb-4 flex items-center justify-between gap-4 max-w-[1400px] mx-auto w-full">
            <div className="flex items-center gap-3">
              <div>
                <p className="text-[10px] font-body text-text-muted uppercase tracking-widest">Mi Tablero</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggle}
                className="theme-toggle"
                title={isDark ? 'Modo claro' : 'Modo oscuro'}
                aria-label={isDark ? 'Activar modo claro' : 'Activar modo oscuro'}
              >
                <div className="theme-toggle-knob">
                  {isDark
                    ? <span className="theme-toggle-icon text-[10px]">🌙</span>
                    : <span className="theme-toggle-icon text-[10px]">☀️</span>
                  }
                </div>
              </button>
              <button
                onClick={() => supabase.auth.signOut()}
                title="Cerrar sesión"
                className="flex items-center justify-center w-9 h-9 rounded-xl bg-surface-3 border border-border text-text-muted hover:text-text-secondary hover:border-border-hover transition-all duration-150 text-sm"
              >
                ↪
              </button>
            </div>
          </header>
        )}

        <main className="flex-1 flex flex-col min-h-0">
          {/* Board views */}
          {activeView === 'projects' && (
            <ActivitiesBoard />
          )}
          {activeView === 'tasks' && (
            <Board onActivityCompleted={enqueueActivityCelebration} />
          )}

          {/* New views — shared padding */}
          {(activeView === 'overview' || activeView === 'calendar' || activeView === 'stats') && (
            <div className="px-6 md:px-10 pb-10 pt-2 max-w-[1400px] mx-auto w-full">
              {activeView === 'overview' && (
                <OverviewPage onNewTask={handleNewTask} onNewProject={handleNewProject} />
              )}
              {activeView === 'calendar' && (
                <CalendarPage onNewTask={handleNewTask} />
              )}
              {activeView === 'stats' && (
                <StatsPage />
              )}
            </div>
          )}
        </main>
      </div>

      {/* Global modals for new views */}
      {showNewTask && (
        <TaskModal
          defaultColumn={newTaskDefaultColumn}
          defaultDueDate={newTaskDefaultDate}
          onClose={() => { setShowNewTask(false); setNewTaskDefaultDate(undefined) }}
        />
      )}
      {showNewProject && (
        <ActivityModal
          onClose={() => setShowNewProject(false)}
        />
      )}
    </div>
  )
}
