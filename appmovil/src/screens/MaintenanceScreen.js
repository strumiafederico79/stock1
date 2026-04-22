import { useEffect, useState } from 'react'
import { FlatList, Text } from 'react-native'

import { AppButton, AppInput, Card, ScreenContainer, colors } from '../components/UI'
import { api } from '../services/api'

export default function MaintenanceScreen() {
  const [overview, setOverview] = useState(null)
  const [orders, setOrders] = useState([])
  const [form, setForm] = useState({ item_id: '', title: '', technician: '' })
  const [error, setError] = useState('')

  const loadData = async () => {
    try {
      const [o, wo] = await Promise.all([api.getMaintenanceOverview(), api.getWorkOrders()])
      setOverview(o)
      setOrders(wo)
      setError('')
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const createWO = async () => {
    if (!form.item_id || !form.title) {
      setError('ID de ítem y título son obligatorios.')
      return
    }

    try {
      await api.createWorkOrder({ item_id: Number(form.item_id), title: form.title, technician: form.technician || null })
      setForm({ item_id: '', title: '', technician: '' })
      await loadData()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <ScreenContainer>
      {error ? <Card><Text style={{ color: '#fecaca' }}>{error}</Text></Card> : null}
      {overview ? (
        <Card title="Resumen mantenimiento">
          <Text style={{ color: colors.text }}>En mantenimiento: {overview.total_items_in_maintenance}</Text>
          <Text style={{ color: colors.muted }}>Preventivo: {overview.preventive_candidates}</Text>
          <Text style={{ color: colors.muted }}>Predictivo: {overview.predictive_candidates}</Text>
        </Card>
      ) : null}

      <Card title="Nueva orden de trabajo">
        <AppInput placeholder="ID ítem" value={form.item_id} onChangeText={(v) => setForm((c) => ({ ...c, item_id: v }))} keyboardType="numeric" />
        <AppInput placeholder="Título" value={form.title} onChangeText={(v) => setForm((c) => ({ ...c, title: v }))} />
        <AppInput placeholder="Técnico" value={form.technician} onChangeText={(v) => setForm((c) => ({ ...c, technician: v }))} />
        <AppButton label="Crear OT" onPress={createWO} />
      </Card>

      <FlatList
        data={orders}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <Card>
            <Text style={{ color: colors.text }}>#{item.id} · Ítem {item.item_id}</Text>
            <Text style={{ color: colors.muted }}>{item.title}</Text>
            <Text style={{ color: colors.muted }}>{item.status} · {item.technician || 'Sin técnico'}</Text>
          </Card>
        )}
      />
    </ScreenContainer>
  )
}
