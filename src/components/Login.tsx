import { useState } from 'react'
import { LayoutGrid } from 'lucide-react'
import { supabase } from '../lib/supabase'

type Mode = 'login' | 'signup'

export function Login() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const reset = () => { setError(null); setInfo(null) }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    reset()

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(
        error.message === 'Invalid login credentials'
          ? 'Correo o contraseña incorrectos.'
          : error.message,
      )
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else setInfo('Revisa tu correo y confirma la cuenta para poder entrar.')
    }

    setLoading(false)
  }

  const switchMode = (next: Mode) => { setMode(next); reset() }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex items-center gap-3 justify-center mb-8">
          <div className="w-10 h-10 rounded-xl bg-[rgba(21,27,34,1)] border border-[rgba(255,255,255,0.09)] flex items-center justify-center">
            <LayoutGrid size={18} className="text-[#a8b5c3]" />
          </div>
          <h1 className="font-display text-xl font-700 text-white tracking-tight">Mi Tablero</h1>
        </div>

        {/* Card */}
        <div className="bg-[rgba(15,20,25,0.97)] border border-[rgba(255,255,255,0.09)] rounded-2xl p-8 shadow-2xl">
          <h2 className="font-display text-lg font-600 text-white mb-1">
            {mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
          </h2>
          <p className="text-sm text-[#a8b5c3] mb-6">
            {mode === 'login'
              ? 'Accede a tu tablero personal.'
              : 'Tu cuenta es solo para ti — nadie más verá tus datos.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-500 text-[#a8b5c3] mb-1.5">
                Correo electrónico
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                className="w-full rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.09)] px-3.5 py-2.5 text-sm text-white placeholder:text-[#64707d] outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/20 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-500 text-[#a8b5c3] mb-1.5">
                Contraseña
              </label>
              <input
                type="password"
                required
                minLength={6}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.09)] px-3.5 py-2.5 text-sm text-white placeholder:text-[#64707d] outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/20 transition"
              />
            </div>

            {error && (
              <p className="text-xs text-rose-400 bg-rose-400/10 border border-rose-400/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            {info && (
              <p className="text-xs text-teal-400 bg-teal-400/10 border border-teal-400/20 rounded-lg px-3 py-2">
                {info}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 active:bg-teal-600 text-white text-sm font-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? 'Cargando...'
                : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
            </button>
          </form>

          <div className="mt-5 text-center">
            {mode === 'login' ? (
              <p className="text-xs text-[#64707d]">
                ¿No tienes cuenta?{' '}
                <button
                  onClick={() => switchMode('signup')}
                  className="text-[#a8b5c3] hover:text-white transition-colors underline underline-offset-2"
                >
                  Crear una
                </button>
              </p>
            ) : (
              <p className="text-xs text-[#64707d]">
                ¿Ya tienes cuenta?{' '}
                <button
                  onClick={() => switchMode('login')}
                  className="text-[#a8b5c3] hover:text-white transition-colors underline underline-offset-2"
                >
                  Iniciar sesión
                </button>
              </p>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
