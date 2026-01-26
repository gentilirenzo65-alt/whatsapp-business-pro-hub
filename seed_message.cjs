const { Contact, Message, sequelize } = require('./backend/models');
const { v4: uuidv4 } = require('uuid');

async function seedMessage() {
    try {
        await sequelize.authenticate();
        console.log('✅ DB Connected');

        const myNumber = '5492645280229';
        const contact = await Contact.findOne({ where: { phone: myNumber } });

        if (!contact) {
            console.error('❌ Contact not found! Run seed_contact.cjs first.');
            return;
        }

        console.log(`Found contact: ${contact.name} (${contact.id})`);

        // Create a fake inbound message
        const message = await Message.create({
            id: `wamid.HBgTEST_${Date.now()}`,
            contact_id: contact.id,
            direction: 'inbound',
            type: 'text',
            body: '¡Hola! Este es un mensaje de prueba generado automáticamente para iniciar el chat.',
            status: 'delivered',
            timestamp: new Date()
        });

        // Update contact last active
        contact.lastActive = new Date();
        contact.unreadCount = (contact.unreadCount || 0) + 1;
        await contact.save();

        console.log(`✅ Message created! ID: ${message.id}`);
        console.log('✅ Contact updated (unread +1)');

    } catch (error) {
        console.error('Error seeding message:', error);
    } finally {
        await sequelize.close();
    }
}

seedMessage();
