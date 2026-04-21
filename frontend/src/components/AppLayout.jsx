import { NavLink } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'

export default function AppLayout({ children }) {
  const { user, isAdmin, logout } = useAuth()

  const links = [
    { to: '/', label: 'Dashboard' },
    { to: '/inventory', label: 'Inventario' },
    ...(isAdmin ? [{ to: '/items/new', label: 'Nuevo equipo' }] : []),
    { to: '/rentals', label: 'Rental' },
    { to: '/scanner', label: 'Escáner' },
    ...(isAdmin ? [{ to: '/users', label: 'Usuarios' }] : []),
  ]

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-card">
          <h1>Stock Control Pro</h1>
          <p>Depósito, rental y trazabilidad por código de barras.</p>
        </div>

        <div className="user-card">
          <strong>{user?.full_name}</strong>
          <span>{user?.role === 'ADMIN' ? 'Administrador' : 'Operador'}</span>
        </div>

        <nav className="sidebar-nav">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.to === '/'} className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <button className="button secondary logout-button" onClick={logout}>Salir</button>
      </aside>

      <main className="main-content">{children}</main>
    </div>
  )
}
