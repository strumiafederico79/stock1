import { useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'

import { AppButton, AppInput, PGRLogo, colors } from '../components/UI'
import { useAuth } from '../context/AuthContext'

export default function LoginScreen() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const onSubmit = async () => {
    try {
      setLoading(true)
      setError('')
      await login(username, password)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <PGRLogo subtitle="Inventario y alquileres profesionales" />
      <View style={styles.formCard}>
        <Text style={styles.welcome}>Bienvenido</Text>
        <AppInput value={username} onChangeText={setUsername} placeholder="Usuario" autoCapitalize="none" />
        <AppInput value={password} onChangeText={setPassword} placeholder="Contraseña" secureTextEntry />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {loading ? <ActivityIndicator color={colors.primary} /> : <AppButton label="Entrar" onPress={onSubmit} disabled={loading} />}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 14,
    backgroundColor: colors.bg,
  },
  formCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  welcome: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  error: {
    color: '#fca5a5',
    textAlign: 'center',
  },
})
