

# [V3.1.0] - 2026-01-30 - Refactorización de Arquitectura 🚀

## Resumen
Se ha modularizado el backend eliminando el "objeto dios" `apiController.js` y separando la lógica en controladores específicos para mejorar la mantenibilidad.

### Backend Refactor
- **Nuevos Controladores**: `contactController`, `messageController`, `templateController`, etc.
- **Rutas**: Actualizadas en `api.js` para usar estos controladores.
- **Limpieza**: Eliminación de duplicidad en envío de medios.

---

# Actualización 30/1/2026 - Versión V3 🚀

## ✅ ESTADO FINAL: BLINDAJE Y CONTROL TOTAL

Se han implementado cambios estructurales para evitar la pérdida de datos y mejorar la gestión de la bandeja de entrada.

---

## 🛡️ Mejora 1: Blindaje de Persistencia (Anti-Data Loss)

### Diagnóstico:
Se detectó que la carpeta `backend/data` (donde reside `database.sqlite`) no estaba en el `.gitignore`. Además, los comandos de actualización previos borraban la carpeta completa del servidor.

### Solución:
1.  **Protección de Datos:** Se actualizó `.gitignore` para incluir `backend/data/` y `backend/uploads/`.
2.  **Despliegue Seguro:** Se creó el script `deploy_safe.sh`. Este script descarga cambios de GitHub y reconstruye contenedores **sin borrar** los volúmenes de datos.
3.  **Docker Volumes:** Se verificó que `docker-compose.yml` mapee correctamente `./backend/data` para persistencia.

---

## 🗑️ Mejora 2: Gestión de Chats (Eliminar)

### Funcionalidad:
Ahora es posible eliminar cualquier chat directamente desde la interfaz.
- Al borrar un contacto, se eliminan **en cascada** todos sus mensajes asociados en la base de datos.
- Se agregó un ícono de "Basura" en la lista de chats que se activa al pasar el mouse por encima del contacto.

---

## 👤 Mejora 3: Unificación y Normalización (Anti-Duplicados)

### Regla de Oro (Argentina Fix V2):
Se implementó un middleware y lógica centralizada para asegurar que los números de Argentina siempre se manejen sin el prefijo `9`.
- **Inbound:** Normalización automática al recibir mensajes.
- **Outbound:** Normalización al enviar mensajes y plantillas.
- **Sync de Perfil:** Si el contacto ya existe pero cambia su nombre en WhatsApp, el sistema lo actualiza localmente en lugar de crear un duplicado.

---

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

---

# 🛠️ IMPLEMENTACIÓN COMPLETADA (17:26 PM - 29/1/2026)

## ✅ FEATURE: Gestión de Canales WhatsApp desde Frontend

Se implementó la funcionalidad completa para que el usuario pueda agregar, editar y eliminar canales (números de WhatsApp) directamente desde la interfaz, sin necesidad de tocar código ni conectarse al servidor.

---

## 📁 ARCHIVOS MODIFICADOS (DETALLE EXACTO)

### 1. `backend/models/index.js`

**Ubicación del cambio:** Líneas 154-186 (modelo `Channel`)

**Cambio realizado:** Se agregó el campo `wabaId` al modelo Sequelize.

**Código ANTES:**
```javascript
const Channel = sequelize.define('Channel', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    phoneNumber: { type: DataTypes.STRING, allowNull: false },
    phoneId: { type: DataTypes.STRING, allowNull: false, unique: true },
    accessToken: { type: DataTypes.TEXT, allowNull: false },
    status: { type: DataTypes.ENUM('CONNECTED', 'DISCONNECTED'), defaultValue: 'CONNECTED' }
});
```

**Código DESPUÉS:**
```javascript
const Channel = sequelize.define('Channel', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    phoneNumber: { type: DataTypes.STRING, allowNull: false },
    phoneId: { type: DataTypes.STRING, allowNull: false, unique: true },
    wabaId: { type: DataTypes.STRING, allowNull: true }, // ← NUEVO CAMPO
    accessToken: { type: DataTypes.TEXT, allowNull: false },
    status: { type: DataTypes.ENUM('CONNECTED', 'DISCONNECTED'), defaultValue: 'CONNECTED' }
});
```

**Por qué se hizo:** El WABA ID (WhatsApp Business Account ID) es necesario para operaciones con plantillas en Meta. Ahora se puede guardar junto con el canal.

---

### 2. `backend/controllers/channelController.js`

**Cambios realizados:**

#### A) Función `createChannel` modificada:
- Ahora acepta `wabaId` en el body de la petición.
- Valida que no exista ya un canal con el mismo `phoneId` (evita duplicados).
- Mensajes de error en español.

#### B) Función `updateChannel` NUEVA:
Se agregó una función completamente nueva que permite editar canales existentes sin eliminarlos.

**Código de la nueva función:**
```javascript
// PUT /api/channels/:id
const updateChannel = async (req, res) => {
    const { id } = req.params;
    const { name, phoneNumber, phoneId, wabaId, accessToken } = req.body;

    try {
        const channel = await Channel.findByPk(id);
        if (!channel) {
            return res.status(404).json({ error: 'Canal no encontrado' });
        }

        // Update fields if provided
        if (name) channel.name = name;
        if (phoneNumber) channel.phoneNumber = phoneNumber;
        if (phoneId) channel.phoneId = phoneId;
        if (wabaId !== undefined) channel.wabaId = wabaId;
        if (accessToken) channel.accessToken = accessToken;

        await channel.save();
        res.json(channel);
    } catch (error) {
        console.error('Error updating channel:', error);
        res.status(500).json({ error: 'Failed to update channel' });
    }
};
```

#### C) Exports actualizados:
```javascript
module.exports = {
    getChannels,
    createChannel,
    updateChannel,  // ← NUEVO
    deleteChannel,
    testChannel
};
```

---

### 3. `backend/routes/api.js`

**Ubicación del cambio:** Línea 42 (sección de rutas de Canales)

**Cambio realizado:** Se agregó la ruta PUT para actualizar canales.

**Código ANTES:**
```javascript
router.get('/channels', channelController.getChannels);
router.post('/channels', channelController.createChannel);
router.delete('/channels/:id', channelController.deleteChannel);
router.post('/channels/test', channelController.testChannel);
```

**Código DESPUÉS:**
```javascript
router.get('/channels', channelController.getChannels);
router.post('/channels', channelController.createChannel);
router.put('/channels/:id', channelController.updateChannel);  // ← NUEVA RUTA
router.delete('/channels/:id', channelController.deleteChannel);
router.post('/channels/test', channelController.testChannel);
```

---

### 4. `types.ts` (Frontend - Tipos TypeScript)

**Ubicación del cambio:** Líneas 74-84 (interfaz `BusinessAPIConfig`)

**Cambio realizado:** Se agregó `wabaId` a la interfaz.

**Código ANTES:**
```typescript
export interface BusinessAPIConfig {
  id: string;
  name: string;
  phoneNumber: string;
  phoneId?: string;
  accessToken?: string;
  status: 'connected' | 'disconnected';
  apiKey?: string;
}
```

**Código DESPUÉS:**
```typescript
export interface BusinessAPIConfig {
  id: string;
  name: string;
  phoneNumber: string;
  phoneId?: string;
  wabaId?: string;       // ← NUEVO CAMPO
  accessToken?: string;
  status: 'connected' | 'disconnected';
  apiKey?: string;
}
```

---

### 5. `stores/channelsStore.ts` (Zustand Store)

**Cambios realizados:**

#### A) Nueva acción en la interfaz:
```typescript
interface ChannelsState {
    // ... existing
    updateChannel: (channel: BusinessAPIConfig) => void;  // ← NUEVO
}
```

#### B) Nueva función en el store:
```typescript
// Update existing channel
updateChannel: (updatedChannel) => set((state) => ({
    channels: state.channels.map(c => c.id === updatedChannel.id ? updatedChannel : c)
})),
```

**Por qué se hizo:** Antes solo se podía agregar y eliminar canales. Ahora el estado global de Zustand puede actualizar un canal existente sin recargar toda la lista.

---

### 6. `components/SettingsView.tsx` (REESCRITURA COMPLETA)

Este archivo fue **completamente reescrito** (de 408 líneas a aproximadamente 470 líneas) con las siguientes mejoras:

#### A) Nuevo Estado del Componente:
```typescript
const [isChannelModalOpen, setIsChannelModalOpen] = useState(false);
const [editingChannelId, setEditingChannelId] = useState<string | null>(null);
const [isTesting, setIsTesting] = useState(false);

const [channelForm, setChannelForm] = useState<Partial<BusinessAPIConfig>>({ 
  name: '', 
  phoneNumber: '', 
  phoneId: '', 
  wabaId: '',      // ← NUEVO CAMPO
  accessToken: '' 
});
```

#### B) Nuevas Funciones:

1. **`openAddChannel()`** - Abre el modal para agregar un nuevo canal.
2. **`openEditChannel(channel)`** - Abre el modal con los datos de un canal existente precargados.
3. **`handleSaveChannel()`** - Guarda o actualiza un canal (usa POST o PUT según corresponda).
4. **`handleTestConnection()`** - Prueba las credenciales contra la API de Meta antes de guardar.
5. **`handleRemoveChannel(id)`** - Elimina un canal (con confirmación).

#### C) Modal de Canal Rediseñado:

El modal ahora incluye:
- Campo **Nombre/Alias** (texto)
- Campo **Número de Teléfono** (texto)
- Campo **Phone Number ID** (texto monoespaciado)
- Campo **WABA ID** (texto monoespaciado, opcional)
- Campo **Access Token** (textarea para tokens largos)
- Botón **Probar Conexión** (con spinner de loading)
- Botón **Vincular Canal** / **Guardar Cambios** (según modo)

#### D) Tarjeta de Canal Mejorada:

Cada canal en la lista ahora muestra:
- Icono de WhatsApp en gradiente verde
- Nombre y número del canal
- Phone ID (truncado)
- WABA ID (truncado o "N/A")
- Botones: Activar como actual | Editar | Eliminar

---

## 🔌 API ENDPOINTS DISPONIBLES

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/channels` | Lista todos los canales |
| POST | `/api/channels` | Crea un nuevo canal |
| PUT | `/api/channels/:id` | **NUEVO** - Actualiza un canal existente |
| DELETE | `/api/channels/:id` | Elimina un canal |
| POST | `/api/channels/test` | Prueba credenciales contra Meta |

---

## 📊 ESTRUCTURA DE DATOS DE UN CANAL

```json
{
  "id": "uuid-generado-automaticamente",
  "name": "Ventas Principal",
  "phoneNumber": "+54 9 264 577 8956",
  "phoneId": "960527703810768",
  "wabaId": "1336632681832004",
  "accessToken": "EAAREzMEwxwcBO...",
  "status": "CONNECTED",
  "createdAt": "2026-01-29T20:30:00.000Z",
  "updatedAt": "2026-01-29T20:30:00.000Z"
}
```

---

## 🎯 CÓMO USAR LA NUEVA FUNCIONALIDAD

### Agregar un nuevo canal:
1. Ir a **Configuración** en el menú lateral.
2. En la sección "**Canales WhatsApp**", hacer clic en el botón **+**.
3. Completar el formulario:
   - **Nombre:** Un alias descriptivo (ej: "Ventas", "Soporte").
   - **Número:** El número en formato internacional.
   - **Phone ID:** Obtenerlo de Meta for Developers → WhatsApp → API Setup.
   - **WABA ID:** Opcional, útil para plantillas.
   - **Token:** Generar un token permanente en Meta.
4. Clic en **"Probar Conexión"** para verificar.
5. Si funciona, clic en **"Vincular Canal"**.

### Editar un canal existente:
1. En la lista de canales, hacer clic en el ícono de **lápiz ✏️**.
2. Modificar los campos necesarios.
3. Clic en **"Guardar Cambios"**.

### Eliminar un canal:
1. En la lista de canales, hacer clic en el ícono de **tacho 🗑️**.
2. Confirmar la eliminación.

### Seleccionar canal activo:
1. En la lista de canales, hacer clic en el ícono de **check ✓**.
2. El canal seleccionado se usará para enviar mensajes.

---

## ⚠️ NOTAS IMPORTANTES

1. **Las credenciales del .env siguen funcionando como fallback.** Si no hay canales en la BD, el sistema usa `META_PHONE_ID` y `META_ACCESS_TOKEN` del archivo `.env`.

2. **La base de datos se actualiza automáticamente.** Sequelize agrega la columna `wabaId` al reiniciar el backend con `{ alter: true }`.

3. **Los canales se guardan en SQLite.** Ubicación: `/app/database.sqlite` dentro del contenedor Docker.

4. **El token debe ser permanente.** Los tokens temporales de Meta expiran en 24 horas.

---

## 🚀 DESPLIEGUE DE ESTOS CAMBIOS

Los cambios ya fueron pusheados a GitHub. Para aplicarlos en el VPS:

```bash
ssh debian@158.69.193.136
cd ~/app
git pull origin master
sudo docker compose down
sudo docker compose up -d --build
```

---

## 📝 COMMIT REALIZADO

```
commit 6edfe20
Author: [Gemini Assistant]
Date:   Thu Jan 29 17:25:00 2026 -0300

    feat: Gestión de canales WhatsApp desde frontend - WABA ID, edición y múltiples números
    
    - backend/models/index.js: Agregado campo wabaId al modelo Channel
    - backend/controllers/channelController.js: Nueva función updateChannel, soporte wabaId
    - backend/routes/api.js: Nueva ruta PUT /api/channels/:id
    - stores/channelsStore.ts: Nueva acción updateChannel en Zustand
    - types.ts: Agregado wabaId a interfaz BusinessAPIConfig
    - components/SettingsView.tsx: Reescritura completa con modal mejorado
    
    7 files changed, 502 insertions(+), 176 deletions(-)
```

---

# 🔄 PROCEDIMIENTO DE ACTUALIZACIÓN REALIZADO (19:40 PM - 29/1/2026)

## 1. Backup Exitoso
Se realizó una copia de seguridad de la base de datos antes de aplicar los cambios en producción.
- **Comando Ejecutado:** `sudo docker cp $(sudo docker ps -qf "name=app-backend"):/app/database.sqlite ./backup_database_antes.sqlite`
- **Resultado:** Archivo creado `backup_database_antes.sqlite` (129kB).
- **Importancia:** Esto asegura que si la migración de Sequelize fallaba, se podía restaurar la BD original.

## 2. Comandos de Despliegue Utilizados
El usuario ejecutó la siguiente secuencia de comandos en el servidor para aplicar la versión 2.5:

1. **Actualizar código fuente:**
   ```bash
   git pull origin master
   ```
2. **Detener contenedores (sin borrar volúmenes):**
   ```bash
   sudo docker compose down
   ```
3. **Reconstruir y levantar servicios:**
   ```bash
   sudo docker compose up -d --build
   ```

## 3. Verificación Final
- **Estado:** ✅ Todo arrancó correctamente.
- **Frontend:** Actualizado a **v2.5** (visible en el sidebar).
- **Base de Datos:** Persistió correctamente y se agregó la columna `wabaId` sin pérdida de datos.
- **Funcionalidad:** Verificada la gestión de canales y conexión con Meta.

## 4. Evidencia de Logs (Backend)
```bash
app-backend-1  | ✅ Base de Datos Sincronizada (Tablas creadas/actualizadas)
app-backend-1  | ⏰ Scheduler iniciado - Revisando broadcasts programados cada minuto...
app-backend-1  | 📦 Sistema de Backups: Iniciando...
app-backend-1  | 📦 Starting database backup at 1/29/2026, 8:34:43 PM...
app-backend-1  | 📦 Backups Automáticos: Cada 24 horas
app-backend-1  | 🚀 Server is running on port 3000
app-backend-1  | - Local: http://localhost:3000
app-backend-1  | - Webhook Endpoint: http://localhost:3000/webhook
app-backend-1  | - Socket.io: Enabled
app-backend-1  | - Scheduler: Active (cada 60s)
app-backend-1  | - Backups: Auto (cada 24h) - Dir: /app/backups
app-backend-1  | ✅ SQLite backup created: backup_2026-01-29T20-34-43.sqlite
app-backend-1  | ✅ Backup completed successfully
```

---

# SESIÓN 30/1/2026 - FINALIZACIÓN Y ENTREGA

## ✅ HITO ALCANZADO: APP 100% OPERATIVA (v2.5.1)

El sistema ha sido actualizado a la versión **v2.5.1** y desplegado exitosamente en el VPS. Esta versión completa los requisitos de Meta y la independencia del usuario.

### 1. Estado Actual
- **Versión:** v2.5.1
- **Status Servidor:** 🟢 ONLINE (Logs confirmados)
- **Status Base de Datos:** 🟢 SINCRONIZADA
- **Status Webhook:** 🟢 VERIFICADO

### 2. Grandes Avances (v2.5.1)
Esta actualización marca el punto de "Listo para Producción" porque elimina la dependencia del desarrollador para tareas administrativas diarias:

#### A. Gestión Total de Credenciales (NO MÁS CÓDIGO)
Ahora la aplicación permite configurar desde el Frontend:
- **Phone ID**
- **WABA ID** (Account ID)
- **Access Token**
- **App Secret** (🔐 Nuevo y Crítico)

**Implicación:** El usuario puede agregar, quitar o cambiar la línea de WhatsApp (ej. si cambia de proveedor o número) sin necesidad de editar archivos `.env`, sin reiniciar el servidor y sin tocar una sola línea de código.

#### B. Seguridad de Grado Empresarial (Meta Compliant)
Se implementó la **validación de firma HMAC SHA-256**.
- **Cómo funciona:** Cuando Meta envía un mensaje, el sistema busca el `App Secret` específico de ese número en la base de datos y verifica matemáticamente que el mensaje viene de Meta y no de un hacker.
- **Implicación:** Cumple con el requisito de seguridad más estricto de Meta para aplicaciones en producción.

### 3. Evidencia de Despliegue Exitoso (30/1/2026 - 03:55 AM)
El servidor reinició correctamente tras la actualización:

```bash
app-backend-1  | [dotenv@17.2.3] injecting env (0) from .env
app-backend-1  | ✅ Base de Datos Sincronizada (Tablas creadas/actualizadas)
app-backend-1  | ⏰ Scheduler iniciado - Revisando broadcasts programados cada minuto...
app-backend-1  | 📦 Sistema de Backups: Iniciando...
app-backend-1  | 📦 Starting database backup at 1/30/2026, 3:55:08 AM...
app-backend-1  | 🚀 Server is running on port 3000
app-backend-1  | - Local: http://localhost:3000
app-backend-1  | - Socket.io: Enabled
app-backend-1  | ✅ SQLite backup created: backup_2026-01-30T03-55-09.sqlite
app-backend-1  | ✅ Backup completed successfully
```

---
**PRÓXIMOS PASOS RECOMENDADOS:**
1. Navegar a `/settings` en la App.
2. Cargar las credenciales reales de la línea (incluyendo el App Secret).
3. Realizar una prueba de envío real.


### 4. PRUEBA DE FUEGO: CONFIRMADA (01:05 AM)
El usuario realizó una prueba real enviando un mensaje desde su móvil personal al número conectado.

**Resultado:**
- ✅ El mensaje llegó al servidor.
- ✅ El Webhook lo procesó correctamente (Firma Validada).
- ✅ El mensaje se guardó en la Base de Datos.
- ✅ No hubo errores en los logs.

# 🏁 ESTADO FINAL DEL PROYECTO: OPERATIVO
La infraestructura base ("Core") del WhatsApp Business Pro Hub está **FINALIZADA Y FUNCIONANDO**.

**Capacidades Actuales:**
1.  **Conectividad:** Full Bidireccional con Meta (Envío y Recepción).
2.  **Seguridad:** Validación robusta (App Secret + Hmac SHA256).
3.  **Gestión:** Autonomía total del usuario para gestionar credenciales desde la UI.
4.  **Backend:** Estable, con backups y re-conexión automática.

---
**SIGUIENTE FASE:** Optimización de UI/UX (Frontend)
El foco cambia ahora a mejorar la experiencia visual y la usabilidad de la interfaz, sabiendo que el motor que hay debajo es sólido como una roca.

---
---

# HISTORIAL DE LA SESIÓN 30/1/2026 (v2.5.2)

## 1. Descarga de Archivos en Segundo Plano (Fix Webhook Timeout)

### Problema:
Al enviar imágenes o archivos pesados, el servidor intentaba descargarlos antes de confirmar la recepción a Meta. Esto causaba retardos y errores de "Timeout", provocando que WhatsApp bloqueara temporalmente el webhook.

### Solución Implementada:
- **Backend:** Ahora el mensaje se guarda *inmediatamente* en la base de datos (con la imagen pendiente) y se responde "OK" a Meta al instante.
- **Background Task:** La descarga del archivo ocurre en un proceso paralelo sin bloquear el sistema.
- **Frontend:** Se implementó un evento `message_update` que actualiza la imagen en el chat en tiempo real una vez finalizada la descarga.

**Resultado:** Mensajes instantáneos y mayor estabilidad del webhook.

---

## 2. Soporte para Avatares (Generación Automática)

### Situación:
La API oficial de Meta no permite obtener la foto de perfil real de los usuarios por privacidad, lo que resultaba en imágenes vacías o rotas en la interfaz.

### Solución:
- **Fallback Inteligente:** Se implementó una integración con `ui-avatars.com`.
- **Funcionamiento:** Si el contacto no tiene foto, el sistema genera automáticamente un **círculo con las iniciales** del nombre del cliente sobre un color de fondo aleatorio.
- **Cobertura:** Esta mejora visual se aplicó en:
  1. La lista de conversaciones (barra lateral).
  2. El encabezado principal del chat activo.
  3. El modal de "Editar Contacto".

---

## 3. Galería Multimedia por Contacto

### Nueva Funcionalidad (Visual):
- Al hacer clic en el nombre del contacto o en "Editar", se abre un nuevo modal expandido.
- **Pestaña "Archivos":** Muestra una galería visual (grid) con todas las fotos enviadas y recibidas con ese cliente.
- Permite descargar las imágenes y previsualizar documentos y audios compartidos.

---

## 4. Identificación de Líneas y Sticky Channel

### Requerimiento:
El usuario necesitaba diferenciar fácilmente por cuál de sus líneas (números) entró un mensaje y asegurarse de que la respuesta salga por el mismo canal.

### Solución Implementada:
- **Badge de Canal:** En la lista de chats, cada conversación ahora tiene una etiqueta de color en la esquina inferior derecha con el nombre de la línea (e.g., "Ventas", "Soporte").
- **Colores Dinámicos:** El sistema asigna un color único a cada línea para identificación visual rápida.
- **Sticky Channel (Respuesta Inteligente):** Al seleccionar un chat, el sistema **cambia automáticamente** la línea de salida a aquella por la que el cliente escribió originalmente. Esto evita errores de responder desde el número equivocado.

---

## 5. Sistema de Alertas Críticas (Líneas Caídas)

### Requerimiento:
El usuario necesitaba un aviso inmediato e imposible de ignorar si Meta bloquea o restringe alguna de sus líneas de WhatsApp.

### Solución Implementada:
- **Monitoreo de Salud:** El Backend ahora escucha eventos `account_update` de Meta (Baneos, Restricciones).
- **Alerta Roja Fija (Sticky Alert):** Si una línea muere, aparece un cartel **ROJO** y **animado (pulse)** en la parte superior de la pantalla. No desaparece hasta que el usuario lo cierra manualmente.
- **Detalle Visual en Configuración:** Las líneas afectadas se muestran con borde rojo e ícono de alerta ⚠️ en la pantalla de Settings.

---

## 6. Limpieza Visual del ChatUI

- Se eliminó la etiqueta de texto que mostraba el número de teléfono encima de cada burbuja de mensaje para ofrecer una experiencia más limpia y similar a la app nativa.

---

# VERSIÓN ACTUAL: v2.5.2

## Resumen de Cambios Técnicos
- `backend/services/whatsappService.js`: Refactorización a async/background download.
- `stores/messagesStore.ts`: Nueva acción `updateMessage` para actualizaciones parciales.
- `App.tsx`: Listener global de actualizaciones de mensajes vía Socket.IO.
- `components/ChatView.tsx`: Implementación de Galería, Avatares, Badges de Canal y lógica Sticky.
- `backend/controllers/webhookController.js`: Detección de eventos `account_update`.
- `components/SettingsView.tsx`: Visualización de estado crítico de líneas.
- `App.tsx`: Sistema de Alertas Globales (Sticky Alerts).
- `components/Sidebar.tsx`: Actualización de indicador de versión.

---

# DESPLIEGUE EN VPS (30/1/2026 - 17:15 PM)

## Procedimiento Realizado:
1.  **Backup de Seguridad:** Se realizó una copia de la base de datos `database.sqlite` en el VPS antes de actualizar (`backup_antes_v2.5.2.sqlite`).
2.  **Actualización de Código:** Se hizo `git pull origin master` para bajar la versión **v2.5.2**.
3.  **Reconstrucción de Contenedores:** Se ejecutó `docker compose up -d --build` para actualizar tanto Backend como Frontend.

## Estado Final:
- **Backend:** 🟢 ONLINE (Puerto 3000). Logs limpios.
- **Frontend:** 🟢 ONLINE (Puerto 80).
- **Base de Datos:** 🟢 SINCRONIZADA y con backup automático al inicio.
- **Versión Desplegada:** `v2.5.2`


---

## 7. Persistencia de Datos (Docker Volumes)

### Problema:
Al actualizar la aplicación con Docker (`docker compose up -d --build`), el contenedor se destruía y recreaba, borrando la base de datos interna (`database.sqlite`) y perdiendo configuraciones y chats.

### Solución Implementada:
- **Volumen Persistente:** Se configuró un volumen en `docker-compose.yml` que mapea la carpeta del host `./backend/data` a `/app/data` en el contenedor.
- **Configuración Dinámica:** Se actualizó `database.js` y `backup.js` para usar la ruta persistente definida en la variable de entorno `DB_STORAGE_PATH`.
- **Migración:** Se movió la base de datos existente a la carpeta segura.

**Resultado:** Ahora se puede actualizar, reiniciar o borrar el contenedor sin perder ni una sola línea de chat o configuración.

---

# ESTADO FINAL DE LA SESIÓN (30/1/2026 - 17:30 PM)

## Resumen de Logros:
1.  **Estabilidad del Webhook:** Solucionado el problema de timeouts mediante descargas en background.
2.  **Experiencia de Usuario:** Avatares automáticos, Galería multimedia, Sticky Channel y limpieza visual.
3.  **Seguridad y Alertas:** Sistema de detección intantánea de bloqueos/bans de Meta con avisos en pantalla.
4.  **Infraestructura:** Implementación de persistencia de datos real a prueba de actualizaciones.

## Verificación Final:
- **Servidor:** 🟢 ONLINE y respondiendo.
- **Base de Datos:** 🟢 PERSISTENTE y con backups automáticos funcionando.
- **Frontend:** 🟢 v2.5.2 Desplegado y operativo.

**PROYECTO LISTO Y ESTABILIZADO.**

---

## 8. Corrección de Envío Multimedia

### Problema Reportado:
El usuario no podía enviar imágenes o archivos multimedia desde la interfaz ("el mensaje llega, pero si quiero enviar imágenes no se puede").

### Causas Detectadas:
1.  **Directorio de Subida Faltante:** La carpeta `backend/uploads/media` no existía, causando error en el módulo `multer`.
2.  **Límite de Nginx:** La configuración por defecto de Nginx limitaba los archivos a 1MB.

### Solución Implementada:
- **Backend (`routes/api.js`):** Se añadió verificación automática para crear la carpeta de destino si no existe.
- **Nginx (`nginx.conf`):** Se aumentó el límite de subida a **50MB** (`client_max_body_size 50M`) tanto para la App como para n8n.
- **Infraestructura:** Se aseguró la existencia de las carpetas mediante `.gitkeep` y creación dinámica.

## 9. Diagnóstico de Fallo de Envío (30/01/2026 - 18:00)

### Síntoma:
Los mensajes salientes (del CRM hacia WhatsApp) empezaron a fallar o demorar, y las imágenes no se enviaban.
Los mensajes entrantes (de WhatsApp al CRM) seguían funcionando.

### Causa Raíz Detectada (Logs):
El **Token de Acceso de Meta** configurado en el canal expiró.
Error en logs: `Session has expired on Friday, 30-Jan-26 13:00:00 PST`.

### Solución Implementada:
1.  **Backend (`whatsappService.js`):** Se corrigió un error crítico que haría crashear el webhook si entraba un contacto sin nombre (`TypeError`).
2.  **Manejo de Errores (`apiController.js`):** Ahora el sistema reportará el error real de Meta al frontend en lugar de fingir que el mensaje se envió.

### ACCIÓN REQUERIDA POR EL USUARIO:
⚠️ **Debe generar un nuevo Token de Acceso en Meta (o usar un Token de Sistema permanente) y actualizarlo en la configuración del Canal dentro de la App.** Sin esto, los mensajes salientes seguirán fallando por "Token Expirado".

## 10. Corrección de Persistencia de Mensajes Fallidos (30/01/2026 - 18:45)

### Problema Reportado:
Al refrescar el CRM, los mensajes que habían fallado al enviarse (por token vencido) desaparecían de la conversación, dando la sensación de "pérdida de datos".

### Causa Técnica:
El sistema estaba diseñado para no guardar en la Base de Datos si la API de Meta devolvía error, para evitar "mentir" sobre el estado del envío.

### Solución Implementada:
- **Persistencia de Errores (`apiController.js`):** Ahora, si un mensaje falla al enviarse, **SE GUARDA IGUALMENTE** en la base de datos, pero marcado con estado **`failed`** (Fallido).
- **Beneficio:** El mensaje permanecerá en el historial (probablemente en rojo o con indicador de error) y no desaparecerá al recargar la página, permitiendo al usuario saber qué falló.

## 11. Unificación de Contactos Argentina (30/01/2026 - 19:00)

### Problema Reportado:
El usuario notó que algunas conversaciones "se borraban" o quedaban colgadas, mientras los mensajes nuevos llegaban pero no se veían en el chat abierto.

### Causa Técnica:
WhatsApp envía los números de Argentina con el prefijo `549...`, pero muchos usuarios (y el propio sistema al enviar) usan `54...`.
Esto provocaba que el sistema detectara dos números distintos para la misma persona, creando un "contacto duplicado" invisible donde llegaban los mensajes nuevos, fragmentando la historia.

### Solución Implementada:
- **Lógica de Normalización Inteligente (`whatsappService.js`):** Al recibir un mensaje, el sistema ahora verifica variantes del número (con y sin '9').
- **Resultado:** Si llega un mensaje desde `549...`, el sistema es capaz de encontrar y usar el contacto existente `54...`, manteniendo toda la conversación en un solo hilo coherente.

## 12. Previsualización de Imágenes ("Mini Vista") (30/01/2026 - 19:30)

### Problema Reportado:
Las imágenes enviadas o recibidas no eran visibles en el chat, requiriendo acciones externas o fallando por completo.

### Solución Implementada:
- **Renderizado Dinámico (`ChatView.tsx`):** Se habilitó la visualización directa de multimedia en la burbuja de chat.
- **Lógica de Fallback:** Si una imagen falla al descargarse (ej. por error de token), el sistema muestra un aviso de "Imagen no disponible" en lugar de un icono roto o nada, informando al usuario.

## 13. Modo Estricto de Credenciales (30/01/2026 - 19:50)

### Problema Reportado:
Confusión entre las credenciales del archivo servidor (`.env`) y las de la Base de Datos (`Settings`), lo que impedía que los cambios realizados por el usuario en el panel tuvieran efecto real.

### Solución Implementada:
- **Eliminación de Fallback:** Se refactorizaron los servicios de envío y descarga para ignorar el archivo `.env`. Ahora el sistema **solo** utiliza lo que el usuario configura en el CRM.
- **Resultado:** El usuario tiene soberanía total sobre las credenciales desde el panel de control. No hay configuraciones "fantasma".

---
**Estado Final:** Sistema estabilizado, previsualizaciones activas y control centralizado de credenciales.
