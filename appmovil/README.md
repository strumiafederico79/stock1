# App móvil (Expo) - PGR Stock Control

## Requisitos
- Node 18+
- npm 9+
- Para build local Android: JDK 17 + Android SDK (`ANDROID_HOME` o `ANDROID_SDK_ROOT`)
- Opcional (build cloud): cuenta de Expo (gratuita) + EAS CLI

## Instalación
```bash
cd appmovil
npm install
```

## Ejecutar en desarrollo
```bash
npm run start
```

## Opción 1: Generar APK local (sin cuenta Expo)
Este modo construye un APK release en tu máquina con Gradle.

```bash
npm run build:apk:local
```

Ruta esperada del archivo:
```bash
appmovil/android/app/build/outputs/apk/release/app-release.apk
```

## Opción 2: Generar APK en la nube (EAS)
La configuración para generar APK también está lista en `eas.json`.

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


## Mejoras incluidas (UI + seguridad)
- Nuevo tema visual premium oscuro con acento dorado y logo PGR en login/ajustes.
- Inputs y botones reutilizables para consistencia visual.
- Validación/sanitización básica de datos de entrada en login y formularios móviles.
- Manejo de sesión más seguro: expiración por inactividad (12h), renovación de sesión por actividad y limpieza automática si hay `401` del backend.
- Timeout de red (15s) para evitar bloqueos indefinidos en solicitudes.

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
