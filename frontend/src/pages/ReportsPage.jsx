import { useEffect, useState } from 'react'

import { api } from '../api'
import AlertBox from '../components/AlertBox'
import SectionTitle from '../components/SectionTitle'
import { useAuth } from '../context/AuthContext'

function ReportButton({ label, onClick }) {
  return (
    <button type="button" className="button secondary" onClick={onClick}>
      {label}
    </button>
  )
}

export default function ReportsPage() {
  const { isAdmin } = useAuth()
  const [error, setError] = useState('')
  const [schedules, setSchedules] = useState([])
  const [scheduleForm, setScheduleForm] = useState({ name: '', report_type: 'inventory', report_format: 'csv', interval_minutes: 1440, recipients: '' })

  const loadSchedules = () => {
    if (!isAdmin) return
    api.getReportSchedules().then(setSchedules).catch((err) => setError(err.message))
  }

  useEffect(() => {
    loadSchedules()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin])

  const download = async (fn, filename) => {
    setError('')
    try {
      const blob = await fn()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      link.click()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError(err.message)
    }
  }

  const createSchedule = async (event) => {
    event.preventDefault()
    try {
      await api.createReportSchedule({
        ...scheduleForm,
        interval_minutes: Number(scheduleForm.interval_minutes),
      })
      setScheduleForm({ name: '', report_type: 'inventory', report_format: 'csv', interval_minutes: 1440, recipients: '' })
      loadSchedules()
    } catch (err) {
      setError(err.message)
    }
  }

  const runNow = async (id) => {
    try {
      await api.runReportSchedule(id)
      loadSchedules()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div>
      <SectionTitle title="Reportes" subtitle="Exportación de inventario y rentals en CSV, Excel y PDF." />
      {error ? <AlertBox>{error}</AlertBox> : null}
      <div className="card">
        <h3>Inventario</h3>
        <div className="button-row">
          <ReportButton label="CSV" onClick={() => download(() => api.exportInventory('csv'), 'inventory_report.csv')} />
          <ReportButton label="Excel" onClick={() => download(() => api.exportInventory('excel'), 'inventory_report.xlsx')} />
          <ReportButton label="PDF" onClick={() => download(() => api.exportInventory('pdf'), 'inventory_report.pdf')} />
        </div>
      </div>
      <div className="card">
        <h3>Rentals</h3>
        <div className="button-row">
          <ReportButton label="CSV" onClick={() => download(() => api.exportRentals('csv'), 'rentals_report.csv')} />
          <ReportButton label="Excel" onClick={() => download(() => api.exportRentals('excel'), 'rentals_report.xlsx')} />
          <ReportButton label="PDF" onClick={() => download(() => api.exportRentals('pdf'), 'rentals_report.pdf')} />
        </div>
      </div>
      {isAdmin ? (
        <div className="card">
          <h3>Reportes programados (scheduler)</h3>
          <form className="form-grid" onSubmit={createSchedule}>
            <div className="field"><label>Nombre</label><input value={scheduleForm.name} onChange={(e) => setScheduleForm((c) => ({ ...c, name: e.target.value }))} required /></div>
            <div className="field"><label>Tipo</label><select value={scheduleForm.report_type} onChange={(e) => setScheduleForm((c) => ({ ...c, report_type: e.target.value }))}><option value="inventory">Inventario</option><option value="rentals">Rentals</option></select></div>
            <div className="field"><label>Formato</label><select value={scheduleForm.report_format} onChange={(e) => setScheduleForm((c) => ({ ...c, report_format: e.target.value }))}><option value="csv">CSV</option><option value="excel">Excel</option><option value="pdf">PDF</option></select></div>
            <div className="field"><label>Intervalo (min)</label><input type="number" min="5" value={scheduleForm.interval_minutes} onChange={(e) => setScheduleForm((c) => ({ ...c, interval_minutes: e.target.value }))} /></div>
            <div className="field full"><label>Destinatarios</label><input value={scheduleForm.recipients} onChange={(e) => setScheduleForm((c) => ({ ...c, recipients: e.target.value }))} placeholder="email1@x.com,email2@x.com" /></div>
            <button className="button primary" type="submit">Crear programación</button>
          </form>
          <div className="field">
            <button className="button secondary" type="button" onClick={loadSchedules}>Actualizar lista</button>
          </div>
          <table className="table">
            <thead><tr><th>Nombre</th><th>Tipo</th><th>Formato</th><th>Intervalo</th><th>Último estado</th><th></th></tr></thead>
            <tbody>
              {schedules.map((schedule) => (
                <tr key={schedule.id}>
                  <td>{schedule.name}</td>
                  <td>{schedule.report_type}</td>
                  <td>{schedule.report_format}</td>
                  <td>{schedule.interval_minutes} min</td>
                  <td>{schedule.last_status || '-'}</td>
                  <td><button className="button tiny" type="button" onClick={() => runNow(schedule.id)}>Ejecutar ahora</button></td>
                </tr>
              ))}
              {schedules.length === 0 ? <tr><td colSpan={6}>Sin programaciones.</td></tr> : null}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}
