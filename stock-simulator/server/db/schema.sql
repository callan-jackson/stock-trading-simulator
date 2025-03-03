-- Database Schema for Stock Trading Simulator
-- This file defines the structure of all database tables used by the application

-- Drop existing tables if they exist
-- This ensures a clean slate when reinitializing the database
DROP TABLE IF EXISTS user_balance;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS portfolio;
DROP TABLE IF EXISTS users;

-- Users table
-- Stores user account information
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,          -- Username must be unique
    password_hash TEXT NOT NULL,            -- Bcrypt hashed password
    email TEXT UNIQUE NOT NULL,             -- Email must be unique
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP  -- Account creation timestamp
);

-- User balance table
-- Tracks available cash for each user
CREATE TABLE IF NOT EXISTS user_balance (
    user_id INTEGER PRIMARY KEY,            -- References users.id
    balance REAL NOT NULL DEFAULT 10000.00, -- Initial balance of $10,000
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Portfolio table
-- Tracks users' stock holdings
CREATE TABLE IF NOT EXISTS portfolio (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    symbol TEXT NOT NULL,                   -- Stock ticker symbol
    quantity INTEGER DEFAULT 0,             -- Number of shares owned
    average_cost REAL,                      -- Average purchase price per share
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, symbol)                 -- One portfolio entry per stock per user
);

-- Transactions table
-- Records all buy/sell transactions
CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    symbol TEXT NOT NULL,                   -- Stock ticker symbol
    quantity INTEGER NOT NULL,              -- Number of shares in transaction
    price REAL NOT NULL,                    -- Price per share at transaction time
    type TEXT NOT NULL,                     -- 'buy' or 'sell'
    date DATETIME DEFAULT CURRENT_TIMESTAMP, -- Transaction timestamp
    FOREIGN KEY (user_id) REFERENCES users(id)
);
