import * as SecureStore from 'expo-secure-store'
import { createContext, useContext, useEffect, useMemo, useState } from 'react'

import { api } from '../services/api'

const AuthContext = createContext(null)
const TOKEN_KEY = 'stock_control_token_mobile'
const USER_KEY = 'stock_control_user_mobile'

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const storedToken = await SecureStore.getItemAsync(TOKEN_KEY)
      const storedUser = await SecureStore.getItemAsync(USER_KEY)
      setToken(storedToken)
      setUser(storedUser ? JSON.parse(storedUser) : null)
      setLoading(false)
    })()
  }, [])

  const login = async (username, password) => {
    const session = await api.login({ username, password })
    await SecureStore.setItemAsync(TOKEN_KEY, session.access_token)
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(session.user))
    setToken(session.access_token)
    setUser(session.user)
  }

  const logout = async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY)
    await SecureStore.deleteItemAsync(USER_KEY)
    setToken(null)
    setUser(null)
  }

  const value = useMemo(() => ({ token, user, loading, login, logout }), [token, user, loading])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)

export async function getStoredToken() {
  return SecureStore.getItemAsync(TOKEN_KEY)
}
