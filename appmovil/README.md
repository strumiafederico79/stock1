# App móvil (Expo) - PGR Stock Control

## Requisitos
- Node 18+
- npm 9+
- Cuenta de Expo (gratuita)
- EAS CLI (`npm i -g eas-cli` o usando `npx eas`)

## Instalación
```bash
cd appmovil
npm install
```

## Ejecutar en desarrollo
```bash
npm run start
```

## Generar APK (Android)
La configuración para generar APK quedó lista en `eas.json`.

1. Inicia sesión en Expo:
   ```bash
   npx eas login
   ```
2. Configura el proyecto (solo la primera vez):
   ```bash
   npx eas build:configure
   ```
3. Lanza el build APK:
   ```bash
   npm run build:apk
   ```
4. Al terminar, Expo te entrega una URL para descargar el archivo `.apk`.

## Generar AAB (Play Store)
```bash
npm run build:aab
```

## Variables de entorno
La app consume la URL del backend desde `app.json` en `expo.extra.apiBaseUrl`.

Si quieres manejarlo por entorno, puedes migrar a `app.config.js` y usar variables `EXPO_PUBLIC_*`.

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
