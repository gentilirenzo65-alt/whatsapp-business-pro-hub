const broadcastService = require('../services/broadcastService');

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

module.exports = {
    getBroadcasts,
    createBroadcast,
    startBroadcast,
    cancelBroadcast
};
