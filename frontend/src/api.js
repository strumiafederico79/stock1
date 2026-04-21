const defaultApiBase = import.meta.env.DEV
  ? `${window.location.protocol}//${window.location.hostname}:8000/api/v1`
  : '/api/v1'

const API_BASE = import.meta.env.VITE_API_URL || defaultApiBase

function getToken() {
  return localStorage.getItem('stock_control_token')
}

export function saveSession(token, user) {
  localStorage.setItem('stock_control_token', token)
  localStorage.setItem('stock_control_user', JSON.stringify(user))
}

export function clearSession() {
  localStorage.removeItem('stock_control_token')
  localStorage.removeItem('stock_control_user')
}

export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('stock_control_user') || 'null')
  } catch {
    return null
  }
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  })

  if (!response.ok) {
    let detail = 'Error inesperado'
    try {
      const data = await response.json()
      detail = data.detail || detail
    } catch {
      detail = response.statusText || detail
    }
    const error = new Error(detail)
    error.status = response.status
    throw error
  }

  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) return response.json()
  return response
}

export const api = {
  login: (payload) => request('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  me: () => request('/auth/me'),
  changePassword: (payload) => request('/auth/change-password', { method: 'POST', body: JSON.stringify(payload) }),
  getUsers: () => request('/users'),
  createUser: (payload) => request('/users', { method: 'POST', body: JSON.stringify(payload) }),
  updateUser: (id, payload) => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  getDashboard: () => request('/dashboard/summary'),
  getAreas: () => request('/catalogs/areas'),
  getCategories: (areaId) => request(`/catalogs/categories${areaId ? `?area_id=${areaId}` : ''}`),
  getLocations: (areaId) => request(`/catalogs/locations${areaId ? `?area_id=${areaId}` : ''}`),
  getItems: (params = {}) => {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') query.append(key, value)
    })
    const suffix = query.toString() ? `?${query.toString()}` : ''
    return request(`/items${suffix}`)
  },
  getItem: (id) => request(`/items/${id}`),
  createItem: (payload) => request('/items', { method: 'POST', body: JSON.stringify(payload) }),
  updateItem: (id, payload) => request(`/items/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  getItemMovements: (id) => request(`/items/${id}/movements`),
  getItemByBarcode: (barcode) => request(`/items/barcode/${encodeURIComponent(barcode)}`),
  createMovement: (payload) => request('/movements', { method: 'POST', body: JSON.stringify(payload) }),
  getMovements: (itemId) => request(`/movements${itemId ? `?item_id=${itemId}` : ''}`),
  getRentals: () => request('/rentals'),
  createRental: (payload) => request('/rentals', { method: 'POST', body: JSON.stringify(payload) }),
  addRentalItem: (rentalId, payload) => request(`/rentals/${rentalId}/items`, { method: 'POST', body: JSON.stringify(payload) }),
  returnRentalItem: (rentalId, rentalItemId, payload) => request(`/rentals/${rentalId}/items/${rentalItemId}/return`, { method: 'POST', body: JSON.stringify(payload) }),
}

export const assetUrl = (path) => {
  const root = API_BASE.replace(/\/api\/v1$/, '')
  return `${root}${path}`
}
