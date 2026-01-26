const { Contact, sequelize } = require('./backend/models');
const { v4: uuidv4 } = require('uuid');

async function seed() {
    try {
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');

        // EDIT THIS NUMBER TO YOUR REAL NUMBER IF YOU WANT
        const myNumber = '5492645280229'; // Formato con 9 para guardar en DB. El servicio lo limpia al enviar.

        // Find or Create
        const [contact, created] = await Contact.findOrCreate({
            where: { phone: myNumber },
            defaults: {
                id: uuidv4(),
                phone: myNumber,
                name: 'Renzo',
                avatar: 'https://ui-avatars.com/api/?name=Renzo&background=0D8ABC&color=fff',
                tags: ['OWNER'],
                notes: 'Usuario principal.',
                lastActive: new Date()
            }
        });

        if (created) {
            console.log('✅ Contacto creado:', contact.name, contact.phone);
        } else {
            console.log('⚠️ El contacto ya existía:', contact.name);
            // Update phone just in case
            // contact.phone = myNumber;
            // await contact.save();
        }

    } catch (error) {
        console.error('Unable to connect to the database:', error);
    } finally {
        await sequelize.close();
    }
}

seed();
