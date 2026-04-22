import { useEffect, useState } from 'react'
import { FlatList, Text, TextInput } from 'react-native'

import { Card, ScreenContainer } from '../components/UI'
import { api } from '../services/api'

export default function InventoryScreen() {
  const [items, setItems] = useState([])
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')

  const load = async (q = '') => {
    try {
      setError('')
      const data = await api.getItems({ q })
      setItems(data)
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <ScreenContainer>
      <Card title="Inventario">
        <TextInput
          placeholder="Buscar por nombre, código o serie"
          value={query}
          onChangeText={(text) => {
            setQuery(text)
            load(text)
          }}
          style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10 }}
        />
      </Card>
      {error ? <Card><Text>{error}</Text></Card> : null}
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <Card>
            <Text>{item.code} · {item.name}</Text>
            <Text>Disponible: {item.quantity_available}/{item.quantity_total}</Text>
            <Text>Estado: {item.status}</Text>
          </Card>
        )}
      />
    </ScreenContainer>
  )
}
