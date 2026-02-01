// CRITICAL: Force IPv4 resolution BEFORE any network connections
const dns = require('node:dns');
if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}

const { Sequelize } = require('sequelize');
require('dotenv').config();

const path = require('path');

// Use SQLite for simple local dev, or Postgres if DATABASE_URL is explicitly provided
const isPostgres = process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres');

const sequelize = isPostgres
    ? new Sequelize(process.env.DATABASE_URL, {
        dialect: 'postgres',
        logging: false,
        dialectOptions: {
            ssl: process.env.NODE_ENV === 'production' ? { require: true, rejectUnauthorized: false } : false
        }
    })
    : new Sequelize({
        dialect: 'sqlite',
        storage: process.env.DB_STORAGE_PATH || path.join(__dirname, '../database.sqlite'), // Local file or Docker volume path
        logging: false
    });

module.exports = sequelize;
