require('dotenv').config({ path: './backend/.env' });
const axios = require('axios');

async function debugSend() {
    console.log('🔍 Debugging Environment...');
    const token = process.env.META_ACCESS_TOKEN;
    const phoneId = process.env.META_PHONE_ID;

    if (!token) console.error('❌ NO META_ACCESS_TOKEN found');
    if (!phoneId) console.error('❌ NO META_PHONE_ID found');
    if (!token || !phoneId) return;

    const url = `https://graph.facebook.com/v17.0/${phoneId}/messages`;

    // Test Format: Without 9 (54 264 ...)
    // Standard for API often excludes the 9 for Argentina if treated as landline/universal, 
    // but usually 549 is correct. Let's try the alternative since 549 failed.
    const testNumber = '542645280229';

    console.log(`📡 Attempting send to ${testNumber} ...`);

    try {
        const payload = {
            messaging_product: 'whatsapp',
            to: testNumber,
            type: 'text',
            text: { body: "Debug Message: Hola (formato sin 9)" }
        };

        const response = await axios.post(url, payload, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log(`✅ SUCCESS! Message sent to ${testNumber}`);
        console.log('Response ID:', response.data.messages[0].id);

    } catch (error) {
        console.error('❌ SEND FAILED');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('Error:', error.message);
        }
    }
}

debugSend();
