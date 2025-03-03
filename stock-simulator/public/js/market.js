/**
 * Market Research Module
 * 
 * Handles the stock market research functionality, including:
 * - Stock chart visualization
 * - Stock search and selection
 * - Real-time price data
 * - Trading interface for buying and selling stocks
 */

// Chart instances and state variables
let marketChart = null;
let marketCandleSeries = null;
let marketVolumeSeries = null;
let marketSma20Series = null;
let marketSma50Series = null;
let marketCurrentSymbol = 'AAPL';  // Default stock symbol
let marketCurrentRange = '6mo';    // Default time range

/**
 * Initialize the market page
 * Called when the market section is first loaded or activated
 */
function initializeMarketPage() {
    // Initialize market chart if not already initialized
    if (!marketChart) {
        initializeMarketChart();
    } else {
        // If chart exists, just update data
        updateMarketChartData();
    }
    
    // Setup market trade form
    setupMarketTradeForm();
    
    // Setup market search functionality
    setupMarketSearchFunctionality();
}

/**
 * Initialize the stock chart with default settings
 * Creates candlestick, volume, and indicator series
 */
function initializeMarketChart() {
    const chartContainer = document.getElementById('marketStockChart');
    if (!chartContainer) return;

    // Clear existing chart
    chartContainer.innerHTML = '';

    // Create new chart instance
    marketChart = LightweightCharts.createChart(chartContainer, {
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
    marketCandleSeries = marketChart.addCandlestickSeries({
        upColor: '#26a69a',       // Green for price increases
        downColor: '#ef5350',     // Red for price decreases
        borderVisible: false,
        wickUpColor: '#26a69a',   // Wick color for up candles
        wickDownColor: '#ef5350', // Wick color for down candles
    });

    // Add volume series at the bottom of the chart
    marketVolumeSeries = marketChart.addHistogramSeries({
        color: '#26a69a',
        priceFormat: {
            type: 'volume',
        },
        priceScaleId: '',  // Use a separate price scale
        scaleMargins: {
            top: 0.8,  // Position in bottom 20% of chart
            bottom: 0,
        },
    });

    // Add SMA 20 technical indicator series
    marketSma20Series = marketChart.addLineSeries({
        color: '#2962FF',  // Blue
        lineWidth: 1,
        title: 'SMA 20',
    });

    // Add SMA 50 technical indicator series
    marketSma50Series = marketChart.addLineSeries({
        color: '#FF6D00',  // Orange
        lineWidth: 1,
        title: 'SMA 50',
    });

    // Setup chart controls and event listeners
    setupMarketChartControls();
    
    // Load initial stock data
    updateMarketChartData();

    // Handle window resize to make chart responsive
    window.addEventListener('resize', () => {
        if (marketChart) {
            marketChart.resize(
                chartContainer.clientWidth,
                chartContainer.clientHeight
            );
        }
    });
}

/**
 * Update chart data for a specific stock symbol
 * Fetches historical price data and technical indicators
 * @param {string} symbol - Stock ticker symbol (default: marketCurrentSymbol)
 */
async function updateMarketChartData(symbol = marketCurrentSymbol) {
    try {
        // Update current symbol
        marketCurrentSymbol = symbol;
        
        // Update symbol display in UI
        document.getElementById('marketCurrentSymbol').textContent = symbol;
        document.getElementById('marketSymbol').value = symbol;
        
        // Fetch stock data from API
        const response = await fetch(`/api/stocks/${symbol}?range=${marketCurrentRange}`);
        const data = await response.json();

        // Validate data
        if (!data.history || !data.history.length) {
            console.error('No historical data received');
            return;
        }

        // Prepare candlestick data
        const candleData = data.history.map(item => ({
            time: new Date(item.date).getTime() / 1000, // Convert to UNIX timestamp
            open: item.open,
            high: item.high,
            low: item.low,
            close: item.close,
        }));

        // Update candlestick series with new data
        marketCandleSeries.setData(candleData);

        // Prepare and update volume data
        const volumeData = data.history.map(item => ({
            time: new Date(item.date).getTime() / 1000,
            value: item.volume,
            // Color volume bars based on price direction
            color: item.close >= item.open ? '#26a69a80' : '#ef535080',
        }));
        marketVolumeSeries.setData(volumeData);

        // Update technical indicators if available
        if (data.technical) {
            const timestamps = candleData.map(d => d.time);
            
            // Update SMA 20 indicator
            if (data.technical.sma20) {
                const sma20Data = data.technical.sma20.map((value, index) => ({
                    time: timestamps[index],
                    value: value,
                }));
                marketSma20Series.setData(sma20Data);
            }

            // Update SMA 50 indicator
            if (data.technical.sma50) {
                const sma50Data = data.technical.sma50.map((value, index) => ({
                    time: timestamps[index],
                    value: value,
                }));
                marketSma50Series.setData(sma50Data);
            }
        }

        // Update price info display
        updateMarketPriceInfo(data.quote);
        
        // Fetch and display company information
        fetchCompanyInfo(symbol);
        
    } catch (error) {
        console.error('Failed to fetch market chart data:', error);
    }
}

/**
 * Set up chart control elements
 * Handles timeframe selection and indicator toggles
 */
function setupMarketChartControls() {
    // Time range selector
    const timeRange = document.getElementById('marketTimeRange');
    if (timeRange) {
        timeRange.addEventListener('change', async (e) => {
            marketCurrentRange = e.target.value;
            await updateMarketChartData();
        });
    }

    // Technical indicator toggle controls
    const sma20Toggle = document.getElementById('marketSma20');
    const sma50Toggle = document.getElementById('marketSma50');
    const volumeToggle = document.getElementById('marketVolume');

    // Toggle SMA 20 visibility
    if (sma20Toggle) {
        sma20Toggle.addEventListener('change', (e) => {
            marketSma20Series.applyOptions({ visible: e.target.checked });
        });
    }

    // Toggle SMA 50 visibility
    if (sma50Toggle) {
        sma50Toggle.addEventListener('change', (e) => {
            marketSma50Series.applyOptions({ visible: e.target.checked });
        });
    }

    // Toggle volume visibility
    if (volumeToggle) {
        volumeToggle.addEventListener('change', (e) => {
            marketVolumeSeries.applyOptions({ visible: e.target.checked });
        });
    }
}

/**
 * Set up stock search functionality
 * Handles stock symbol lookup and selection
 */
function setupMarketSearchFunctionality() {
    const searchInput = document.getElementById('marketStockSearch');
    const searchResults = document.getElementById('marketSearchResults');

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
            // Call search API
            const response = await fetch(`/api/stocks/search/${query}`);
            const results = await response.json();

            // Display search results
            if (results.length === 0) {
                searchResults.innerHTML = '<div class="search-result">No results found</div>';
            } else {
                // Generate HTML for each result
                searchResults.innerHTML = results.map(stock => `
                    <div class="search-result" onclick="selectMarketStock('${stock.symbol}')">
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
function selectMarketStock(symbol) {
    // Hide search results
    document.getElementById('marketSearchResults').style.display = 'none';
    // Update search input with selected symbol
    document.getElementById('marketStockSearch').value = symbol;
    // Update chart with the selected stock
    updateMarketChartData(symbol);
}

/**
 * Update price information display
 * Shows current price, change, and market data
 * @param {Object} quote - Stock quote data
 */
function updateMarketPriceInfo(quote) {
    if (!quote) return;

    // Update current price
    const currentPriceElement = document.getElementById('marketCurrentPrice');
    if (currentPriceElement) {
        currentPriceElement.textContent = quote.price.toFixed(2);
    }

    // Update chart legend with price information
    const legend = document.getElementById('marketChartLegend');
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
            <div class="legend-item">
                <span>High: ${formatCurrency(quote.high)}</span>
            </div>
            <div class="legend-item">
                <span>Low: ${formatCurrency(quote.low)}</span>
            </div>
        `;
    }
    
    // Update total cost calculation for trade form
    updateMarketTotalCost();
}

/**
 * Fetch company information for display
 * @param {string} symbol - Stock symbol to fetch information for
 */
async function fetchCompanyInfo(symbol) {
    try {
        // This is a placeholder function - in a real implementation, 
        // you'd fetch company information from your backend or a third-party API
        const stockInfoContent = document.getElementById('stockInfoContent');
        
        if (stockInfoContent) {
            // Show loading state
            stockInfoContent.innerHTML = `
                <div class="stock-info-header">
                    <h4>${symbol}</h4>
                    <p>Loading company information...</p>
                </div>
            `;
            
            // Simulate a fetch delay (would be a real API call in production)
            setTimeout(() => {
                // Display company information (sample data for demonstration)
                stockInfoContent.innerHTML = `
                    <div class="stock-info-header">
                        <h4>${symbol}</h4>
                        <p>Sample company information for ${symbol}.</p>
                    </div>
                    <div class="stock-info-details">
                        <div class="info-row">
                            <span>Sector:</span>
                            <span>Technology</span>
                        </div>
                        <div class="info-row">
                            <span>Industry:</span>
                            <span>Consumer Electronics</span>
                        </div>
                        <div class="info-row">
                            <span>Market Cap:</span>
                            <span>$2.85T</span>
                        </div>
                        <div class="info-row">
                            <span>P/E Ratio:</span>
                            <span>31.25</span>
                        </div>
                        <div class="info-row">
                            <span>Dividend Yield:</span>
                            <span>0.53%</span>
                        </div>
                    </div>
                `;
            }, 1000);
        }
    } catch (error) {
        console.error('Failed to fetch company info:', error);
    }
}

/**
 * Set up trading form event handlers
 * Handles buy/sell buttons and quantity input
 */
function setupMarketTradeForm() {
    // Buy/Sell buttons
    const buyBtn = document.getElementById('marketBuyBtn');
    const sellBtn = document.getElementById('marketSellBtn');
    
    // Set up buy button
    if (buyBtn) {
        buyBtn.addEventListener('click', () => executeMarketTrade('buy'));
    }
    
    // Set up sell button
    if (sellBtn) {
        sellBtn.addEventListener('click', () => executeMarketTrade('sell'));
    }
    
    // Setup quantity input to calculate total cost in real-time
    const quantityInput = document.getElementById('marketQuantity');
    if (quantityInput) {
        quantityInput.addEventListener('input', updateMarketTotalCost);
    }
}

/**
 * Calculate and update total cost based on quantity and price
 */
function updateMarketTotalCost() {
    const quantityInput = document.getElementById('marketQuantity');
    const currentPriceElement = document.getElementById('marketCurrentPrice');
    const totalCostElement = document.getElementById('marketTotalCost');
    
    if (quantityInput && currentPriceElement && totalCostElement) {
        const quantity = parseInt(quantityInput.value) || 0;
        const currentPrice = parseFloat(currentPriceElement.textContent) || 0;
        const totalCost = (quantity * currentPrice).toFixed(2);
        
        totalCostElement.textContent = totalCost;
    }
}

/**
 * Execute a stock trade (buy or sell)
 * @param {string} type - Trade type ('buy' or 'sell')
 */
async function executeMarketTrade(type) {
    const symbol = document.getElementById('marketSymbol').value;
    const quantity = parseInt(document.getElementById('marketQuantity').value);
    
    // Validate inputs
    if (!symbol || isNaN(quantity) || quantity <= 0) {
        showError('Please enter a valid symbol and quantity');
        return;
    }
    
    try {
        // Send trade request to API
        const response = await fetch('/api/portfolio/trade', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ symbol, quantity, type }),
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Show success message
            showSuccess(`Successfully ${type === 'buy' ? 'bought' : 'sold'} ${quantity} shares of ${symbol}`);
            
            // Clear form
            document.getElementById('marketQuantity').value = '';
            updateMarketTotalCost();
            
            // Refresh portfolio data to reflect the new trade
            fetch('/api/portfolio/summary', { credentials: 'include' })
                .then(response => response.json())
                .then(data => {
                    updateBalanceDisplay(data);
                })
                .catch(error => {
                    console.error('Error refreshing portfolio data:', error);
                });
        } else {
            showError(data.error || 'Trade failed');
        }
    } catch (error) {
        console.error('Trade execution failed:', error);
        showError('Trade execution failed');
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
window.selectMarketStock = selectMarketStock;