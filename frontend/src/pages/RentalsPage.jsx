import { useEffect, useMemo, useState } from 'react'

import { api } from '../api'
import AlertBox from '../components/AlertBox'
import SectionTitle from '../components/SectionTitle'
import { useAuth } from '../context/AuthContext'

const initialRental = {
  client_name: '',
  event_name: '',
  start_date: '',
  due_date: '',
  responsible: '',
  notes: '',
  status: 'DRAFT',
}

const initialAddItem = {
  item_id: '',
  quantity: 1,
  unit_price: '',
  performed_by: '',
  notes: '',
}

const initialReturnForm = {
  quantity: 1,
  return_status: 'OK',
  notes: '',
}

const statusLabels = {
  DRAFT: 'Borrador',
  ACTIVE: 'Activo',
  PARTIAL_RETURN: 'Devolución parcial',
  CLOSED: 'Cerrado',
  CANCELLED: 'Cancelado',
}

const returnStatusLabels = {
  OK: 'OK',
  DAMAGED: 'Dañado',
  MAINTENANCE_REQUIRED: 'Requiere mantenimiento',
  LOST: 'Perdido',
}

function isOverdue(rental) {
  if (!rental) return false
  return ['ACTIVE', 'PARTIAL_RETURN'].includes(rental.status) && rental.due_date < new Date().toISOString().slice(0, 10)
}

export default function RentalsPage() {
  const { isAdmin } = useAuth()
  const [rentals, setRentals] = useState([])
  const [items, setItems] = useState([])
  const [selectedRentalId, setSelectedRentalId] = useState('')
  const [rentalForm, setRentalForm] = useState(initialRental)
  const [addItemForm, setAddItemForm] = useState(initialAddItem)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [searchTerm, setSearchTerm] = useState('')
  const [returnsByItemId, setReturnsByItemId] = useState({})
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    try {
      setLoading(true)
      const [rentalsData, itemsData] = await Promise.all([
        api.getRentals(),
        api.getItems({ available_only: true }),
      ])
      setRentals(rentalsData)
      setItems(itemsData)
      if (!selectedRentalId && rentalsData.length) {
        setSelectedRentalId(String(rentalsData[0].id))
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
  }, [])

  const filteredRentals = useMemo(() => {
    return rentals.filter((rental) => {
      if (statusFilter !== 'ALL' && rental.status !== statusFilter) return false
      if (!searchTerm.trim()) return true
      const text = `${rental.client_name} ${rental.event_name || ''}`.toLowerCase()
      return text.includes(searchTerm.trim().toLowerCase())
    })
  }, [rentals, searchTerm, statusFilter])

  const selectedRental = useMemo(
    () => rentals.find((rental) => String(rental.id) === String(selectedRentalId)),
    [rentals, selectedRentalId],
  )

  const rentalTotals = useMemo(() => {
    if (!selectedRental?.items?.length) return { subtotal: 0, returned: 0, pending: 0 }
    return selectedRental.items.reduce(
      (acc, rentalItem) => {
        const unitPrice = Number(rentalItem.unit_price || 0)
        const lineSubtotal = unitPrice * Number(rentalItem.quantity)
        const pendingQty = Math.max(0, Number(rentalItem.quantity) - Number(rentalItem.returned_quantity))
        acc.subtotal += lineSubtotal
        acc.returned += Number(rentalItem.returned_quantity) * unitPrice
        acc.pending += pendingQty * unitPrice
        return acc
      },
      { subtotal: 0, returned: 0, pending: 0 },
    )
  }, [selectedRental])

  const createRental = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')
    try {
      const created = await api.createRental(rentalForm)
      setRentalForm(initialRental)
      setMessage(`Alquiler #${created.id} creado.`)
      await loadData()
      setSelectedRentalId(String(created.id))
    } catch (err) {
      setError(err.message)
    }
  }

  const addItemToRental = async (event) => {
    event.preventDefault()
    if (!selectedRentalId) return
    setError('')
    setMessage('')
    try {
      await api.addRentalItem(selectedRentalId, {
        item_id: Number(addItemForm.item_id),
        quantity: Number(addItemForm.quantity),
        unit_price: isAdmin && addItemForm.unit_price !== '' ? Number(addItemForm.unit_price) : null,
        performed_by: addItemForm.performed_by || null,
        notes: addItemForm.notes || null,
      })
      setAddItemForm(initialAddItem)
      setMessage('Equipo agregado al alquiler.')
      await loadData()
    } catch (err) {
      setError(err.message)
    }
  }

  const updateReturnForm = (rentalItemId, changes) => {
    setReturnsByItemId((current) => ({
      ...current,
      [rentalItemId]: {
        ...(current[rentalItemId] || initialReturnForm),
        ...changes,
      },
    }))
  }

  const returnItem = async (rentalItemId) => {
    setError('')
    setMessage('')
    const payload = returnsByItemId[rentalItemId] || initialReturnForm
    try {
      await api.returnRentalItem(selectedRentalId, rentalItemId, {
        quantity: Number(payload.quantity),
        return_status: payload.return_status,
        performed_by: 'Sistema web',
        notes: payload.notes || null,
      })
      setMessage('Devolución registrada.')
      setReturnsByItemId((current) => ({ ...current, [rentalItemId]: initialReturnForm }))
      await loadData()
    } catch (err) {
      setError(err.message)
    }
  }

  const downloadReceipt = async () => {
    if (!selectedRentalId) return
    setError('')
    try {
      const blob = await api.getRentalReceipt(selectedRentalId)
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `alquiler_${selectedRentalId}_comprobante.pdf`
      link.click()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div>
      <SectionTitle title="Alquileres" subtitle="Alta de salidas, carga de equipos y devoluciones por cantidad con estado." />
      {error ? <AlertBox>{error}</AlertBox> : null}
      {message ? <AlertBox type="success">{message}</AlertBox> : null}

      {loading ? <div className="card">Cargando alquileres...</div> : null}

      <div className="grid two-columns">
        <form className="card" onSubmit={createRental}>
          <h3>Nuevo alquiler</h3>
          <div className="field">
            <label>Cliente</label>
            <input value={rentalForm.client_name} onChange={(event) => setRentalForm((current) => ({ ...current, client_name: event.target.value }))} required />
          </div>
          <div className="field">
            <label>Evento</label>
            <input value={rentalForm.event_name} onChange={(event) => setRentalForm((current) => ({ ...current, event_name: event.target.value }))} />
          </div>
          <div className="field">
            <label>Fecha de salida</label>
            <input type="date" value={rentalForm.start_date} onChange={(event) => setRentalForm((current) => ({ ...current, start_date: event.target.value }))} required />
          </div>
          <div className="field">
            <label>Fecha de devolución</label>
            <input type="date" value={rentalForm.due_date} onChange={(event) => setRentalForm((current) => ({ ...current, due_date: event.target.value }))} required />
          </div>
          <div className="field">
            <label>Responsable</label>
            <input value={rentalForm.responsible} onChange={(event) => setRentalForm((current) => ({ ...current, responsible: event.target.value }))} />
          </div>
          <div className="field full">
            <label>Notas</label>
            <textarea value={rentalForm.notes} onChange={(event) => setRentalForm((current) => ({ ...current, notes: event.target.value }))} rows="3" />
          </div>
          <button className="button primary" type="submit">
            Crear alquiler
          </button>
        </form>

        <div className="card">
          <h3>Alquileres cargados</h3>
          <div className="grid two-columns">
            <div className="field">
              <label>Buscar</label>
              <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Cliente o evento" />
            </div>
            <div className="field">
              <label>Estado</label>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="ALL">Todos</option>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="field">
            <label>Seleccionar</label>
            <select value={selectedRentalId} onChange={(event) => setSelectedRentalId(event.target.value)}>
              <option value="">Seleccionar alquiler</option>
              {filteredRentals.map((rental) => (
                <option key={rental.id} value={rental.id}>
                  #{rental.id} · {rental.client_name} · {rental.event_name || 'Sin evento'} · {statusLabels[rental.status] || rental.status}
                </option>
              ))}
            </select>
          </div>
          {selectedRental ? (
            <div className="rental-summary">
              <p>
                <strong>Cliente:</strong> {selectedRental.client_name}
              </p>
              <p>
                <strong>Evento:</strong> {selectedRental.event_name || 'Sin evento'}
              </p>
              <p>
                <strong>Fechas:</strong> {selectedRental.start_date} → {selectedRental.due_date}
              </p>
              <p>
                <strong>Estado:</strong> {statusLabels[selectedRental.status] || selectedRental.status}
                {isOverdue(selectedRental) ? ' · VENCIDO' : ''}
              </p>
              <button className="button secondary" type="button" onClick={downloadReceipt}>
                Emitir comprobante PDF
              </button>
            </div>
          ) : (
            <p className="muted-text">Creá o seleccioná un alquiler para cargar equipos.</p>
          )}
        </div>
      </div>

      <div className="grid two-columns">
        <form className="card" onSubmit={addItemToRental}>
          <h3>Agregar equipo al alquiler</h3>
          <div className="field">
            <label>Equipo disponible</label>
            <select value={addItemForm.item_id} onChange={(event) => setAddItemForm((current) => ({ ...current, item_id: event.target.value }))} required>
              <option value="">Seleccionar</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.code} · {item.name} · disp. {item.quantity_available}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Cantidad</label>
            <input type="number" min="1" value={addItemForm.quantity} onChange={(event) => setAddItemForm((current) => ({ ...current, quantity: event.target.value }))} />
          </div>
          {isAdmin ? (
            <div className="field">
              <label>Precio unitario (solo admin)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={addItemForm.unit_price}
                onChange={(event) => setAddItemForm((current) => ({ ...current, unit_price: event.target.value }))}
                placeholder="Ej: 15000"
              />
            </div>
          ) : null}
          <div className="field">
            <label>Responsable</label>
            <input value={addItemForm.performed_by} onChange={(event) => setAddItemForm((current) => ({ ...current, performed_by: event.target.value }))} />
          </div>
          <div className="field full">
            <label>Notas</label>
            <textarea value={addItemForm.notes} onChange={(event) => setAddItemForm((current) => ({ ...current, notes: event.target.value }))} rows="3" />
          </div>
          <button className="button primary" type="submit" disabled={!selectedRentalId}>
            Agregar al alquiler
          </button>
        </form>

        <div className="card">
          <h3>Ítems del alquiler</h3>
          <p className="muted-text">
            Total: ${rentalTotals.subtotal.toFixed(2)} · Devuelto: ${rentalTotals.returned.toFixed(2)} · Pendiente: ${rentalTotals.pending.toFixed(2)}
          </p>
          {selectedRental?.items?.length ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Equipo</th>
                  <th>Salió</th>
                  <th>Devuelto</th>
                  <th>Estado devolución</th>
                  <th>P. Unit.</th>
                  <th>Subtotal</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {selectedRental.items.map((rentalItem) => {
                  const pending = Math.max(0, rentalItem.quantity - rentalItem.returned_quantity)
                  const returnForm = returnsByItemId[rentalItem.id] || initialReturnForm
                  return (
                    <tr key={rentalItem.id}>
                      <td>
                        {rentalItem.item.code} · {rentalItem.item.name}
                      </td>
                      <td>{rentalItem.quantity}</td>
                      <td>{rentalItem.returned_quantity}</td>
                      <td>{returnStatusLabels[rentalItem.return_status] || rentalItem.return_status}</td>
                      <td>${Number(rentalItem.unit_price || 0).toFixed(2)}</td>
                      <td>${(Number(rentalItem.unit_price || 0) * Number(rentalItem.quantity)).toFixed(2)}</td>
                      <td>
                        <div className="field" style={{ marginBottom: 8 }}>
                          <input
                            type="number"
                            min="1"
                            max={pending || 1}
                            value={returnForm.quantity}
                            disabled={pending <= 0}
                            onChange={(event) => updateReturnForm(rentalItem.id, { quantity: event.target.value })}
                            title="Cantidad a devolver"
                          />
                        </div>
                        <div className="field" style={{ marginBottom: 8 }}>
                          <select
                            value={returnForm.return_status}
                            disabled={pending <= 0}
                            onChange={(event) => updateReturnForm(rentalItem.id, { return_status: event.target.value })}
                          >
                            {Object.entries(returnStatusLabels).map(([value, label]) => (
                              <option key={value} value={value}>{label}</option>
                            ))}
                          </select>
                        </div>
                        <div className="field" style={{ marginBottom: 8 }}>
                          <input
                            value={returnForm.notes}
                            disabled={pending <= 0}
                            onChange={(event) => updateReturnForm(rentalItem.id, { notes: event.target.value })}
                            placeholder="Notas devolución"
                          />
                        </div>
                        <button
                          className="button tiny"
                          type="button"
                          disabled={pending <= 0}
                          onClick={() => returnItem(rentalItem.id)}
                        >
                          Devolver
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            <p className="muted-text">Este alquiler todavía no tiene equipos cargados.</p>
          )}
        </div>
      </div>
    </div>
  )
}
