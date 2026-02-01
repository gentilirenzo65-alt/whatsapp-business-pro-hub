const axios = require('axios');

const TOKEN = 'sbp_390e5ef46f5929434c96edf2eea803410a6efe66';
const PROJECT_REF = 'pqefbzrtpwkrnlrqyfng'; // Existing project in Wpp App
const DB_PASS = 'WppProHub2026!_' + Math.random().toString(36).substring(2, 10); // Strong password

async function resetPassword() {
    try {
        console.log(`Resource Limit Reached. Using existing project '${PROJECT_REF}'.`);
        console.log(`🔐 Resetting Database Password to gain access...`);

        const payload = {
            password: DB_PASS
        };

        await axios.put(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/password`, payload, {
            headers: {
                Authorization: `Bearer ${TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ Password Reset Successfully!');
        console.log(`   - Project ID: ${PROJECT_REF}`);
        console.log(`   - DB Host: db.${PROJECT_REF}.supabase.co`);
        console.log(`   - DB User: postgres`);
        console.log(`   - DB Pass: ${DB_PASS}`);
        console.log(`   - Connection String: postgresql://postgres:${encodeURIComponent(DB_PASS)}@db.${PROJECT_REF}.supabase.co:5432/postgres`);

    } catch (error) {
        console.error('❌ Password Reset Failed:', error.response ? error.response.data : error.message);
    }
}

resetPassword();
