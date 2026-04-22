# App móvil (Expo) - PGR Stock Control

## Requisitos
- Node 18+
- npm 9+
- Expo CLI (opcional, se usa con `npx expo`)

## Instalación
```bash
cd appmovil
npm install
cp .env.example .env
```

Editar `.env` con tu backend:
```env
EXPO_PUBLIC_API_URL=http://3.88.51.188/api/v1
```

## Ejecutar
```bash
npm run start
```

## Pantallas incluidas (MVP)
- Login
- Inicio (dashboard)
- Inventario
- Alquileres
- Escáner de códigos
- Mantenimiento
- Ajustes

## Notas
- La app reutiliza la API FastAPI existente.
- Token guardado con `expo-secure-store`.
- El escáner usa `expo-barcode-scanner`.
