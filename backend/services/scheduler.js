const { Broadcast } = require('../models');
const { Op } = require('sequelize');

class Scheduler {
    constructor(broadcastService) {
        this.broadcastService = broadcastService;
        this.intervalId = null;
        this.checkIntervalMs = 60000; // Check every minute
    }

    // Start the scheduler
    start() {
        console.log('⏰ Scheduler iniciado - Revisando broadcasts programados cada minuto...');

        // Run immediately on start
        this.checkScheduledBroadcasts();

        // Then run every minute
        this.intervalId = setInterval(() => {
            this.checkScheduledBroadcasts();
        }, this.checkIntervalMs);
    }

    // Stop the scheduler
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            console.log('⏰ Scheduler detenido');
        }
    }

    // Check for scheduled broadcasts that need to be executed
    async checkScheduledBroadcasts() {
        try {
            const now = new Date();

            // Find broadcasts that are scheduled and their time has come
            const dueBroadcasts = await Broadcast.findAll({
                where: {
                    status: 'SCHEDULED',
                    scheduledTime: {
                        [Op.lte]: now // scheduledTime <= now
                    }
                }
            });

            if (dueBroadcasts.length > 0) {
                console.log(`⏰ Encontrados ${dueBroadcasts.length} broadcasts programados para ejecutar`);

                for (const broadcast of dueBroadcasts) {
                    console.log(`🚀 Ejecutando broadcast programado: ${broadcast.name}`);

                    // Execute the broadcast (this is async, will run in background)
                    this.broadcastService.executeBroadcast(broadcast.id).catch(err => {
                        console.error(`❌ Error ejecutando broadcast ${broadcast.id}:`, err);
                    });
                }
            }
        } catch (error) {
            console.error('❌ Error en scheduler:', error);
        }
    }
}

module.exports = Scheduler;
