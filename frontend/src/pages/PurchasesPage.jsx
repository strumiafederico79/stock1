import { useEffect, useState } from 'react'

import { api } from '../api'
import AlertBox from '../components/AlertBox'
import SectionTitle from '../components/SectionTitle'

export default function PurchasesPage() {
  const [alerts, setAlerts] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    api.getSmartAlerts().then((data) => setAlerts(data.alerts)).catch((err) => setError(err.message))
  }, [])

  return (
    <div>
      <SectionTitle title="Compras" subtitle="Alertas inteligentes multicanal para priorizar reposiciones." />
      {error ? <AlertBox>{error}</AlertBox> : null}
      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Severidad</th>
              <th>Alerta</th>
              <th>Canales</th>
            </tr>
          </thead>
          <tbody>
            {alerts.map((alert, idx) => (
              <tr key={`${alert.type}-${idx}`}>
                <td>{alert.severity}</td>
                <td>
                  <strong>{alert.title}</strong>
                  <div className="muted-text">{alert.message}</div>
                </td>
                <td>{alert.channels.join(', ')}</td>
              </tr>
            ))}
            {alerts.length === 0 ? (
              <tr><td colSpan={3}>No hay alertas activas.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
