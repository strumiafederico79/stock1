import { Text } from 'react-native'

import { AppButton, Card, PGRLogo, ScreenContainer, colors } from '../components/UI'
import { useAuth } from '../context/AuthContext'

export default function SettingsScreen() {
  const { user, logout } = useAuth()

  return (
    <ScreenContainer>
      <PGRLogo subtitle="Gestión segura" />

      <Card title="Usuario">
        <Text style={{ color: colors.text }}>{user?.full_name || 'Sin nombre'}</Text>
        <Text style={{ color: colors.muted }}>{user?.username}</Text>
        <Text style={{ color: colors.muted }}>Rol: {user?.role}</Text>
      </Card>

      <Card title="Sesión">
        <Text style={{ color: colors.muted, marginBottom: 8 }}>La sesión se cierra automáticamente tras 12 horas de inactividad.</Text>
        <AppButton variant="danger" label="Cerrar sesión" onPress={logout} />
      </Card>
    </ScreenContainer>
  )
}
