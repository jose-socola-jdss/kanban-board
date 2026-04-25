import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!url || !key) {
  console.error('[Supabase] Variables de entorno no encontradas:', { url: !!url, key: !!key })
}

export const supabase = createClient(
  url ?? 'http://localhost',
  key ?? 'placeholder',
)

export const supabaseConfigured = !!url && !!key
