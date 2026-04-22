import 'react-native-gesture-handler'
import { NavigationContainer, DarkTheme } from '@react-navigation/native'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { colors } from './src/components/UI'
import { AuthProvider, useAuth } from './src/context/AuthContext'
import AuthStack from './src/navigation/AuthStack'
import MainTabs from './src/navigation/MainTabs'

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.surface,
    text: colors.text,
    primary: colors.primary,
    border: colors.border,
  },
}

function RootNavigator() {
  const { token, loading } = useAuth()

  if (loading) return null
  return <NavigationContainer theme={navTheme}>{token ? <MainTabs /> : <AuthStack />}</NavigationContainer>
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  )
}
