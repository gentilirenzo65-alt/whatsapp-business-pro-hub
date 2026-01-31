const { Tag } = require('../models');

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

module.exports = {
    getTags,
    createTag,
    updateTag,
    deleteTag
};
