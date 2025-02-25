const express = require('express');
const router = express.Router();
const yahooFinance = require('yahoo-finance2').default;

// Get stock quote and historical data
router.get('/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        const { range = '6mo' } = req.query;

        // Get current quote
        const quote = await yahooFinance.quote(symbol);
        
        // Get historical data with appropriate interval based on range
        const queryOptions = {
            period1: getDateRange(range),
            interval: getInterval(range)
        };
        
        const history = await yahooFinance.historical(symbol, queryOptions);

        // Calculate technical indicators
        const technicalData = calculateTechnicalIndicators(history);

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

// Search stocks
router.get('/search/:query', async (req, res) => {
    try {
        const { query } = req.params;
        const results = await yahooFinance.search(query);
        
        // Filter and format search results
        const stocks = results.quotes
            .filter(quote => quote.quoteType === 'EQUITY')
            .slice(0, 10) // Limit to top 10 results
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

// Helper function to calculate date range
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

// Helper function to get appropriate interval
function getInterval(range) {
    switch (range) {
        case '1d':
            return '5m';
        case '5d':
            return '15m';
        case '1mo':
            return '1d';
        default:
            return '1d';
    }
}

// Calculate technical indicators
function calculateTechnicalIndicators(history) {
    const closes = history.map(day => day.close);
    
    return {
        sma20: calculateSMA(closes, 20),
        sma50: calculateSMA(closes, 50),
        rsi: calculateRSI(closes)
    };
}

// Calculate Simple Moving Average
function calculateSMA(data, period) {
    const sma = [];
    for (let i = period - 1; i < data.length; i++) {
        const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
        sma.push(sum / period);
    }
    
    // Pad the beginning with null values to match data length
    return Array(period - 1).fill(null).concat(sma);
}

// Calculate Relative Strength Index
function calculateRSI(data, period = 14) {
    const changes = [];
    for (let i = 1; i < data.length; i++) {
        changes.push(data[i] - data[i - 1]);
    }

    // Calculate initial averages
    let gains = changes.slice(0, period).filter(change => change > 0);
    let losses = changes.slice(0, period).filter(change => change < 0).map(Math.abs);
    
    let avgGain = gains.reduce((sum, gain) => sum + gain, 0) / period;
    let avgLoss = losses.reduce((sum, loss) => sum + loss, 0) / period;

    const rsi = [];
    
    // Calculate first RSI
    if (avgLoss === 0) {
        rsi.push(100);
    } else {
        const rs = avgGain / avgLoss;
        rsi.push(100 - (100 / (1 + rs)));
    }

    // Calculate remaining RSI values
    for (let i = period; i < data.length - 1; i++) {
        const change = changes[i];
        const gain = change > 0 ? change : 0;
        const loss = change < 0 ? Math.abs(change) : 0;

        avgGain = ((avgGain * (period - 1)) + gain) / period;
        avgLoss = ((avgLoss * (period - 1)) + loss) / period;

        if (avgLoss === 0) {
            rsi.push(100);
        } else {
            const rs = avgGain / avgLoss;
            rsi.push(100 - (100 / (1 + rs)));
        }
    }

    // Pad the beginning with null values to match data length
    return Array(data.length - rsi.length).fill(null).concat(rsi);
}

module.exports = router;