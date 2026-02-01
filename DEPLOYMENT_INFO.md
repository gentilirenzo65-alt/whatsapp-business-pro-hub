# Información de Despliegue VPS - Helen App

## Acceso VPS
- **IP**: `158.69.193.136`
- **Usuario**: `debian`
- **Ruta de Instalación**: `/home/debian/app`

## Repositorio
- **URL**: `https://github.com/gentilirenzo65-alt/whatsapp-business-pro-hub.git`

## Comandos de Actualización (Base de Datos + App)

Estos comandos ejecutan la actualización preservando los volúmenes de datos (base de datos y archivos multimedia) y sin afectar a otros servicios del VPS (como n8n), ya que apuntan específicamente a los contenedores de la app.

### 1. Conectar al VPS
```bash
ssh debian@158.69.193.136
```

### 2. Ir a la carpeta de la App
```bash
cd /home/debian/app
```

### 3. Descargar últimos cambios (Github)
```bash
git pull origin master
```

### 4. Reconstruir y Reiniciar App (Backend + Frontend)
Este comando hace la migración de base de datos automáticamente al iniciar el contenedor, si está configurado en el entrypoint o código.

```bash
sudo docker compose up -d --build app-backend app-frontend
```

### 5. Verificar Logs (Opcional)
```bash
sudo docker compose logs -f app-backend
```
