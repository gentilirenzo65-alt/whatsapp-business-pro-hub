const { Broadcast, Contact, Template, Channel } = require('../models');
const whatsappService = require('./whatsappService');

class BroadcastService {

    // Create a new broadcast
    async createBroadcast(data) {
        const { name, templateId, channelId, targetTagId, scheduledTime, delayMin, delayMax } = data;

        // Get recipient count
        let recipients;
        if (targetTagId) {
            recipients = await Contact.findAll({
                where: {
                    tags: { [require('sequelize').Op.contains]: [targetTagId] }
                }
            });
        } else {
            recipients = await Contact.findAll();
        }

        const broadcast = await Broadcast.create({
            name,
            templateId,
            channelId,
            targetTagId,
            scheduledTime: scheduledTime ? new Date(scheduledTime) : null,
            delayMin: delayMin || 2,
            delayMax: delayMax || 8,
            recipientsCount: recipients.length,
            status: scheduledTime ? 'SCHEDULED' : 'SENDING'
        });

        // If immediate (no scheduledTime), start sending now
        if (!scheduledTime) {
            this.executeBroadcast(broadcast.id);
        }

        return broadcast;
    }

    // Execute broadcast (send messages with delay)
    async executeBroadcast(broadcastId) {
        const broadcast = await Broadcast.findByPk(broadcastId);
        if (!broadcast) return;

        // Get template
        const template = await Template.findByPk(broadcast.templateId);
        if (!template) {
            broadcast.status = 'FAILED';
            await broadcast.save();
            return;
        }

        // Get recipients
        let recipients;
        if (broadcast.targetTagId) {
            recipients = await Contact.findAll({
                where: {
                    tags: { [require('sequelize').Op.contains]: [broadcast.targetTagId] }
                }
            });
        } else {
            recipients = await Contact.findAll();
        }

        // Mark as sending
        broadcast.status = 'SENDING';
        await broadcast.save();

        console.log(`🚀 Iniciando difusión [${broadcast.name}] a ${recipients.length} contactos...`);

        let sentCount = 0;
        let failedCount = 0;

        for (let i = 0; i < recipients.length; i++) {
            const contact = recipients[i];

            // Calculate random delay
            const delay = this.getRandomDelay(broadcast.delayMin, broadcast.delayMax);

            console.log(`⏳ Esperando ${delay}s antes de enviar a ${contact.phone}...`);
            await this.sleep(delay * 1000);

            try {
                // Send message using official Meta Template API
                const result = await whatsappService.sendTemplateMessage(
                    contact.phone,
                    template.name,           // Template name as registered in Meta
                    template.language || 'es',
                    broadcast.channelId
                    // Note: Parameters could be added here if templates have variables
                );

                if (result.success) {
                    sentCount++;
                } else {
                    failedCount++;
                    console.error(`❌ Error enviando a ${contact.phone}: ${result.error}`);
                }
            } catch (error) {
                failedCount++;
                console.error(`❌ Error enviando a ${contact.phone}:`, error.message);
            }

            // Update progress
            const progress = Math.round(((i + 1) / recipients.length) * 100);
            broadcast.progress = progress;
            broadcast.sentCount = sentCount;
            broadcast.failedCount = failedCount;
            await broadcast.save();

            // Emit progress via Socket.IO
            if (global.io) {
                global.io.emit('broadcast_progress', {
                    broadcastId: broadcast.id,
                    progress,
                    sentCount,
                    failedCount,
                    total: recipients.length
                });
            }
        }

        // Mark as completed
        broadcast.status = failedCount === recipients.length ? 'FAILED' : 'SENT';
        broadcast.progress = 100;
        await broadcast.save();

        console.log(`✅ Difusión [${broadcast.name}] completada. Enviados: ${sentCount}, Fallidos: ${failedCount}`);

        return broadcast;
    }

    // Get random delay between min and max
    getRandomDelay(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // Sleep helper
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Get all broadcasts
    async getAllBroadcasts() {
        return await Broadcast.findAll({
            order: [['createdAt', 'DESC']]
        });
    }

    // Cancel a broadcast
    async cancelBroadcast(broadcastId) {
        const broadcast = await Broadcast.findByPk(broadcastId);
        if (broadcast && broadcast.status === 'SCHEDULED') {
            broadcast.status = 'CANCELLED';
            await broadcast.save();
        }
        return broadcast;
    }
}

module.exports = new BroadcastService();
