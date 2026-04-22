# Deploy rápido - PGR STOCK CONTROL

## 1) Requisitos del servidor (Ubuntu 22.04/24.04)

```bash
sudo apt update
sudo apt install -y ca-certificates curl git gnupg lsb-release
```

### Opción A (recomendada): Docker

```bash
# Docker Engine + Compose plugin
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker "$USER"
newgrp docker

docker --version
docker compose version
```

### Opción B: sin Docker (nativo)

```bash
sudo apt update
sudo apt install -y python3 python3-venv python3-pip nodejs npm nginx
python3 --version
node --version
npm --version
```

---

## 2) Obtener código

```bash
git clone <URL_DEL_REPO> stock1
cd stock1
git pull
```

---

## 3) Variables de entorno

Raíz del proyecto (docker compose):

```bash
cp .env.example .env
```

Backend:

```bash
cp backend/.env.example backend/.env
```

Editar `backend/.env` según tu entorno (`DATABASE_URL`, `JWT_SECRET_KEY`, etc.).

---

## 4) Deploy con Docker (producción)

```bash
cd /ruta/a/stock1
docker compose build --no-cache
docker compose up -d
docker compose ps
docker compose logs -f backend
docker compose logs -f frontend
```

### Reinicio/actualización

```bash
git pull
docker compose build
docker compose up -d
```

---

## 5) Deploy sin Docker (producción)

### Backend

```bash
cd /ruta/a/stock1/backend
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip wheel
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd /ruta/a/stock1/frontend
npm ci
npm run build
```

Servir `frontend/dist` con Nginx.

---

## 6) Verificaciones post-deploy

```bash
curl -f http://localhost:8000/health
curl -f http://localhost/api/v1/dashboard/summary -H "Authorization: Bearer <TOKEN>"
```

---

## 7) Dependencias de aplicación (resumen)

- Backend: `backend/requirements.txt`
- Frontend: `frontend/package.json`
- Variables env ejemplo: `backend/.env.example`

---

## 8) Rollback rápido (Docker)

```bash
git log --oneline -n 10
git checkout <commit_anterior_estable>
docker compose build
docker compose up -d
```
