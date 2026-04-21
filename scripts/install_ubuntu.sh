#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="${1:-$HOME/stock-control-pro-v1}"

sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg git unzip build-essential python3 python3-venv python3-pip python3-dev libpq-dev

if ! command -v docker >/dev/null 2>&1; then
  sudo install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  sudo chmod a+r /etc/apt/keyrings/docker.gpg
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
  sudo apt-get update
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  sudo usermod -aG docker "$USER" || true
fi

if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

mkdir -p "$PROJECT_DIR"
echo "Listo. Copiá el proyecto en: $PROJECT_DIR"
echo "Después ejecutá: cd $PROJECT_DIR && docker compose up --build -d"
echo "Checks útiles:"
echo "  curl http://127.0.0.1/health"
echo "  curl http://127.0.0.1:8000/health"
