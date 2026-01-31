const { QuickReply } = require('../models');

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

module.exports = {
    getQuickReplies,
    createQuickReply,
    updateQuickReply,
    deleteQuickReply
};
