#!/bin/bash
# Doble clic en macOS para iniciar el demo.
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "Necesitas instalar Node.js 20 o superior: https://nodejs.org"
  read -n 1 -s -r -p "Pulsa una tecla para salir"; exit 1
fi
[ -d node_modules ] || { echo "Instalando dependencias, solo la primera vez..."; npm install; }
npm run demo
