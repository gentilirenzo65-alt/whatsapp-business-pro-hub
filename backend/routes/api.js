const express = require('express');
const router = express.Router();
const apiController = require('../controllers/apiController');
const channelController = require('../controllers/channelController');
const multer = require('multer');
const path = require('path');

// Configure multer for media uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '..', 'uploads', 'media');
        // Ensure directory exists
        const fs = require('fs');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}_${file.originalname}`;
        cb(null, uniqueName);
    }
});
const upload = multer({ storage });

// PIN Authentication
router.post('/auth/pin', (req, res) => {
    const { pin } = req.body;
    const validPins = (process.env.APP_PINS || '0000').split(',');

    if (validPins.includes(pin)) {
        res.json({ success: true, message: 'Acceso concedido' });
    } else {
        res.status(401).json({ success: false, message: 'PIN incorrecto' });
    }
});

// Contactos
router.get('/contacts', apiController.getContacts);

// Gestión Contactos
router.post('/contacts', apiController.createContact);
router.put('/contacts/:id', apiController.updateContact);

// Gestión Canales (Múltiples Números)
router.get('/channels', channelController.getChannels);
router.post('/channels', channelController.createChannel);
router.put('/channels/:id', channelController.updateChannel);
router.delete('/channels/:id', channelController.deleteChannel);
router.post('/channels/test', channelController.testChannel); // New Test Endpoint

// Mensajes
router.get('/messages/:contactId', apiController.getMessages);
router.post('/send', apiController.sendMessage);

// Media Upload + Send
router.post('/send-media', upload.single('media'), apiController.sendMediaMessage);

// Plantillas
router.get('/templates', apiController.getTemplates);
router.post('/templates', apiController.createTemplate);
router.put('/templates/:id', apiController.updateTemplate);
router.delete('/templates/:id', apiController.deleteTemplate);

// Difusiones (Broadcasts)
router.get('/broadcasts', apiController.getBroadcasts);
router.post('/broadcasts', apiController.createBroadcast);
router.post('/broadcasts/:id/start', apiController.startBroadcast);
router.delete('/broadcasts/:id', apiController.cancelBroadcast);

// Etiquetas (Tags)
router.get('/tags', apiController.getTags);
router.post('/tags', apiController.createTag);
router.put('/tags/:id', apiController.updateTag);
router.delete('/tags/:id', apiController.deleteTag);

// Respuestas Rápidas (Quick Replies)
router.get('/quickreplies', apiController.getQuickReplies);
router.post('/quickreplies', apiController.createQuickReply);
router.put('/quickreplies/:id', apiController.updateQuickReply);
router.delete('/quickreplies/:id', apiController.deleteQuickReply);

// Analytics
router.get('/analytics', apiController.getAnalytics);

// Backup Routes
const backupService = require('../services/backup');

router.get('/backups', (req, res) => {
    const backups = backupService.listBackups();
    res.json({
        count: backups.length,
        backups,
        backupDir: backupService.BACKUP_DIR
    });
});

router.post('/backups', async (req, res) => {
    try {
        const success = await backupService.runBackup();
        if (success) {
            res.json({ success: true, message: 'Backup creado exitosamente' });
        } else {
            res.status(500).json({ success: false, message: 'Error al crear backup' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;

