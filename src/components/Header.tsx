import { LayoutGrid } from 'lucide-react'
import { useKanbanStore } from '../store/kanbanStore'

export function Header() {
  const { activeView, setActiveView } = useKanbanStore()

  const today = new Date()
  const dateStr = today.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <header className="relative z-10 px-6 md:px-10 pt-8 pb-6">
      <div className="max-w-[1400px] mx-auto flex items-start justify-between gap-4 flex-wrap">
        {/* Logo + Title */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-surface-3 border border-border shadow-card flex items-center justify-center">
              <LayoutGrid size={18} className="text-text-secondary" />
            </div>
            <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-pending animate-pulse-subtle" />
          </div>
          <div>
            <h1 className="font-display text-xl font-700 text-text-primary leading-none tracking-tight">
              Mi Tablero
            </h1>
            <p className="text-xs text-text-muted font-body mt-0.5 capitalize">{dateStr}</p>
          </div>
        </div>

        {/* View switcher — only control remaining in header */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-surface-3 border border-border">
          <button
            onClick={() => setActiveView('tasks')}
            className={`px-3 py-1.5 rounded-lg text-xs font-body font-500 transition-all duration-150 ${
              activeView === 'tasks'
                ? 'bg-surface-0 text-text-primary shadow-sm border border-border'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            Tareas
          </button>
          <button
            onClick={() => setActiveView('projects')}
            className={`px-3 py-1.5 rounded-lg text-xs font-body font-500 transition-all duration-150 ${
              activeView === 'projects'
                ? 'bg-surface-0 text-text-primary shadow-sm border border-border'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            Proyectos
          </button>
        </div>
      </div>
    </header>
  )
}
