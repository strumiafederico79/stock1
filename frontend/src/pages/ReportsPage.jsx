import { useState } from 'react'

import { api } from '../api'
import AlertBox from '../components/AlertBox'
import SectionTitle from '../components/SectionTitle'

function ReportButton({ label, onClick }) {
  return (
    <button type="button" className="button secondary" onClick={onClick}>
      {label}
    </button>
  )
}

export default function ReportsPage() {
  const [error, setError] = useState('')

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

  return (
    <div>
      <SectionTitle title="Reportes" subtitle="Exportación de inventario y rentals en CSV, Excel y PDF." />
      {error ? <AlertBox>{error}</AlertBox> : null}
      <div className="card">
        <h3>Inventario</h3>
        <div className="button-row">
          <ReportButton label="CSV" onClick={() => download(() => api.exportInventory('csv'), 'inventory_report.csv')} />
          <ReportButton label="Excel" onClick={() => download(() => api.exportInventory('excel'), 'inventory_report.xls')} />
          <ReportButton label="PDF" onClick={() => download(() => api.exportInventory('pdf'), 'inventory_report.pdf')} />
        </div>
      </div>
      <div className="card">
        <h3>Rentals</h3>
        <div className="button-row">
          <ReportButton label="CSV" onClick={() => download(() => api.exportRentals('csv'), 'rentals_report.csv')} />
          <ReportButton label="Excel" onClick={() => download(() => api.exportRentals('excel'), 'rentals_report.xls')} />
          <ReportButton label="PDF" onClick={() => download(() => api.exportRentals('pdf'), 'rentals_report.pdf')} />
        </div>
      </div>
    </div>
  )
}
