export function sanitizeText(value = '') {
  return String(value).replace(/[<>]/g, '').trim()
}

export function sanitizePayload(payload = {}) {
  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => [key, typeof value === 'string' ? sanitizeText(value) : value]),
  )
}

export function validateCredentials(username, password) {
  const cleanUsername = sanitizeText(username)
  if (!cleanUsername || cleanUsername.length < 3) {
    return 'El usuario debe tener al menos 3 caracteres.'
  }

  if (!password || String(password).length < 8) {
    return 'La contraseña debe tener al menos 8 caracteres.'
  }

  return ''
}
