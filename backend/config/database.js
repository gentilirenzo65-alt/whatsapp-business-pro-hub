// CRITICAL: Force IPv4 resolution BEFORE any network connections
const dns = require('node:dns');
if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}

const { Sequelize } = require('sequelize');
require('dotenv').config();

// Validate DATABASE_URL exists
if (!process.env.DATABASE_URL) {
    console.error('❌ FATAL: DATABASE_URL environment variable is required.');
    console.error('   Please configure your Supabase connection string in .env');
    process.exit(1);
}

// Connect to Supabase (PostgreSQL)
const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
        ssl: process.env.NODE_ENV === 'production' ? { require: true, rejectUnauthorized: false } : false
    }
});

module.exports = sequelize;
