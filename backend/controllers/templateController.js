const { Template } = require('../models');
const whatsappService = require('../services/whatsappService');

// GET /api/templates
const getTemplates = async (req, res) => {
    try {
        const templates = await Template.findAll({ order: [['createdAt', 'DESC']] });
        res.json(templates);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Error' });
    }
};

// POST /api/templates
const createTemplate = async (req, res) => {
    const { name, category, content, language } = req.body;

    if (!name || !content) return res.status(400).json({ error: 'Missing fields' });

    try {
        const metaResult = await whatsappService.createTemplate(name, category, content, language);

        const status = metaResult.success ? (metaResult.status || 'PENDING') : 'REJECTED';

        const newTemplate = await Template.create({
            name,
            category,
            language,
            components: { body: content },
            status: status
        });

        if (!metaResult.success) {
            await newTemplate.destroy();
            return res.status(400).json({ error: metaResult.error });
        }

        res.json(newTemplate);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Error' });
    }
};

// PUT /api/templates/:id
const updateTemplate = async (req, res) => {
    const { id } = req.params;
    const { name, category, content, language } = req.body;

    try {
        const template = await Template.findByPk(id);
        if (!template) return res.status(404).json({ error: 'Template not found' });

        if (name !== undefined) template.name = name;
        if (category !== undefined) template.category = category;
        if (language !== undefined) template.language = language;
        if (content !== undefined) template.components = { body: content };

        await template.save();
        res.json(template);
    } catch (error) {
        console.error('Error updating template:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// DELETE /api/templates/:id
const deleteTemplate = async (req, res) => {
    try {
        const template = await Template.findByPk(req.params.id);
        if (!template) return res.status(404).json({ error: 'Template not found' });
        await template.destroy();
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting template:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

module.exports = {
    getTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate
};
