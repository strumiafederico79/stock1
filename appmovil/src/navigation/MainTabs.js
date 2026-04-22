import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'

import DashboardScreen from '../screens/DashboardScreen'
import InventoryScreen from '../screens/InventoryScreen'
import MaintenanceScreen from '../screens/MaintenanceScreen'
import RentalsScreen from '../screens/RentalsScreen'
import ScannerScreen from '../screens/ScannerScreen'
import SettingsScreen from '../screens/SettingsScreen'

const Tab = createBottomTabNavigator()

export default function MainTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerTitleAlign: 'center' }}>
      <Tab.Screen name="Inicio" component={DashboardScreen} />
      <Tab.Screen name="Inventario" component={InventoryScreen} />
      <Tab.Screen name="Alquileres" component={RentalsScreen} />
      <Tab.Screen name="Escáner" component={ScannerScreen} />
      <Tab.Screen name="Mantto" component={MaintenanceScreen} />
      <Tab.Screen name="Ajustes" component={SettingsScreen} />
    </Tab.Navigator>
  )
}
