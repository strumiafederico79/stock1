import { useEffect, useMemo, useState } from 'react'
import { FlatList, Pressable, Text, TextInput, View } from 'react-native'

import { Card, ScreenContainer } from '../components/UI'
import { api } from '../services/api'

export default function RentalsScreen() {
  const [rentals, setRentals] = useState([])
  const [items, setItems] = useState([])
  const [selectedRentalId, setSelectedRentalId] = useState(null)
  const [error, setError] = useState('')

  const [newRental, setNewRental] = useState({
    client_name: '',
    event_name: '',
    start_date: '',
    due_date: '',
    responsible: '',
    deposit_amount: 0,
    late_fee_per_day: 0,
    notes: '',
    status: 'DRAFT',
  })

  const [addItem, setAddItem] = useState({ item_id: '', quantity: 1 })

  const loadData = async () => {
    try {
      const [rData, iData] = await Promise.all([api.getRentals(), api.getItems({ available_only: true })])
      setRentals(rData)
      setItems(iData)
      if (!selectedRentalId && rData.length) setSelectedRentalId(rData[0].id)
      setError('')
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const selectedRental = useMemo(() => rentals.find((r) => r.id === selectedRentalId), [rentals, selectedRentalId])

  const createRental = async () => {
    try {
      await api.createRental(newRental)
      setNewRental({
        client_name: '', event_name: '', start_date: '', due_date: '', responsible: '', deposit_amount: 0, late_fee_per_day: 0, notes: '', status: 'DRAFT',
      })
      await loadData()
    } catch (err) {
      setError(err.message)
    }
  }

  const addRentalItem = async () => {
    if (!selectedRentalId) return
    try {
      await api.addRentalItem(selectedRentalId, {
        item_id: Number(addItem.item_id),
        quantity: Number(addItem.quantity),
        checklist: { accesorios_ok: true },
        photo_urls: [],
        client_signature_name: 'Firma móvil',
      })
      setAddItem({ item_id: '', quantity: 1 })
      await loadData()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <ScreenContainer>
      {error ? <Card><Text>{error}</Text></Card> : null}
      <FlatList
        ListHeaderComponent={(
          <>
            <Card title="Nuevo alquiler (móvil)">
              <TextInput placeholder="Cliente" value={newRental.client_name} onChangeText={(v) => setNewRental((c) => ({ ...c, client_name: v }))} style={styles.input} />
              <TextInput placeholder="Evento" value={newRental.event_name} onChangeText={(v) => setNewRental((c) => ({ ...c, event_name: v }))} style={styles.input} />
              <TextInput placeholder="Fecha inicio YYYY-MM-DD" value={newRental.start_date} onChangeText={(v) => setNewRental((c) => ({ ...c, start_date: v }))} style={styles.input} />
              <TextInput placeholder="Fecha fin YYYY-MM-DD" value={newRental.due_date} onChangeText={(v) => setNewRental((c) => ({ ...c, due_date: v }))} style={styles.input} />
              <Pressable style={styles.button} onPress={createRental}><Text style={styles.buttonLabel}>Crear alquiler</Text></Pressable>
            </Card>

            <Card title="Seleccionar alquiler">
              <View style={{ gap: 6 }}>
                {rentals.slice(0, 10).map((r) => (
                  <Pressable key={r.id} onPress={() => setSelectedRentalId(r.id)}>
                    <Text style={{ fontWeight: selectedRentalId === r.id ? '700' : '400' }}>#{r.id} · {r.client_name} · {r.status}</Text>
                  </Pressable>
                ))}
              </View>
            </Card>

            {selectedRental ? (
              <Card title={`Alquiler #${selectedRental.id}`}>
                <Text>Cliente: {selectedRental.client_name}</Text>
                <Text>Estado: {selectedRental.status}</Text>
                <Text>Depósito: ${Number(selectedRental.deposit_amount || 0).toFixed(2)}</Text>
              </Card>
            ) : null}

            <Card title="Agregar ítem al alquiler">
              <TextInput placeholder="ID ítem" value={addItem.item_id} onChangeText={(v) => setAddItem((c) => ({ ...c, item_id: v }))} style={styles.input} keyboardType="numeric" />
              <TextInput placeholder="Cantidad" value={String(addItem.quantity)} onChangeText={(v) => setAddItem((c) => ({ ...c, quantity: v }))} style={styles.input} keyboardType="numeric" />
              <Text style={{ fontSize: 12, color: '#555' }}>IDs disponibles: {items.slice(0, 5).map((item) => item.id).join(', ')}</Text>
              <Pressable style={styles.button} onPress={addRentalItem}><Text style={styles.buttonLabel}>Agregar</Text></Pressable>
            </Card>
          </>
        )}
        data={selectedRental?.items || []}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <Card>
            <Text>{item.item?.code} · {item.item?.name}</Text>
            <Text>Cant.: {item.quantity} | Devuelto: {item.returned_quantity}</Text>
            <Text>Estado devolución: {item.return_status}</Text>
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
