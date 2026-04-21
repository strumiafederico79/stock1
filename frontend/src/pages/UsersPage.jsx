import { useEffect, useState } from 'react'

import { api } from '../api'
import AlertBox from '../components/AlertBox'
import SectionTitle from '../components/SectionTitle'

const defaultForm = { username: '', full_name: '', password: '', role: 'OPERATOR', is_active: true }

export default function UsersPage() {
  const [users, setUsers] = useState([])
  const [form, setForm] = useState(defaultForm)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const loadUsers = () => api.getUsers().then(setUsers).catch((err) => setError(err.message))

  useEffect(() => { loadUsers() }, [])

  const onSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api.createUser(form)
      setForm(defaultForm)
      await loadUsers()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (user) => {
    try {
      await api.updateUser(user.id, { is_active: !user.is_active })
      await loadUsers()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div>
      <SectionTitle title="Usuarios" subtitle="Alta de operadores y administradores del sistema." />
      {error ? <AlertBox>{error}</AlertBox> : null}

      <div className="grid two-columns">
        <form className="card" onSubmit={onSubmit}>
          <h3>Nuevo usuario</h3>
          <div className="field"><label>Usuario</label><input value={form.username} onChange={(e) => setForm((c) => ({ ...c, username: e.target.value }))} /></div>
          <div className="field"><label>Nombre completo</label><input value={form.full_name} onChange={(e) => setForm((c) => ({ ...c, full_name: e.target.value }))} /></div>
          <div className="field"><label>Contraseña</label><input type="password" value={form.password} onChange={(e) => setForm((c) => ({ ...c, password: e.target.value }))} /></div>
          <div className="field"><label>Rol</label><select value={form.role} onChange={(e) => setForm((c) => ({ ...c, role: e.target.value }))}><option value="OPERATOR">Operador</option><option value="ADMIN">Administrador</option></select></div>
          <button className="button primary" type="submit" disabled={saving}>{saving ? 'Guardando...' : 'Crear usuario'}</button>
        </form>

        <div className="card">
          <h3>Listado</h3>
          <table className="table">
            <thead><tr><th>Usuario</th><th>Nombre</th><th>Rol</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.username}</td>
                  <td>{user.full_name}</td>
                  <td>{user.role}</td>
                  <td>{user.is_active ? 'Activo' : 'Inactivo'}</td>
                  <td><button className="button tiny" onClick={() => toggleActive(user)}>{user.is_active ? 'Desactivar' : 'Activar'}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
