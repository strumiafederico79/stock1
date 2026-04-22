import { useEffect, useState } from 'react'

import { api } from '../api'
import AlertBox from '../components/AlertBox'
import SectionTitle from '../components/SectionTitle'

export default function AuditPage() {
  const [logs, setLogs] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    api.getAuditLogs().then(setLogs).catch((err) => setError(err.message))
  }, [])

  return (
    <div>
      <SectionTitle title="Auditoría forense" subtitle="Trazabilidad completa de acciones de usuario y sistema." />
      {error ? <AlertBox>{error}</AlertBox> : null}
      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Acción</th>
              <th>Entidad</th>
              <th>Usuario</th>
              <th>Detalle</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td>{new Date(log.created_at).toLocaleString()}</td>
                <td>{log.action}</td>
                <td>{log.entity_type} #{log.entity_id}</td>
                <td>{log.user_full_name}</td>
                <td>{formatDetails(log.details_json)}</td>
              </tr>
            ))}
            {logs.length === 0 ? (
              <tr><td colSpan={5}>No hay eventos de auditoría.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function formatDetails(rawValue) {
  if (!rawValue) return '-'
  try {
    return JSON.stringify(JSON.parse(rawValue), null, 2)
  } catch {
    return rawValue
  }
}
