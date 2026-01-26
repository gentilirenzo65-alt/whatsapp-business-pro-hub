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
        // Need a valid contact ID first, let's create a fake one directly in DB if needed or just use a random one and expect 404 or success if DB is empty
        // Actually, let's just try to send with a dummy ID and see if it hits the controller logic
        // The controller checks: Contact.findByPk(contactId)
        // So we might fail with 404 if no contacts exist.

        // Let's create a contact first using a direct DB script? No, let's just see failure or success.
        // Or better, let's use the webhook to CREATE a contact first!

        console.log('📡 Sending Mock Inbound Webhook...');
        await axios.post(`${API_URL}/webhook`, {
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
        }, {
            headers: {
                'x-hub-signature-256': 'INVALID_SIG_FOR_NOW' // The controller checks signature!
            }
        });

    } catch (e) {
        // We expect 401 or 403 because we didn't sign it properly
        if (e.response && (e.response.status === 401 || e.response.status === 403)) {
            console.log(`✅ POST /webhook: Rejected invalid signature as expected (${e.response.status})`);
        } else {
            console.log(`⚠️ POST /webhook result: ${e.message}`);
        }
    }

    // Note: Generating a valid signature in this script is possible if we know the secret.
    // In backend/index.js -> webhook verification uses process.env.WEBHOOK_VERIFY_TOKEN for GET?
    // receiveWebhook uses process.env.WEBHOOK_VERIFY_TOKEN for SHA256 HMAC? Wait, usually it's APP_SECRET.
    // user code: .createHmac('sha256', process.env.WEBHOOK_VERIFY_TOKEN) // TODO: Use separate APP_SECRET

    // Let's try to generate a valid signature using the default token if it's in .env (or we assume a default).
}

runTests();
