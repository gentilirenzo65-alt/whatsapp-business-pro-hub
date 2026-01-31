const { Contact, Message, sequelize } = require('./models');

async function cleanup() {
    console.log('🧹 Iniciando limpieza de Base de Datos...');
    try {
        await sequelize.authenticate();

        // Desactivar temporalmente las claves foráneas si es necesario (SQLite no siempre es estricto pero es buena práctica)
        await sequelize.query('PRAGMA foreign_keys = OFF;');

        const messagesCount = await Message.destroy({ where: {}, truncate: false });
        console.log(`✅ Mensajes eliminados: ${messagesCount}`);

        const contactsCount = await Contact.destroy({ where: {}, truncate: false });
        console.log(`✅ Contactos eliminados: ${contactsCount}`);

        await sequelize.query('PRAGMA foreign_keys = ON;');

        console.log('✨ Base de datos limpia. Listo para el nuevo comienzo.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error durante la limpieza:', error);
        process.exit(1);
    }
}

cleanup();
