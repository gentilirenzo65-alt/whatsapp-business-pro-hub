/**
 * Database Backup Service
 * 
 * Creates automatic backups of the database.
 * - SQLite: Copies the database.sqlite file
 * - PostgreSQL: Uses pg_dump (must be installed on the server)
 * 
 * Backups are stored in backend/backups/ with timestamp naming.
 * Old backups (>7 days) are automatically deleted.
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
require('dotenv').config();

const BACKUP_DIR = path.join(__dirname, '..', 'backups');
const SQLITE_PATH = path.join(__dirname, '..', 'database.sqlite');
const RETENTION_DAYS = 7; // Keep backups for 7 days

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

/**
 * Get current timestamp for backup filename
 */
function getTimestamp() {
    const now = new Date();
    return now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

/**
 * Backup SQLite database (simple file copy)
 */
async function backupSQLite() {
    return new Promise((resolve, reject) => {
        const backupName = `backup_${getTimestamp()}.sqlite`;
        const backupPath = path.join(BACKUP_DIR, backupName);

        if (!fs.existsSync(SQLITE_PATH)) {
            return reject(new Error('SQLite database file not found'));
        }

        fs.copyFile(SQLITE_PATH, backupPath, (err) => {
            if (err) {
                reject(err);
            } else {
                console.log(`✅ SQLite backup created: ${backupName}`);
                resolve(backupPath);
            }
        });
    });
}

/**
 * Backup PostgreSQL database using pg_dump
 */
async function backupPostgres() {
    return new Promise((resolve, reject) => {
        const backupName = `backup_${getTimestamp()}.sql`;
        const backupPath = path.join(BACKUP_DIR, backupName);
        const databaseUrl = process.env.DATABASE_URL;

        if (!databaseUrl) {
            return reject(new Error('DATABASE_URL not set'));
        }

        // pg_dump command
        const command = `pg_dump "${databaseUrl}" > "${backupPath}"`;

        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(new Error(`pg_dump failed: ${stderr || error.message}`));
            } else {
                console.log(`✅ PostgreSQL backup created: ${backupName}`);
                resolve(backupPath);
            }
        });
    });
}

/**
 * Delete backups older than RETENTION_DAYS
 */
function cleanOldBackups() {
    const files = fs.readdirSync(BACKUP_DIR);
    const now = Date.now();
    const maxAge = RETENTION_DAYS * 24 * 60 * 60 * 1000;

    let deletedCount = 0;
    files.forEach(file => {
        const filePath = path.join(BACKUP_DIR, file);
        const stat = fs.statSync(filePath);
        const age = now - stat.mtimeMs;

        if (age > maxAge && file.startsWith('backup_')) {
            fs.unlinkSync(filePath);
            deletedCount++;
        }
    });

    if (deletedCount > 0) {
        console.log(`🗑️ Deleted ${deletedCount} old backup(s)`);
    }
}

/**
 * Run backup based on database type
 */
async function runBackup() {
    const isPostgres = process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres');

    console.log(`\n📦 Starting database backup at ${new Date().toLocaleString()}...`);

    try {
        if (isPostgres) {
            await backupPostgres();
        } else {
            await backupSQLite();
        }

        // Clean old backups after successful backup
        cleanOldBackups();

        console.log('✅ Backup completed successfully\n');
        return true;
    } catch (error) {
        console.error('❌ Backup failed:', error.message);
        return false;
    }
}

/**
 * List all backups
 */
function listBackups() {
    if (!fs.existsSync(BACKUP_DIR)) return [];

    return fs.readdirSync(BACKUP_DIR)
        .filter(f => f.startsWith('backup_'))
        .map(f => {
            const filePath = path.join(BACKUP_DIR, f);
            const stat = fs.statSync(filePath);
            return {
                name: f,
                path: filePath,
                size: (stat.size / 1024).toFixed(2) + ' KB',
                created: stat.mtime
            };
        })
        .sort((a, b) => b.created - a.created);
}

// Export functions
module.exports = {
    runBackup,
    backupSQLite,
    backupPostgres,
    cleanOldBackups,
    listBackups,
    BACKUP_DIR
};

// Run backup if called directly: node backup.js
if (require.main === module) {
    runBackup();
}
