# Historial de Versiones y Actualizaciones

## [V3.6.0] - 2026-01-31 - Despliegue VPS Verificado 🚀
- **Procedimiento de Despliegue Documentado:** Se creó `DEPLOYMENT_INFO.md` con las credenciales y pasos exactos para actualizar el VPS sin afectar otros servicios (n8n).
- **Script de Actualización:** Verificación de `git pull` y reconstrucción de contenedores `app-backend` y `app-frontend`.
- **Validación de Integridad:** Se confirmó que la actualización NO afecta volúmenes de datos ni configuraciones externas.
- **Ruta de Instalación:** Identificada y documentada en `/home/debian/app`.

## [V3.5.0] - 2026-01-31 - Suite Multimedia Completa 🎬
- **Modo Lightbox (Expandido):** Visor de fotos y videos a pantalla completa idéntico a WhatsApp, con controles integrados.
- **Acceso a Archivos (Fix Crítico):** Solución definitiva para abrir y descargar documentos (PDFs, Docs) que antes no respondían al clic.
- **Reparación de Videos:** Reproductor de video funcional dentro del chat y en modo expandido, corrigiendo errores de reproducción y visualización.
- **Indicadores de Carga:** Feedback visual ("ruedita") para archivos pesados que aún se están descargando del servidor, mejorando la UX.
- **Descargas Directas:** Botones explícitos de "Guardar en PC" tanto en el chat como en el visor multimedia.

## [V3.1.1] - 2026-01-31 - Unificación de Contactos (Local) 🧬
- **Normalización Inteligente (Local):** Implementación de lógica en frontend para unificar contactos con y sin prefijo `9` (54... vs 549...).
- **Fusión de Chats:** Visualización unificada de historiales de mensajes para números equivalentes bajo un solo hilo de conversación.
- **Forzado de Formato:** Normalización automática a estándar `549` al guardar o editar contactos para consistencia futura.
- **Persistencia Confirmada:** Verificación de que `backend/data` asegura la retención de mensajes, contactos y configuraciones tras reinicios o actualizaciones.
- **Papelera Oculta:** Confirmación de funcionalidad de eliminación de chat (botón visible al hover).

## [V3.1.0] - 2026-01-30 - Refactorización de Arquitectura 🚀
- **Backend Modularizado:** Se eliminó el "objeto dios" `apiController.js`.
- **Nuevos Controladores:** Separación de lógica en `contactController`, `messageController`, `templateController`, etc.
- **Rutas Optimizadas:** Actualización de `api.js` para usar la nueva arquitectura.
- **Limpieza:** Eliminación de código duplicado en envío de medios.
- **Despliegue VPS:** Actualización exitosa en producción.

## [V3.0.0] - 2026-01-30 - Blindaje y Control Total 🛡️
- **Blindaje de Persistencia:** Correcta configuración de `.gitignore` y volúmenes Docker para evitar pérdida de datos (`backend/data/`).
- **Eliminación de Chats:** Funcionalidad para borrar contactos y mensajes en cascada desde la UI.
- **Normalización Argentina (V2):** Middleware centralizado para unificar números con/sin prefijo `9` (Inbound/Outbound) y evitar duplicados.
- **Script de Despliegue Seguro:** Implementación de `deploy_safe.sh` que preserva volúmenes.

## [V2.5.2] - 2026-01-30 - Optimización UX y Estabilidad ✨
- **Webhook Timeout Fix:** Descarga de archivos en background para evitar bloqueos de Meta por retardos.
- **Avatares Automáticos:** Generación de iniciales con `ui-avatars` para contactos sin foto.
- **Galería Multimedia:** Nueva pestaña en contacto para visualizar grid de fotos enviadas/recibidas.
- **Identificación de Líneas:** Badges de color por canal y "Sticky Channel" (respuesta inteligente por el canal de entrada).
- **Alertas Críticas:** Aviso visual de "Línea Caída" y monitoreo de eventos `account_update`.
- **Limpieza UI:** Mejoras visuales en burbujas de chat (eliminación de etiquetas redundantes).
- **Soporte Multimedia 50MB:** Aumento de límite en Nginx y creación automática de carpetas de upload.
- **Persistencia de Errores:** Los mensajes fallidos se guardan en BD con estado `failed` para visibilidad.
- **Modo Estricto Credenciales:** Eliminación de fallback a `.env`, priorizando configuración de BD.
- **Mini Vista:** Visualización directa de imágenes en burbujas de chat.

## [V2.5.1] - 2026-01-30 - Seguridad y Autonomía 🔐
- **Gestión Total de Credenciales:** Configuración de Phone ID, WABA ID, Token y **App Secret** desde el Frontend.
- **Seguridad Robusta:** Validación de firma HMAC SHA-256 para cumplir requisitos de Meta.
- **Autonomía:** Usuario puede gestionar líneas y credenciales sin reiniciar servidor ni tocar código.

## [V2.5.0] - 2026-01-29 - Gestión de Canales 📱
- **Gestión de Canales (Frontend):** Interfaz visual para agregar, editar y listar múltiples líneas de WhatsApp (soporte multi-tenant).
- **Soporte WABA ID:** Integración de Account ID para operaciones avanzadas.
- **Verificación Webhook:** Validación exitosa en conexión con Meta.
- **Fix Estructurales:** Corrección de `package.json`, instalación de dependencias faltantes y fix de volúmenes SQLite (`SQLITE_CANTOPEN`).
- **Backups:** Implementación de sistema de backups automáticos de base de datos.
