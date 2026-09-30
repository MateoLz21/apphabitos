import type { Session } from '@supabase/supabase-js'
import { createContext, useContext } from 'react'

export type AuthContextValue = {
  session: Session | null
  loading: boolean
  configured: boolean
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth debe utilizarse dentro de AuthProvider')
  return context
}
