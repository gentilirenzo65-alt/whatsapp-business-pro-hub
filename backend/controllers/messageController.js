const { Message, Contact, Channel } = require('../models'); // Check imports logic
const whatsappService = require('../services/whatsappService');
const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios'); // Needed for manual fallback if service fails/or if we keep it for now

// GET /api/messages/:contactId
// Obtener historial de chat
const getMessages = async (req, res) => {
    const { contactId } = req.params;
    try {
        const messages = await Message.findAll({
            where: { contact_id: contactId },
            order: [['timestamp', 'ASC']]
        });

        if (messages.length === 0) {
            // If no messages found, ensure unread is 0 (fix ghost notifications)
            await Contact.update({ unreadCount: 0 }, { where: { id: contactId } });
        }

        res.json(messages);
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// POST /api/send
// Enviar mensaje a WhatsApp
const sendMessage = async (req, res) => {
    const { contactId, text, type, mediaUrl } = req.body;

    if (!contactId || (!text && !mediaUrl)) {
        return res.status(400).json({ error: 'Missing contactId or content' });
    }

    try {
        const contact = await Contact.findByPk(contactId);
        if (!contact) return res.status(404).json({ error: 'Contact not found' });

        const sendResult = await whatsappService.sendMessage(contact.phone, text, type, mediaUrl, req.body.channelId);

        const newMessage = await Message.create({
            id: sendResult.messageId || `failed_${Date.now()}`,
            direction: 'outbound',
            type: type || 'text',
            body: text,
            media_url: mediaUrl,
            status: sendResult.success ? 'sent' : 'failed',
            timestamp: new Date(),
            contact_id: contactId
        });

        if (!sendResult.success) {
            return res.status(500).json({
                error: 'Failed to send message via WhatsApp API',
                details: sendResult.error,
                message: newMessage // Return the saved message
            });
        }

        res.json(newMessage);

    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
};

// POST /api/send-media
// Upload media to Meta and send to contact
const sendMediaMessage = async (req, res) => {
    const { contactId, channelId, caption } = req.body;
    const file = req.file;

    if (!contactId || !file) {
        return res.status(400).json({ error: 'Missing contactId or media file' });
    }

    try {
        const contact = await Contact.findByPk(contactId);
        if (!contact) return res.status(404).json({ error: 'Contact not found' });

        // STRICT: Get credentials ONLY from Channel
        let token = null;
        let phoneId = null;

        if (channelId) {
            const channel = await Channel.findByPk(channelId);
            if (channel) {
                token = channel.accessToken;
                phoneId = channel.phoneId;
            } else {
                return res.status(404).json({ error: 'Channel not found in DB' });
            }
        } else {
            return res.status(400).json({ error: 'channelId is required for strict mode' });
        }

        if (!token || !phoneId) {
            return res.status(400).json({ error: 'Channel credentials missing in DB. Update Channel Settings.' });
        }

        // Determine media type from mimetype
        const mimeType = file.mimetype;
        let mediaType = 'document';
        if (mimeType.startsWith('image/')) mediaType = 'image';
        else if (mimeType.startsWith('video/')) mediaType = 'video';
        else if (mimeType.startsWith('audio/')) mediaType = 'audio';

        // Step 1: Upload media to Meta
        const formData = new FormData();
        formData.append('file', fs.createReadStream(file.path));
        formData.append('type', mimeType);
        formData.append('messaging_product', 'whatsapp');

        let mediaId = null, metaMessageId = null;
        let success = false;
        let errorDetails = null;

        try {
            const uploadRes = await axios.post(
                `https://graph.facebook.com/v17.0/${phoneId}/media`,
                formData,
                { headers: { ...formData.getHeaders(), 'Authorization': `Bearer ${token}` } }
            );
            mediaId = uploadRes.data.id;
            console.log(`📤 Media uploaded to Meta: ${mediaId}`);

            // Argentina Normalization V2 (Strict)
            let toPhone = contact.phone;
            if (toPhone && toPhone.startsWith('549')) {
                toPhone = '54' + toPhone.substring(3);
            }

            // Step 2: Send message
            const payload = {
                messaging_product: 'whatsapp',
                to: toPhone,
                type: mediaType,
                [mediaType]: { id: mediaId, ...(caption && mediaType !== 'audio' ? { caption } : {}) }
            };

            const sendRes = await axios.post(
                `https://graph.facebook.com/v17.0/${phoneId}/messages`,
                payload,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            metaMessageId = sendRes.data.messages[0].id;
            success = true;
            console.log(`✅ Media message sent: ${metaMessageId}`);

        } catch (apiError) {
            console.error('❌ Error sending media to Meta:', apiError.response?.data || apiError.message);
            errorDetails = apiError.response?.data || apiError.message;
        }

        // Save to DB (Always)
        const newMessage = await Message.create({
            id: metaMessageId || `failed_${Date.now()}`,
            direction: 'outbound',
            type: mediaType,
            body: caption || `[${mediaType.toUpperCase()}]`,
            media_url: `/uploads/media/${file.filename}`,
            status: success ? 'sent' : 'failed',
            timestamp: new Date(),
            contact_id: contactId
        });

        if (!success) {
            return res.status(500).json({ error: 'Failed to send media', details: errorDetails, message: newMessage });
        }

        res.json(newMessage);

    } catch (error) {
        console.error('Critical Error sending media:', error);
        res.status(500).json({ error: 'Failed to send media' });
    }
};

module.exports = {
    getMessages,
    sendMessage,
    sendMediaMessage
};
