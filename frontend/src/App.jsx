import { Route, Routes } from 'react-router-dom'

import AppLayout from './components/AppLayout'
import ProtectedRoute from './components/ProtectedRoute'
import DashboardPage from './pages/DashboardPage'
import InventoryPage from './pages/InventoryPage'
import ItemDetailPage from './pages/ItemDetailPage'
import ItemFormPage from './pages/ItemFormPage'
import LoginPage from './pages/LoginPage'
import RentalsPage from './pages/RentalsPage'
import ScannerPage from './pages/ScannerPage'
import UsersPage from './pages/UsersPage'

function AppRoutes() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/items/new" element={<ProtectedRoute adminOnly><ItemFormPage /></ProtectedRoute>} />
        <Route path="/items/:itemId/edit" element={<ProtectedRoute adminOnly><ItemFormPage /></ProtectedRoute>} />
        <Route path="/items/:itemId" element={<ItemDetailPage />} />
        <Route path="/rentals" element={<RentalsPage />} />
        <Route path="/scanner" element={<ScannerPage />} />
        <Route path="/users" element={<ProtectedRoute adminOnly><UsersPage /></ProtectedRoute>} />
      </Routes>
    </AppLayout>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/*" element={<ProtectedRoute><AppRoutes /></ProtectedRoute>} />
    </Routes>
  )
}
