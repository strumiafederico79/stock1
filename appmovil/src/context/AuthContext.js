import { AppState } from 'react-native'
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'

import { api } from '../services/api'
import { clearStoredSession, getStoredSession, getStoredToken, getStoredUser, persistSession } from '../services/sessionStore'
import { sanitizeText, validateCredentials } from '../utils/security'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const appState = useRef(AppState.currentState)

  const logout = async () => {
    await clearStoredSession()
    setToken(null)
    setUser(null)
  }

  useEffect(() => {
    ;(async () => {
      const [storedToken, storedUser, storedSession] = await Promise.all([getStoredToken(), getStoredUser(), getStoredSession()])

      const session = storedSession ? JSON.parse(storedSession) : null
      if (session?.expiresAt && session.expiresAt < Date.now()) {
        await clearStoredSession()
        setToken(null)
        setUser(null)
      } else {
        setToken(storedToken)
        setUser(storedUser ? JSON.parse(storedUser) : null)
      }
      setLoading(false)
    })()
  }, [])

  useEffect(() => {
    const sub = AppState.addEventListener('change', async (nextState) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        const storedSession = await getStoredSession()
        const session = storedSession ? JSON.parse(storedSession) : null
        if (session?.expiresAt && session.expiresAt < Date.now()) {
          await logout()
        }
      }
      appState.current = nextState
    })

    return () => sub.remove()
  }, [token])

  const login = async (username, password) => {
    const error = validateCredentials(username, password)
    if (error) throw new Error(error)

    const session = await api.login({
      username: sanitizeText(username),
      password,
    })

    await persistSession(session.access_token, session.user)
    setToken(session.access_token)
    setUser(session.user)
  }

  const value = useMemo(() => ({ token, user, loading, login, logout }), [token, user, loading])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
