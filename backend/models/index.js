const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// --- USER MODEL (Agentes/Admins) ---
const User = sequelize.define('User', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: { isEmail: true }
    },
    password_hash: {
        type: DataTypes.STRING,
        allowNull: false
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    role: {
        type: DataTypes.ENUM('ADMIN', 'AGENT'),
        defaultValue: 'AGENT'
    }
});

// --- CONTACT MODEL (Clientes) ---
const Contact = sequelize.define('Contact', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    phone: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    name: {
        type: DataTypes.STRING,
        defaultValue: 'Unknown'
    },
    avatar: {
        type: DataTypes.STRING
    },
    lastActive: {
        type: DataTypes.DATE, // Required for sorting
        defaultValue: DataTypes.NOW
    },
    unreadCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    tags: {
        type: DataTypes.JSON,
        defaultValue: []
    },
    notes: {
        type: DataTypes.TEXT
    },
    // === CRM FIELDS ===
    email: {
        type: DataTypes.STRING,
        validate: { isEmail: true }
    },
    birthday: {
        type: DataTypes.DATEONLY // Solo fecha, sin hora
    },
    company: {
        type: DataTypes.STRING
    },
    customFields: {
        type: DataTypes.JSON, // Para campos dinámicos adicionales
        defaultValue: {}
    }
}, {
    // INDEXES for optimized queries
    indexes: [
        { fields: ['lastActive'] },       // Fast sorting for chat list
        { fields: ['phone'] },            // Fast phone lookup
        { fields: ['assigned_agent_id'] } // Fast agent filtering
    ]
});

// --- MESSAGE MODEL (Chats) ---
const Message = sequelize.define('Message', {
    id: {
        type: DataTypes.STRING, // WhatsApp Message ID (wamid...)
        primaryKey: true
    },
    type: {
        type: DataTypes.ENUM('text', 'image', 'audio', 'document', 'video', 'sticker', 'interactive'),
        defaultValue: 'text'
    },
    body: {
        type: DataTypes.TEXT
    },
    media_url: {
        type: DataTypes.STRING
    },
    direction: {
        type: DataTypes.ENUM('inbound', 'outbound'),
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('sent', 'delivered', 'read', 'failed'),
        defaultValue: 'sent'
    },
    timestamp: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    // INDEXES for optimized queries on large datasets
    indexes: [
        { fields: ['contact_id'] },                    // Fast lookup by contact
        { fields: ['timestamp'] },                     // Fast sorting by date
        { fields: ['contact_id', 'timestamp'] },       // Combined for chat history
        { fields: ['status'] }                         // Fast filtering by status
    ]
});

// --- TEMPLATE MODEL (Plantillas) ---
const Template = sequelize.define('Template', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    category: {
        type: DataTypes.STRING // MARKETING, UTILITY, ETC
    },
    language: {
        type: DataTypes.STRING,
        defaultValue: 'es'
    },
    components: {
        type: DataTypes.JSON // Estructura completa de Meta
    },
    status: {
        type: DataTypes.STRING // APPROVED, PENDING, REJECTED
    }
});

// --- CHANNEL MODEL (Números de WhatsApp) ---
const Channel = sequelize.define('Channel', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    phoneNumber: {
        type: DataTypes.STRING,
        allowNull: false
    },
    phoneId: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    wabaId: {
        type: DataTypes.STRING,
        allowNull: true // Optional, can be auto-fetched from Meta API
    },
    accessToken: {
        type: DataTypes.TEXT, // Token can be long
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('CONNECTED', 'DISCONNECTED'),
        defaultValue: 'CONNECTED'
    }
});

// --- BROADCAST MODEL (Difusiones) ---
const Broadcast = sequelize.define('Broadcast', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    templateId: {
        type: DataTypes.UUID
    },
    channelId: {
        type: DataTypes.UUID
    },
    targetTagId: {
        type: DataTypes.STRING // Tag ID for segmentation, null = all contacts
    },
    scheduledTime: {
        type: DataTypes.DATE
    },
    delayMin: {
        type: DataTypes.INTEGER,
        defaultValue: 2
    },
    delayMax: {
        type: DataTypes.INTEGER,
        defaultValue: 8
    },
    recipientsCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    sentCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    failedCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    status: {
        type: DataTypes.ENUM('SCHEDULED', 'SENDING', 'SENT', 'FAILED', 'CANCELLED'),
        defaultValue: 'SCHEDULED'
    },
    progress: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    }
});

// --- TAG MODEL (Etiquetas CRM) ---
const Tag = sequelize.define('Tag', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    color: {
        type: DataTypes.STRING,
        defaultValue: 'bg-gray-500'
    }
});

// --- QUICKREPLY MODEL (Respuestas Rápidas) ---
const QuickReply = sequelize.define('QuickReply', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    shortcut: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false
    }
});

// --- RELATIONSHIPS ---
// Un Contacto tiene muchos Mensajes
Contact.hasMany(Message, { foreignKey: 'contact_id' });
Message.belongsTo(Contact, { foreignKey: 'contact_id' });

// Un Usuario (Agente) puede tener muchos Contactos asignados
User.hasMany(Contact, { foreignKey: 'assigned_agent_id' });
Contact.belongsTo(User, { foreignKey: 'assigned_agent_id' });

module.exports = {
    sequelize,
    User,
    Contact,
    Message,
    Template,
    Channel,
    Broadcast,
    Tag,
    QuickReply
};
