import { useEffect, useState } from 'react'

import { api } from '../api'
import AlertBox from '../components/AlertBox'
import SectionTitle from '../components/SectionTitle'
import StatCard from '../components/StatCard'

export default function DashboardPage() {
  const [summary, setSummary] = useState(null)
  const [insights, setInsights] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.getDashboard(), api.getDashboardInsights()])
      .then(([summaryData, insightsData]) => {
        setSummary(summaryData)
        setInsights(insightsData)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <SectionTitle
        title="PGR STOCK CONTROL"
        subtitle="Panel ejecutivo con analítica operativa, estado de inventario y alertas de acción inmediata."
      />

      {error ? <AlertBox>{error}</AlertBox> : null}
      {loading ? <div className="card">Cargando datos...</div> : null}

      {summary && insights ? (
        <>
          <div className="grid stats-grid">
            <StatCard title="Ítems cargados" value={summary.total_items} hint="Registros únicos" />
            <StatCard title="Unidades disponibles" value={summary.total_available_units} hint="Listas para uso inmediato" />
            <StatCard title="Stock crítico" value={summary.low_stock_items} hint="Ítems bajo mínimo" />
            <StatCard title="Rentals activos" value={summary.active_rentals} hint="Operaciones abiertas" />
            <StatCard title="Vencidos" value={insights.overdue_rentals} hint="Rentals fuera de término" />
            <StatCard title="Movimientos 30 días" value={insights.unique_items_moved_30d} hint="Ítems con actividad reciente" />
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
                  {summary.by_area.map((row) => (
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
                  {summary.by_status.map((row) => (
                    <tr key={row.status}>
                      <td>{row.status}</td>
                      <td>{row.items_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid two-columns">
            <div className="card">
              <h3>Radar de demanda (30 días)</h3>
              <div className="kpi-row">
                <span>Salidas</span>
                <strong>{insights.outgoing_movements_30d}</strong>
              </div>
              <div className="kpi-row">
                <span>Entradas / devoluciones</span>
                <strong>{insights.incoming_movements_30d}</strong>
              </div>
              <div className="kpi-row">
                <span>Rentals por vencer (72h)</span>
                <strong>{insights.due_soon_rentals}</strong>
              </div>
              <table className="table compact-table">
                <thead>
                  <tr>
                    <th>Ítem</th>
                    <th>Salidas</th>
                  </tr>
                </thead>
                <tbody>
                  {insights.top_outgoing_items.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="muted-text">Sin movimiento en el período.</td>
                    </tr>
                  ) : insights.top_outgoing_items.map((row) => (
                    <tr key={row.item_id}>
                      <td>{row.item_name}</td>
                      <td>{row.total_outgoing}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="card">
              <h3>Reabastecimiento sugerido</h3>
              <table className="table compact-table">
                <thead>
                  <tr>
                    <th>Ítem</th>
                    <th>Actual</th>
                    <th>Mínimo</th>
                    <th>Sugerido</th>
                  </tr>
                </thead>
                <tbody>
                  {insights.restock_suggestions.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="muted-text">No hay ítems con necesidad de reposición.</td>
                    </tr>
                  ) : insights.restock_suggestions.map((row) => (
                    <tr key={row.item_id}>
                      <td>{row.item_name}</td>
                      <td>{row.quantity_available}</td>
                      <td>{row.min_stock}</td>
                      <td><span className="pill">{row.suggested_restock}</span></td>
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
