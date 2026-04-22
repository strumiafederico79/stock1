import Constants from 'expo-constants'

import { getStoredToken } from '../context/AuthContext'

const API_BASE =
  process.env.EXPO_PUBLIC_API_URL ||
  Constants?.expoConfig?.extra?.apiBaseUrl ||
  'http://localhost:8000/api/v1'

async function request(path, options = {}) {
  const token = await getStoredToken()

  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
    throw new Error(detail)
  }

  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) return response.json()
  return response
}

export const api = {
  login: (payload) => request('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  me: () => request('/auth/me'),

  getDashboard: () => request('/dashboard/summary'),
  getDashboardInsights: () => request('/dashboard/insights'),
  getDashboardFinance: () => request('/dashboard/finance'),

  getItems: (params = {}) => {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') query.append(key, value)
    })
    const suffix = query.toString() ? `?${query.toString()}` : ''
    return request(`/items${suffix}`)
  },
  getItemByBarcode: (barcode) => request(`/items/barcode/${encodeURIComponent(barcode)}`),

  getRentals: () => request('/rentals'),
  createRental: (payload) => request('/rentals', { method: 'POST', body: JSON.stringify(payload) }),
  addRentalItem: (rentalId, payload) => request(`/rentals/${rentalId}/items`, { method: 'POST', body: JSON.stringify(payload) }),
  returnRentalItem: (rentalId, rentalItemId, payload) => request(`/rentals/${rentalId}/items/${rentalItemId}/return`, { method: 'POST', body: JSON.stringify(payload) }),

  getMaintenanceOverview: () => request('/maintenance/overview'),
  getWorkOrders: () => request('/maintenance/work-orders'),
  createWorkOrder: (payload) => request('/maintenance/work-orders', { method: 'POST', body: JSON.stringify(payload) }),

  getSmartAlerts: () => request('/alerts/smart'),
}
