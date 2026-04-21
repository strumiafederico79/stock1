import { useEffect, useState } from 'react'

import { api } from '../api'
import AlertBox from '../components/AlertBox'
import SectionTitle from '../components/SectionTitle'
import StatCard from '../components/StatCard'

export default function DashboardPage() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .getDashboard()
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <SectionTitle title="Dashboard" subtitle="Resumen general del stock, rental y mantenimiento." />

      {error ? <AlertBox>{error}</AlertBox> : null}
      {loading ? <div className="card">Cargando datos...</div> : null}

      {data ? (
        <>
          <div className="grid stats-grid">
            <StatCard title="Ítems cargados" value={data.total_items} hint="Registros únicos" />
            <StatCard title="Unidades totales" value={data.total_units} hint="Cantidad física total" />
            <StatCard title="Unidades disponibles" value={data.total_available_units} hint="Listas para usar" />
            <StatCard title="Stock crítico" value={data.low_stock_items} hint="Por debajo del mínimo" />
            <StatCard title="Rentals activos" value={data.active_rentals} hint="Salidas abiertas" />
            <StatCard title="Mantenimiento" value={data.maintenance_items} hint="Equipos fuera de disponibilidad" />
          </div>

          <div className="grid two-columns">
            <div className="card">
              <h3>Stock por área</h3>
              <table className="table">
                <thead>
                  <tr>
                    <th>Área</th>
                    <th>Ítems</th>
                    <th>Disponibles</th>
                  </tr>
                </thead>
                <tbody>
                  {data.by_area.map((row) => (
                    <tr key={row.area_id}>
                      <td>{row.area_name}</td>
                      <td>{row.items_count}</td>
                      <td>{row.units_available}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="card">
              <h3>Estado de equipos</h3>
              <table className="table">
                <thead>
                  <tr>
                    <th>Estado</th>
                    <th>Cantidad</th>
                  </tr>
                </thead>
                <tbody>
                  {data.by_status.map((row) => (
                    <tr key={row.status}>
                      <td>{row.status}</td>
                      <td>{row.items_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
