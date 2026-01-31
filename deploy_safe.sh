#!/bin/bash

# ==========================================
# SCRIPT DE ACTUALIZACIÓN SEGURA (V3)
# Preserva Base de Datos y Archivos de Media
# ==========================================

echo "🚀 Iniciando actualización segura a la versión V3..."

# 1. Bajar los cambios de GitHub
echo "📥 Descargando código desde GitHub..."
git pull origin master

# 2. Reconstruir y levantar contenedores
# Usamos --build para aplicar cambios de código
# NO usamos 'rm' ni borramos carpetas de volumes
echo "🏗️  Reconstruyendo contenedores (esto preserva los volúmenes)..."
sudo docker compose up -d --build app-backend app-frontend

echo "✅ ¡Actualización completada!"
echo "📡 La Base de Datos y los Uploads NO han sido tocados."
echo "📜 Puedes ver los logs con: sudo docker compose logs -f app-backend"
