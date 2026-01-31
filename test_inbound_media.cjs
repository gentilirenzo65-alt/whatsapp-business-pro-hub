const whatsappService = require('./backend/services/whatsappService');
const { Channel, Contact, Message, sequelize } = require('./backend/models');

async function testInboundMedia() {
    console.log('🧪 Simulando recepción de imagen...');

    // 0. Sync Database to ensure schema matches (LOCAL FORCE)
    await sequelize.sync({ force: true });

    // 1. Setup a fake channel in DB
    await Channel.findOrCreate({
        where: { phoneId: '123456789' },
        defaults: {
            name: 'Test Channel',
            phoneNumber: '1234567890',
            accessToken: 'FAKE_TOKEN',
            status: 'CONNECTED'
        }
    });

    // 2. Mock Webhook Payload for an Image
    const mockImagePayload = {
        id: 'wamid.IMAGE_WITHOUT_CAPTION',
        from: '5492645280229',
        timestamp: '1706640000',
        type: 'image',
        image: {
            mime_type: 'image/jpeg',
            sha256: 'xyz123',
            id: 'MEDIA_ID_456'
        }
    };

    const mockUnknownPayload = {
        id: 'wamid.UNKNOWN_TYPE',
        from: '5492645280229',
        timestamp: '1706640000',
        type: 'reaction',
        reaction: { message_id: 'some_id', emoji: '👍' }
    };

    const mockContactData = {
        wa_id: '5492645280229',
        profile: { name: 'Renzo Test' }
    };

    const mockMetadata = {
        display_phone_number: '1234567890',
        phone_number_id: '123456789'
    };

    try {
        console.log('🚀 Procesando imagen sin caption...');
        await whatsappService.handleIncomingMessage(mockImagePayload, mockContactData, mockMetadata);
        console.log('✅ Imagen sin caption procesada.');

        console.log('🚀 Procesando tipo desconocido (reaction)...');
        await whatsappService.handleIncomingMessage(mockUnknownPayload, mockContactData, mockMetadata);
        console.log('✅ Tipo desconocido procesado.');
    } catch (err) {
        console.error('❌ Error fatal en el procesamiento:', err.message);
    }
}

testInboundMedia();
