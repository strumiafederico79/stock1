import { useEffect, useMemo, useState } from 'react'

import { api } from '../api'
import AlertBox from '../components/AlertBox'
import SectionTitle from '../components/SectionTitle'

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
  performed_by: '',
  notes: '',
}

export default function RentalsPage() {
  const [rentals, setRentals] = useState([])
  const [items, setItems] = useState([])
  const [selectedRentalId, setSelectedRentalId] = useState('')
  const [rentalForm, setRentalForm] = useState(initialRental)
  const [addItemForm, setAddItemForm] = useState(initialAddItem)
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

  const selectedRental = useMemo(
    () => rentals.find((rental) => String(rental.id) === String(selectedRentalId)),
    [rentals, selectedRentalId],
  )

  const createRental = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')
    try {
      const created = await api.createRental(rentalForm)
      setRentalForm(initialRental)
      setMessage(`Rental #${created.id} creado.`)
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
        performed_by: addItemForm.performed_by || null,
        notes: addItemForm.notes || null,
      })
      setAddItemForm(initialAddItem)
      setMessage('Equipo agregado al rental.')
      await loadData()
    } catch (err) {
      setError(err.message)
    }
  }

  const returnItem = async (rentalItemId) => {
    setError('')
    setMessage('')
    try {
      await api.returnRentalItem(selectedRentalId, rentalItemId, {
        quantity: 1,
        performed_by: 'Sistema web',
        notes: 'Devolución rápida',
      })
      setMessage('Devolución registrada.')
      await loadData()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div>
      <SectionTitle title="Rental" subtitle="Alta de salidas, carga de equipos y devoluciones rápidas." />
      {error ? <AlertBox>{error}</AlertBox> : null}
      {message ? <AlertBox type="success">{message}</AlertBox> : null}

      {loading ? <div className="card">Cargando rentals...</div> : null}

      <div className="grid two-columns">
        <form className="card" onSubmit={createRental}>
          <h3>Nuevo rental</h3>
          <div className="field">
            <label>Cliente</label>
            <input value={rentalForm.client_name} onChange={(event) => setRentalForm((current) => ({ ...current, client_name: event.target.value }))} required />
          </div>
          <div className="field">
            <label>Evento</label>
            <input value={rentalForm.event_name} onChange={(event) => setRentalForm((current) => ({ ...current, event_name: event.target.value }))} />
          </div>
          <div className="field">
            <label>Fecha salida</label>
            <input type="date" value={rentalForm.start_date} onChange={(event) => setRentalForm((current) => ({ ...current, start_date: event.target.value }))} required />
          </div>
          <div className="field">
            <label>Fecha devolución</label>
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
            Crear rental
          </button>
        </form>

        <div className="card">
          <h3>Rentals cargados</h3>
          <div className="field">
            <label>Seleccionar</label>
            <select value={selectedRentalId} onChange={(event) => setSelectedRentalId(event.target.value)}>
              <option value="">Seleccionar rental</option>
              {rentals.map((rental) => (
                <option key={rental.id} value={rental.id}>
                  #{rental.id} · {rental.client_name} · {rental.event_name || 'Sin evento'} · {rental.status}
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
                <strong>Estado:</strong> {selectedRental.status}
              </p>
            </div>
          ) : (
            <p className="muted-text">Creá o seleccioná un rental para cargar equipos.</p>
          )}
        </div>
      </div>

      <div className="grid two-columns">
        <form className="card" onSubmit={addItemToRental}>
          <h3>Agregar equipo al rental</h3>
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
          <div className="field">
            <label>Responsable</label>
            <input value={addItemForm.performed_by} onChange={(event) => setAddItemForm((current) => ({ ...current, performed_by: event.target.value }))} />
          </div>
          <div className="field full">
            <label>Notas</label>
            <textarea value={addItemForm.notes} onChange={(event) => setAddItemForm((current) => ({ ...current, notes: event.target.value }))} rows="3" />
          </div>
          <button className="button primary" type="submit" disabled={!selectedRentalId}>
            Agregar al rental
          </button>
        </form>

        <div className="card">
          <h3>Ítems del rental</h3>
          {selectedRental?.items?.length ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Equipo</th>
                  <th>Salió</th>
                  <th>Devuelto</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {selectedRental.items.map((rentalItem) => (
                  <tr key={rentalItem.id}>
                    <td>
                      {rentalItem.item.code} · {rentalItem.item.name}
                    </td>
                    <td>{rentalItem.quantity}</td>
                    <td>{rentalItem.returned_quantity}</td>
                    <td>
                      <button
                        className="button tiny"
                        type="button"
                        disabled={rentalItem.returned_quantity >= rentalItem.quantity}
                        onClick={() => returnItem(rentalItem.id)}
                      >
                        Devolver 1
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="muted-text">Este rental todavía no tiene equipos cargados.</p>
          )}
        </div>
      </div>
    </div>
  )
}
