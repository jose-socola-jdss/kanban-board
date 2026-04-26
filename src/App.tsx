import { useCallback, useEffect, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, supabaseConfigured } from './lib/supabase'
import { Header } from './components/Header'
import { Board } from './components/Board'
import { ActivitiesBoard } from './components/MonthlyBoard'
import { ActivityCelebration } from './components/ActivityCelebration'
import { Login } from './components/Login'
import { useTheme } from './hooks/useTheme'
import { useKanbanStore } from './store/kanbanStore'

interface ActivityCelebrationItem {
  id: string
  title: string
}

// undefined = todavía verificando sesión | null = sin sesión | Session = autenticado
type SessionState = Session | null | undefined

export default function App() {
  const { theme, toggle } = useTheme()
  const isDark = theme === 'dark'
  const activeView = useKanbanStore((s) => s.activeView)
  const loadUserData = useKanbanStore((s) => s.loadUserData)
  const isLoading = useKanbanStore((s) => s.isLoading)

  const [session, setSession] = useState<SessionState>(undefined)
  const [activityCelebration, setActivityCelebration] = useState<ActivityCelebrationItem | null>(null)
  const celebrationQueue = useRef<ActivityCelebrationItem[]>([])

  // ── Escucha cambios de sesión ──────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) loadUserData(session.user.id)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session?.user) loadUserData(session.user.id)
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

  // ── Autenticado → mostrar tablero ──────────────────────────────────────────
  return (
    <div
      className="grain min-h-screen flex flex-col bg-surface-0 relative"
      style={{ backgroundColor: 'rgb(var(--surface-0))' }}
    >
      {/* Background radial glow — adapts per theme */}
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

      {/* Pattern overlay — adapts per theme */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={
          isDark
            ? {
                backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.18) 1.2px, transparent 1.2px)',
                backgroundSize: '32px 32px',
                opacity: 0.65,
              }
            : {
                backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.14) 1.2px, transparent 1.2px)',
                backgroundSize: '32px 32px',
                opacity: 0.55,
              }
        }
      />

      {activityCelebration && <ActivityCelebration title={activityCelebration.title} />}

      {/* Content */}
      <div className="relative z-10 flex flex-col flex-1 min-h-screen">
        <Header
          isDark={isDark}
          onToggleTheme={toggle}
          onSignOut={() => supabase.auth.signOut()}
        />
        <main className="flex-1 flex flex-col min-h-0 pt-6">
          {activeView === 'projects'
            ? <ActivitiesBoard />
            : <Board onActivityCompleted={enqueueActivityCelebration} />}
        </main>
      </div>
    </div>
  )
}
