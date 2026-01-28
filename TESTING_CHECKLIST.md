# 🧪 Checklist de Pruebas - Despliegue VPS

Este documento contiene todas las pruebas pendientes para verificar el correcto funcionamiento de la aplicación una vez desplegada en el VPS.

---

## 🔌 1. Comunicación Real-Time (Socket.io)

### Conexión
- [ ] Verificar badge "EN VIVO" aparece al conectar
- [ ] Verificar badge "DESCONECTADO" aparece al perder conexión
- [ ] Verificar que el punto verde/rojo en el avatar refleja el estado correcto

### Mensajes en Tiempo Real
- [ ] Enviar mensaje desde WhatsApp → Debe aparecer instantáneamente en el chat correcto
- [ ] Enviar mensaje desde la app → Debe aparecer con tick ✓ (enviado)
- [ ] Verificar que el mensaje NO aparece en otros chats abiertos (solo en el correcto)
- [ ] Verificar sonido de notificación al recibir mensaje (solo entrantes)

### Actualizaciones de Estado
- [ ] Enviar mensaje → Verificar que cambia a ✓✓ (entregado)
- [ ] Cliente lee mensaje → Verificar que cambia a ✓✓ azul (leído)

### Indicadores de Escritura
- [ ] Cliente escribe en WhatsApp → Verificar "Escribiendo..." en el header (si Meta lo soporta)

### Lista de Contactos en Tiempo Real
- [ ] Recibir mensaje de nuevo contacto → Debe aparecer en la lista automáticamente
- [ ] Recibir mensaje de contacto existente → Debe subir al tope de la lista
- [ ] Verificar que `unreadCount` se incrementa correctamente

---

## 🧭 2. Navegación (React Router)

### Rutas
- [ ] Acceder a `/chats` → Muestra lista de chats
- [ ] Acceder a `/chat/[ID_CONTACTO]` → Abre chat específico
- [ ] Acceder a `/templates` → Muestra gestión de plantillas
- [ ] Acceder a `/broadcasts` → Muestra difusiones
- [ ] Acceder a `/settings` → Muestra configuración

### Historial del Navegador
- [ ] Navegar entre vistas → Botón "Atrás" del navegador funciona
- [ ] Navegar entre vistas → Botón "Adelante" del navegador funciona
- [ ] Recargar página en `/chat/[ID]` → Mantiene el chat abierto

### Enlaces Compartibles
- [ ] Copiar URL de chat → Abrir en otra pestaña → Debe abrir el mismo chat

### Fallback SPA
- [ ] Acceder directamente a `/settings` (sin pasar por raíz) → Debe cargar correctamente (nginx)

---

## 💾 3. Base de Datos

### PostgreSQL (si se usa)
- [ ] Verificar conexión con `DATABASE_URL` configurado
- [ ] Crear contacto → Verificar que se guarda en PostgreSQL
- [ ] Enviar mensaje → Verificar que se guarda en PostgreSQL

### Índices de Performance
- [ ] Con muchos mensajes (1000+) → Chat carga rápido
- [ ] Lista de contactos con muchos items → Ordena por lastActive rápido

---

## 📦 4. Sistema de Backups

### Backup Automático
- [ ] Iniciar servidor → Verificar log "✅ SQLite/PostgreSQL backup created"
- [ ] Verificar que se crea archivo en `backend/backups/`
- [ ] Esperar 24h (o cambiar intervalo para test) → Verificar nuevo backup

### API de Backups
- [ ] `GET /api/backups` → Devuelve lista de backups existentes
- [ ] `POST /api/backups` → Crea backup manual inmediato

### Limpieza Automática
- [ ] Modificar fecha de backup viejo (>7 días) → Verificar que se elimina en próximo ciclo

---

## 📱 5. Canales WhatsApp (Multi-número)

### Configuración
- [ ] Agregar nuevo canal en Settings → Verificar que se guarda
- [ ] Configurar webhook de Meta apuntando al VPS
- [ ] Recibir mensaje en canal → Verificar que llega al sistema

### Webhook
- [ ] `GET /webhook?hub.mode=subscribe&hub.verify_token=TOKEN` → Responde con challenge
- [ ] `POST /webhook` → Procesa mensajes entrantes correctamente

---

## 📣 6. Broadcasts

### Creación
- [ ] Crear broadcast con plantilla → Se guarda correctamente
- [ ] Crear broadcast programado → Aparece en lista con estado "SCHEDULED"

### Ejecución
- [ ] Iniciar broadcast → Cambia a estado "SENDING"
- [ ] Broadcast completo → Cambia a estado "SENT"
- [ ] Verificar que mensajes se envían con delay aleatorio

---

## 🏷️ 7. Tags y Quick Replies

### Tags
- [ ] Crear tag en Settings → Aparece disponible en chat
- [ ] Asignar tag a contacto → Se guarda correctamente
- [ ] Filtrar broadcasts por tag → Selecciona contactos correctos

### Quick Replies
- [ ] Crear quick reply → Aparece al escribir "/"
- [ ] Usar quick reply → Inserta texto correctamente

---

## 🔒 8. Autenticación (PENDIENTE - Para después)

- [ ] PinLogin habilitado → Pide PIN al entrar
- [ ] PIN correcto → Accede a la app
- [ ] PIN incorrecto → Muestra error

---

## 🖥️ 9. Infraestructura VPS

### Docker
- [ ] `docker-compose up -d` → Levanta todos los servicios
- [ ] Backend responde en `/health`
- [ ] Frontend carga correctamente

### Nginx
- [ ] Proxy reverso funciona para `/api/*`
- [ ] Proxy reverso funciona para `/socket.io`
- [ ] SPA fallback funciona (`try_files`)

### SSL (si aplica)
- [ ] HTTPS funciona correctamente
- [ ] Redirección HTTP → HTTPS

---

## 📝 Notas de Testing

### Comandos Útiles
```bash
# Ver logs del backend
docker logs -f whatsapp-backend

# Ejecutar backup manual
curl -X POST http://localhost:3000/api/backups

# Listar backups
curl http://localhost:3000/api/backups

# Verificar health
curl http://localhost:3000/health
```

### Variables de Entorno Requeridas
```env
# Backend (.env)
PORT=3000
VERIFY_TOKEN=tu_token_secreto
DATABASE_URL=postgres://user:pass@host:5432/db  # Opcional, usa SQLite si no está
APP_PINS=1234,5678  # PINs válidos para login

# Canales se configuran desde la UI en /settings
```

---

**Fecha de última actualización:** 2026-01-28
