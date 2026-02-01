const axios = require('axios');

const TOKEN = 'sbp_390e5ef46f5929434c96edf2eea803410a6efe66';
const PROJECT_REF = 'pqefbzrtpwkrnlrqyfng';

async function deleteProject() {
    try {
        console.log(`🗑️ Deleting project '${PROJECT_REF}' to free up slot...`);

        const res = await axios.delete(`https://api.supabase.com/v1/projects/${PROJECT_REF}`, {
            headers: {
                Authorization: `Bearer ${TOKEN}`
            }
        });

        console.log('✅ Project Deleted Successfully!');
        console.log(JSON.stringify(res.data, null, 2));

    } catch (error) {
        console.error('❌ Delete Failed:', error.response ? error.response.data : error.message);
    }
}

deleteProject();
