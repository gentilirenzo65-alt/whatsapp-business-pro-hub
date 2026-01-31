const { Contact, Message } = require('../models');

// Listar contactos ordenados por última actividad
const getContacts = async (req, res) => {
    try {
        const contacts = await Contact.findAll({
            order: [['lastActive', 'DESC']],
        });
        res.json(contacts);
    } catch (error) {
        console.error('Error fetching contacts:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// POST /api/contacts
const createContact = async (req, res) => {
    const { name, phone, tags, notes } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone is required' });

    try {
        let cleanPhone = phone.replace(/\D/g, '');

        // ARGENTINA NORMALIZATION V2.1 (ADD 9)
        if (cleanPhone.startsWith('54') && !cleanPhone.startsWith('549')) {
            cleanPhone = '549' + cleanPhone.substring(2);
        }

        const [contact, created] = await Contact.findOrCreate({
            where: { phone: cleanPhone },
            defaults: {
                name: name || cleanPhone,
                tags: tags || [],
                notes: notes || '',
                avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=random`
            }
        });

        if (!created) {
            if (name) contact.name = name;
            if (tags) contact.tags = tags;
            if (notes) contact.notes = notes;
            await contact.save();
        }

        res.json(contact);
    } catch (error) {
        console.error('Error creating contact:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// PUT /api/contacts/:id
const updateContact = async (req, res) => {
    const { id } = req.params;
    const { name, tags, notes, unreadCount, email, birthday, company, customFields } = req.body;

    try {
        const contact = await Contact.findByPk(id);
        if (!contact) return res.status(404).json({ error: 'Contact not found' });

        if (name !== undefined) contact.name = name;
        if (tags !== undefined) contact.tags = tags;
        if (notes !== undefined) contact.notes = notes;
        if (unreadCount !== undefined) contact.unreadCount = unreadCount;
        // CRM Fields
        if (email !== undefined) contact.email = email;
        if (birthday !== undefined) contact.birthday = birthday;
        if (company !== undefined) contact.company = company;
        if (customFields !== undefined) contact.customFields = customFields;

        await contact.save();
        res.json(contact);
    } catch (error) {
        console.error('Error updating contact:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// DELETE /api/contacts/:id
const deleteContact = async (req, res) => {
    const { id } = req.params;

    try {
        const contact = await Contact.findByPk(id);
        if (!contact) return res.status(404).json({ error: 'Contact not found' });

        // Delete all messages associated with this contact
        await Message.destroy({ where: { contact_id: id } });

        // Delete the contact
        await contact.destroy();

        res.json({ success: true, message: 'Contacto y mensajes eliminados correctamente' });
    } catch (error) {
        console.error('Error deleting contact:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

module.exports = {
    getContacts,
    createContact,
    updateContact,
    deleteContact
};
