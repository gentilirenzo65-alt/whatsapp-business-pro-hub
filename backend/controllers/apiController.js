const { Contact, Message, Template, Tag, QuickReply, sequelize, Broadcast, Channel } = require('../models');
const { Op } = require('sequelize');
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const whatsappService = require('../services/whatsappService');
const broadcastService = require('../services/broadcastService');

// ... (existing code remains, adding at the end before module.exports)
// Listar contactos ordenados por última actividad
const getContacts = async (req, res) => {
    try {
        const contacts = await Contact.findAll({
            order: [['lastActive', 'DESC']],
        });
        res.json(contacts);
    } catch (error) {
        console.error('Error fetching contacts:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// GET /api/messages/:contactId
// Obtener historial de chat
const getMessages = async (req, res) => {
    const { contactId } = req.params;
    try {
        const messages = await Message.findAll({
            where: { contact_id: contactId },
            order: [['timestamp', 'ASC']]
        });

        // Auto-fix: Sync unread count if mismatched
        // If we retrieve messages, usually the frontend will trigger a separate 'read' status update.
        // But if we want to ensure consistency:
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
            // Return success: false but with the saved message data so UI can show it as failed
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

// POST /api/contacts
const createContact = async (req, res) => {
    const { name, phone, tags, notes } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone is required' });

    try {
        let cleanPhone = phone.replace(/\D/g, '');

        // ARGENTINA NORMALIZATION V2 (REMOVE 9)
        if (cleanPhone.startsWith('549')) {
            cleanPhone = '54' + cleanPhone.substring(3);
        }

        const [contact, created] = await Contact.findOrCreate({
            where: { phone: cleanPhone },
            defaults: {
                name: name || cleanPhone,
                tags: tags || [],
                notes: notes || '',
                avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=random`
            }
        });

        if (!created) {
            if (name) contact.name = name;
            if (tags) contact.tags = tags;
            if (notes) contact.notes = notes;
            await contact.save();
        }

        res.json(contact);
    } catch (error) {
        console.error('Error creating contact:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// PUT /api/contacts/:id
const updateContact = async (req, res) => {
    const { id } = req.params;
    const { name, tags, notes, unreadCount, email, birthday, company, customFields } = req.body;

    try {
        const contact = await Contact.findByPk(id);
        if (!contact) return res.status(404).json({ error: 'Contact not found' });

        if (name !== undefined) contact.name = name;
        if (tags !== undefined) contact.tags = tags;
        if (notes !== undefined) contact.notes = notes;
        if (unreadCount !== undefined) contact.unreadCount = unreadCount;
        // CRM Fields
        if (email !== undefined) contact.email = email;
        if (birthday !== undefined) contact.birthday = birthday;
        if (company !== undefined) contact.company = company;
        if (customFields !== undefined) contact.customFields = customFields;

        await contact.save();
        res.json(contact);
    } catch (error) {
        console.error('Error updating contact:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// GET /api/templates
const getTemplates = async (req, res) => {
    try {
        const templates = await Template.findAll({ order: [['createdAt', 'DESC']] });
        res.json(templates);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Error' });
    }
};

// POST /api/templates
const createTemplate = async (req, res) => {
    const { name, category, content, language } = req.body;

    if (!name || !content) return res.status(400).json({ error: 'Missing fields' });

    try {
        const metaResult = await whatsappService.createTemplate(name, category, content, language);

        const status = metaResult.success ? (metaResult.status || 'PENDING') : 'REJECTED';

        const newTemplate = await Template.create({
            name,
            category,
            language,
            components: { body: content },
            status: status
        });

        if (!metaResult.success) {
            await newTemplate.destroy();
            return res.status(400).json({ error: metaResult.error });
        }

        res.json(newTemplate);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Error' });
    }
};

// GET /api/broadcasts
const getBroadcasts = async (req, res) => {
    try {
        const broadcasts = await broadcastService.getAllBroadcasts();
        res.json(broadcasts);
    } catch (error) {
        console.error('Error fetching broadcasts:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// POST /api/broadcasts
const createBroadcast = async (req, res) => {
    const { name, templateId, channelId, targetTagId, scheduledTime, delayMin, delayMax } = req.body;

    if (!name || !templateId) {
        return res.status(400).json({ error: 'Missing name or templateId' });
    }

    try {
        const broadcast = await broadcastService.createBroadcast({
            name, templateId, channelId, targetTagId, scheduledTime, delayMin, delayMax
        });
        res.json(broadcast);
    } catch (error) {
        console.error('Error creating broadcast:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// DELETE /api/broadcasts/:id
const cancelBroadcast = async (req, res) => {
    try {
        const broadcast = await broadcastService.cancelBroadcast(req.params.id);
        res.json(broadcast);
    } catch (error) {
        console.error('Error cancelling broadcast:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// POST /api/broadcasts/:id/start
const startBroadcast = async (req, res) => {
    try {
        const broadcast = await broadcastService.executeBroadcast(req.params.id);
        res.json(broadcast);
    } catch (error) {
        console.error('Error starting broadcast:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// PUT /api/templates/:id
const updateTemplate = async (req, res) => {
    const { id } = req.params;
    const { name, category, content, language } = req.body;

    try {
        const template = await Template.findByPk(id);
        if (!template) return res.status(404).json({ error: 'Template not found' });

        if (name !== undefined) template.name = name;
        if (category !== undefined) template.category = category;
        if (language !== undefined) template.language = language;
        if (content !== undefined) template.components = { body: content };

        await template.save();
        res.json(template);
    } catch (error) {
        console.error('Error updating template:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// DELETE /api/templates/:id
const deleteTemplate = async (req, res) => {
    try {
        const template = await Template.findByPk(req.params.id);
        if (!template) return res.status(404).json({ error: 'Template not found' });
        await template.destroy();
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting template:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// =====================
// TAGS CRUD
// =====================

// GET /api/tags
const getTags = async (req, res) => {
    try {
        const tags = await Tag.findAll({ order: [['createdAt', 'ASC']] });
        res.json(tags);
    } catch (error) {
        console.error('Error fetching tags:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// POST /api/tags
const createTag = async (req, res) => {
    const { name, color } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    try {
        const tag = await Tag.create({ name, color: color || 'bg-gray-500' });
        res.json(tag);
    } catch (error) {
        console.error('Error creating tag:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// PUT /api/tags/:id
const updateTag = async (req, res) => {
    const { id } = req.params;
    const { name, color } = req.body;

    try {
        const tag = await Tag.findByPk(id);
        if (!tag) return res.status(404).json({ error: 'Tag not found' });

        if (name !== undefined) tag.name = name;
        if (color !== undefined) tag.color = color;
        await tag.save();
        res.json(tag);
    } catch (error) {
        console.error('Error updating tag:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// DELETE /api/tags/:id
const deleteTag = async (req, res) => {
    try {
        const tag = await Tag.findByPk(req.params.id);
        if (!tag) return res.status(404).json({ error: 'Tag not found' });
        await tag.destroy();
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting tag:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// =====================
// QUICK REPLIES CRUD
// =====================

// GET /api/quickreplies
const getQuickReplies = async (req, res) => {
    try {
        const qrs = await QuickReply.findAll({ order: [['createdAt', 'ASC']] });
        res.json(qrs);
    } catch (error) {
        console.error('Error fetching quick replies:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// POST /api/quickreplies
const createQuickReply = async (req, res) => {
    const { shortcut, content } = req.body;
    if (!shortcut || !content) return res.status(400).json({ error: 'Shortcut and content are required' });

    try {
        const cleanShortcut = shortcut.replace('/', '');
        const qr = await QuickReply.create({ shortcut: cleanShortcut, content });
        res.json(qr);
    } catch (error) {
        console.error('Error creating quick reply:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// PUT /api/quickreplies/:id
const updateQuickReply = async (req, res) => {
    const { id } = req.params;
    const { shortcut, content } = req.body;

    try {
        const qr = await QuickReply.findByPk(id);
        if (!qr) return res.status(404).json({ error: 'Quick reply not found' });

        if (shortcut !== undefined) qr.shortcut = shortcut.replace('/', '');
        if (content !== undefined) qr.content = content;
        await qr.save();
        res.json(qr);
    } catch (error) {
        console.error('Error updating quick reply:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// DELETE /api/quickreplies/:id
const deleteQuickReply = async (req, res) => {
    try {
        const qr = await QuickReply.findByPk(req.params.id);
        if (!qr) return res.status(404).json({ error: 'Quick reply not found' });
        await qr.destroy();
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting quick reply:', error);
        res.status(500).json({ error: 'Internal Server Error' });
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

        // Imports moved to top


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

// =====================
// ANALYTICS
// =====================

// GET /api/analytics
const getAnalytics = async (req, res) => {
    try {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Basic Counts (Safe)
        const messagesToday = await Message.count({ where: { timestamp: { [Op.gte]: todayStart } } });
        const messagesWeek = await Message.count({ where: { timestamp: { [Op.gte]: weekAgo } } });
        const messagesMonth = await Message.count({ where: { timestamp: { [Op.gte]: monthAgo } } });
        const messagesTotal = await Message.count();
        const messagesInbound = await Message.count({ where: { direction: 'inbound' } });
        const messagesOutbound = await Message.count({ where: { direction: 'outbound' } });

        const totalContacts = await Contact.count();
        const broadcastsSent = await Broadcast.count({ where: { status: 'SENT' } });
        const broadcastsFailed = await Broadcast.count({ where: { status: 'FAILED' } });
        const broadcastsScheduled = await Broadcast.count({ where: { status: 'SCHEDULED' } });

        const messagesByStatus = {
            sent: await Message.count({ where: { status: 'sent' } }),
            delivered: await Message.count({ where: { status: 'delivered' } }),
            read: await Message.count({ where: { status: 'read' } }),
            failed: await Message.count({ where: { status: 'failed' } })
        };

        // Top Contacts (Simplified approach to avoid SQL Literal errors)
        // Fetch all contacts and count messages in JS (for small scale) or use simpler group by
        // For robustness in this prompt, we skip the complex subquery if it fails
        let top5 = [];
        try {
            const contacts = await Contact.findAll();
            // Manually count for safely (not performant for millions, but fine for thousands)
            const contactsWithCounts = await Promise.all(contacts.map(async c => {
                const count = await Message.count({ where: { contact_id: c.id } });
                return {
                    id: c.id,
                    name: c.name,
                    phone: c.phone,
                    avatar: c.avatar,
                    messageCount: count
                };
            }));
            top5 = contactsWithCounts.sort((a, b) => b.messageCount - a.messageCount).slice(0, 5);
        } catch (err) {
            console.error('Error calculating top contacts:', err);
        }

        // Response Time Calculation (Simplified)
        let avgResponseTimeMinutes = 0;
        try {
            const recentMsgs = await Message.findAll({
                where: { timestamp: { [Op.gte]: weekAgo } },
                order: [['contact_id', 'ASC'], ['timestamp', 'ASC']],
                limit: 500
            });
            // ... (keep existing logic or simplify) ...
            // Re-using the simplified logic or keeping it safely wrapped
            let responseTimes = [];
            let lastInbound = null;
            let lastContactId = null;

            for (const msg of recentMsgs) {
                if (msg.contact_id !== lastContactId) {
                    lastInbound = null;
                    lastContactId = msg.contact_id;
                }
                if (msg.direction === 'inbound') {
                    lastInbound = new Date(msg.timestamp);
                } else if (msg.direction === 'outbound' && lastInbound) {
                    const diff = new Date(msg.timestamp).valueOf() - lastInbound.valueOf();
                    if (diff > 0 && diff < 86400000) responseTimes.push(diff);
                    lastInbound = null;
                }
            }
            if (responseTimes.length) {
                avgResponseTimeMinutes = Math.round((responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) / 60000);
            }
        } catch (err) {
            console.error('Error calculating response time:', err);
        }

        res.json({
            messages: {
                today: messagesToday,
                week: messagesWeek,
                month: messagesMonth,
                total: messagesTotal,
                inbound: messagesInbound,
                outbound: messagesOutbound,
                byStatus: messagesByStatus
            },
            contacts: {
                total: totalContacts,
                top5: top5
            },
            broadcasts: {
                sent: broadcastsSent,
                failed: broadcastsFailed,
                scheduled: broadcastsScheduled
            },
            performance: {
                avgResponseTimeMinutes
            }
        });

    } catch (error) {
        console.error('Error fetching analytics:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

module.exports = {
    getContacts,
    getMessages,
    sendMessage,
    sendMediaMessage,
    createContact,
    updateContact,
    getTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    getBroadcasts,
    createBroadcast,
    startBroadcast,
    cancelBroadcast,
    getTags,
    createTag,
    updateTag,
    deleteTag,
    getQuickReplies,
    createQuickReply,
    updateQuickReply,
    deleteQuickReply,
    getAnalytics
};
