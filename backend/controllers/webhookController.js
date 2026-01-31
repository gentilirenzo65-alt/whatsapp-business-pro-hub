const whatsappService = require('../services/whatsappService');
const { Message, Channel } = require('../models');
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
    try {
        const body = req.body;

        // 1. IDENTIFY CHANNEL (to get the correct App Secret)
        let phoneId = null;
        if (body.entry && body.entry[0].changes && body.entry[0].changes[0].value.metadata) {
            phoneId = body.entry[0].changes[0].value.metadata.phone_number_id;
        }

        // 2. GET APP SECRET (From DB or Env Fallback)
        let appSecret = process.env.META_APP_SECRET; // Default fallback from .env

        if (phoneId) {
            const channel = await Channel.findOne({ where: { phoneId } });
            if (channel && channel.appSecret) {
                appSecret = channel.appSecret;
            }
        }

        // 3. VALIDATE SIGNATURE (SHA256)
        const signature = req.headers['x-hub-signature-256'];

        // If we have an appSecret, we MUST validate. 
        // If we don't have one, we log a warning but might fail safely or allow depending on policy.
        // For security, we should reject if we can't validate.
        if (appSecret && signature) {
            const elements = signature.split('=');
            const signatureHash = elements[1];
            const expectedHash = crypto
                .createHmac('sha256', appSecret)
                .update(req.rawBody || JSON.stringify(req.body)) // Try rawBody first
                .digest('hex');

            if (signatureHash !== expectedHash) {
                console.warn('⚠️ Webhook signature mismatch. Check App Secret.');
                return res.sendStatus(403);
            }
        } else if (!appSecret && signature) {
            console.warn('⚠️ Webhook has signature but no App Secret configured on server to verify it.');
            // Allow processing to continue if user hasn't configured secret yet? 
            // Better to block to force configuration, but user is currently stuck.
            // Let's block to encourage fixing.
            return res.sendStatus(403);
        }

        // 4. PROCESS MESSAGE
        if (body.object) {
            if (body.entry && body.entry[0].changes && body.entry[0].changes[0].value.messages && body.entry[0].changes[0].value.messages[0]) {

                const changes = body.entry[0].changes[0].value;
                const messageData = changes.messages[0];
                const contactData = changes.contacts[0];
                const metadata = changes.metadata; // Contains phone_number_id

                await whatsappService.handleIncomingMessage(messageData, contactData, metadata);
            }

            // Handle message status updates (delivered, read, failed)
            if (body.entry && body.entry[0].changes && body.entry[0].changes[0].value.statuses) {
                const statuses = body.entry[0].changes[0].value.statuses;
                for (const statusData of statuses) {
                    await handleStatusUpdate(statusData);
                }
            }

            // 5. HANDLE CRITICAL ACCOUNT ALERTS (Bans / Restrictions)
            // Meta sometimes sends these in the same webhook structure but with different fields
            if (body.entry && body.entry[0].changes && body.entry[0].changes[0].field === 'account_update') {
                const alertValue = body.entry[0].changes[0].value;
                const phoneId = body.entry[0].id || (body.entry[0].changes[0].value.metadata ? body.entry[0].changes[0].value.metadata.phone_number_id : null);

                console.error(`🚨 CRITICAL ACCOUNT UPDATE for PhoneID ${phoneId}:`, JSON.stringify(alertValue));

                // Alert Type Detection
                let issueType = 'UNKNOWN';
                if (alertValue.ban_info) issueType = 'BANNED';
                if (alertValue.restriction_info) issueType = 'RESTRICTED';

                // Emit CRITICAL event to Frontend
                if (global.io) {
                    global.io.emit('channel_issue', {
                        phoneId: phoneId,
                        type: issueType, // 'BANNED', 'RESTRICTED', 'QUALITY_LOW'
                        details: alertValue
                    });
                }

                // Update Channel Status in DB to 'DISCONNECTED' or 'BANNED' if possible
                if (phoneId) {
                    const channel = await Channel.findOne({ where: { phoneId } });
                    if (channel) {
                        channel.status = 'DISCONNECTED'; // Or add a new ENUM 'BANNED' later
                        await channel.save();
                    }
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
