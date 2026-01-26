const { Contact, sequelize } = require('./backend/models');

async function check() {
    try {
        await sequelize.authenticate();
        const contacts = await Contact.findAll();
        console.log('Total contacts:', contacts.length);
        contacts.forEach(c => {
            console.log(`- ${c.name} (${c.phone}) [ID: ${c.id}] LastActive: ${c.lastActive}`);
        });
    } catch (e) {
        console.error(e);
    } finally {
        await sequelize.close();
    }
}
check();
