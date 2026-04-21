import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { api } from '../api'
import AlertBox from '../components/AlertBox'
import SectionTitle from '../components/SectionTitle'

const initialForm = {
  name: '',
  description: '',
  area_id: '',
  category_id: '',
  location_id: '',
  brand: '',
  model: '',
  serial_number: '',
  control_type: 'SERIALIZED',
  quantity_total: 1,
  quantity_available: 1,
  unit: 'u',
  status: 'AVAILABLE',
  min_stock: 0,
  code: '',
  barcode_value: '',
  notes: '',
}

export default function ItemFormPage() {
  const { itemId } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(itemId)
  const [areas, setAreas] = useState([])
  const [categories, setCategories] = useState([])
  const [locations, setLocations] = useState([])
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function bootstrap() {
      try {
        const areasData = await api.getAreas()
        setAreas(areasData)

        if (!isEdit) return

        const item = await api.getItem(itemId)
        setForm({
          name: item.name,
          description: item.description || '',
          area_id: String(item.area_id),
          category_id: item.category_id ? String(item.category_id) : '',
          location_id: item.location_id ? String(item.location_id) : '',
          brand: item.brand || '',
          model: item.model || '',
          serial_number: item.serial_number || '',
          control_type: item.control_type,
          quantity_total: item.quantity_total,
          quantity_available: item.quantity_available,
          unit: item.unit,
          status: item.status,
          min_stock: item.min_stock,
          code: item.code,
          barcode_value: item.barcode_value,
          notes: item.notes || '',
        })

        const [categoriesData, locationsData] = await Promise.all([
          api.getCategories(item.area_id),
          api.getLocations(item.area_id),
        ])
        setCategories(categoriesData)
        setLocations(locationsData)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    bootstrap()
  }, [isEdit, itemId])

  useEffect(() => {
    if (!form.area_id) {
      setCategories([])
      setLocations([])
      return
    }

    Promise.all([api.getCategories(form.area_id), api.getLocations(form.area_id)])
      .then(([categoriesData, locationsData]) => {
        setCategories(categoriesData)
        setLocations(locationsData)
      })
      .catch((err) => setError(err.message))
  }, [form.area_id])

  const isSerialized = useMemo(() => form.control_type === 'SERIALIZED', [form.control_type])

  const update = (field, value) => {
    setForm((current) => {
      if (field === 'area_id') {
        return {
          ...current,
          area_id: value,
          category_id: '',
          location_id: '',
        }
      }
      return { ...current, [field]: value }
    })
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      const payload = {
        ...form,
        area_id: Number(form.area_id),
        category_id: form.category_id ? Number(form.category_id) : null,
        location_id: form.location_id ? Number(form.location_id) : null,
        quantity_total: isSerialized ? 1 : Number(form.quantity_total),
        quantity_available: isSerialized ? (form.status === 'AVAILABLE' ? 1 : 0) : Number(form.quantity_available),
        min_stock: Number(form.min_stock),
      }

      const saved = isEdit ? await api.updateItem(itemId, payload) : await api.createItem(payload)
      navigate(`/items/${saved.id}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <SectionTitle
        title={isEdit ? 'Editar equipo' : 'Nuevo equipo'}
        subtitle="Alta de stock con generación automática de barcode y QR si dejás esos campos vacíos."
        actions={
          <Link to="/inventory" className="button secondary">
            Volver al inventario
          </Link>
        }
      />

      {error ? <AlertBox>{error}</AlertBox> : null}
      {loading ? (
        <div className="card">Cargando formulario...</div>
      ) : (
        <form className="card form-grid" onSubmit={onSubmit}>
          <div className="field full">
            <label>Nombre</label>
            <input value={form.name} onChange={(event) => update('name', event.target.value)} required />
          </div>
          <div className="field full">
            <label>Descripción</label>
            <textarea value={form.description} onChange={(event) => update('description', event.target.value)} rows="3" />
          </div>
          <div className="field">
            <label>Área</label>
            <select value={form.area_id} onChange={(event) => update('area_id', event.target.value)} required>
              <option value="">Seleccionar</option>
              {areas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Categoría</label>
            <select value={form.category_id} onChange={(event) => update('category_id', event.target.value)}>
              <option value="">Sin categoría</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Ubicación</label>
            <select value={form.location_id} onChange={(event) => update('location_id', event.target.value)}>
              <option value="">Sin ubicación</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Tipo de control</label>
            <select value={form.control_type} onChange={(event) => update('control_type', event.target.value)}>
              <option value="SERIALIZED">Serializado</option>
              <option value="QUANTITY">Por cantidad</option>
            </select>
          </div>
          <div className="field">
            <label>Marca</label>
            <input value={form.brand} onChange={(event) => update('brand', event.target.value)} />
          </div>
          <div className="field">
            <label>Modelo</label>
            <input value={form.model} onChange={(event) => update('model', event.target.value)} />
          </div>
          <div className="field">
            <label>Serial</label>
            <input value={form.serial_number} onChange={(event) => update('serial_number', event.target.value)} />
          </div>
          <div className="field">
            <label>Código interno</label>
            <input value={form.code} onChange={(event) => update('code', event.target.value)} placeholder="Auto si queda vacío" />
          </div>
          <div className="field">
            <label>Barcode</label>
            <input value={form.barcode_value} onChange={(event) => update('barcode_value', event.target.value)} placeholder="Auto si queda vacío" />
          </div>
          <div className="field">
            <label>Unidad</label>
            <input value={form.unit} onChange={(event) => update('unit', event.target.value)} />
          </div>
          <div className="field">
            <label>Estado</label>
            <select value={form.status} onChange={(event) => update('status', event.target.value)}>
              <option value="AVAILABLE">Disponible</option>
              <option value="RESERVED">Reservado</option>
              <option value="RENTED">Alquilado</option>
              <option value="MAINTENANCE">Mantenimiento</option>
              <option value="DAMAGED">Dañado</option>
              <option value="OUT_OF_SERVICE">Fuera de servicio</option>
            </select>
          </div>
          <div className="field">
            <label>Cantidad total</label>
            <input
              type="number"
              min="1"
              disabled={isSerialized}
              value={isSerialized ? 1 : form.quantity_total}
              onChange={(event) => update('quantity_total', event.target.value)}
            />
          </div>
          <div className="field">
            <label>Cantidad disponible</label>
            <input
              type="number"
              min="0"
              disabled={isSerialized}
              value={isSerialized ? (form.status === 'AVAILABLE' ? 1 : 0) : form.quantity_available}
              onChange={(event) => update('quantity_available', event.target.value)}
            />
          </div>
          <div className="field">
            <label>Stock mínimo</label>
            <input type="number" min="0" value={form.min_stock} onChange={(event) => update('min_stock', event.target.value)} />
          </div>
          <div className="field full">
            <label>Notas</label>
            <textarea value={form.notes} onChange={(event) => update('notes', event.target.value)} rows="3" />
          </div>

          <div className="full form-actions">
            <button type="submit" className="button primary" disabled={saving}>
              {saving ? 'Guardando...' : isEdit ? 'Actualizar equipo' : 'Crear equipo'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
