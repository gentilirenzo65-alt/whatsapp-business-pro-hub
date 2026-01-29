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
