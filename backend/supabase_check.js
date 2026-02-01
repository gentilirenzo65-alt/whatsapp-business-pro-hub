const axios = require('axios');

// Token provided by user
const TOKEN = 'sbp_390e5ef46f5929434c96edf2eea803410a6efe66';

async function checkAccess() {
    try {
        console.log('🔍 Verifying Supabase API Access...');

        // 1. Get Organizations (Needed to create a project)
        console.log('... Fetching Organizations');
        const orgs = await axios.get('https://api.supabase.com/v1/organizations', {
            headers: { Authorization: `Bearer ${TOKEN}` }
        });

        if (orgs.data.length === 0) {
            console.log('⚠️ No organizations found. User needs to create an organization first.');
        } else {
            console.log(`✅ ${orgs.data.length} Organization(s) found.`);
            orgs.data.forEach(o => console.log(`   - [${o.id}] ${o.name}`));
        }

        // 2. List Projects
        console.log('... Fetching Projects');
        const projects = await axios.get('https://api.supabase.com/v1/projects', {
            headers: { Authorization: `Bearer ${TOKEN}` }
        });

        if (projects.data.length === 0) {
            console.log('ℹ️ No projects found. We can create one.');
        } else {
            console.log(`✅ ${projects.data.length} Project(s) found.`);
            projects.data.forEach(p => console.log(`   - [${p.id}] ${p.name} (Region: ${p.region}) (Status: ${p.status})`));
        }

        // Output raw data for parsing if needed
        console.log('--- DATA START ---');
        console.log(JSON.stringify({
            orgs: orgs.data,
            projects: projects.data
        }));
        console.log('--- DATA END ---');

    } catch (error) {
        console.error('❌ Error accessing Supabase API:', error.response ? JSON.stringify(error.response.data) : error.message);
    }
}

checkAccess();
