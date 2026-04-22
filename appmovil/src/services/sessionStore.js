import * as SecureStore from 'expo-secure-store'

const TOKEN_KEY = 'stock_control_token_mobile'
const USER_KEY = 'stock_control_user_mobile'
const SESSION_KEY = 'stock_control_session_mobile'
const SESSION_HOURS = 12

const secureOptions = {
  keychainService: 'pgr-stock-control-mobile',
}

export async function getStoredToken() {
  return SecureStore.getItemAsync(TOKEN_KEY)
}

export async function getStoredUser() {
  return SecureStore.getItemAsync(USER_KEY)
}

export async function getStoredSession() {
  return SecureStore.getItemAsync(SESSION_KEY)
}

export async function persistSession(token, user) {
  await Promise.all([
    SecureStore.setItemAsync(TOKEN_KEY, token, secureOptions),
    SecureStore.setItemAsync(USER_KEY, JSON.stringify(user), secureOptions),
    touchStoredSession(),
  ])
}

export async function touchStoredSession() {
  const expiresAt = Date.now() + SESSION_HOURS * 60 * 60 * 1000
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify({ expiresAt }), secureOptions)
}

export async function clearStoredSession() {
  await Promise.all([
    SecureStore.deleteItemAsync(TOKEN_KEY),
    SecureStore.deleteItemAsync(USER_KEY),
    SecureStore.deleteItemAsync(SESSION_KEY),
  ])
}
