import { LayoutGrid, List, CalendarDays, BarChart3, FolderKanban } from 'lucide-react'
import { useKanbanStore } from '../store/kanbanStore'
import type { ViewMode } from '../types'

const NAV_ITEMS: { view: ViewMode; icon: React.ElementType; label: string }[] = [
  { view: 'tasks',    icon: LayoutGrid,   label: 'Mi Tablero'     },
  { view: 'projects', icon: FolderKanban, label: 'Proyectos'      },
  { view: 'overview', icon: List,         label: 'Vista General'  },
  { view: 'calendar', icon: CalendarDays, label: 'Calendario'     },
  { view: 'stats',    icon: BarChart3,    label: 'Estadísticas'   },
]

export function Sidebar() {
  const { activeView, setActiveView } = useKanbanStore()

  return (
    <aside className="fixed left-0 top-0 h-full z-50 flex flex-col items-center py-6 gap-2 w-14 bg-surface-1/80 backdrop-blur-md border-r border-border/50">
      {/* Logo dot */}
      <div className="w-7 h-7 rounded-lg bg-surface-3 border border-border flex items-center justify-center mb-4 relative">
        <LayoutGrid size={13} className="text-text-secondary" />
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-pending animate-pulse-subtle" />
      </div>

      <nav className="flex flex-col gap-1.5 flex-1 w-full px-2">
        {NAV_ITEMS.map(({ view, icon: Icon, label }) => {
          const isActive = activeView === view
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
              {/* Tooltip */}
              <span className="pointer-events-none absolute left-full ml-2.5 px-2.5 py-1.5 rounded-lg bg-surface-3 border border-border text-[11px] font-body font-500 text-text-primary shadow-card whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50">
                {label}
              </span>
              {/* Active indicator */}
              {isActive && (
                <span className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-teal-400" />
              )}
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
