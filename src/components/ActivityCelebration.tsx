import { CheckCircle2, Sparkles } from 'lucide-react'

interface ActivityCelebrationProps {
  title: string
}

const CONFETTI_COLORS = ['#14b8a6', '#f59e0b', '#22c55e', '#a78bfa', '#f472b6', '#38bdf8']
const PARTICLE_COLORS = ['#2dd4bf', '#fbbf24', '#4ade80', '#c4b5fd', '#f9a8d4']

export function ActivityCelebration({ title }: ActivityCelebrationProps) {
  return (
    <div className="activity-celebration-screen pointer-events-none fixed inset-0 z-40 flex items-center justify-center overflow-hidden px-6">
      <div className="activity-celebration-backdrop absolute inset-0" />
      <div className="activity-celebration-aura absolute left-1/2 top-1/2 h-[44rem] w-[44rem] -translate-x-1/2 -translate-y-1/2 rounded-full" />

      {/* Expanding ring ripples */}
      {[0, 0.16, 0.32].map((delay, i) => (
        <div
          key={`ring-${i}`}
          className="activity-celebration-ring absolute left-1/2 top-1/2 rounded-full"
          style={{
            width: '16rem',
            height: '16rem',
            ['--ring-delay' as string]: `${delay}s`,
          }}
        />
      ))}

      {/* Inner burst rays */}
      {[...Array(14)].map((_, i) => (
        <span
          key={`burst-${i}`}
          className="activity-celebration-burst absolute left-1/2 top-1/2 h-24 w-1 rounded-full"
          style={{
            ['--burst-angle' as string]: `${i * (360 / 14)}deg`,
            ['--burst-delay' as string]: `${i * 0.03}s`,
          }}
        />
      ))}

      {/* Outer burst rays */}
      {[...Array(8)].map((_, i) => (
        <span
          key={`burst-outer-${i}`}
          className="activity-celebration-burst-outer absolute left-1/2 top-1/2 h-36 w-px rounded-full"
          style={{
            ['--burst-angle' as string]: `${i * 45 + 22.5}deg`,
            ['--burst-delay' as string]: `${0.07 + i * 0.04}s`,
          }}
        />
      ))}

      {/* Particles */}
      {[...Array(24)].map((_, i) => (
        <span
          key={`particle-${i}`}
          className="activity-celebration-particle absolute left-1/2 top-1/2 rounded-full"
          style={{
            width: `${i % 3 === 0 ? 12 : i % 3 === 1 ? 9 : 7}px`,
            height: `${i % 3 === 0 ? 12 : i % 3 === 1 ? 9 : 7}px`,
            ['--particle-angle' as string]: `${i * 15}deg`,
            ['--particle-distance' as string]: `${140 + (i % 5) * 28}px`,
            ['--particle-delay' as string]: `${i * 0.022}s`,
            background: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
          }}
        />
      ))}

      {/* Confetti */}
      {[...Array(30)].map((_, i) => (
        <span
          key={`confetti-${i}`}
          className="activity-celebration-confetti absolute left-1/2 top-1/2"
          style={{
            width: `${4 + (i % 3) * 3}px`,
            height: `${6 + (i % 5) * 4}px`,
            borderRadius: i % 5 === 0 ? '50%' : '2px',
            ['--confetti-angle' as string]: `${i * 12}deg`,
            ['--confetti-distance' as string]: `${110 + (i % 7) * 22}px`,
            ['--confetti-spin' as string]: `${180 + (i % 4) * 90}deg`,
            ['--confetti-delay' as string]: `${0.04 + i * 0.026}s`,
            background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          }}
        />
      ))}

      <div className="activity-celebration-card relative z-10 w-full max-w-md overflow-hidden rounded-[28px] border border-white/20 px-7 py-8 text-center shadow-2xl">
        <div className="activity-celebration-card-shine absolute inset-0 rounded-[28px]" />

        <div className="activity-celebration-check-ring mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-400/85 text-white">
            <CheckCircle2 size={26} strokeWidth={2.4} />
          </div>
        </div>

        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-body font-500 uppercase tracking-[0.24em] text-white/80">
          <Sparkles size={12} />
          Actividad completada
        </div>

        <h2 className="font-display text-2xl font-600 text-white sm:text-[2rem]">
          ¡Actividad terminada, carajo!
        </h2>

        <p className="mt-3 text-sm font-body leading-relaxed text-white/82 sm:text-[15px]">
          <span className="font-500">&quot;{title}&quot;</span> quedo cerrada.
        </p>
      </div>
    </div>
  )
}
