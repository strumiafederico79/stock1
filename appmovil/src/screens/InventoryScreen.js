import { useEffect, useState } from 'react'
import { FlatList, RefreshControl, Text } from 'react-native'

import { AppInput, Card, ScreenContainer, colors } from '../components/UI'
import { api } from '../services/api'
import { sanitizeText } from '../utils/security'

export default function InventoryScreen() {
  const [items, setItems] = useState([])
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)

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

  const onSearch = (text) => {
    const cleanText = sanitizeText(text)
    setQuery(cleanText)
    load(cleanText)
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await load(query)
    setRefreshing(false)
  }

  return (
    <ScreenContainer>
      <Card title="Inventario premium">
        <AppInput
          placeholder="Buscar por nombre, código o serie"
          value={query}
          onChangeText={onSearch}
        />
      </Card>
      {error ? <Card><Text style={{ color: '#fecaca' }}>{error}</Text></Card> : null}
      <FlatList
        data={items}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <Card>
            <Text style={{ color: colors.text }}>{item.code} · {item.name}</Text>
            <Text style={{ color: colors.muted }}>Disponible: {item.quantity_available}/{item.quantity_total}</Text>
            <Text style={{ color: colors.muted }}>Estado: {item.status}</Text>
          </Card>
        )}
      />
    </ScreenContainer>
  )
}
