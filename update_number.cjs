const { Contact, sequelize } = require('./backend/models');

async function update() {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        // User's real number
        const realNumber = '5492645280229';

        // Find the test contact
        const contact = await Contact.findOne({ where: { name: 'Renzo (Test)' } });

        if (contact) {
            contact.phone = realNumber;
            await contact.save();
            console.log(`✅ Contacto actualizado! Ahora 'Renzo (Test)' tiene el número: ${contact.phone}`);
        } else {
            console.log('⚠️ No encontré al contacto Renzo (Test), creándolo...');
            // Create if not exists
            const { v4: uuidv4 } = require('uuid');
            await Contact.create({
                id: uuidv4(),
                phone: realNumber,
                name: 'Renzo (Test)',
                avatar: 'https://ui-avatars.com/api/?name=Renzo&background=0D8ABC&color=fff',
                tags: ['TEST_USER'],
                lastActive: new Date()
            });
            console.log(`✅ Contacto creado con número: ${realNumber}`);
        }

    } catch (error) {
        console.error('Error updating database:', error);
    } finally {
        await sequelize.close();
    }
}

update();
