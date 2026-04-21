# Requisitos y herramientas para Ubuntu Server

## Sistema operativo
- Ubuntu Server 22.04 LTS o 24.04 LTS

## Recursos mínimos
- 2 vCPU
- 4 GB RAM
- 25 GB SSD

## Recomendado para producción liviana
- 4 vCPU
- 8 GB RAM
- 50 GB SSD

## Paquetes base
```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg git unzip build-essential python3 python3-venv python3-pip python3-dev libpq-dev
```

## Docker y Compose
Instalalos si vas a levantar todo con contenedores.

## Node.js 20.x
Necesario solo si vas a correr el frontend sin Docker.

## Python 3.11 o 3.12
Necesario solo si vas a correr el backend sin Docker.

## Puertos a abrir
- 80/tcp para el frontend
- 8000/tcp solo si querés exponer la API directa además del frontend
- 5432/tcp no hace falta abrirlo si PostgreSQL queda solo dentro de Docker

## Recomendación
Para producción real:
- dejar PostgreSQL sin exponer a internet,
- poner un reverse proxy adelante,
- agregar HTTPS,
- y después sumar autenticación con roles.

## Verificación rápida después del deploy
```bash
curl http://127.0.0.1/health
curl http://127.0.0.1:8000/health
curl http://127.0.0.1/api/v1/catalogs/areas
```
