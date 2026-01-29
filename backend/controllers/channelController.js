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
    const { name, phoneNumber, phoneId, wabaId, appSecret, accessToken } = req.body;

    if (!name || !phoneNumber || !phoneId || !accessToken) {
        return res.status(400).json({ error: 'Nombre, Número, Phone ID y Token son requeridos' });
    }

    try {
        // Check if phoneId already exists
        const existing = await Channel.findOne({ where: { phoneId } });
        if (existing) {
            return res.status(409).json({ error: 'Ya existe un canal con ese Phone ID' });
        }

        const newChannel = await Channel.create({
            name,
            phoneNumber,
            phoneId,
            wabaId: wabaId || null,
            appSecret: appSecret || null,
            accessToken
        });
        res.json(newChannel);
    } catch (error) {
        console.error('Error creating channel:', error);
        res.status(500).json({ error: 'Failed to create channel' });
    }
};

// PUT /api/channels/:id
const updateChannel = async (req, res) => {
    const { id } = req.params;
    const { name, phoneNumber, phoneId, wabaId, appSecret, accessToken } = req.body;

    try {
        const channel = await Channel.findByPk(id);
        if (!channel) {
            return res.status(404).json({ error: 'Canal no encontrado' });
        }

        // Update fields if provided
        if (name) channel.name = name;
        if (phoneNumber) channel.phoneNumber = phoneNumber;
        if (phoneId) channel.phoneId = phoneId;
        if (wabaId !== undefined) channel.wabaId = wabaId;
        if (appSecret !== undefined) channel.appSecret = appSecret;
        if (accessToken) channel.accessToken = accessToken;

        await channel.save();
        res.json(channel);
    } catch (error) {
        console.error('Error updating channel:', error);
        res.status(500).json({ error: 'Failed to update channel' });
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

// POST /api/channels/test
const testChannel = async (req, res) => {
    const { phoneId, accessToken } = req.body;

    if (!phoneId || !accessToken) {
        return res.status(400).json({ error: 'Phone ID y Access Token son requeridos' });
    }

    try {
        const whatsappService = require('../services/whatsappService');
        const result = await whatsappService.verifyCredentials(phoneId, accessToken);

        if (result.success) {
            res.json(result);
        } else {
            res.status(401).json(result);
        }
    } catch (error) {
        console.error('Error testing channel:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

module.exports = {
    getChannels,
    createChannel,
    updateChannel,
    deleteChannel,
    testChannel
};
