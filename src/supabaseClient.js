import { createClient } from '@supabase/supabase-js'

// Estas dos variables se configuran en Netlify:
// Site settings → Environment variables
//   VITE_SUPABASE_URL      → la URL de tu proyecto Supabase
//   VITE_SUPABASE_ANON_KEY → la anon/public key (Settings → API en Supabase)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Faltan las variables VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. ' +
    'Crea un archivo .env en la raíz del proyecto (ver .env.example) o configúralas en Netlify.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
