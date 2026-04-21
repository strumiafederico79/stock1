import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { api, assetUrl } from '../api'
import AlertBox from '../components/AlertBox'
import SectionTitle from '../components/SectionTitle'

const movementTemplates = {
  IN: { quantity: 1, notes: 'Ingreso de stock' },
  OUT: { quantity: 1, notes: 'Salida manual' },
  TRANSFER: { quantity: 1, notes: 'Transferencia de ubicación o área' },
  RETURN: { quantity: 1, notes: 'Devolución al depósito' },
  MAINTENANCE: { quantity: 1, notes: 'Ingreso a mantenimiento' },
  ADJUSTMENT: { quantity: 1, notes: 'Ajuste manual de stock' },
}

export default function ItemDetailPage() {
  const { itemId } = useParams()
  const [item, setItem] = useState(null)
  const [areas, setAreas] = useState([])
  const [locations, setLocations] = useState([])
  const [movements, setMovements] = useState([])
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    movement_type: 'OUT',
    quantity: 1,
    destination_area_id: '',
    destination_location_id: '',
    performed_by: '',
    notes: 'Salida manual',
  })

  const loadData = async () => {
    try {
      setLoading(true)
      const [itemData, areasData, movementsData] = await Promise.all([
        api.getItem(itemId),
        api.getAreas(),
        api.getItemMovements(itemId),
      ])
      setItem(itemData)
      setAreas(areasData)
      setMovements(movementsData)
      if (itemData.area_id) {
        const locationsData = await api.getLocations(itemData.area_id)
        setLocations(locationsData)
      }
      setError('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId])

  useEffect(() => {
    const targetAreaId = form.destination_area_id || item?.area_id
    if (!targetAreaId) return
    api.getLocations(targetAreaId).then(setLocations).catch(() => undefined)
  }, [form.destination_area_id, item?.area_id])

  const needsDestination = useMemo(() => form.movement_type === 'TRANSFER', [form.movement_type])

  const onMovementTypeChange = (value) => {
    setForm((current) => ({
      ...current,
      movement_type: value,
      quantity: movementTemplates[value].quantity,
      notes: movementTemplates[value].notes,
      destination_area_id: value === 'TRANSFER' ? current.destination_area_id : '',
      destination_location_id: value === 'TRANSFER' ? current.destination_location_id : '',
    }))
  }

  const onSubmitMovement = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')

    try {
      await api.createMovement({
        item_id: Number(itemId),
        movement_type: form.movement_type,
        quantity: Number(form.quantity),
        origin_area_id: item?.area_id || null,
        origin_location_id: item?.location_id || null,
        destination_area_id: needsDestination && form.destination_area_id ? Number(form.destination_area_id) : null,
        destination_location_id: needsDestination && form.destination_location_id ? Number(form.destination_location_id) : null,
        barcode_scanned: item?.barcode_value,
        performed_by: form.performed_by || null,
        notes: form.notes || null,
      })
      setMessage('Movimiento registrado correctamente.')
      await loadData()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div>
      <SectionTitle
        title={item ? item.name : 'Detalle del equipo'}
        subtitle="Ficha completa del equipo con barcode, QR y movimientos rápidos."
        actions={
          <div className="button-row">
            <Link to={`/items/${itemId}/edit`} className="button secondary">
              Editar
            </Link>
            <Link to="/inventory" className="button secondary">
              Volver
            </Link>
          </div>
        }
      />

      {error ? <AlertBox>{error}</AlertBox> : null}
      {message ? <AlertBox type="success">{message}</AlertBox> : null}
      {loading || !item ? (
        <div className="card">Cargando detalle...</div>
      ) : (
        <>
          <div className="grid two-columns">
            <div className="card">
              <h3>Datos principales</h3>
              <dl className="detail-grid">
                <dt>Código</dt>
                <dd>{item.code}</dd>
                <dt>Área</dt>
                <dd>{item.area?.name}</dd>
                <dt>Categoría</dt>
                <dd>{item.category?.name || 'Sin categoría'}</dd>
                <dt>Ubicación</dt>
                <dd>{item.location?.name || 'Sin ubicación'}</dd>
                <dt>Disponible</dt>
                <dd>
                  {item.quantity_available} / {item.quantity_total}
                </dd>
                <dt>Estado</dt>
                <dd>{item.status}</dd>
                <dt>Marca / Modelo</dt>
                <dd>{[item.brand, item.model].filter(Boolean).join(' / ') || 'No informado'}</dd>
                <dt>Serial</dt>
                <dd>{item.serial_number || 'No informado'}</dd>
                <dt>Barcode</dt>
                <dd>{item.barcode_value}</dd>
              </dl>
              {item.notes ? (
                <div className="notes-box">
                  <strong>Notas:</strong>
                  <p>{item.notes}</p>
                </div>
              ) : null}
            </div>

            <div className="card code-panel">
              <h3>Identificación</h3>
              <div className="code-images">
                <div>
                  <p>Code 128</p>
                  <img src={assetUrl(`/api/v1/items/${item.id}/barcode.png`)} alt={`Barcode ${item.barcode_value}`} />
                </div>
                <div>
                  <p>QR</p>
                  <img src={assetUrl(`/api/v1/items/${item.id}/qr.png`)} alt={`QR ${item.qr_value}`} />
                </div>
              </div>
            </div>
          </div>

          <div className="grid two-columns">
            <form className="card" onSubmit={onSubmitMovement}>
              <h3>Movimiento rápido</h3>
              <div className="field">
                <label>Tipo</label>
                <select value={form.movement_type} onChange={(event) => onMovementTypeChange(event.target.value)}>
                  {Object.keys(movementTemplates).map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Cantidad</label>
                <input type="number" min="1" value={form.quantity} onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))} />
              </div>
              <div className="field">
                <label>Responsable</label>
                <input value={form.performed_by} onChange={(event) => setForm((current) => ({ ...current, performed_by: event.target.value }))} />
              </div>
              {needsDestination ? (
                <>
                  <div className="field">
                    <label>Área destino</label>
                    <select value={form.destination_area_id} onChange={(event) => setForm((current) => ({ ...current, destination_area_id: event.target.value, destination_location_id: '' }))}>
                      <option value="">Sin cambio</option>
                      {areas.map((area) => (
                        <option key={area.id} value={area.id}>
                          {area.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label>Ubicación destino</label>
                    <select value={form.destination_location_id} onChange={(event) => setForm((current) => ({ ...current, destination_location_id: event.target.value }))}>
                      <option value="">Sin cambio</option>
                      {locations.map((location) => (
                        <option key={location.id} value={location.id}>
                          {location.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              ) : null}
              <div className="field full">
                <label>Notas</label>
                <textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} rows="3" />
              </div>
              <button className="button primary" type="submit">
                Registrar movimiento
              </button>
            </form>

            <div className="card">
              <h3>Historial</h3>
              <table className="table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Cant.</th>
                    <th>Responsable</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((movement) => (
                    <tr key={movement.id}>
                      <td>{new Date(movement.created_at).toLocaleString()}</td>
                      <td>{movement.movement_type}</td>
                      <td>{movement.quantity}</td>
                      <td>{movement.performed_by || '—'}</td>
                    </tr>
                  ))}
                  {movements.length === 0 ? (
                    <tr>
                      <td colSpan="4">Todavía no hay movimientos registrados.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
