const { Contact, Message, Broadcast } = require('../models');
const { Op } = require('sequelize');

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

        // Top Contacts (Simplified)
        let top5 = [];
        try {
            const contacts = await Contact.findAll();
            // Manually count for safety
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
    getAnalytics
};
