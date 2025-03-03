/**
 * Stock Market Data Routes
 * 
 * Provides API endpoints for retrieving stock market data:
 * - Stock quotes and historical prices
 * - Technical indicators
 * - Symbol search functionality
 * 
 * Uses Yahoo Finance API for real-time market data.
 */

const express = require('express');
const router = express.Router();
const yahooFinance = require('yahoo-finance2').default;

/**
 * Get stock quote and historical data
 * GET /api/stocks/:symbol
 * 
 * Returns current quote, historical prices, and technical indicators
 * for the specified stock symbol.
 */
router.get('/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        const { range = '6mo' } = req.query;

        // Get current stock quote
        const quote = await yahooFinance.quote(symbol);
        
        // Get historical data with appropriate interval based on range
        const queryOptions = {
            period1: getDateRange(range),
            interval: getInterval(range)
        };
        
        const history = await yahooFinance.historical(symbol, queryOptions);

        // Calculate technical indicators from historical data
        const technicalData = calculateTechnicalIndicators(history);

        // Format and return combined data
        res.json({
            quote: {
                price: quote.regularMarketPrice,
                change: quote.regularMarketChange,
                changePercent: quote.regularMarketChangePercent,
                volume: quote.regularMarketVolume,
                high: quote.regularMarketDayHigh,
                low: quote.regularMarketDayLow,
                previousClose: quote.regularMarketPreviousClose
            },
            history: history.map(day => ({
                date: day.date,
                close: day.close,
                open: day.open,
                high: day.high,
                low: day.low,
                volume: day.volume
            })),
            technical: technicalData
        });
    } catch (error) {
        console.error('Stock data fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch stock data' });
    }
});

/**
 * Search for stocks by name or symbol
 * GET /api/stocks/search/:query
 * 
 * Returns matching stock symbols and company names.
 */
router.get('/search/:query', async (req, res) => {
    try {
        const { query } = req.params;
        const results = await yahooFinance.search(query);
        
        // Filter and format search results
        const stocks = results.quotes
            .filter(quote => quote.quoteType === 'EQUITY') // Only include stocks
            .slice(0, 10) // Limit to top 10 results for performance
            .map(quote => ({
                symbol: quote.symbol,
                name: quote.longname || quote.shortname,
                exchange: quote.exchange
            }));

        res.json(stocks);
    } catch (error) {
        console.error('Stock search error:', error);
        res.status(500).json({ error: 'Search failed' });
    }
});

/**
 * Calculate date range based on specified time period
 * @param {string} range - Time range ('1d', '5d', '1mo', etc.)
 * @returns {Date} Start date for the range
 */
function getDateRange(range) {
    const now = new Date();
    switch (range) {
        case '1d':
            return new Date(now.setDate(now.getDate() - 1));
        case '5d':
            return new Date(now.setDate(now.getDate() - 5));
        case '1mo':
            return new Date(now.setMonth(now.getMonth() - 1));
        case '3mo':
            return new Date(now.setMonth(now.getMonth() - 3));
        case '6mo':
            return new Date(now.setMonth(now.getMonth() - 6));
        case '1y':
            return new Date(now.setFullYear(now.getFullYear() - 1));
        default:
            return new Date(now.setMonth(now.getMonth() - 6));
    }
}

/**
 * Get appropriate interval for historical data based on range
 * @param {string} range - Time range ('1d', '5d', '1mo', etc.)
 * @returns {string} Data interval ('5m', '15m', '1d', etc.)
 */
function getInterval(range) {
    switch (range) {
        case '1d':
            return '5m';  // 5-minute intervals for 1-day view
        case '5d':
            return '15m'; // 15-minute intervals for 5-day view
        case '1mo':
            return '1d';  // Daily intervals for 1-month view
        default:
            return '1d';  // Daily intervals for longer periods
    }
}

/**
 * Calculate technical indicators from historical price data
 * @param {Array} history - Array of historical price data
 * @returns {Object} Calculated technical indicators
 */
function calculateTechnicalIndicators(history) {
    const closes = history.map(day => day.close);
    
    return {
        sma20: calculateSMA(closes, 20), // 20-day Simple Moving Average
        sma50: calculateSMA(closes, 50), // 50-day Simple Moving Average
        rsi: calculateRSI(closes)        // Relative Strength Index
    };
}

/**
 * Calculate Simple Moving Average
 * @param {Array} data - Array of price values
 * @param {number} period - SMA period length
 * @returns {Array} - The calculated SMA values
 */
function calculateSMA(data, period) {
    const sma = [];
    
    // Calculate SMA for each point after we have enough data
    for (let i = period - 1; i < data.length; i++) {
        const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
        sma.push(sum / period);
    }
    
    // Pad the beginning with null values to match data length
    return Array(period - 1).fill(null).concat(sma);
}

/**
 * Calculate Relative Strength Index
 * @param {Array} data - Array of price values
 * @param {number} period - RSI period length (default: 14)
 * @returns {Array} - The calculated RSI values
 */
function calculateRSI(data, period = 14) {
    // Calculate price changes
    const changes = [];
    for (let i = 1; i < data.length; i++) {
        changes.push(data[i] - data[i - 1]);
    }

    // Calculate initial averages for first period
    let gains = changes.slice(0, period).filter(change => change > 0);
    let losses = changes.slice(0, period).filter(change => change < 0).map(Math.abs);
    
    let avgGain = gains.reduce((sum, gain) => sum + gain, 0) / period;
    let avgLoss = losses.reduce((sum, loss) => sum + loss, 0) / period;

    const rsi = [];
    
    // Calculate first RSI value
    if (avgLoss === 0) {
        rsi.push(100); // No losses means RSI = 100
    } else {
        const rs = avgGain / avgLoss;
        rsi.push(100 - (100 / (1 + rs)));
    }

    // Calculate remaining RSI values using smoothed method
    for (let i = period; i < data.length - 1; i++) {
        const change = changes[i];
        const gain = change > 0 ? change : 0;
        const loss = change < 0 ? Math.abs(change) : 0;

        // Update average gain and loss with smoothing
        avgGain = ((avgGain * (period - 1)) + gain) / period;
        avgLoss = ((avgLoss * (period - 1)) + loss) / period;

        if (avgLoss === 0) {
            rsi.push(100); // No losses means RSI = 100
        } else {
            const rs = avgGain / avgLoss;
            rsi.push(100 - (100 / (1 + rs)));
        }
    }

    // Pad the beginning with null values to match data length
    return Array(data.length - rsi.length).fill(null).concat(rsi);
}

module.exports = router;
