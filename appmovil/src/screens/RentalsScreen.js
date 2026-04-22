import { useEffect, useMemo, useState } from 'react'
import { FlatList, Text, View } from 'react-native'

import { AppButton, AppInput, Card, ScreenContainer, colors } from '../components/UI'
import { api } from '../services/api'
import { sanitizePayload } from '../utils/security'

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
    if (!newRental.client_name || !newRental.start_date || !newRental.due_date) {
      setError('Cliente, fecha inicio y fecha fin son obligatorios.')
      return
    }

    try {
      await api.createRental(sanitizePayload(newRental))
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
    if (!addItem.item_id || Number(addItem.quantity) <= 0) {
      setError('Debes indicar ID de ítem y cantidad válida.')
      return
    }

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
      {error ? <Card><Text style={{ color: '#fecaca' }}>{error}</Text></Card> : null}
      <FlatList
        ListHeaderComponent={(
          <>
            <Card title="Nuevo alquiler (móvil)">
              <AppInput placeholder="Cliente" value={newRental.client_name} onChangeText={(v) => setNewRental((c) => ({ ...c, client_name: v }))} />
              <AppInput placeholder="Evento" value={newRental.event_name} onChangeText={(v) => setNewRental((c) => ({ ...c, event_name: v }))} />
              <AppInput placeholder="Fecha inicio YYYY-MM-DD" value={newRental.start_date} onChangeText={(v) => setNewRental((c) => ({ ...c, start_date: v }))} />
              <AppInput placeholder="Fecha fin YYYY-MM-DD" value={newRental.due_date} onChangeText={(v) => setNewRental((c) => ({ ...c, due_date: v }))} />
              <AppButton label="Crear alquiler" onPress={createRental} />
            </Card>

            <Card title="Seleccionar alquiler">
              <View style={{ gap: 8 }}>
                {rentals.slice(0, 10).map((r) => (
                  <Text key={r.id} onPress={() => setSelectedRentalId(r.id)} style={{ color: selectedRentalId === r.id ? colors.primary : colors.muted, fontWeight: '700' }}>
                    #{r.id} · {r.client_name} · {r.status}
                  </Text>
                ))}
              </View>
            </Card>

            {selectedRental ? (
              <Card title={`Alquiler #${selectedRental.id}`}>
                <Text style={{ color: colors.text }}>Cliente: {selectedRental.client_name}</Text>
                <Text style={{ color: colors.muted }}>Estado: {selectedRental.status}</Text>
                <Text style={{ color: colors.muted }}>Depósito: ${Number(selectedRental.deposit_amount || 0).toFixed(2)}</Text>
              </Card>
            ) : null}

            <Card title="Agregar ítem al alquiler">
              <AppInput placeholder="ID ítem" value={addItem.item_id} onChangeText={(v) => setAddItem((c) => ({ ...c, item_id: v }))} keyboardType="numeric" />
              <AppInput placeholder="Cantidad" value={String(addItem.quantity)} onChangeText={(v) => setAddItem((c) => ({ ...c, quantity: v }))} keyboardType="numeric" />
              <Text style={{ fontSize: 12, color: colors.muted }}>IDs disponibles: {items.slice(0, 5).map((item) => item.id).join(', ') || 'N/D'}</Text>
              <AppButton label="Agregar" onPress={addRentalItem} />
            </Card>
          </>
        )}
        data={selectedRental?.items || []}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <Card>
            <Text style={{ color: colors.text }}>{item.item?.code} · {item.item?.name}</Text>
            <Text style={{ color: colors.muted }}>Cant.: {item.quantity} | Devuelto: {item.returned_quantity}</Text>
            <Text style={{ color: colors.muted }}>Estado devolución: {item.return_status}</Text>
          </Card>
        )}
      />
    </ScreenContainer>
  )
}
