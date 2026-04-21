import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { api } from '../api'
import AlertBox from '../components/AlertBox'
import SectionTitle from '../components/SectionTitle'

const statusOptions = ['', 'AVAILABLE', 'RESERVED', 'RENTED', 'MAINTENANCE', 'DAMAGED', 'OUT_OF_SERVICE']

export default function InventoryPage() {
  const [items, setItems] = useState([])
  const [areas, setAreas] = useState([])
  const [filters, setFilters] = useState({ q: '', area_id: '', status: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    try {
      setLoading(true)
      const [areasData, itemsData] = await Promise.all([api.getAreas(), api.getItems(filters)])
      setAreas(areasData)
      setItems(itemsData)
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

  const onSearch = (event) => {
    event.preventDefault()
    loadData()
  }

  const activeFilters = useMemo(
    () => Object.values(filters).filter(Boolean).length,
    [filters],
  )

  return (
    <div>
      <SectionTitle
        title="Inventario"
        subtitle="Filtrá por área, estado o buscá por nombre, código interno, barcode o serial."
        actions={
          <Link to="/items/new" className="button primary">
            + Nuevo equipo
          </Link>
        }
      />

      <form className="card filters" onSubmit={onSearch}>
        <div className="field">
          <label>Buscar</label>
          <input
            value={filters.q}
            onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))}
            placeholder="Ej: consola, SON-00001, serial..."
          />
        </div>
        <div className="field">
          <label>Área</label>
          <select
            value={filters.area_id}
            onChange={(event) => setFilters((current) => ({ ...current, area_id: event.target.value }))}
          >
            <option value="">Todas</option>
            {areas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Estado</label>
          <select
            value={filters.status}
            onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
          >
            {statusOptions.map((status) => (
              <option key={status || 'all'} value={status}>
                {status || 'Todos'}
              </option>
            ))}
          </select>
        </div>
        <div className="filters-actions">
          <button className="button primary" type="submit">
            Aplicar filtros
          </button>
          <button
            className="button secondary"
            type="button"
            onClick={async () => {
              const cleanFilters = { q: '', area_id: '', status: '' }
              setFilters(cleanFilters)
              try {
                setLoading(true)
                const [areasData, itemsData] = await Promise.all([api.getAreas(), api.getItems(cleanFilters)])
                setAreas(areasData)
                setItems(itemsData)
                setError('')
              } catch (err) {
                setError(err.message)
              } finally {
                setLoading(false)
              }
            }}
          >
            Limpiar
          </button>
        </div>
      </form>

      {activeFilters ? <p className="small-note">Filtros activos: {activeFilters}</p> : null}
      {error ? <AlertBox>{error}</AlertBox> : null}

      <div className="card">
        {loading ? (
          <p>Cargando inventario...</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Equipo</th>
                <th>Área</th>
                <th>Disponible</th>
                <th>Estado</th>
                <th>Barcode</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.code}</td>
                  <td>
                    <strong>{item.name}</strong>
                    <div className="muted-text">
                      {[item.brand, item.model, item.serial_number].filter(Boolean).join(' · ')}
                    </div>
                  </td>
                  <td>{item.area?.name}</td>
                  <td>
                    {item.quantity_available} / {item.quantity_total}
                  </td>
                  <td>{item.status}</td>
                  <td>{item.barcode_value}</td>
                  <td>
                    <Link to={`/items/${item.id}`} className="button tiny">
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
              {items.length === 0 ? (
                <tr>
                  <td colSpan="7">No hay resultados para los filtros seleccionados.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
