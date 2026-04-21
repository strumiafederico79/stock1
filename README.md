# Stock Control Pro V1

App web responsive para control de stock por áreas, pensada para depósito, rental y trazabilidad por código de barras.

## Qué incluye esta versión

- Stock dividido por áreas: Sonido, Iluminacion, Pantalla, Layher, Extras y Rental.
- Alta de equipos serializados o por cantidad.
- Generación automática de código interno, barcode Code 128 y QR.
- Búsqueda por nombre, código, barcode o serial.
- Ficha del equipo con historial de movimientos.
- Movimientos rápidos: ingreso, salida, transferencia, devolución, mantenimiento y ajuste.
- Módulo básico de rental con salida y devolución.
- Escaneo desde navegador usando cámara en Chrome/Android con `BarcodeDetector`.
- Docker Compose con PostgreSQL, backend FastAPI y frontend React.
- Reverse proxy en Nginx para que el frontend consuma la API sin depender de `localhost` del navegador.

## Correcciones aplicadas en esta revisión

- Corregido el consumo de API desde el frontend en Docker. Ahora usa `/api/v1` en el mismo dominio y Nginx proxya al backend.
- PostgreSQL dejó de exponerse a internet por defecto.
- Corregida la lógica de transferencias: ya no descuenta stock disponible cuando solo cambia de área o ubicación.
- Corregida la validación de categoría y ubicación para que pertenezcan al área seleccionada.
- Corregida la edición de ítems serializados para que el stock disponible sea consistente con el estado.
- Agregado filtro `available_only` en la API de ítems para usar equipos con stock disponible desde Rental.
- Corregido el estado de los ítems al devolver parcialmente un rental.
- El formulario de edición ahora limpia categoría y ubicación al cambiar el área.
- Eliminado del frontend el movimiento rápido `STATUS_CHANGE`, porque no estaba implementado correctamente en esta V1.

## Stack

- Backend: FastAPI + SQLAlchemy
- Frontend: React + Vite
- Base de datos: PostgreSQL en Docker
- Generación de barcode: `python-barcode`
- Generación de QR: `qrcode`

## Estructura

```text
stock-control-pro-v1-fixed-r7/
├── backend/
├── frontend/
├── scripts/
├── docker-compose.yml
└── README.md
```

## Requisitos recomendados para Ubuntu Server

### Mínimo razonable

- Ubuntu 22.04 LTS o 24.04 LTS
- 2 vCPU
- 4 GB RAM
- 25 GB SSD

### Recomendado para uso real

- 4 vCPU
- 8 GB RAM
- 50 GB SSD

## Herramientas necesarias

- Docker Engine
- Docker Compose plugin
- Git
- Curl
- Node.js 20.x si lo querés correr sin Docker
- Python 3.11 o 3.12 si lo querés correr sin Docker
- Build tools: `build-essential`, `python3-dev`, `libpq-dev`

## Opción 1: levantar todo con Docker

Desde la carpeta raíz:

```bash
docker compose up --build -d

Nota: el build del frontend quedó simplificado para evitar el error `vite: not found`: la imagen instala dependencias desde `package.json`, fuerza el registro público de npm y valida que `node_modules/.bin/vite` exista antes de compilar.
```

Servicios:

- Frontend: `http://TU_IP/`
- Health de la app: `http://TU_IP/health`
- Docs FastAPI detrás del proxy: `http://TU_IP/docs`
- Backend directo: `http://TU_IP:8000/health`
- API directa: `http://TU_IP:8000/api/v1`

### Detener

```bash
docker compose down
```

## Opción 2: correr local sin Docker

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Si querés SQLite rápido, reemplazá DATABASE_URL por:
# sqlite:///./stock_control.db
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend

```bash
cd frontend
npm install
export VITE_API_URL="http://TU_IP:8000/api/v1"
npm run dev -- --host 0.0.0.0 --port 5173
```

## Seed inicial

La app crea automáticamente al iniciar:

- Áreas: Sonido, Iluminacion, Pantalla, Layher, Extras, Rental
- Categorías base por área
- Ubicaciones base por área

## Flujo rápido de prueba

1. Abrí el frontend.
2. Entrá en **Nuevo equipo**.
3. Cargá un equipo y dejá vacío código/barcode para que se generen solos.
4. Abrí la ficha del equipo y verificá barcode y QR.
5. Registrá un movimiento rápido.
6. Entrá a **Rental** y creá una salida.
7. Probá el **Escáner** desde el celular.

## Endpoints principales

### Salud
- `GET /health`

### Dashboard
- `GET /api/v1/dashboard/summary`

### Catálogos
- `GET /api/v1/catalogs/areas`
- `GET /api/v1/catalogs/categories`
- `GET /api/v1/catalogs/locations`
- `POST /api/v1/catalogs/areas`
- `POST /api/v1/catalogs/categories`
- `POST /api/v1/catalogs/locations`

### Ítems
- `GET /api/v1/items`
- `GET /api/v1/items?available_only=true`
- `POST /api/v1/items`
- `GET /api/v1/items/{id}`
- `PUT /api/v1/items/{id}`
- `GET /api/v1/items/barcode/{barcode}`
- `GET /api/v1/items/{id}/barcode.png`
- `GET /api/v1/items/{id}/qr.png`
- `GET /api/v1/items/{id}/movements`

### Movimientos
- `GET /api/v1/movements`
- `POST /api/v1/movements`

### Rental
- `GET /api/v1/rentals`
- `POST /api/v1/rentals`
- `GET /api/v1/rentals/{id}`
- `POST /api/v1/rentals/{id}/items`
- `POST /api/v1/rentals/{id}/items/{rental_item_id}/return`

## Validaciones realizadas sobre esta entrega

- Compilación del backend con Python.
- Build de producción del frontend con Vite.
- Smoke test del backend creando áreas, ítems, movimientos, barcode y rental.

## Notas de esta V1

Esta entrega está pensada como base funcional lista para arrancar. Todavía no incluye:

- autenticación y permisos por usuario,
- carga de fotos,
- exportación a PDF/Excel,
- impresión masiva de etiquetas,
- multi-depósito avanzado,
- auditoría física masiva por lote.

Eso se puede sumar en una V2 sin romper esta estructura.


## Login agregado
- Usuario admin inicial: `admin`
- Clave inicial: `admin1234`
- Roles: `ADMIN` y `OPERATOR`
- Rutas protegidas en frontend y backend
