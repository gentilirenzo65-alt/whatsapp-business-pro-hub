require('dotenv').config();
const dns = require('node:dns');
if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const socketIo = require('socket.io');
const http = require('http');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json({
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));

// Serve static files from uploads folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
const webhookController = require('./controllers/webhookController');
const apiRoutes = require('./routes/api');

app.get('/health', (req, res) => res.status(200).send('Backend OK'));

// API Routes
app.use('/api', apiRoutes);

// Webhook Routes
app.get('/webhook', webhookController.verifyWebhook);
app.post('/webhook', (req, res) => {
    // Pass IO to controller/service if needed, or just emit here for simplicity in this phase
    webhookController.receiveWebhook(req, res);
});

// Socket.io Connection
io.on('connection', (socket) => {
    console.log('🔌 Cliente Frontend conectado:', socket.id);

    socket.on('disconnect', () => {
        console.log('🔌 Cliente desconectado');
    });
});

// Make IO accessible globally or pass it to services
global.io = io;


const { sequelize } = require('./models');

// Import scheduler
const Scheduler = require('./services/scheduler');
const broadcastService = require('./services/broadcastService');
const backupService = require('./services/backup');

// Backup interval: 24 hours in milliseconds
const BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

// Sync Database and Start Server
sequelize.sync().then(() => {
    console.log('✅ Base de Datos Sincronizada (Tablas creadas/actualizadas)');

    // Start the broadcast scheduler
    const scheduler = new Scheduler(broadcastService);
    scheduler.start();

    // Run initial backup on startup
    console.log('📦 Sistema de Backups: Iniciando...');
    backupService.runBackup();

    // Schedule backups every 24 hours
    setInterval(() => {
        backupService.runBackup();
    }, BACKUP_INTERVAL_MS);

    console.log(`📦 Backups Automáticos: Cada 24 horas`);

    server.listen(PORT, () => {
        console.log(`🚀 Server is running on port ${PORT}`);
        console.log(`- Local: http://localhost:${PORT}`);
        console.log(`- Webhook Endpoint: http://localhost:${PORT}/webhook`);
        console.log(`- Socket.io: Enabled`);
        console.log(`- Scheduler: Active (cada 60s)`);
        console.log(`- Backups: Auto (cada 24h) - Dir: ${backupService.BACKUP_DIR}`);
    });
}).catch(err => {
    console.error('❌ Error al conectar con la Base de Datos:', err);
});
