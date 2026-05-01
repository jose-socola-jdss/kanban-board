import { useMemo, useState } from 'react'
import { CalendarPlus2, Trash2, CalendarDays } from 'lucide-react'
import { useKanbanStore } from '../store/kanbanStore'

export function HolidaysPage() {
  const holidays = useKanbanStore((state) => state.holidays)
  const holidaysAvailable = useKanbanStore((state) => state.holidaysAvailable)
  const addHoliday = useKanbanStore((state) => state.addHoliday)
  const updateHoliday = useKanbanStore((state) => state.updateHoliday)
  const deleteHoliday = useKanbanStore((state) => state.deleteHoliday)

  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [error, setError] = useState('')

  const upcoming = useMemo(
    () => holidays.slice().sort((a, b) => a.date.localeCompare(b.date)),
    [holidays],
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !date) {
      setError('Nombre y fecha son requeridos')
      return
    }
    addHoliday({ name: name.trim(), date })
    setName('')
    setDate('')
    setError('')
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-2xl font-700 text-text-primary leading-none">Feriados</h2>
        <p className="text-xs font-body text-text-muted mt-1">
          Gestiona las fechas no laborables que afectan tus programaciones especiales.
        </p>
      </div>

      {!holidaysAvailable && (
        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-xs text-amber-300">
          La tabla `holidays` todavia no existe en Supabase. La app sigue funcionando, pero para guardar feriados debes aplicar la migracion incluida en `supabase/migrations`.
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-4">
        <form onSubmit={handleSubmit} className="rounded-2xl border border-border/60 bg-surface-1 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center">
              <CalendarPlus2 size={15} />
            </div>
            <div>
              <h3 className="text-sm font-body font-600 text-text-primary">Nuevo feriado</h3>
              <p className="text-[11px] font-body text-text-muted">Disponible para ajustar fechas habiles</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-body font-500 text-text-secondary mb-1.5">Nombre</label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError('') }}
              placeholder="Ej. Navidad"
              className="form-input w-full px-3.5 py-2.5 rounded-xl text-sm font-body"
            />
          </div>

          <div>
            <label className="block text-xs font-body font-500 text-text-secondary mb-1.5">Fecha</label>
            <input
              type="date"
              value={date}
              onChange={(e) => { setDate(e.target.value); setError('') }}
              className="form-input w-full px-3.5 py-2.5 rounded-xl text-sm font-body cursor-pointer"
            />
          </div>

          {error && <p className="text-xs text-rose-400">{error}</p>}

          <button
            type="submit"
            className="w-full px-4 py-2.5 rounded-xl text-sm font-body font-500 text-white bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 transition-all shadow-lg shadow-teal-500/20"
          >
            Guardar feriado
          </button>
        </form>

        <div className="rounded-2xl border border-border/60 bg-surface-1 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
            <div>
              <h3 className="text-sm font-body font-600 text-text-primary">Base de datos de feriados</h3>
              <p className="text-[11px] font-body text-text-muted mt-0.5">{upcoming.length} fecha{upcoming.length === 1 ? '' : 's'} registradas</p>
            </div>
          </div>

          {upcoming.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <CalendarDays size={26} className="text-text-muted opacity-30" />
              <p className="text-xs font-body text-text-muted">Aun no has creado feriados.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {upcoming.map((holiday) => (
                <div key={holiday.id} className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_180px_40px] gap-3 px-5 py-3 items-center">
                  <input
                    type="text"
                    value={holiday.name}
                    onChange={(e) => updateHoliday(holiday.id, { name: e.target.value })}
                    className="form-input w-full px-3 py-2 rounded-xl text-sm font-body"
                  />
                  <input
                    type="date"
                    value={holiday.date}
                    onChange={(e) => updateHoliday(holiday.id, { date: e.target.value })}
                    className="form-input w-full px-3 py-2 rounded-xl text-sm font-body cursor-pointer"
                  />
                  <button
                    onClick={() => deleteHoliday(holiday.id)}
                    title="Eliminar feriado"
                    className="p-2 rounded-xl text-text-muted hover:text-rose-400 hover:bg-rose-400/10 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
