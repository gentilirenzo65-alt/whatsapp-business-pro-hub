const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

// New Controllers
const contactController = require('../controllers/contactController');
const messageController = require('../controllers/messageController');
const templateController = require('../controllers/templateController');
const broadcastController = require('../controllers/broadcastController');
const tagController = require('../controllers/tagController');
const quickReplyController = require('../controllers/quickReplyController');
const analyticsController = require('../controllers/analyticsController');
const channelController = require('../controllers/channelController'); // Existing

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
router.get('/contacts', contactController.getContacts);
router.post('/contacts', contactController.createContact);
router.put('/contacts/:id', contactController.updateContact);
router.delete('/contacts/:id', contactController.deleteContact);

// Gestión Canales (Múltiples Números)
router.get('/channels', channelController.getChannels);
router.post('/channels', channelController.createChannel);
router.put('/channels/:id', channelController.updateChannel);
router.delete('/channels/:id', channelController.deleteChannel);
router.post('/channels/test', channelController.testChannel);

// Mensajes
router.get('/messages/:contactId', messageController.getMessages);
router.post('/send', messageController.sendMessage);

// Media Upload + Send
router.post('/send-media', upload.single('media'), messageController.sendMediaMessage);

// Plantillas
router.get('/templates', templateController.getTemplates);
router.post('/templates', templateController.createTemplate);
router.put('/templates/:id', templateController.updateTemplate);
router.delete('/templates/:id', templateController.deleteTemplate);

// Difusiones (Broadcasts)
router.get('/broadcasts', broadcastController.getBroadcasts);
router.post('/broadcasts', broadcastController.createBroadcast);
router.post('/broadcasts/:id/start', broadcastController.startBroadcast);
router.delete('/broadcasts/:id', broadcastController.cancelBroadcast);

// Etiquetas (Tags)
router.get('/tags', tagController.getTags);
router.post('/tags', tagController.createTag);
router.put('/tags/:id', tagController.updateTag);
router.delete('/tags/:id', tagController.deleteTag);

// Respuestas Rápidas (Quick Replies)
router.get('/quickreplies', quickReplyController.getQuickReplies);
router.post('/quickreplies', quickReplyController.createQuickReply);
router.put('/quickreplies/:id', quickReplyController.updateQuickReply);
router.delete('/quickreplies/:id', quickReplyController.deleteQuickReply);

// Analytics
router.get('/analytics', analyticsController.getAnalytics);

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
