/**
 * Authentication Routes Module
 * 
 * Handles all authentication-related endpoints including:
 * - User registration
 * - Login
 * - Logout
 * - Current user validation
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const config = require('../config');
const db = new sqlite3.Database(config.dbPath);

/**
 * Register new user
 * POST /api/auth/register
 * 
 * Creates a new user account with initial balance
 */
router.post('/register', async (req, res) => {
    const { username, password, email } = req.body;

    try {
        // Check if username or email already exists
        db.get('SELECT * FROM users WHERE username = ? OR email = ?', [username, email], async (err, user) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Server error' });
            }
            
            if (user) {
                return res.status(400).json({ error: 'Username or email already exists' });
            }

            // Hash password for secure storage
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(password, salt);

            // Use a Promise to handle the transaction
            const executeTransaction = () => {
                return new Promise((resolve, reject) => {
                    db.serialize(() => {
                        // Begin transaction for atomicity
                        db.run('BEGIN TRANSACTION');

                        // Insert user
                        db.run(
                            'INSERT INTO users (username, password_hash, email) VALUES (?, ?, ?)',
                            [username, passwordHash, email],
                            function(err) {
                                if (err) {
                                    db.run('ROLLBACK');
                                    return reject(err);
                                }

                                const userId = this.lastID;

                                // Check if user balance already exists
                                db.get('SELECT * FROM user_balance WHERE user_id = ?', [userId], (err, balanceRow) => {
                                    if (err) {
                                        db.run('ROLLBACK');
                                        return reject(err);
                                    }
                                    
                                    // Only insert a new balance if one doesn't already exist
                                    if (!balanceRow) {
                                        db.run(
                                            'INSERT INTO user_balance (user_id, balance) VALUES (?, ?)',
                                            [userId, config.initialBalance],
                                            (err) => {
                                                if (err) {
                                                    db.run('ROLLBACK');
                                                    return reject(err);
                                                }

                                                db.run('COMMIT', (err) => {
                                                    if (err) {
                                                        db.run('ROLLBACK');
                                                        return reject(err);
                                                    }
                                                    resolve(userId);
                                                });
                                            }
                                        );
                                    } else {
                                        // Balance already exists, just commit
                                        db.run('COMMIT', (err) => {
                                            if (err) {
                                                db.run('ROLLBACK');
                                                return reject(err);
                                            }
                                            resolve(userId);
                                        });
                                    }
                                });
                            }
                        );
                    });
                });
            };

            try {
                const userId = await executeTransaction();

                // Create JWT token for authentication
                const token = jwt.sign({ id: userId }, config.jwtSecret, {
                    expiresIn: '24h'
                });

                // Set cookie and return response
                res.cookie('token', token, config.cookieOptions);
                res.json({
                    success: true,
                    user: {
                        id: userId,
                        username,
                        email,
                        balance: config.initialBalance
                    }
                });
            } catch (error) {
                console.error('Transaction error:', error);
                res.status(500).json({ error: 'Error creating account' });
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * Login user
 * POST /api/auth/login
 * 
 * Authenticates user and returns JWT token
 */
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Find user by username and get balance
        db.get(
            'SELECT users.*, user_balance.balance FROM users LEFT JOIN user_balance ON users.id = user_balance.user_id WHERE username = ?',
            [username],
            async (err, user) => {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({ error: 'Server error' });
                }

                if (!user) {
                    return res.status(400).json({ error: 'Invalid credentials' });
                }

                // Verify password
                const isMatch = await bcrypt.compare(password, user.password_hash);
                if (!isMatch) {
                    return res.status(400).json({ error: 'Invalid credentials' });
                }

                // Create JWT token
                const token = jwt.sign({ id: user.id }, config.jwtSecret, {
                    expiresIn: '24h'
                });

                // If user has no balance record, create one with initial balance
                if (user.balance === null) {
                    db.run(
                        'INSERT INTO user_balance (user_id, balance) VALUES (?, ?)',
                        [user.id, config.initialBalance],
                        (err) => {
                            if (err) {
                                console.error('Error creating balance:', err);
                            }
                        }
                    );
                    user.balance = config.initialBalance;
                }

                // Set cookie and return user info
                res.cookie('token', token, config.cookieOptions);
                res.json({
                    success: true,
                    user: {
                        id: user.id,
                        username: user.username,
                        email: user.email,
                        balance: user.balance || config.initialBalance
                    }
                });
            }
        );
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * Logout user
 * POST /api/auth/logout
 * 
 * Invalidates user session by clearing token cookie
 */
router.post('/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ success: true });
});

/**
 * Get current user
 * GET /api/auth/user
 * 
 * Returns current user info from token
 */
router.get('/user', (req, res) => {
    const token = req.cookies.token;
    if (!token) {
        return res.status(401).json({ error: 'No token, authorization denied' });
    }

    try {
        // Verify token and get user data
        const decoded = jwt.verify(token, config.jwtSecret);
        db.get(
            'SELECT users.id, users.username, users.email, user_balance.balance FROM users LEFT JOIN user_balance ON users.id = user_balance.user_id WHERE users.id = ?',
            [decoded.id],
            (err, user) => {
                if (err || !user) {
                    return res.status(401).json({ error: 'Invalid token' });
                }

                // If user has no balance record, create one with initial balance
                if (user.balance === null) {
                    db.run(
                        'INSERT INTO user_balance (user_id, balance) VALUES (?, ?)',
                        [user.id, config.initialBalance],
                        (err) => {
                            if (err) {
                                console.error('Error creating balance:', err);
                            }
                        }
                    );
                    user.balance = config.initialBalance;
                }

                res.json(user);
            }
        );
    } catch (error) {
        res.status(401).json({ error: 'Token is not valid' });
    }
});

module.exports = router;
