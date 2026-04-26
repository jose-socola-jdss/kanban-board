import { LayoutGrid, List, CalendarDays, BarChart3, PanelLeftClose, PanelLeftOpen, Sun, Moon, LogOut } from 'lucide-react'
import { useKanbanStore } from '../store/kanbanStore'
import type { ViewMode } from '../types'

const NAV_ITEMS: { view: ViewMode; icon: React.ElementType; label: string }[] = [
  { view: 'tasks',    icon: LayoutGrid,   label: 'Mi Tablero'    },
  { view: 'overview', icon: List,         label: 'Vista General' },
  { view: 'calendar', icon: CalendarDays, label: 'Calendario'    },
  { view: 'stats',    icon: BarChart3,    label: 'Estadísticas'  },
]

interface SidebarProps {
  isDark: boolean
  onToggleTheme: () => void
  onSignOut: () => void
  collapsed: boolean
  onToggleCollapse?: () => void
}

export function Sidebar({ isDark, onToggleTheme, onSignOut, collapsed }: SidebarProps) {
  const { activeView, setActiveView } = useKanbanStore()

  return (
    <aside
      className={`
        fixed left-0 top-0 h-full z-50 flex flex-col items-center py-5 gap-1
        bg-surface-1/90 backdrop-blur-md border-r border-border/50
        transition-all duration-300 ease-in-out
        ${collapsed ? 'w-0 overflow-hidden opacity-0 pointer-events-none' : 'w-14 opacity-100'}
      `}
    >
      {/* Logo */}
      <div className="w-7 h-7 rounded-lg bg-surface-3 border border-border flex items-center justify-center mb-3 relative flex-shrink-0">
        <LayoutGrid size={13} className="text-text-secondary" />
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-pending animate-pulse-subtle" />
      </div>

      {/* Nav items */}
      <nav className="flex flex-col gap-1.5 flex-1 w-full px-2">
        {NAV_ITEMS.map(({ view, icon: Icon, label }) => {
          const isActive = activeView === view || (view === 'tasks' && activeView === 'projects')
          return (
            <button
              key={view}
              onClick={() => setActiveView(view)}
              title={label}
              className={`
                group relative flex items-center justify-center w-full h-9 rounded-xl transition-all duration-150
                ${isActive
                  ? 'bg-surface-3 text-text-primary shadow-sm border border-border'
                  : 'text-text-muted hover:text-text-secondary hover:bg-surface-3/60'
                }
              `}
            >
              <Icon size={16} />
              <span className="pointer-events-none absolute left-full ml-2.5 px-2.5 py-1.5 rounded-lg bg-surface-3 border border-border text-[11px] font-body font-500 text-text-primary shadow-card whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50">
                {label}
              </span>
              {isActive && (
                <span className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-teal-400" />
              )}
            </button>
          )
        })}
      </nav>

      {/* Bottom controls */}
      <div className="flex flex-col gap-1.5 w-full px-2">
        {/* Theme toggle */}
        <button
          onClick={onToggleTheme}
          title={isDark ? 'Modo claro' : 'Modo oscuro'}
          className="group relative flex items-center justify-center w-full h-9 rounded-xl text-text-muted hover:text-text-secondary hover:bg-surface-3/60 transition-all duration-150"
        >
          {isDark ? <Moon size={16} /> : <Sun size={16} />}
          <span className="pointer-events-none absolute left-full ml-2.5 px-2.5 py-1.5 rounded-lg bg-surface-3 border border-border text-[11px] font-body font-500 text-text-primary shadow-card whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50">
            {isDark ? 'Modo claro' : 'Modo oscuro'}
          </span>
        </button>

        {/* Sign out */}
        <button
          onClick={onSignOut}
          title="Cerrar sesión"
          className="group relative flex items-center justify-center w-full h-9 rounded-xl text-text-muted hover:text-rose-400 hover:bg-rose-400/10 transition-all duration-150"
        >
          <LogOut size={16} />
          <span className="pointer-events-none absolute left-full ml-2.5 px-2.5 py-1.5 rounded-lg bg-surface-3 border border-border text-[11px] font-body font-500 text-text-primary shadow-card whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50">
            Cerrar sesión
          </span>
        </button>
      </div>
    </aside>
  )
}

// Collapse toggle button — shown outside sidebar so it remains visible when sidebar is hidden
export function SidebarToggle({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      title={collapsed ? 'Mostrar barra lateral' : 'Ocultar barra lateral'}
      className={`
        fixed top-4 z-50 flex items-center justify-center w-7 h-7 rounded-lg
        bg-surface-3 border border-border text-text-muted hover:text-text-primary hover:border-border-hover
        shadow-card transition-all duration-300
        ${collapsed ? 'left-2' : 'left-[52px]'}
      `}
    >
      {collapsed ? <PanelLeftOpen size={13} /> : <PanelLeftClose size={13} />}
    </button>
  )
}
