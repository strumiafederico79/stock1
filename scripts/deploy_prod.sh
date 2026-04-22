#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: docker no está instalado en el servidor."
  echo "Instalación rápida: curl -fsSL https://get.docker.com | sh"
  exit 1
fi

if ! command -v docker >/dev/null 2>&1 || ! docker compose version >/dev/null 2>&1; then
  echo "ERROR: docker compose plugin no disponible."
  exit 1
fi

if [[ ! -f backend/.env ]]; then
  echo "No existe backend/.env. Se creará desde backend/.env.example"
  cp backend/.env.example backend/.env
fi

if [[ ! -f .env ]]; then
  echo "No existe .env de docker compose. Se creará desde .env.example"
  cp .env.example .env
fi

echo "==> Actualizando código"
git pull --ff-only || true

echo "==> Construyendo imágenes"
docker compose build

echo "==> Levantando servicios"
docker compose up -d

echo "==> Estado"
docker compose ps

echo "==> Health backend"
set +e
curl -fsS http://localhost:8000/health && echo
set -e

echo "Deploy finalizado."
