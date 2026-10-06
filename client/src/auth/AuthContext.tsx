import { useState, type ReactNode } from 'react'
import type { AuthSession } from '../types/auth'
import { AuthContext } from './context'

export function AuthProvider({ children }: { children: ReactNode }) {
  // Memory-only: no credentials or tokens written to browser storage.
  const [session, setSession] = useState<AuthSession | null>(null)
  return <AuthContext.Provider value={{ session, signIn: setSession, logout: () => setSession(null) }}>
    {children}
  </AuthContext.Provider>
}
