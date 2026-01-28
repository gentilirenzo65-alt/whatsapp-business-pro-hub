const whatsappService = require('../services/whatsappService');
const { Message } = require('../models');
const crypto = require('crypto');

// Handle message status updates from Meta (delivered, read, failed)
const handleStatusUpdate = async (statusData) => {
    try {
        const messageId = statusData.id;
        const newStatus = statusData.status; // 'sent', 'delivered', 'read', 'failed'

        // Update message in database
        const message = await Message.findByPk(messageId);
        if (message) {
            message.status = newStatus;
            await message.save();

            console.log(`📬 Estado actualizado: ${messageId} → ${newStatus}`);

            // Emit to frontend via Socket.IO
            if (global.io) {
                global.io.emit('message_status_update', {
                    messageId: messageId,
                    status: newStatus
                });
            }
        }
    } catch (error) {
        console.error('Error updating message status:', error);
    }
};

// Handle typing indicator from Meta (when client is typing)
const handleTypingIndicator = (phone, isTyping = true) => {
    console.log(`⌨️ ${phone} está ${isTyping ? 'escribiendo...' : 'dejó de escribir'}`);

    if (global.io) {
        global.io.emit('contact_typing', {
            phone: phone,
            isTyping: isTyping
        });
    }
};

// VERIFY TOKEN (GET)
const verifyWebhook = (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
            console.log('✅ WEBHOOK VERIFICADO');
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    } else {
        res.sendStatus(400);
    }
};

// RECEIVE EVENT (POST)
const receiveWebhook = async (req, res) => {
    // 1. VALIDATE SIGNATURE (SHA256)
    const signature = req.headers['x-hub-signature-256'];
    if (!signature) {
        console.warn('⚠️ Webhook missing signature');
        return res.sendStatus(401);
    }

    const elements = signature.split('=');
    const signatureHash = elements[1];
    const expectedHash = crypto
        .createHmac('sha256', process.env.WEBHOOK_VERIFY_TOKEN) // TODO: Use separate APP_SECRET in prod
        .update(JSON.stringify(req.body))
        .digest('hex');

    if (signatureHash !== expectedHash) {
        console.warn('⚠️ Webhook signature mismatch');
        return res.sendStatus(403);
    }

    const body = req.body;

    try {
        if (body.object) {
            if (body.entry && body.entry[0].changes && body.entry[0].changes[0].value.messages && body.entry[0].changes[0].value.messages[0]) {

                const changes = body.entry[0].changes[0].value;
                const messageData = changes.messages[0];
                const contactData = changes.contacts[0];
                const metadata = changes.metadata; // Contains phone_number_id

                await whatsappService.handleIncomingMessage(messageData, contactData, metadata);
            }

            // Handle status updates (delivered, read, failed)
            if (body.entry && body.entry[0].changes && body.entry[0].changes[0].value.statuses) {
                const statuses = body.entry[0].changes[0].value.statuses;
                for (const statusData of statuses) {
                    await handleStatusUpdate(statusData);
                }
            }

            res.sendStatus(200);
        } else {
            res.sendStatus(404);
        }
    } catch (error) {
        console.error('Error in webhook controller:', error);
        res.sendStatus(500);
    }
};

module.exports = {
    verifyWebhook,
    receiveWebhook
};
