import { createContext } from 'react'
import type { AuthSession } from '../types/auth'

interface AuthContextValue {
  session: AuthSession | null
  signIn: (session: AuthSession) => void
  logout: () => void
}
export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
