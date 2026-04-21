import { createContext, useContext, useEffect, useMemo, useState } from 'react'

import { api, clearSession, getStoredUser, saveSession } from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser())
  const [loading, setLoading] = useState(Boolean(localStorage.getItem('stock_control_token')))

  useEffect(() => {
    const token = localStorage.getItem('stock_control_token')
    if (!token) {
      setLoading(false)
      return
    }
    api.me().then((me) => setUser(me)).catch(() => { clearSession(); setUser(null) }).finally(() => setLoading(false))
  }, [])

  const value = useMemo(() => ({
    user,
    loading,
    isAdmin: user?.role === 'ADMIN',
    async login(username, password) {
      const data = await api.login({ username, password })
      saveSession(data.access_token, data.user)
      setUser(data.user)
      return data.user
    },
    logout() {
      clearSession()
      setUser(null)
    },
    refreshMe() {
      return api.me().then((me) => { setUser(me); saveSession(localStorage.getItem('stock_control_token'), me); return me })
    },
  }), [user, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
