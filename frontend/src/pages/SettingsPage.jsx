import { useEffect, useState } from 'react'

import { api } from '../api'
import AlertBox from '../components/AlertBox'
import SectionTitle from '../components/SectionTitle'

export default function SettingsPage() {
  const [form, setForm] = useState({
    business_name: 'PGR STOCK CONTROL',
    business_tax_id: 'CUIT 00-00000000-0',
    business_address: 'Sin dirección configurada',
    footer_note: 'Gracias por su alquiler.',
    currency_symbol: '$',
  })
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    api.getReceiptBranding().then(setForm).catch((err) => setError(err.message))
  }, [])

  const onSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')
    try {
      const updated = await api.updateReceiptBranding(form)
      setForm(updated)
      setMessage('Configuración fiscal y branding guardada.')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div>
      <SectionTitle
        title="Configuración"
        subtitle="Parámetros operativos centrales: políticas de alerta, umbrales y preferencias del sistema."
      />
      {error ? <AlertBox>{error}</AlertBox> : null}
      {message ? <AlertBox type="success">{message}</AlertBox> : null}
      <form className="card form-grid" onSubmit={onSubmit}>
        <div className="field"><label>Razón social / Nombre</label><input value={form.business_name} onChange={(e) => setForm((c) => ({ ...c, business_name: e.target.value }))} required /></div>
        <div className="field"><label>Identificación fiscal</label><input value={form.business_tax_id} onChange={(e) => setForm((c) => ({ ...c, business_tax_id: e.target.value }))} required /></div>
        <div className="field"><label>Moneda</label><input value={form.currency_symbol} onChange={(e) => setForm((c) => ({ ...c, currency_symbol: e.target.value }))} required /></div>
        <div className="field full"><label>Dirección</label><input value={form.business_address} onChange={(e) => setForm((c) => ({ ...c, business_address: e.target.value }))} required /></div>
        <div className="field full"><label>Nota final del comprobante</label><textarea rows="3" value={form.footer_note} onChange={(e) => setForm((c) => ({ ...c, footer_note: e.target.value }))} /></div>
        <button className="button primary" type="submit">Guardar configuración</button>
      </form>
    </div>
  )
}
