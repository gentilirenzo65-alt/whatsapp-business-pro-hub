const axios = require('axios');

const TOKEN = 'sbp_390e5ef46f5929434c96edf2eea803410a6efe66';
const ORG_ID = 'msdwdpkllgkcmnmdwqxm'; // Wpp App
const PROJECT_NAME = 'whatsapp-hub-db';
const DB_PASS = 'WppProHub2026!_' + Math.random().toString(36).substring(2, 10); // Strong password
const REGION = 'us-east-1';

async function setupProject() {
    try {
        console.log(`🚀 Attempting to create project '${PROJECT_NAME}' in Org '${ORG_ID}'...`);

        const payload = {
            name: PROJECT_NAME,
            organization_id: ORG_ID,
            db_pass: DB_PASS,
            region: REGION,
            plan: 'free'
        };

        const res = await axios.post('https://api.supabase.com/v1/projects', payload, {
            headers: {
                Authorization: `Bearer ${TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        const project = res.data;
        console.log('✅ Project Created Successfully!');
        console.log(`   - ID (Ref): ${project.id}`);
        console.log(`   - DB Host: db.${project.id}.supabase.co`);
        console.log(`   - DB User: postgres`);
        console.log(`   - DB Pass: ${DB_PASS}`);
        console.log(`   - Connection String: postgresql://postgres:${encodeURIComponent(DB_PASS)}@db.${project.id}.supabase.co:5432/postgres`);

        // Wait loop? No, the user can wait. The DB takes ~2 mins to be ready.
        // But for the purpose of this script, we just return the config.

    } catch (error) {
        if (error.response) {
            console.error('❌ Creation Failed:', error.response.status, error.response.data);
            if (error.response.data.message && error.response.data.message.includes('limit')) {
                console.log('⚠️ LIMIT REACHED: You already have 2 projects. Cannot create a new one.');
            }
        } else {
            console.error('❌ Error:', error.message);
        }
    }
}

setupProject();
