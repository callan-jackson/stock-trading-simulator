/**
 * Server Configuration Module
 * 
 * Centralizes application configuration settings to maintain consistency
 * across all server components. Loads environment variables from .env file
 * and provides default values when environment variables are not set.
 */

const path = require('path');
require('dotenv').config(); // Load environment variables from .env file

module.exports = {
    // Server port - defaults to 3000 if PORT environment variable isn't set
    port: process.env.PORT || 3000,
    
    // JWT secret key for authentication tokens
    // In production, this should be set via environment variable
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
    
    // Initial cash balance for new user accounts
    initialBalance: 10000,
    
    // Database file path - uses SQLite file in database directory
    dbPath: path.join(__dirname, '../database/stocks.db'),
    
    // Cookie settings for JWT token storage
    cookieOptions: {
        httpOnly: true,                              // Prevents JavaScript access to cookie
        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
        maxAge: 24 * 60 * 60 * 1000                  // 24 hours expiration
    }
};
