const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const config = require('../config');

// Ensure database directory exists
const dbDir = path.join(__dirname, '../../database');
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// Create database connection
const db = new sqlite3.Database(config.dbPath);

// Read schema file
const schema = fs.readFileSync(path.join(__dirname, './schema.sql'), 'utf8');

// Execute schema
db.serialize(() => {
    // Enable foreign keys
    db.run('PRAGMA foreign_keys = ON');

    // Split schema into individual statements and execute each
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

// Close database connection
db.close((err) => {
    if (err) {
        console.error('Error closing database:', err);
    } else {
        console.log('Database connection closed');
    }
});