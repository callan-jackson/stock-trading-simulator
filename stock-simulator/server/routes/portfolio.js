const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const yahooFinance = require('yahoo-finance2').default;
const config = require('../config');
const db = new sqlite3.Database(config.dbPath);

// Get user's portfolio summary
router.get('/summary', async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Get user's cash balance
        db.get('SELECT balance FROM user_balance WHERE user_id = ?', [userId], async (err, balanceRow) => {
            if (err) {
                console.error('Database error fetching balance:', err);
                return res.status(500).json({ error: 'Database error' });
            }

            // If no balance row exists, create one with initial balance
            if (!balanceRow) {
                try {
                    await new Promise((resolve, reject) => {
                        db.run(
                            'INSERT INTO user_balance (user_id, balance) VALUES (?, ?)',
                            [userId, config.initialBalance],
                            (err) => {
                                if (err) reject(err);
                                else resolve();
                            }
                        );
                    });
                    balanceRow = { balance: config.initialBalance };
                    console.log(`Created new balance for user ${userId}: ${config.initialBalance}`);
                } catch (error) {
                    console.error('Error creating balance:', error);
                    return res.status(500).json({ error: 'Failed to initialize balance' });
                }
            }

            // Get user's portfolio
            db.all(
                'SELECT symbol, quantity, average_cost FROM portfolio WHERE user_id = ? AND quantity > 0',
                [userId],
                async (err, portfolio) => {
                    if (err) {
                        console.error('Database error fetching portfolio:', err);
                        return res.status(500).json({ error: 'Database error' });
                    }

                    let totalValue = balanceRow.balance;
                    const holdings = [];

                    // Calculate current value of each holding
                    for (const stock of portfolio) {
                        try {
                            const quote = await yahooFinance.quote(stock.symbol);
                            const currentPrice = quote.regularMarketPrice;
                            const value = currentPrice * stock.quantity;
                            
                            holdings.push({
                                symbol: stock.symbol,
                                quantity: stock.quantity,
                                averageCost: stock.average_cost,
                                currentPrice: currentPrice,
                                totalValue: value,
                                profit: value - (stock.average_cost * stock.quantity)
                            });

                            totalValue += value;
                        } catch (error) {
                            console.error(`Error fetching quote for ${stock.symbol}:`, error);
                        }
                    }

                    res.json({
                        cash: balanceRow.balance,
                        totalValue,
                        holdings,
                        profit: totalValue - config.initialBalance
                    });
                }
            );
        });
    } catch (error) {
        console.error('Portfolio summary error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Execute trade
router.post('/trade', async (req, res) => {
    const { symbol, quantity, type } = req.body;
    const userId = req.user.id;

    if (!symbol || !quantity || !['buy', 'sell'].includes(type)) {
        return res.status(400).json({ error: 'Invalid trade parameters' });
    }

    try {
        const quote = await yahooFinance.quote(symbol);
        const currentPrice = quote.regularMarketPrice;
        const totalCost = currentPrice * quantity;

        db.serialize(() => {
            db.run('BEGIN TRANSACTION');

            // Check user's balance for buy orders
            if (type === 'buy') {
                db.get('SELECT balance FROM user_balance WHERE user_id = ?', [userId], (err, row) => {
                    if (err) {
                        db.run('ROLLBACK');
                        console.error('Database error checking balance:', err);
                        return res.status(500).json({ error: 'Database error' });
                    }

                    if (!row) {
                        db.run('ROLLBACK');
                        return res.status(400).json({ error: 'User balance not found' });
                    }

                    if (row.balance < totalCost) {
                        db.run('ROLLBACK');
                        return res.status(400).json({ error: 'Insufficient funds' });
                    }

                    // Update user's balance
                    db.run(
                        'UPDATE user_balance SET balance = balance - ? WHERE user_id = ?',
                        [totalCost, userId],
                        (err) => {
                            if (err) {
                                db.run('ROLLBACK');
                                console.error('Error updating balance:', err);
                                return res.status(500).json({ error: 'Transaction failed' });
                            }

                            // Update portfolio
                            updatePortfolio(userId, symbol, quantity, currentPrice, type, (err) => {
                                if (err) {
                                    db.run('ROLLBACK');
                                    console.error('Error updating portfolio:', err);
                                    return res.status(500).json({ error: 'Transaction failed' });
                                }

                                db.run('COMMIT');
                                res.json({ success: true });
                            });
                        }
                    );
                });
            } else {
                // Handle sell orders
                db.get(
                    'SELECT quantity FROM portfolio WHERE user_id = ? AND symbol = ?',
                    [userId, symbol],
                    (err, row) => {
                        if (err) {
                            db.run('ROLLBACK');
                            console.error('Database error checking shares:', err);
                            return res.status(500).json({ error: 'Database error' });
                        }

                        if (!row || row.quantity < quantity) {
                            db.run('ROLLBACK');
                            return res.status(400).json({ error: 'Insufficient shares' });
                        }

                        // Update user's balance
                        db.run(
                            'UPDATE user_balance SET balance = balance + ? WHERE user_id = ?',
                            [totalCost, userId],
                            (err) => {
                                if (err) {
                                    db.run('ROLLBACK');
                                    console.error('Error updating balance:', err);
                                    return res.status(500).json({ error: 'Transaction failed' });
                                }

                                // Update portfolio with negative quantity for sells
                                updatePortfolio(userId, symbol, -quantity, currentPrice, type, (err) => {
                                    if (err) {
                                        db.run('ROLLBACK');
                                        console.error('Error updating portfolio:', err);
                                        return res.status(500).json({ error: 'Transaction failed' });
                                    }

                                    db.run('COMMIT');
                                    res.json({ success: true });
                                });
                            }
                        );
                    }
                );
            }
        });
    } catch (error) {
        console.error('Trade execution error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get transaction history - IMPROVED VERSION
router.get('/transactions', (req, res) => {
    // Make sure we have a valid user ID from the authenticated user
    const userId = req.user.id;
    
    if (!userId) {
        console.error('No user ID found in request');
        return res.status(401).json({ error: 'Authentication required' });
    }
    
    console.log(`Fetching transactions for user ID: ${userId}`);
    
    // Use parameterized query with explicit user ID check
    db.all(
        `SELECT id, symbol, quantity, price, type, date FROM transactions 
         WHERE user_id = ? 
         ORDER BY date DESC 
         LIMIT 50`,
        [userId],
        (err, transactions) => {
            if (err) {
                console.error('Database error fetching transactions:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            
            console.log(`Found ${transactions.length} transactions for user ${userId}`);
            
            // Only return necessary fields, excluding user_id for extra security
            const sanitizedTransactions = transactions.map(transaction => ({
                id: transaction.id,
                symbol: transaction.symbol,
                quantity: transaction.quantity,
                price: transaction.price,
                type: transaction.type,
                date: transaction.date
            }));
            
            res.json(sanitizedTransactions);
        }
    );
});

// Helper function to update portfolio
function updatePortfolio(userId, symbol, quantity, price, type, callback) {
    db.run(
        `INSERT INTO portfolio (user_id, symbol, quantity, average_cost)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(user_id, symbol) DO UPDATE SET
         quantity = quantity + ?,
         average_cost = CASE 
             WHEN ? > 0 THEN 
                 ((quantity * average_cost) + (? * ?)) / (quantity + ?)
             ELSE average_cost
         END`,
        [userId, symbol, quantity, price, quantity, quantity, Math.abs(quantity), price, Math.abs(quantity)],
        (err) => {
            if (err) {
                console.error('Error updating portfolio:', err);
                return callback(err);
            }

            // Record transaction - call improved version
            recordTransaction(userId, symbol, Math.abs(quantity), price, type, callback);
        }
    );
}

// Helper function to record transaction - IMPROVED VERSION
function recordTransaction(userId, symbol, quantity, price, type, callback) {
    // Extra validation to ensure we have a valid user ID
    if (!userId) {
        console.error('Attempted to record transaction without valid user ID');
        return callback(new Error('Invalid user ID'));
    }
    
    console.log(`Recording ${type} transaction for user ${userId}: ${quantity} ${symbol} at $${price}`);
    
    db.run(
        'INSERT INTO transactions (user_id, symbol, quantity, price, type) VALUES (?, ?, ?, ?, ?)',
        [userId, symbol, quantity, price, type],
        function(err) {
            if (err) {
                console.error(`Error recording transaction: ${err.message}`);
                return callback(err);
            }
            
            console.log(`Transaction recorded successfully with ID ${this.lastID} for user ${userId}`);
            callback(null);
        }
    );
}

module.exports = router;