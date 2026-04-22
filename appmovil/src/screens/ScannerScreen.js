import { BarCodeScanner } from 'expo-barcode-scanner'
import { useEffect, useState } from 'react'
import { Pressable, Text, View } from 'react-native'

import { Card, ScreenContainer } from '../components/UI'
import { api } from '../services/api'

export default function ScannerScreen() {
  const [permission, setPermission] = useState(null)
  const [scanned, setScanned] = useState(false)
  const [result, setResult] = useState('')

  useEffect(() => {
    ;(async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync()
      setPermission(status === 'granted')
    })()
  }, [])

  const onScan = async ({ data }) => {
    setScanned(true)
    try {
      const item = await api.getItemByBarcode(data)
      setResult(`${item.code} · ${item.name} · Disponible ${item.quantity_available}`)
    } catch (err) {
      setResult(`Código leído: ${data} | ${err.message}`)
    }
  }

  if (permission === null) return <ScreenContainer><Card><Text>Solicitando permiso...</Text></Card></ScreenContainer>
  if (permission === false) return <ScreenContainer><Card><Text>Sin acceso a cámara.</Text></Card></ScreenContainer>

  return (
    <ScreenContainer>
      <View style={{ height: 320, borderRadius: 12, overflow: 'hidden' }}>
        <BarCodeScanner onBarCodeScanned={scanned ? undefined : onScan} style={{ flex: 1 }} />
      </View>
      <Card>
        <Text>{result || 'Escaneá un código para buscar ítem.'}</Text>
        {scanned ? (
          <Pressable style={{ backgroundColor: '#2563eb', padding: 10, borderRadius: 8, marginTop: 8 }} onPress={() => setScanned(false)}>
            <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '700' }}>Escanear nuevamente</Text>
          </Pressable>
        ) : null}
      </Card>
    </ScreenContainer>
  )
}
