# Actualización 28-29/1/2026

## ✅ ESTADO FINAL: FUNCIONANDO

El backend arranca correctamente y el webhook de Meta fue verificado exitosamente.

---

# HISTORIAL COMPLETO DE LA SESIÓN 29/1/2026

## Problema inicial
El usuario intentaba verificar el webhook de Meta WhatsApp API pero Meta devolvía:
> "No se pudo validar la URL de devolución de llamada o el token de verificación"

---

## ERROR #1: Cannot find module 'express'

### Síntoma:
```
Error: Cannot find module 'express'
Require stack:
- /app/index.js
```

### Diagnóstico:
Al revisar `backend/package.json` se descubrió que **faltaban dependencias críticas**:
- express ❌
- body-parser ❌
- cors ❌
- socket.io ❌
- sequelize ❌

Solo tenía: axios, dotenv, form-data, multer, sqlite3

### Causa raíz:
El archivo `backend/package.json` nunca fue actualizado cuando se agregaron nuevas librerías al código.

### Solución:
Se actualizó `backend/package.json` con todas las dependencias:
```json
{
  "dependencies": {
    "axios": "^1.13.3",
    "body-parser": "^2.2.2",
    "cors": "^2.8.6",
    "dotenv": "^17.2.3",
    "express": "^5.2.1",
    "form-data": "^4.0.5",
    "multer": "^2.0.2",
    "sequelize": "^6.37.7",
    "socket.io": "^4.8.3",
    "sqlite3": "^5.1.7"
  }
}
```

---

## ERROR #2: SQLITE_CANTOPEN

### Síntoma:
Después de solucionar el error de express, apareció:
```
❌ Error al conectar con la Base de Datos: ConnectionError [SequelizeConnectionError]: SQLITE_CANTOPEN: unable to open database file
```

### Diagnóstico:
El `docker-compose.yml` tenía un volumen que montaba el archivo de base de datos:
```yaml
volumes:
  - ./backend/uploads:/app/uploads
  - ./backend/database.sqlite:/app/database.sqlite  # ← ESTE ERA EL PROBLEMA
```

Esto causaba conflictos de permisos porque Docker intentaba montar un archivo que no existía o no tenía permisos correctos.

### Solución:
Se eliminó la línea del volumen de database.sqlite en `docker-compose.yml`:
```yaml
volumes:
  - ./backend/uploads:/app/uploads
  # Se eliminó: - ./backend/database.sqlite:/app/database.sqlite
```

Ahora la base de datos se crea automáticamente **dentro** del contenedor.

---

## Comandos de reinstalación que funcionaron

### Reinstalación limpia completa:
```bash
cd ~
sudo docker stop $(sudo docker ps -aq) 2>/dev/null
sudo docker rm $(sudo docker ps -aq) 2>/dev/null
sudo docker system prune -af
sudo rm -rf ~/app
git clone https://github.com/gentilirenzo65-alt/whatsapp-business-pro-hub.git ~/app
cd ~/app
cat > .env << 'EOF'
WEBHOOK_VERIFY_TOKEN=391556
META_PHONE_ID=676498832214498
META_ACCESS_TOKEN=EAAREzMEwxwcBQgfA17GJHeIWadasZCH4ztlVqYpppi6G0i3ayNr0cfqaZCE455vzrv6Fu05AKZAoKJHepM3Or9KZAg2K2gld9aqZCqWvZC4FKo3bB87KiftqWXVfl2DVl5fNmfZB3au9p13LNMEvCxCKVCpb5v4ZBkdZAXj3Uw5FcDjfAz94V7SBZA2fMJmtJCmXvcjQZDZD
APP_PINS=1234,5678
EOF
sudo docker compose up -d --build
```

### Verificar logs del backend:
```bash
sudo docker compose logs app-backend --tail=20
```

---

## Resultado final exitoso

```
✅ Base de Datos Sincronizada (Tablas creadas/actualizadas)
⏰ Scheduler iniciado - Revisando broadcasts programados cada minuto...
📦 Sistema de Backups: Iniciando...
📦 Backups Automáticos: Cada 24 horas
🚀 Server is running on port 3000
- Local: http://localhost:3000
- Webhook Endpoint: http://localhost:3000/webhook
- Socket.io: Enabled
- Scheduler: Active (cada 60s)
- Backups: Auto (cada 24h) - Dir: /app/backups
✅ SQLite backup created: backup_2026-01-29T19-52-39.sqlite
✅ Backup completed successfully
```

---

# CREDENCIALES ACTUALES (29/1/2026)

## Token de Meta WhatsApp API (NUEVO)
```
EAAREzMEwxwcBQgfA17GJHeIWadasZCH4ztlVqYpppi6G0i3ayNr0cfqaZCE455vzrv6Fu05AKZAoKJHepM3Or9KZAg2K2gld9aqZCqWvZC4FKo3bB87KiftqWXVfl2DVl5fNmfZB3au9p13LNMEvCxCKVCpb5v4ZBkdZAXj3Uw5FcDjfAz94V7SBZA2fMJmtJCmXvcjQZDZD
```

## META_PHONE_ID
```
676498832214498
```

## Webhook de Meta - ✅ VERIFICADO
- **URL:** `https://bar.helensteward.shop/webhook`
- **Token de verificación:** `391556`

## Conexión VPS
- **IP:** 158.69.193.136
- **Usuario:** debian
- **Comando SSH:** `ssh debian@158.69.193.136`

## Archivo .env en el servidor
```
WEBHOOK_VERIFY_TOKEN=391556
META_PHONE_ID=676498832214498
META_ACCESS_TOKEN=EAAREzMEwxwcBQgfA17GJHeIWadasZCH4ztlVqYpppi6G0i3ayNr0cfqaZCE455vzrv6Fu05AKZAoKJHepM3Or9KZAg2K2gld9aqZCqWvZC4FKo3bB87KiftqWXVfl2DVl5fNmfZB3au9p13LNMEvCxCKVCpb5v4ZBkdZAXj3Uw5FcDjfAz94V7SBZA2fMJmtJCmXvcjQZDZD
APP_PINS=1234,5678
```

---

# CONFIGURACIÓN DE CLOUDFLARE

## Subdominio: bar.helensteward.shop
- **Proxy:** Activado (nube naranja)
- **SSL:** Funciona correctamente

## Regla de seguridad creada:
- **Nombre:** Permitir Webhook Meta
- **Expresión:** `(http.request.uri.path contains "/webhook")`
- **Acción:** Skip (todas las protecciones)

---

# ARQUITECTURA DE LA APP

## Contenedores Docker:
1. **app-backend** - Node.js + Express (puerto 3000)
2. **app-frontend** - Nginx sirviendo React/Vite (puerto 80)

## Rutas Nginx:
| Ruta | Destino |
|------|---------|
| `/` | Frontend (archivos estáticos) |
| `/api/*` | Backend |
| `/webhook` | Backend |
| `/socket.io` | Backend |
| `/uploads` | Backend |

---

# ARCHIVOS MODIFICADOS EN ESTA SESIÓN

1. **`backend/package.json`** - Se agregaron dependencias faltantes
2. **`docker-compose.yml`** - Se eliminó el volumen de database.sqlite
3. **`components/Sidebar.tsx`** - Se actualizó versión de v1.5 a v2.0
4. **`backend/.env`** - Se actualizó token de verificación a 391556

---

# LECCIONES APRENDIDAS

1. **Siempre verificar `package.json`** - Si el código usa una librería, debe estar en las dependencias
2. **Cuidado con volúmenes de Docker** - Montar archivos que no existen causa errores de permisos
3. **Logs son críticos** - `docker compose logs` es esencial para diagnosticar problemas
4. **Reinstalar limpio funciona** - Cuando hay muchos problemas de cache, es mejor borrar todo y empezar de cero

---

# COMANDOS ÚTILES

## Ver logs del backend:
```bash
sudo docker compose logs app-backend --tail=50
```

## Ver logs en tiempo real:
```bash
sudo docker compose logs -f app-backend
```

## Reiniciar solo el backend:
```bash
sudo docker compose restart app-backend
```

## Actualizar sin borrar todo:
```bash
cd ~/app
git pull origin master
sudo docker compose down
sudo docker compose up -d --build
```

## Reinstalar todo desde cero:
```bash
cd ~
sudo docker stop $(sudo docker ps -aq) 2>/dev/null
sudo docker rm $(sudo docker ps -aq) 2>/dev/null
sudo docker system prune -af
sudo rm -rf ~/app
git clone https://github.com/gentilirenzo65-alt/whatsapp-business-pro-hub.git ~/app
cd ~/app
cat > .env << 'EOF'
WEBHOOK_VERIFY_TOKEN=391556
META_PHONE_ID=676498832214498
META_ACCESS_TOKEN=EAAREzMEwxwcBQgfA17GJHeIWadasZCH4ztlVqYpppi6G0i3ayNr0cfqaZCE455vzrv6Fu05AKZAoKJHepM3Or9KZAg2K2gld9aqZCqWvZC4FKo3bB87KiftqWXVfl2DVl5fNmfZB3au9p13LNMEvCxCKVCpb5v4ZBkdZAXj3Uw5FcDjfAz94V7SBZA2fMJmtJCmXvcjQZDZD
APP_PINS=1234,5678
EOF
sudo docker compose up -d --build
```

---

# AVANCES POSTERIORES (17:15 PM)

## ✅ HITO ALCANZADO: Webhook Verificado
El usuario confirmó que al hacer clic en "Verificar y guardar" en Meta, la acción fue exitosa y redirigió a la configuración de la API.
**Estado del Webhook:** 🟢 ACTIVO y RESPONDIENDO.

## 🔍 NUEVOS DATOS DESCUBIERTOS
En las capturas de pantalla del usuario se identificaron nuevos identificadores asociados a la cuenta de WhatsApp Business configurada en Meta:
- **Nuevo Phone ID:** `960527703810768` (Diferente al que estaba en el .env)
- **WABA ID:** `1336632681832004`
- **Número:** `+54 9 264 577 8956`

## 🚀 CAMBIO DE ESTRATEGIA: Gestión desde Frontend
Para evitar que el usuario tenga que editar código o conectarse al VPS cada vez que quiera cambiar de número o token, se decidió implementar una **Interfaz de Configuración Visual**.

### Plan de Acción Inmediato:
1. **No modificar más el backend hardcodeado** con los nuevos IDs.
2. **Modificar `SettingsView.tsx`** para incluir un formulario donde el usuario pueda:
   - Pegar el Token de Acceso.
   - Pegar el Phone ID.
   - Pegar el WABA ID.
   - Guardar la configuración en la base de datos.
3. Esto permitirá gestionar múltiples líneas sin intervención técnica.
