import { BarCodeScanner } from 'expo-barcode-scanner'
import { useEffect, useState } from 'react'
import { Text, View } from 'react-native'

import { AppButton, Card, ScreenContainer, colors } from '../components/UI'
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

  if (permission === null) return <ScreenContainer><Card><Text style={{ color: colors.muted }}>Solicitando permiso...</Text></Card></ScreenContainer>
  if (permission === false) return <ScreenContainer><Card><Text style={{ color: '#fecaca' }}>Sin acceso a cámara.</Text></Card></ScreenContainer>

  return (
    <ScreenContainer>
      <View style={{ height: 320, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
        <BarCodeScanner onBarCodeScanned={scanned ? undefined : onScan} style={{ flex: 1 }} />
      </View>
      <Card>
        <Text style={{ color: colors.text }}>{result || 'Escaneá un código para buscar ítem.'}</Text>
        {scanned ? <AppButton label="Escanear nuevamente" onPress={() => setScanned(false)} /> : null}
      </Card>
    </ScreenContainer>
  )
}
