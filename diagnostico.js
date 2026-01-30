const { Channel } = require('./backend/models');
Channel.findAll({ raw: true }).then(c => console.log(JSON.stringify(c, null, 2))).catch(console.error);
