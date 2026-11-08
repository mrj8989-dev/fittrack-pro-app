import { createContext, useContext, useState, useEffect } from 'react'
import api from '../lib/api'

interface User {
  id: string
  email: string
  name: string
  role: string
  profilePhoto?: string | null
  mustChangePassword?: boolean
  /** Solo clientes: FREE, PRO o PREMIUM. */
  subscriptionPlan?: string | null
}

export interface AuthSession {
  access_token: string
  user: User
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  updateUser: (patch: Partial<User>) => void
  /** Sustituye token y usuario (p. ej. tras cambiar la contraseña). */
  applySession: (session: AuthSession) => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem('ft-token')
  )
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const savedToken = localStorage.getItem('ft-token')
    const savedUser = localStorage.getItem('ft-user')
    if (savedToken && savedUser) {
      setToken(savedToken)
      setUser(JSON.parse(savedUser))
      // Refresca rol y plan por si un admin los ha cambiado desde el último inicio de sesión.
      api.get<User>('/auth/me')
        .then(({ data }) => {
          setUser(data)
          localStorage.setItem('ft-user', JSON.stringify(data))
        })
        .catch(() => { /* 401 lo gestiona el interceptor; otros errores: seguimos con lo guardado */ })
    }
    setIsLoading(false)
  }, [])

  const applySession = (session: AuthSession) => {
    setToken(session.access_token)
    setUser(session.user)
    localStorage.setItem('ft-token', session.access_token)
    localStorage.setItem('ft-user', JSON.stringify(session.user))
  }

  const login = async (email: string, password: string) => {
    const { data } = await api.post<AuthSession>('/auth/login', { email, password })
    applySession(data)
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('ft-token')
    localStorage.removeItem('ft-user')
    window.location.href = '/login'
  }

  const updateUser = (patch: Partial<User>) => {
    setUser(prev => {
      if (!prev) return prev
      const next = { ...prev, ...patch }
      localStorage.setItem('ft-user', JSON.stringify(next))
      return next
    })
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser, applySession, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}