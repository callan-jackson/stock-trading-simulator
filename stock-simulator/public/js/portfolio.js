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
                return res.status(500).json({ error: 'Database error' });
            }

            // If no balance row exists, create one
            if (!balanceRow) {
                await new Promise((resolve, reject) => {
                    db.run('INSERT INTO user_balance (user_id, balance) VALUES (?, ?)',
                        [userId, config.initialBalance],
                        (err) => {
                            if (err) reject(err);
                            else resolve();
                        });
                });
                balanceRow = { balance: config.initialBalance };
            }

            // Get user's portfolio
            db.all(
                'SELECT symbol, quantity, average_cost FROM portfolio WHERE user_id = ? AND quantity > 0',
                [userId],
                async (err, portfolio) => {
                    if (err) {
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

            if (type === 'buy') {
                // Check user's balance
                db.get('SELECT balance FROM user_balance WHERE user_id = ?', [userId], (err, row) => {
                    if (err || !row) {
                        db.run('ROLLBACK');
                        return res.status(400).json({ error: 'Could not verify balance' });
                    }

                    if (row.balance < totalCost) {
                        db.run('ROLLBACK');
                        return res.status(400).json({ error: 'Insufficient funds' });
                    }

                    // Update balance
                    db.run(
                        'UPDATE user_balance SET balance = balance - ? WHERE user_id = ?',
                        [totalCost, userId],
                        (err) => {
                            if (err) {
                                db.run('ROLLBACK');
                                return res.status(500).json({ error: 'Failed to update balance' });
                            }

                            // Update portfolio
                            updatePortfolio(userId, symbol, quantity, currentPrice, type, (err) => {
                                if (err) {
                                    db.run('ROLLBACK');
                                    return res.status(500).json({ error: 'Failed to update portfolio' });
                                }

                                db.run('COMMIT');
                                res.json({ success: true });
                            });
                        }
                    );
                });
            } else { // Sell
                // Verify holding
                db.get(
                    'SELECT quantity FROM portfolio WHERE user_id = ? AND symbol = ?',
                    [userId, symbol],
                    (err, row) => {
                        if (err) {
                            db.run('ROLLBACK');
                            return res.status(500).json({ error: 'Database error' });
                        }

                        if (!row || row.quantity < quantity) {
                            db.run('ROLLBACK');
                            return res.status(400).json({ error: 'Insufficient shares' });
                        }

                        // Update balance
                        db.run(
                            'UPDATE user_balance SET balance = balance + ? WHERE user_id = ?',
                            [totalCost, userId],
                            (err) => {
                                if (err) {
                                    db.run('ROLLBACK');
                                    return res.status(500).json({ error: 'Failed to update balance' });
                                }

                                // Update portfolio with negative quantity for sells
                                updatePortfolio(userId, symbol, -quantity, currentPrice, type, (err) => {
                                    if (err) {
                                        db.run('ROLLBACK');
                                        return res.status(500).json({ error: 'Failed to update portfolio' });
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
        res.status(500).json({ error: 'Failed to execute trade' });
    }
});

// Get transaction history
router.get('/transactions', (req, res) => {
    const userId = req.user.id;
    
    db.all(
        `SELECT * FROM transactions 
         WHERE user_id = ? 
         ORDER BY date DESC 
         LIMIT 50`,
        [userId],
        (err, transactions) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            res.json(transactions);
        }
    );
});

// Helper function to update portfolio
function updatePortfolio(userId, symbol, quantity, price, type, callback) {
    db.get(
        'SELECT quantity, average_cost FROM portfolio WHERE user_id = ? AND symbol = ?',
        [userId, symbol],
        (err, row) => {
            if (err) {
                return callback(err);
            }

            if (!row) {
                // New position
                if (type === 'buy') {
                    db.run(
                        'INSERT INTO portfolio (user_id, symbol, quantity, average_cost) VALUES (?, ?, ?, ?)',
                        [userId, symbol, quantity, price],
                        (err) => {
                            if (err) return callback(err);
                            recordTransaction(userId, symbol, quantity, price, type, callback);
                        }
                    );
                } else {
                    return callback(new Error('Cannot sell stock that is not in portfolio'));
                }
            } else {
                // Update existing position
                const newQuantity = row.quantity + (type === 'buy' ? quantity : -quantity);
                let newAverageCost = row.average_cost;
                
                if (type === 'buy' && newQuantity > 0) {
                    // Update average cost only on buys
                    const totalCost = (row.quantity * row.average_cost) + (quantity * price);
                    newAverageCost = totalCost / newQuantity;
                }

                db.run(
                    'UPDATE portfolio SET quantity = ?, average_cost = ? WHERE user_id = ? AND symbol = ?',
                    [newQuantity, newAverageCost, userId, symbol],
                    (err) => {
                        if (err) return callback(err);
                        recordTransaction(userId, symbol, quantity, price, type, callback);
                    }
                );
            }
        }
    );
}

// Helper function to record transaction
function recordTransaction(userId, symbol, quantity, price, type, callback) {
    db.run(
        'INSERT INTO transactions (user_id, symbol, quantity, price, type) VALUES (?, ?, ?, ?, ?)',
        [userId, symbol, quantity, price, type],
        callback
    );
}

module.exports = router;