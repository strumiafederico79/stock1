import { Pressable, Text } from 'react-native'

import { Card, ScreenContainer } from '../components/UI'
import { useAuth } from '../context/AuthContext'

export default function SettingsScreen() {
  const { user, logout } = useAuth()

  return (
    <ScreenContainer>
      <Card title="Usuario">
        <Text>{user?.full_name}</Text>
        <Text>{user?.username}</Text>
        <Text>Rol: {user?.role}</Text>
      </Card>

      <Card title="Sesión">
        <Pressable style={{ backgroundColor: '#dc2626', padding: 10, borderRadius: 8 }} onPress={logout}>
          <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '700' }}>Cerrar sesión</Text>
        </Pressable>
      </Card>
    </ScreenContainer>
  )
}
