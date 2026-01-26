const axios = require('axios');

const API_URL = 'http://localhost:3000';

async function runTests() {
    console.log('🚀 Starting API Tests...');

    // 1. Test Health
    try {
        const res = await axios.get(`${API_URL}/health`);
        console.log(`✅ GET /health: ${res.data}`);
    } catch (e) {
        console.error('❌ GET /health FAILED:', e.message);
    }

    // 2. Test Get Contacts
    try {
        const res = await axios.get(`${API_URL}/api/contacts`);
        console.log(`✅ GET /api/contacts: Found ${res.data.length} contacts`);
    } catch (e) {
        console.error('❌ GET /api/contacts FAILED:', e.message);
    }

    // 3. Test Send Message (Mock)
    try {
        console.log('📡 Sending Mock Inbound Webhook...');
        const secret = 'whatsapp_hub_promo_2026';
        const body = {
            object: 'whatsapp_business_account',
            entry: [{
                changes: [{
                    value: {
                        messages: [{
                            id: 'wamid.test',
                            type: 'text',
                            text: { body: 'Hola mundo' },
                            timestamp: Math.floor(Date.now() / 1000)
                        }],
                        contacts: [{
                            profile: { name: 'Test User' },
                            wa_id: '123456789' // Phone
                        }]
                    }
                }]
            }]
        };
        const crypto = require('crypto');
        const signature = crypto.createHmac('sha256', secret).update(JSON.stringify(body)).digest('hex');

        await axios.post(`${API_URL}/webhook`, body, {
            headers: {
                'x-hub-signature-256': `sha256=${signature}`
            }
        });
        console.log('✅ POST /webhook: Accepted (200 OK)');

    } catch (e) {
        // The original error handling for invalid signatures is now less relevant as we send a valid one.
        // If it fails now, it's a general error.
        console.error('❌ POST /webhook FAILED:', e.message);
        if (e.response) {
            console.error('Response status:', e.response.status);
            console.error('Response data:', e.response.data);
        }
    }
}

runTests();
