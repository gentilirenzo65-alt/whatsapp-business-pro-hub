# WhatsApp Business Pro Hub - Technical Roadmap

Este documento detalla las mejoras críticas necesarias para transformar el prototipo actual en una aplicación de producción robusta y escalable.

## 1. Comunicación en Tiempo Real (WebSockets) ✅ COMPLETADO
- [x] **Implementar Socket.io**: Backend ya tiene Socket.io configurado con eventos `new_message`, `contact_update`, y `message_status_update`.
- [x] **Conexión Frontend**: ChatView.tsx y App.tsx ahora escuchan eventos en tiempo real.
- [x] **Filtro por Contacto**: Los mensajes solo se agregan al chat del contacto correcto usando `selectedContactIdRef`.
- [x] **Indicadores de Estado**: Badge "EN VIVO" en header, punto verde/rojo en avatar, y "Escribiendo..." en tiempo real.

## 2. Seguridad Básica ✅ COMPLETADO
- [x] **Acceso por PIN**: Login simple mediante PIN numérico (`/api/auth/pin`)
- [x] **Uso individual**: No requiere sistema de roles (usuario único)

## 3. Navegación y Routing (React Router) ✅ COMPLETADO
- [x] **Instalar React Router**: `react-router-dom` instalado.
- [x] **Rutas Dinámicas**:
    - `/chats` - Lista de chats
    - `/chat/:contactId` - Chat con contacto específico (enlaces compartibles)
    - `/templates` - Gestión de templates
    - `/broadcasts` - Gestión de broadcasts
    - `/settings` - Configuración
- [x] **Manejo de Historial**: Botones Atrás/Adelante del navegador funcionan correctamente.
- [x] **Nginx configurado**: `try_files $uri $uri/ /index.html;` para SPA routing.

## 4. Base de Datos Robusta (Migración) ✅ COMPLETADO
- [x] **PostgreSQL Listo**: Activar con `DATABASE_URL=postgres://...` en `.env`
- [x] **Indexación Optimizada**: 
    - Contact: `lastActive`, `phone`, `assigned_agent_id`
    - Message: `contact_id`, `timestamp`, `status`, `contact_id+timestamp` (compuesto)
- [x] **Backups Automáticos**: 
    - Cada 24 horas automáticamente
    - SQLite: Copia directa del archivo
    - PostgreSQL: `pg_dump` (requiere pg_dump instalado)
    - Retención: 7 días (automático)
    - API: `GET /api/backups` (listar) y `POST /api/backups` (crear manual)
    - Directorio: `backend/backups/`

## 5. Gestión de Estado Global (Frontend) ✅ COMPLETADO
- [x] **Implementar Zustand**:
    - Stores: `contactsStore`, `channelsStore`, `appStore`, `messagesStore`, `broadcastsStore`, `templatesStore`
    - Eliminado "prop drilling" en todos los componentes principales
    - Caché de mensajes por contacto implementado en `messagesStore`
- [x] **Optimización de Renderizado**: Solo se re-renderiza el componente que necesita los datos específicos del store

## 6. Funcionalidades de Negocio ("Nice to have") ✅ COMPLETADO
- [x] **Editor de Templates con Variables**: Preview en tiempo real con variables resaltadas y contador de caracteres.
- [x] **Analytics Dashboard**: Nueva vista `/analytics` con métricas de mensajes, tiempos de respuesta, top contactos.
- [x] **CRM Miniatura**: Campos adicionales en contactos (email, birthday, company, customFields).
