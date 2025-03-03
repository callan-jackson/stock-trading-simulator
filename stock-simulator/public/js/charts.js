/**
 * Stock Charts Module
 * 
 * Handles stock chart creation, data visualization, and real-time updates.
 * Uses LightweightCharts library for efficient rendering of financial data.
 */

// Chart instances
let stockChart = null;
let candleSeries = null;
let volumeSeries = null;
let sma20Series = null;
let sma50Series = null;
let currentSymbol = 'AAPL';  // Default symbol
let currentRange = '6mo';    // Default time range

/**
 * Initialize the stock chart with default settings
 * Creates candlestick, volume, and moving average series
 */
async function initializeChart() {
    const chartContainer = document.getElementById('stockChart');
    if (!chartContainer) return;

    // Clear any existing chart
    chartContainer.innerHTML = '';

    // Create new chart instance
    stockChart = LightweightCharts.createChart(chartContainer, {
        width: chartContainer.clientWidth,
        height: 400,
        layout: {
            background: { color: '#ffffff' },
            textColor: '#333333',
        },
        grid: {
            vertLines: { color: '#f0f0f0' },
            horzLines: { color: '#f0f0f0' },
        },
        crosshair: {
            mode: LightweightCharts.CrosshairMode.Normal,
        },
        rightPriceScale: {
            borderColor: '#d1d4dc',
        },
        timeScale: {
            borderColor: '#d1d4dc',
            timeVisible: true,
        },
    });

    // Add candlestick series for price data
    candleSeries = stockChart.addCandlestickSeries({
        upColor: '#26a69a',       // Green for price increases
        downColor: '#ef5350',     // Red for price decreases
        borderVisible: false,
        wickUpColor: '#26a69a',   // Wick color for up candles
        wickDownColor: '#ef5350', // Wick color for down candles
    });

    // Add volume series at the bottom of the chart
    volumeSeries = stockChart.addHistogramSeries({
        color: '#26a69a',
        priceFormat: {
            type: 'volume',
        },
        priceScaleId: '',  // Display on a separate scale
        scaleMargins: {
            top: 0.8,  // Position at bottom 20% of chart
            bottom: 0,
        },
    });

    // Add 20-day Simple Moving Average (SMA) indicator
    sma20Series = stockChart.addLineSeries({
        color: '#2962FF',  // Blue line
        lineWidth: 1,
        title: 'SMA 20',
    });

    // Add 50-day Simple Moving Average (SMA) indicator
    sma50Series = stockChart.addLineSeries({
        color: '#FF6D00',  // Orange line
        lineWidth: 1,
        title: 'SMA 50',
    });

    // Setup chart controls and event listeners
    setupChartControls();
    setupSearchFunctionality();
    
    // Load initial stock data
    await updateChartData(currentSymbol);

    // Handle window resize to maintain chart responsiveness
    window.addEventListener('resize', () => {
        if (stockChart) {
            stockChart.resize(
                chartContainer.clientWidth,
                chartContainer.clientHeight
            );
        }
    });
}

/**
 * Update chart data for a specific stock symbol
 * Fetches price history and technical indicators
 * @param {string} symbol - Stock ticker symbol (default: currentSymbol)
 */
async function updateChartData(symbol = currentSymbol) {
    try {
        // Update current symbol
        currentSymbol = symbol;
        
        // Update symbol display in UI
        const symbolElement = document.getElementById('currentSymbol');
        if (symbolElement) {
            symbolElement.textContent = symbol;
        }
        
        // Fetch stock data from API
        const response = await fetch(`/api/stocks/${symbol}?range=${currentRange}`);
        const data = await response.json();

        // Validate data
        if (!data.history || !data.history.length) {
            console.error('No historical data received');
            return;
        }

        // Prepare candlestick data
        const candleData = data.history.map(item => ({
            time: new Date(item.date).getTime() / 1000, // Convert to Unix timestamp
            open: item.open,
            high: item.high,
            low: item.low,
            close: item.close,
        }));

        // Update candlestick series with new data
        candleSeries.setData(candleData);

        // Prepare and update volume data
        const volumeData = data.history.map(item => ({
            time: new Date(item.date).getTime() / 1000,
            value: item.volume,
            // Color based on price movement (green if up, red if down)
            color: item.close >= item.open ? '#26a69a80' : '#ef535080',
        }));
        volumeSeries.setData(volumeData);

        // Update technical indicators if available
        if (data.technical) {
            const timestamps = candleData.map(d => d.time);
            
            // Update SMA 20 indicator
            if (data.technical.sma20) {
                const sma20Data = data.technical.sma20.map((value, index) => ({
                    time: timestamps[index],
                    value: value,
                }));
                sma20Series.setData(sma20Data);
            }

            // Update SMA 50 indicator
            if (data.technical.sma50) {
                const sma50Data = data.technical.sma50.map((value, index) => ({
                    time: timestamps[index],
                    value: value,
                }));
                sma50Series.setData(sma50Data);
            }
        }

        // Update price information display
        updatePriceInfo(data.quote);
        
        // Update symbol in trade box for trading
        const symbolInput = document.getElementById('symbol');
        if (symbolInput) {
            symbolInput.value = symbol;
        }
        
        // Update current price display
        const currentPriceElement = document.getElementById('currentPrice');
        if (currentPriceElement && data.quote) {
            currentPriceElement.textContent = data.quote.price.toFixed(2);
            
            // Call updateTotalCost to recalculate trade amounts
            if (typeof window.updateTotalCost === 'function') {
                window.updateTotalCost();
            } else if (typeof updateTotalCost === 'function') {
                updateTotalCost();
            }
        }

    } catch (error) {
        console.error('Failed to fetch chart data:', error);
    }
}

/**
 * Update total cost calculation when quantity or price changes
 * Updates trade form with current calculation
 */
function updateTotalCost() {
    const quantityInput = document.getElementById('quantity');
    const currentPriceElement = document.getElementById('currentPrice');
    const totalCostElement = document.getElementById('totalCost');
    
    if (quantityInput && currentPriceElement && totalCostElement) {
        const quantity = parseInt(quantityInput.value) || 0;
        // Remove the dollar sign from the price before parsing
        const currentPrice = parseFloat(currentPriceElement.textContent.replace('$', '')) || 0;
        const totalCost = (quantity * currentPrice).toFixed(2);
        
        totalCostElement.textContent = totalCost;
    }
}

/**
 * Set up chart control elements
 * Sets event listeners for time range and indicator toggles
 */
function setupChartControls() {
    // Time range selector
    const timeRange = document.getElementById('timeRange');
    if (timeRange) {
        timeRange.addEventListener('change', async (e) => {
            currentRange = e.target.value;
            await updateChartData();
        });
    }

    // Indicator toggles
    const sma20Toggle = document.getElementById('sma20');
    const sma50Toggle = document.getElementById('sma50');
    const volumeToggle = document.getElementById('volume');

    // Toggle SMA20 visibility
    if (sma20Toggle) {
        sma20Toggle.addEventListener('change', (e) => {
            sma20Series.applyOptions({ visible: e.target.checked });
        });
    }

    // Toggle SMA50 visibility
    if (sma50Toggle) {
        sma50Toggle.addEventListener('change', (e) => {
            sma50Series.applyOptions({ visible: e.target.checked });
        });
    }

    // Toggle volume visibility
    if (volumeToggle) {
        volumeToggle.addEventListener('change', (e) => {
            volumeSeries.applyOptions({ visible: e.target.checked });
        });
    }
}

/**
 * Set up stock search functionality
 * Implements debounced search for stock symbols
 */
function setupSearchFunctionality() {
    const searchInput = document.getElementById('stockSearch');
    const searchResults = document.getElementById('searchResults');

    if (!searchInput || !searchResults) return;

    // Add input event listener with debounce
    searchInput.addEventListener('input', debounce(async (e) => {
        const query = e.target.value.trim();
        
        // Only search when query has at least 2 characters
        if (query.length < 2) {
            searchResults.style.display = 'none';
            return;
        }

        try {
            // Search for stock symbols
            const response = await fetch(`/api/stocks/search/${query}`);
            const results = await response.json();

            // Display search results
            if (results.length === 0) {
                searchResults.innerHTML = '<div class="search-result">No results found</div>';
            } else {
                // Generate HTML for each result
                searchResults.innerHTML = results.map(stock => `
                    <div class="search-result" onclick="selectStock('${stock.symbol}')">
                        <div class="stock-symbol">${stock.symbol}</div>
                        <div class="stock-name">${stock.name}</div>
                    </div>
                `).join('');
            }

            // Show results dropdown
            searchResults.style.display = 'block';
        } catch (error) {
            console.error('Search failed:', error);
        }
    }, 300)); // 300ms debounce delay

    // Hide search results when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.stock-search-container')) {
            searchResults.style.display = 'none';
        }
    });
}

/**
 * Handle stock selection from search results
 * @param {string} symbol - The selected stock symbol
 */
async function selectStock(symbol) {
    // Hide search results
    document.getElementById('searchResults').style.display = 'none';
    
    // Update search input with selected symbol
    document.getElementById('stockSearch').value = symbol;
    
    // Update chart with selected stock data
    await updateChartData(symbol);
}

/**
 * Update price information display
 * Shows current price, change, and volume
 * @param {Object} quote - Stock quote data
 */
function updatePriceInfo(quote) {
    if (!quote) return;

    // Update current price
    const currentPriceElement = document.getElementById('currentPrice');
    if (currentPriceElement) {
        // Update without the $ sign - it will be added in the HTML
        currentPriceElement.textContent = quote.price.toFixed(2);
    }

    // Update chart legend with price information
    const legend = document.getElementById('chartLegend');
    if (legend) {
        const changeClass = quote.change >= 0 ? 'positive' : 'negative';
        const changeSign = quote.change >= 0 ? '+' : '';

        legend.innerHTML = `
            <div class="legend-item">
                <span>Price: ${formatCurrency(quote.price)}</span>
            </div>
            <div class="legend-item ${changeClass}">
                <span>Change: ${changeSign}${formatCurrency(quote.change)} (${changeSign}${quote.changePercent.toFixed(2)}%)</span>
            </div>
            <div class="legend-item">
                <span>Volume: ${formatNumber(quote.volume)}</span>
            </div>
        `;
    }
}

/**
 * Format a number as currency (USD)
 * @param {number} value - Value to format
 * @returns {string} - Formatted currency string
 */
function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(value);
}

/**
 * Format a number with thousands separators
 * @param {number} value - Value to format
 * @returns {string} - Formatted number string
 */
function formatNumber(value) {
    return new Intl.NumberFormat('en-US').format(value);
}

/**
 * Debounce function to limit the rate of function execution
 * Prevents excessive API calls during rapid input
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} - Debounced function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Make key functions globally available
window.selectStock = selectStock;
window.updateTotalCost = updateTotalCost;
