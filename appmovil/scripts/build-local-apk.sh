#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v npx >/dev/null 2>&1; then
  echo "Error: npx no está instalado. Instala Node.js 18+ y npm." >&2
  exit 1
fi

if ! command -v java >/dev/null 2>&1; then
  echo "Error: Java no está instalado. Se requiere JDK 17." >&2
  exit 1
fi

if [[ -z "${ANDROID_HOME:-}" && -z "${ANDROID_SDK_ROOT:-}" ]]; then
  echo "Error: define ANDROID_HOME o ANDROID_SDK_ROOT apuntando al Android SDK." >&2
  exit 1
fi

echo "[1/3] Generando proyecto Android nativo (Expo prebuild)..."
npx expo prebuild --platform android --non-interactive

echo "[2/3] Compilando APK release local..."
cd android
./gradlew assembleRelease

echo "[3/3] APK generado en:"
echo "$(pwd)/app/build/outputs/apk/release/app-release.apk"
