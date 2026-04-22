import { useEffect, useState } from 'react'
import { ScrollView, Text } from 'react-native'

import { Card, ScreenContainer } from '../components/UI'
import { api } from '../services/api'

export default function DashboardScreen() {
  const [summary, setSummary] = useState(null)
  const [finance, setFinance] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([api.getDashboard(), api.getDashboardFinance()])
      .then(([s, f]) => {
        setSummary(s)
        setFinance(f)
      })
      .catch((err) => setError(err.message))
  }, [])

  return (
    <ScreenContainer>
      <ScrollView>
        {error ? <Card><Text>{error}</Text></Card> : null}
        {summary ? (
          <>
            <Card title="Operación">
              <Text>Ítems: {summary.total_items}</Text>
              <Text>Disponibles: {summary.total_available_units}</Text>
              <Text>Stock crítico: {summary.low_stock_items}</Text>
              <Text>Alquileres activos: {summary.active_rentals}</Text>
            </Card>
            <Card title="Finanzas">
              <Text>Ingresos: ${Number(finance?.rental_revenue || 0).toFixed(2)}</Text>
              <Text>Multas: ${Number(finance?.collected_late_fees || 0).toFixed(2)}</Text>
              <Text>Depósitos retenidos: ${Number(finance?.estimated_deposits_held || 0).toFixed(2)}</Text>
            </Card>
          </>
        ) : <Card><Text>Cargando...</Text></Card>}
      </ScrollView>
    </ScreenContainer>
  )
}
