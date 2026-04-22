import { useEffect, useState } from 'react'

import { api } from '../api'
import AlertBox from '../components/AlertBox'
import SectionTitle from '../components/SectionTitle'
import StatCard from '../components/StatCard'

export default function MaintenancePage() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getMaintenanceOverview().then(setData).catch((err) => setError(err.message))
  }, [])

  return (
    <div>
      <SectionTitle title="Mantenimiento preventivo/predictivo" subtitle="Planificación por riesgo y días sin mantenimiento." />
      {error ? <AlertBox>{error}</AlertBox> : null}
      {data ? (
        <>
          <div className="grid stats-grid">
            <StatCard title="En mantenimiento" value={data.total_items_in_maintenance} />
            <StatCard title="Candidatos preventivos" value={data.preventive_candidates} />
            <StatCard title="Candidatos predictivos" value={data.predictive_candidates} />
          </div>
          <div className="card">
            <table className="table">
              <thead>
                <tr>
                  <th>Equipo</th>
                  <th>Área</th>
                  <th>Días sin mant.</th>
                  <th>Riesgo</th>
                  <th>Recomendación</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={item.item_id}>
                    <td>{item.item_code} · {item.item_name}</td>
                    <td>{item.area_name}</td>
                    <td>{item.days_without_maintenance}</td>
                    <td>{item.risk_score}</td>
                    <td>{item.recommendation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : <div className="card">Cargando mantenimiento...</div>}
    </div>
  )
}
