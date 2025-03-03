/**
 * Database Initialization Script
 * 
 * This script creates the SQLite database structure for the application.
 * It should be run once before starting the application for the first time,
 * or when the database schema needs to be reset.
 * 
 * Usage: npm run init-db
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const config = require('../config');

// Ensure database directory exists before creating the database file
const dbDir = path.join(__dirname, '../../database');
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// Create database connection
const db = new sqlite3.Database(config.dbPath);

// Read schema file containing table definitions
const schema = fs.readFileSync(path.join(__dirname, './schema.sql'), 'utf8');

// Execute schema
db.serialize(() => {
    // Enable foreign keys for referential integrity
    db.run('PRAGMA foreign_keys = ON');

    // Split schema into individual SQL statements and execute each
    // This allows us to have multiple CREATE TABLE statements in one file
    const statements = schema.split(';').filter(stmt => stmt.trim());
    
    statements.forEach((statement) => {
        if (statement.trim()) {
            db.run(statement.trim() + ';', (err) => {
                if (err) {
                    console.error('Error executing statement:', statement);
                    console.error(err);
                }
            });
        }
    });

    console.log('Database initialized successfully');
});

// Close database connection when done
db.close((err) => {
    if (err) {
        console.error('Error closing database:', err);
    } else {
        console.log('Database connection closed');
    }
});
