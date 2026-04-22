import { useCallback, useEffect, useState } from 'react'
import { RefreshControl, ScrollView, Text } from 'react-native'

import { Card, ScreenContainer, colors } from '../components/UI'
import { api } from '../services/api'

export default function DashboardScreen() {
  const [summary, setSummary] = useState(null)
  const [finance, setFinance] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      setError('')
      const [s, f, a] = await Promise.all([api.getDashboard(), api.getDashboardFinance(), api.getSmartAlerts()])
      setSummary(s)
      setFinance(f)
      setAlerts(Array.isArray(a) ? a : [])
    } catch (err) {
      setError(err.message)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const onRefresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  return (
    <ScreenContainer>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
        {error ? <Card><Text style={{ color: '#fecaca' }}>{error}</Text></Card> : null}
        {summary ? (
          <>
            <Card title="Operación">
              <Text style={{ color: colors.text }}>Ítems: {summary.total_items}</Text>
              <Text style={{ color: colors.text }}>Disponibles: {summary.total_available_units}</Text>
              <Text style={{ color: colors.text }}>Stock crítico: {summary.low_stock_items}</Text>
              <Text style={{ color: colors.text }}>Alquileres activos: {summary.active_rentals}</Text>
            </Card>
            <Card title="Finanzas">
              <Text style={{ color: colors.text }}>Ingresos: ${Number(finance?.rental_revenue || 0).toFixed(2)}</Text>
              <Text style={{ color: colors.text }}>Multas: ${Number(finance?.collected_late_fees || 0).toFixed(2)}</Text>
              <Text style={{ color: colors.text }}>Depósitos retenidos: ${Number(finance?.estimated_deposits_held || 0).toFixed(2)}</Text>
            </Card>
            <Card title="Alertas inteligentes">
              {alerts.slice(0, 4).map((alert, idx) => (
                <Text key={`${alert.code || 'alert'}-${idx}`} style={{ color: colors.muted }}>
                  • {alert.message || alert.title || 'Alerta disponible'}
                </Text>
              ))}
              {!alerts.length ? <Text style={{ color: colors.muted }}>Sin alertas por ahora.</Text> : null}
            </Card>
          </>
        ) : <Card><Text style={{ color: colors.muted }}>Cargando...</Text></Card>}
      </ScrollView>
    </ScreenContainer>
  )
}
