import SectionTitle from '../components/SectionTitle'

export default function SettingsPage() {
  return (
    <div>
      <SectionTitle
        title="Configuración"
        subtitle="Parámetros operativos centrales: políticas de alerta, umbrales y preferencias del sistema."
      />
      <div className="card">
        <p className="muted-text">
          Próximamente: configuración de canales (email/whatsapp/slack), reglas de mantenimiento y parámetros de compra.
        </p>
      </div>
    </div>
  )
}
