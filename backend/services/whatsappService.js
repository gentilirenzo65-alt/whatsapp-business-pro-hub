const { Contact, Message, User, Channel, sequelize } = require('../models'); // Added Channel
const { Op } = require('sequelize');

class WhatsAppService {

    // -------------------------------------------------------------
    // PROCESAMIENTO CENTRAL DE MENSAJES (EL CEREBRO)
    // -------------------------------------------------------------
    async handleIncomingMessage(messageData, contactData, metadata) { // Added metadata param
        const transaction = await sequelize.transaction();

        try {
            // 0. Detectar Canal (Channel)
            const receiverPhoneId = metadata?.phone_number_id;
            let channel = null;
            if (receiverPhoneId) {
                channel = await Channel.findOne({ where: { phoneId: receiverPhoneId } });
            }

            // Si el canal no existe, podríamos loguearlo o usar fallback. 
            // Por ahora seguimos, pero idealmente enlazamos el mensaje al canal.

            // 1. Identificar o Crear Contacto (Normalización Argentina V2.1 - Con '9')
            // Resilience: Fallback to messageData.from if contactData is missing
            let rawPhone = contactData?.wa_id || messageData?.from || '';
            let phone = rawPhone.replace(/\D/g, '');
            const name = contactData?.profile?.name || phone || 'Unknown';

            // REGLA DE ORO V3: Si es Argentina, SIEMPRE usar 549 (Estándar WhatsApp)
            // Si viene como 54XXXXXXXXXX, lo convertimos a 549XXXXXXXXXX
            if (phone.startsWith('54') && !phone.startsWith('549')) {
                phone = '549' + phone.substring(2);
            }
            // Si ya viene como 549..., lo dejamos así.

            // Buscar contacto (Prioridad: Formato nuevo 549)
            let contact = await Contact.findOne({ where: { phone: phone }, transaction });

            // Si no existe con 549, buscar si existe con el formato viejo (54 sin 9) para migrarlo
            if (!contact && phone.startsWith('549')) {
                const legacyPhone = '54' + phone.substring(3);
                const legacyContact = await Contact.findOne({ where: { phone: legacyPhone }, transaction });

                if (legacyContact) {
                    console.log(`🔄 Migrando contacto ${legacyContact.name} de formato ${legacyPhone} a ${phone}`);
                    legacyContact.phone = phone; // Actualizamos al nuevo formato
                    await legacyContact.save({ transaction });
                    contact = legacyContact; // Usamos este
                }
            }

            if (!contact) {
                contact = await Contact.create({
                    phone: phone,
                    name: name,
                    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
                    assigned_agent_id: null,
                    tags: []
                }, { transaction });
            } else {
                // Si el nombre cambió en WhatsApp, lo actualizamos localmente
                if (name && name !== 'Unknown' && name !== contact.name) {
                    contact.name = name;
                    await contact.save({ transaction });
                }
            }

            // Link contact to channel if we want strict segmentation later, 
            // currently contacts are global but we could tag 'Source: Ventas'

            // 2. Lógica de "Opt-out" (Legal)
            const textBody = this._extractText(messageData);

            if (textBody && textBody.toUpperCase() === 'BAJA') {
                contact.tags = [...(contact.tags || []), 'BLOCKED_OPTOUT'];
                await contact.save({ transaction });
                console.log(`🚫 Contacto ${phone} solicitó BAJA. Bloqueado.`);
                await transaction.commit();
                return;
            }

            // 3. Guardar Mensaje en DB (INITIAL SAVE - FAST)
            const newMessage = await Message.create({
                id: messageData.id,
                direction: 'inbound',
                type: messageData.type,
                body: textBody,
                media_url: null, // Will be updated in background
                status: 'delivered',
                contact_id: contact.id,
                channelId: channel ? channel.id : null,
                timestamp: new Date(parseInt(messageData.timestamp) * 1000)
            }, { transaction });

            // 4. Actualizar contacto
            contact.lastActive = new Date();
            contact.unreadCount = (contact.unreadCount || 0) + 1;
            await contact.save({ transaction });

            await transaction.commit();

            // REAL-TIME UPDATE (Immediate feedback)
            if (global.io) {
                global.io.emit('new_message', newMessage);
                global.io.emit('contact_update', contact);
            }

            console.log(`✅ Mensaje guardado de ${name} [Canal: ${channel?.name || 'Unknown'}]: ${textBody || '[' + messageData.type + ']'}`);

            // 5. TRIGGER BACKGROUND MEDIA DOWNLOAD (Non-blocking)
            if (['image', 'audio', 'document', 'video', 'sticker'].includes(messageData.type)) {

                // STRICT: Only use Channel Token from Database
                const token = channel?.accessToken;

                if (token) {
                    // Fire and forget - do not await
                    this._downloadMediaBackground(messageData, newMessage.id, token)
                        .catch(err => console.error('❌ Background media download failed:', err));
                } else {
                    console.warn(`⚠️ Media message received but NO TOKEN found for channel ${channel?.id || 'Unknown'}. Media will not be downloaded. Verify Channel Settings in CRM.`);
                }
            }

            return newMessage;

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error handling message:', error);
            throw error;
        }
    }

    // NEW: Background Media Downloader
    async _downloadMediaBackground(messageData, messageId, token) {
        const mediaId = messageData[messageData.type].id;
        const axios = require('axios');
        const fs = require('fs');
        const path = require('path');
        const { Message } = require('../models'); // Re-import to ensure scope

        try {
            console.log(`📥 Iniciando descarga de media en segundo plano: ${mediaId} (Tipo: ${messageData.type})`);

            // Step 1: Get media info (Using v21.0 and trailing slash as requested)
            const mediaInfoRes = await axios.get(`https://graph.facebook.com/v21.0/${mediaId}/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const metaMediaUrl = mediaInfoRes.data.url;
            const mimeType = mediaInfoRes.data.mime_type || 'application/octet-stream';

            if (!metaMediaUrl) {
                throw new Error('Meta API no devolvió URL de descarga para el media_id provisto.');
            }

            // Step 2: Download binary with Token (IMPORTANT: Authorization header is required)
            const mediaRes = await axios.get(metaMediaUrl, {
                headers: { 'Authorization': `Bearer ${token}` },
                responseType: 'arraybuffer'
            });

            // Step 3: Determine extension
            const extMap = {
                'image/jpeg': '.jpg',
                'image/png': '.png',
                'image/webp': '.webp',
                'audio/ogg': '.ogg',
                'audio/mpeg': '.mp3',
                'audio/amr': '.amr',
                'video/mp4': '.mp4',
                'application/pdf': '.pdf',
                'application/vnd.ms-excel': '.xls',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
                'application/msword': '.doc',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx'
            };
            const ext = extMap[mimeType] || '.bin';

            // Step 4: Save to disk
            const filename = `${mediaId}${ext}`;
            const uploadDir = path.join(__dirname, '..', 'uploads', 'media');
            const filepath = path.join(uploadDir, filename);

            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }

            fs.writeFileSync(filepath, mediaRes.data);

            const localMediaUrl = `/uploads/media/${filename}`;
            console.log(`📎 Media descargada y guardada: ${localMediaUrl}`);

            // Step 5: Update Database
            const msg = await Message.findByPk(messageId);
            if (msg) {
                msg.media_url = localMediaUrl;
                await msg.save();

                // Step 6: Emit Update Event to Frontend
                if (global.io) {
                    global.io.emit('message_update', {
                        id: messageId,
                        media_url: localMediaUrl,
                        // Include other fields if necessary, but partial update is usually handled by id
                        contact_id: msg.contact_id // Helpful for stores to find where to update
                    });
                }
            }

        } catch (error) {
            console.error(`❌ Error downloading media ${mediaId} in background:`, error.message);
            // Optionally update message with error status
        }
    }
    // -------------------------------------------------------------
    // ENVÍO DE MENSAJES
    // -------------------------------------------------------------
    async sendMessage(toPhone, text, type = 'text', mediaUrl = null, channelId = null) {
        // Argentina Normalization V2.1 (Strict: Add 9)
        if (toPhone && toPhone.startsWith('54') && !toPhone.startsWith('549')) {
            toPhone = '549' + toPhone.substring(2);
        }

        console.log(`📡 Enviando mensaje a [${toPhone}] por canal [${channelId || 'DEFAULT'}]`);

        let token, phoneId;

        // 1. Determine Credentials from DB (STRICT)
        if (channelId) {
            const channel = await Channel.findByPk(channelId);
            if (channel) {
                token = channel.accessToken;
                phoneId = channel.phoneId;
            } else {
                console.error(`❌ CRITICAL: Channel ID ${channelId} not found in DB.`);
                return { success: false, error: 'Channel not found in DB' };
            }
        } else {
            console.error('❌ CRITICAL: No channelId provided for sendMessage (Strict Mode).');
            return { success: false, error: 'Channel ID required' };
        }

        // 2. Strict Check
        if (!token || !phoneId) {
            console.error(`❌ CRITICAL: Channel ${channelId} has missing credentials in DB.`);
            return { success: false, error: 'Channel credentials missing. Update Settings.' };
        }

        const axios = require('axios');

        try {
            const url = `https://graph.facebook.com/v17.0/${phoneId}/messages`;

            const payload = {
                messaging_product: 'whatsapp',
                to: toPhone,
                type: 'text',
                text: { body: text }
            };

            const response = await axios.post(url, payload, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('✅ Meta Response:', response.data);
            const metaMessageId = response.data.messages[0].id;

            return { success: true, messageId: metaMessageId };

        } catch (error) {
            console.error('❌ Error enviando a Meta:', error.response ? error.response.data : error.message);
            return { success: false, error: error.message };
        }
    }

    // -------------------------------------------------------------
    // ENVÍO DE MENSAJES CON PLANTILLA OFICIAL
    // -------------------------------------------------------------
    async sendTemplateMessage(toPhone, templateName, language = 'es', channelId = null, parameters = []) {
        // Argentina Normalization V2.1 (Strict: Add 9)
        if (toPhone && toPhone.startsWith('54') && !toPhone.startsWith('549')) {
            toPhone = '549' + toPhone.substring(2);
        }

        console.log(`📋 Enviando plantilla [${templateName}] a [${toPhone}] por canal [${channelId || 'DEFAULT'}]`);

        let token, phoneId;

        // 1. Determine Credentials from DB (STRICT)
        if (channelId) {
            const channel = await Channel.findByPk(channelId);
            if (channel) {
                token = channel.accessToken;
                phoneId = channel.phoneId;
            } else {
                console.error(`❌ CRITICAL: Channel ID ${channelId} not found in DB.`);
                return { success: false, error: 'Channel not found in DB' };
            }
        } else {
            console.error('❌ CRITICAL: No channelId provided for sendTemplateMessage (Strict Mode).');
            return { success: false, error: 'Channel ID required' };
        }

        // 2. Strict Check
        if (!token || !phoneId) {
            console.error(`❌ CRITICAL: Channel ${channelId} has missing credentials in DB.`);
            return { success: false, error: 'Channel credentials missing. Update Settings.' };
        }

        const axios = require('axios');

        try {
            const url = `https://graph.facebook.com/v17.0/${phoneId}/messages`;

            // Build template payload
            const templatePayload = {
                messaging_product: 'whatsapp',
                to: toPhone,
                type: 'template',
                template: {
                    name: templateName,
                    language: { code: language }
                }
            };

            // Add parameters if provided (for {{1}}, {{2}}, etc.)
            if (parameters && parameters.length > 0) {
                templatePayload.template.components = [
                    {
                        type: 'body',
                        parameters: parameters.map(param => ({
                            type: 'text',
                            text: param
                        }))
                    }
                ];
            }

            const response = await axios.post(url, templatePayload, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('✅ Template enviado:', response.data);
            const metaMessageId = response.data.messages[0].id;

            return { success: true, messageId: metaMessageId };

        } catch (error) {
            console.error('❌ Error enviando template a Meta:', error.response ? error.response.data : error.message);
            return { success: false, error: error.response?.data?.error?.message || error.message };
        }
    }

    _extractText(messageData) {
        if (messageData.type === 'text') return messageData.text.body;
        if (messageData.type === 'button') return messageData.button.text;
        if (messageData.type === 'interactive') {
            if (messageData.interactive.type === 'button_reply') return messageData.interactive.button_reply.title;
            if (messageData.interactive.type === 'list_reply') return messageData.interactive.list_reply.title;
        }
        if (messageData.type === 'image') return messageData.image.caption || '[FOTO]';
        if (messageData.type === 'document') return messageData.document.caption || messageData.document.filename || '[DOCUMENTO]';
        if (messageData.type === 'audio') return '[AUDIO]';
        if (messageData.type === 'video') return messageData.video.caption || '[VIDEO]';
        if (messageData.type === 'sticker') return '[STICKER]';

        return `[${messageData.type.toUpperCase()}]`;
    }

    // -------------------------------------------------------------
    // GESTIÓN DE PLANTILLAS
    // -------------------------------------------------------------
    async createTemplate(name, category, content, language = 'es', buttons = [], channelId = null) {
        console.log(`📝 Creando plantilla [${name}] en Meta...`);

        let token, phoneId;

        // Get credentials
        if (channelId) {
            const channel = await Channel.findByPk(channelId);
            if (channel) {
                token = channel.accessToken;
                phoneId = channel.phoneId;
            }
        }

        if (!token) {
            token = process.env.META_ACCESS_TOKEN;
            phoneId = process.env.META_PHONE_ID;
        }

        if (!token || !phoneId) {
            return { success: false, error: 'No credentials available' };
        }

        const axios = require('axios');

        try {
            // Step 1: Get WABA ID from Phone ID
            // The correct endpoint is: GET /{phone-number-id}?fields=id,display_phone_number,waba_id
            console.log(`🔍 Obteniendo WABA ID desde Phone ID: ${phoneId}...`);

            const phoneRes = await axios.get(`https://graph.facebook.com/v17.0/${phoneId}`, {
                params: { fields: 'id,display_phone_number,whatsapp_business_account' },
                headers: { 'Authorization': `Bearer ${token}` }
            });

            // The response contains: { id, display_phone_number, whatsapp_business_account: { id: "WABA_ID" } }
            let wabaId = phoneRes.data?.whatsapp_business_account?.id;

            // Fallback to env if API doesn't return it (permissions issue)
            if (!wabaId) {
                wabaId = process.env.META_WABA_ID;
            }

            if (!wabaId) {
                return { success: false, error: 'No se pudo obtener el WABA ID. Configura META_WABA_ID en .env' };
            }

            console.log(`✅ WABA ID obtenido: ${wabaId}`);

            // Step 2: Create template
            const url = `https://graph.facebook.com/v17.0/${wabaId}/message_templates`;

            const components = [
                {
                    type: 'BODY',
                    text: content
                }
            ];

            // Add buttons if any
            if (buttons && buttons.length > 0) {
                components.push({
                    type: 'BUTTONS',
                    buttons: buttons.map(btnText => ({
                        type: 'QUICK_REPLY',
                        text: btnText
                    }))
                });
            }

            const payload = {
                name: name,
                category: category,
                allow_category_change: true,
                language: language,
                components: components
            };

            const response = await axios.post(url, payload, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            console.log('✅ Template Created:', response.data);
            return { success: true, metaId: response.data.id, status: response.data.status };

        } catch (error) {
            console.error('❌ Error creando plantilla en Meta:', error.response ? error.response.data : error.message);
            return { success: false, error: error.response?.data?.error?.message || error.message };
        }
    }

    // -------------------------------------------------------------
    // VERIFICACIÓN DE CREDENCIALES
    // -------------------------------------------------------------
    async verifyCredentials(phoneId, accessToken) {
        console.log(`🔍 Verificando credenciales para Phone ID: ${phoneId}`);
        const axios = require('axios');

        try {
            // Call Meta API to get Phone Number details
            // GET /{phone-number-id}
            const url = `https://graph.facebook.com/v17.0/${phoneId}`;

            const response = await axios.get(url, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });

            // If successful, check if the ID matches (sanity check)
            if (response.data.id === phoneId) {
                console.log('✅ Credenciales Válidas. Nombre en Meta:', response.data.display_phone_number);
                return {
                    success: true,
                    data: {
                        display_phone_number: response.data.display_phone_number,
                        quality_rating: response.data.quality_rating,
                        verified_name: response.data.verified_name
                    }
                };
            } else {
                return { success: false, error: 'El ID devuelto por Meta no coincide.' };
            }

        } catch (error) {
            console.error('❌ Error verificando credenciales:', error.response ? error.response.data : error.message);
            const metaError = error.response?.data?.error?.message || error.message;

            // User friendly error mapping
            let userError = metaError;
            if (metaError.includes('Invalid OAuth access token')) userError = 'Token de acceso inválido o expirado.';
            if (metaError.includes('Unsupported get request')) userError = 'Phone ID incorrecto o no existe.';

            return { success: false, error: userError };
        }
    }
}

module.exports = new WhatsAppService();
