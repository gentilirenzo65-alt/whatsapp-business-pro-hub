const { Channel } = require('../models');

// GET /api/channels
const getChannels = async (req, res) => {
    try {
        const channels = await Channel.findAll();
        res.json(channels);
    } catch (error) {
        console.error('Error fetching channels:', error);
        res.status(500).json({ error: 'Failed to fetch channels' });
    }
};

// POST /api/channels
const createChannel = async (req, res) => {
    const { name, phoneNumber, phoneId, accessToken } = req.body;

    if (!name || !phoneNumber || !phoneId || !accessToken) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        const newChannel = await Channel.create({
            name,
            phoneNumber,
            phoneId,
            accessToken
        });
        res.json(newChannel);
    } catch (error) {
        console.error('Error creating channel:', error);
        res.status(500).json({ error: 'Failed to create channel' });
    }
};

// DELETE /api/channels/:id
const deleteChannel = async (req, res) => {
    const { id } = req.params;
    try {
        const deleted = await Channel.destroy({ where: { id } });
        if (deleted) {
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'Channel not found' });
        }
    } catch (error) {
        console.error('Error deleting channel:', error);
        res.status(500).json({ error: 'Failed to delete channel' });
    }
};

module.exports = {
    getChannels,
    createChannel,
    deleteChannel
};
