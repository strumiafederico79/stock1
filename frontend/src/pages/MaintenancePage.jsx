import { useEffect, useState } from 'react'

import { api } from '../api'
import AlertBox from '../components/AlertBox'
import SectionTitle from '../components/SectionTitle'
import StatCard from '../components/StatCard'

export default function MaintenancePage() {
  const [data, setData] = useState(null)
  const [orders, setOrders] = useState([])
  const [workOrderForm, setWorkOrderForm] = useState({ item_id: '', title: '', technician: '', estimated_cost: '', notes: '' })
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([api.getMaintenanceOverview(), api.getWorkOrders()])
      .then(([overview, workOrders]) => {
        setData(overview)
        setOrders(workOrders)
      })
      .catch((err) => setError(err.message))
  }, [])

  const createWorkOrder = async (event) => {
    event.preventDefault()
    try {
      const created = await api.createWorkOrder({
        item_id: Number(workOrderForm.item_id),
        title: workOrderForm.title,
        technician: workOrderForm.technician || null,
        estimated_cost: workOrderForm.estimated_cost ? Number(workOrderForm.estimated_cost) : null,
        notes: workOrderForm.notes || null,
      })
      setOrders((current) => [created, ...current])
      setWorkOrderForm({ item_id: '', title: '', technician: '', estimated_cost: '', notes: '' })
    } catch (err) {
      setError(err.message)
    }
  }

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
            <h3>Nueva orden de trabajo</h3>
            <form className="grid two-columns" onSubmit={createWorkOrder}>
              <div className="field">
                <label>ID del equipo</label>
                <input type="number" min="1" value={workOrderForm.item_id} onChange={(event) => setWorkOrderForm((c) => ({ ...c, item_id: event.target.value }))} required />
              </div>
              <div className="field">
                <label>Título</label>
                <input value={workOrderForm.title} onChange={(event) => setWorkOrderForm((c) => ({ ...c, title: event.target.value }))} required />
              </div>
              <div className="field">
                <label>Técnico</label>
                <input value={workOrderForm.technician} onChange={(event) => setWorkOrderForm((c) => ({ ...c, technician: event.target.value }))} />
              </div>
              <div className="field">
                <label>Costo estimado</label>
                <input type="number" min="0" step="0.01" value={workOrderForm.estimated_cost} onChange={(event) => setWorkOrderForm((c) => ({ ...c, estimated_cost: event.target.value }))} />
              </div>
              <div className="field full">
                <label>Notas</label>
                <textarea rows="2" value={workOrderForm.notes} onChange={(event) => setWorkOrderForm((c) => ({ ...c, notes: event.target.value }))} />
              </div>
              <button className="button primary" type="submit">Crear OT</button>
            </form>
          </div>
          <div className="card">
            <h3>Órdenes de trabajo</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Equipo</th>
                  <th>Título</th>
                  <th>Técnico</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>#{order.id}</td>
                    <td>{order.item_id}</td>
                    <td>{order.title}</td>
                    <td>{order.technician || '-'}</td>
                    <td>{order.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
