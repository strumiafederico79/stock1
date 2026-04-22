import { useEffect, useState } from 'react'
import { FlatList, Pressable, Text, TextInput } from 'react-native'

import { Card, ScreenContainer } from '../components/UI'
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
      {error ? <Card><Text>{error}</Text></Card> : null}
      {overview ? (
        <Card title="Resumen mantenimiento">
          <Text>En mantenimiento: {overview.total_items_in_maintenance}</Text>
          <Text>Preventivo: {overview.preventive_candidates}</Text>
          <Text>Predictivo: {overview.predictive_candidates}</Text>
        </Card>
      ) : null}

      <Card title="Nueva orden de trabajo">
        <TextInput placeholder="ID ítem" value={form.item_id} onChangeText={(v) => setForm((c) => ({ ...c, item_id: v }))} style={styles.input} keyboardType="numeric" />
        <TextInput placeholder="Título" value={form.title} onChangeText={(v) => setForm((c) => ({ ...c, title: v }))} style={styles.input} />
        <TextInput placeholder="Técnico" value={form.technician} onChangeText={(v) => setForm((c) => ({ ...c, technician: v }))} style={styles.input} />
        <Pressable style={styles.button} onPress={createWO}><Text style={styles.buttonLabel}>Crear OT</Text></Pressable>
      </Card>

      <FlatList
        data={orders}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <Card>
            <Text>#{item.id} · Ítem {item.item_id}</Text>
            <Text>{item.title}</Text>
            <Text>{item.status} · {item.technician || 'Sin técnico'}</Text>
          </Card>
        )}
      />
    </ScreenContainer>
  )
}

const styles = {
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, marginBottom: 8 },
  button: { backgroundColor: '#2563eb', padding: 10, borderRadius: 8, alignItems: 'center' },
  buttonLabel: { color: '#fff', fontWeight: '700' },
}
