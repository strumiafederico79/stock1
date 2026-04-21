import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'

import AlertBox from '../components/AlertBox'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: 'admin', password: 'admin1234' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (user) return <Navigate to="/" replace />

  const onSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      await login(form.username, form.password)
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-shell">
      <form className="login-card" onSubmit={onSubmit}>
        <h1>Stock Control Pro</h1>
        <p>Ingresá con tu usuario para operar el sistema.</p>

        {error ? <AlertBox>{error}</AlertBox> : null}

        <div className="field">
          <label>Usuario</label>
          <input value={form.username} onChange={(e) => setForm((c) => ({ ...c, username: e.target.value }))} />
        </div>

        <div className="field">
          <label>Contraseña</label>
          <input type="password" value={form.password} onChange={(e) => setForm((c) => ({ ...c, password: e.target.value }))} />
        </div>

        <button className="button primary full" type="submit" disabled={loading}>
          {loading ? 'Ingresando...' : 'Entrar'}
        </button>

        <div className="small-note">Admin inicial: <strong>admin</strong> / <strong>admin1234</strong></div>
      </form>
    </div>
  )
}
