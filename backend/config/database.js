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
        storage: path.join(__dirname, '../database.sqlite'), // Local file
        logging: false
    });

module.exports = sequelize;
