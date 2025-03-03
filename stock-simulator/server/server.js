/**
 * Main Server Application
 * 
 * This is the entry point for the Express server application.
 * It sets up middleware, routes, and starts the HTTP server.
 */

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const path = require('path');
const config = require('./config');

// Create Express application instance
const app = express();

// Middleware Setup
app.use(cors({
    origin: 'http://localhost:3000', // Restrict CORS to localhost during development
    credentials: true                // Allow cookies to be sent with requests
}));
app.use(cookieParser());            // Parse cookies for authentication
app.use(express.json());            // Parse JSON request bodies

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../public')));

// Import route handlers
const authRoutes = require('./routes/auth');
const stockRoutes = require('./routes/stocks');
const portfolioRoutes = require('./routes/portfolio');

/**
 * Authentication middleware
 * Verifies JWT token and attaches user data to request
 */
const authMiddleware = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) {
        return res.status(401).json({ error: 'No token, authorization denied' });
    }

    try {
        // Verify token and attach decoded user data to request
        const decoded = jwt.verify(token, config.jwtSecret);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Token is not valid' });
    }
};

// API Routes
app.use('/api/auth', authRoutes);          // Authentication routes (login, register, etc.)
app.use('/api/stocks', stockRoutes);       // Stock data routes (quotes, history, search)
app.use('/api/portfolio', authMiddleware, portfolioRoutes); // Portfolio routes (requires auth)

// Serve index.html for all other routes (client-side routing)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Global error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something broke!' });
});

// Start HTTP server
const PORT = config.port || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
