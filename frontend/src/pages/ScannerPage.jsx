import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { api } from '../api'
import AlertBox from '../components/AlertBox'
import SectionTitle from '../components/SectionTitle'

export default function ScannerPage() {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const detectorRef = useRef(null)
  const loopRef = useRef(null)
  const scanningRef = useRef(false)

  const [supported, setSupported] = useState(false)
  const [error, setError] = useState('')
  const [manualCode, setManualCode] = useState('')
  const [detectedItem, setDetectedItem] = useState(null)
  const [scanning, setScanning] = useState(false)

  useEffect(() => {
    const isSupported = 'BarcodeDetector' in window
    setSupported(isSupported)
    if (isSupported) {
      detectorRef.current = new window.BarcodeDetector({ formats: ['code_128', 'qr_code'] })
    }

    return () => {
      if (loopRef.current) window.cancelAnimationFrame(loopRef.current)
      scanningRef.current = false
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  const scanFrame = async () => {
    if (!videoRef.current || !detectorRef.current) return
    try {
      const codes = await detectorRef.current.detect(videoRef.current)
      if (codes.length > 0) {
        const value = codes[0].rawValue
        setManualCode(value)
        setScanning(false)
        scanningRef.current = false
        await fetchItem(value)
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop())
        }
        return
      }
    } catch (err) {
      setError(err.message)
    }
    if (scanningRef.current) {
      loopRef.current = window.requestAnimationFrame(scanFrame)
    }
  }

  const startScan = async () => {
    if (!supported) return
    try {
      setError('')
      setDetectedItem(null)
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setScanning(true)
      scanningRef.current = true
      loopRef.current = window.requestAnimationFrame(scanFrame)
    } catch (err) {
      setError('No se pudo acceder a la cámara. Revisá permisos o usá la carga manual.')
    }
  }

  const fetchItem = async (barcode) => {
    try {
      const item = await api.getItemByBarcode(barcode)
      setDetectedItem(item)
      setError('')
    } catch (err) {
      setDetectedItem(null)
      setError(err.message)
    }
  }

  const onManualSearch = async (event) => {
    event.preventDefault()
    if (!manualCode.trim()) return
    await fetchItem(manualCode.trim())
  }

  return (
    <div>
      <SectionTitle title="Escáner" subtitle="Usá cámara del celular o lector que escriba el barcode en un input." />
      {error ? <AlertBox>{error}</AlertBox> : null}

      <div className="grid two-columns">
        <div className="card">
          <h3>Cámara</h3>
          <p className="muted-text">
            Compatibilidad ideal en Chrome/Android moderno mediante BarcodeDetector API.
          </p>
          <video ref={videoRef} className="scanner-video" muted playsInline />
          <div className="button-row">
            <button className="button primary" type="button" disabled={!supported || scanning} onClick={startScan}>
              {supported ? 'Iniciar cámara' : 'BarcodeDetector no disponible'}
            </button>
          </div>
        </div>

        <form className="card" onSubmit={onManualSearch}>
          <h3>Carga manual o lector USB/Bluetooth</h3>
          <div className="field">
            <label>Barcode</label>
            <input value={manualCode} onChange={(event) => setManualCode(event.target.value)} placeholder="Escaneá o escribí el código" />
          </div>
          <button className="button primary" type="submit">
            Buscar equipo
          </button>
        </form>
      </div>

      {detectedItem ? (
        <div className="card">
          <h3>Equipo encontrado</h3>
          <p>
            <strong>{detectedItem.code}</strong> · {detectedItem.name}
          </p>
          <p>
            Área: {detectedItem.area?.name} · Estado: {detectedItem.status} · Disponible: {detectedItem.quantity_available}/
            {detectedItem.quantity_total}
          </p>
          <Link className="button primary" to={`/items/${detectedItem.id}`}>
            Abrir ficha
          </Link>
        </div>
      ) : null}
    </div>
  )
}
