/**
 * Transaction History Module
 * 
 * Responsible for displaying and visualizing user's trading history.
 * Creates interactive charts for activity analysis and provides filtering options.
 */

// Chart instances
let activityChart = null;   // Trading activity visualization
let compositionChart = null; // Portfolio composition over time
let transactionData = [];   // Cached transaction data

/**
 * Initialize the history page
 * Called when the history section is first loaded or activated
 */
function initializeHistoryPage() {
    // Fetch transaction data from the server
    fetchTransactionData();
    
    // Set up filter event listeners
    setupHistoryFilters();
}

/**
 * Fetch transaction history data from the API
 * Retrieves all user transactions for analysis
 */
async function fetchTransactionData() {
    try {
        const response = await fetch('/api/portfolio/transactions', {
            credentials: 'include',
            headers: {
                'Cache-Control': 'no-cache', // Prevent caching for latest data
                'Pragma': 'no-cache'
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch transaction history');
        }
        
        // Cache the transaction data for filtering
        transactionData = await response.json();
        
        // Update visualizations and table with data
        updateHistoryVisualizations();
        updateTransactionTable();
    } catch (error) {
        console.error('Failed to fetch transaction data:', error);
        showError('Failed to load transaction history');
    }
}

/**
 * Set up event listeners for history filter controls
 * Handles filtering by transaction type and date range
 */
function setupHistoryFilters() {
    const typeFilter = document.getElementById('historyFilterType');
    const dateFilter = document.getElementById('historyDateRange');
    
    // Add change listener for transaction type filter
    if (typeFilter) {
        typeFilter.addEventListener('change', () => {
            updateHistoryVisualizations();
            updateTransactionTable();
        });
    }
    
    // Add change listener for date range filter
    if (dateFilter) {
        dateFilter.addEventListener('change', () => {
            updateHistoryVisualizations();
            updateTransactionTable();
        });
    }
}

/**
 * Apply filters to transaction data
 * Filters by transaction type and date range
 * @returns {Array} Filtered transaction data
 */
function getFilteredTransactions() {
    if (!transactionData || !transactionData.length) {
        return [];
    }
    
    const typeFilter = document.getElementById('historyFilterType').value;
    const dateFilter = document.getElementById('historyDateRange').value;
    
    // Apply transaction type filter (buy/sell/all)
    let filtered = transactionData;
    if (typeFilter !== 'all') {
        filtered = filtered.filter(t => t.type === typeFilter);
    }
    
    // Apply date range filter
    if (dateFilter !== 'all') {
        const daysToInclude = parseInt(dateFilter);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToInclude);
        
        filtered = filtered.filter(t => new Date(t.date) >= cutoffDate);
    }
    
    return filtered;
}

/**
 * Update all history visualizations
 * Updates charts with filtered transaction data
 */
function updateHistoryVisualizations() {
    // Get filtered transactions
    const filteredTransactions = getFilteredTransactions();
    
    // Update trading activity chart
    updateActivityChart(filteredTransactions);
    
    // Update portfolio composition chart
    updateCompositionChart(filteredTransactions);
}

/**
 * Update trading activity chart
 * Visualizes buy/sell activity over time
 * @param {Array} transactions - Filtered transaction data
 */
function updateActivityChart(transactions) {
    const activityChartElement = document.getElementById('activityChart');
    if (!activityChartElement) return;
    
    // Clear existing chart
    activityChartElement.innerHTML = '';
    
    // Group transactions by date
    const transactionsByDate = groupTransactionsByDate(transactions);
    
    // Create chart
    activityChart = LightweightCharts.createChart(activityChartElement, {
        width: activityChartElement.clientWidth,
        height: 300,
        layout: {
            background: { color: '#ffffff' },
            textColor: '#333333',
        },
        grid: {
            vertLines: { color: '#f0f0f0' },
            horzLines: { color: '#f0f0f0' },
        },
        rightPriceScale: {
            borderColor: '#d1d4dc',
        },
        timeScale: {
            borderColor: '#d1d4dc',
            timeVisible: true,
        },
    });
    
    // Add histogram series for buy transactions (positive values)
    const buySeries = activityChart.addHistogramSeries({
        color: '#26a69a', // Green for buys
        priceFormat: {
            type: 'volume',
        },
        priceScaleId: 'right',
    });
    
    // Add histogram series for sell transactions (negative values)
    const sellSeries = activityChart.addHistogramSeries({
        color: '#ef5350', // Red for sells
        priceFormat: {
            type: 'volume',
        },
        priceScaleId: 'right',
    });
    
    // Prepare data for visualization
    const buyData = [];
    const sellData = [];
    
    // Process grouped data for the chart
    Object.keys(transactionsByDate).sort().forEach(date => {
        const timestamp = new Date(date).getTime() / 1000;
        
        // Count buys and sells
        const buys = transactionsByDate[date].filter(t => t.type === 'buy').length;
        const sells = transactionsByDate[date].filter(t => t.type === 'sell').length;
        
        // Add buy data point if there were buys
        if (buys > 0) {
            buyData.push({
                time: timestamp,
                value: buys
            });
        }
        
        // Add sell data point if there were sells (as negative for visualization)
        if (sells > 0) {
            sellData.push({
                time: timestamp,
                value: -sells // Negative values for sells
            });
        }
    });
    
    // Set data to the series
    buySeries.setData(buyData);
    sellSeries.setData(sellData);
    
    // Add legend below the chart for context
    document.getElementById('activityChart').insertAdjacentHTML('afterend', `
        <div class="chart-legend">
            <div class="legend-item">
                <span style="background-color: #26a69a;" class="legend-color"></span>
                <span>Buy Transactions</span>
            </div>
            <div class="legend-item">
                <span style="background-color: #ef5350;" class="legend-color"></span>
                <span>Sell Transactions</span>
            </div>
        </div>
    `);
    
    // Handle window resize for responsiveness
    window.addEventListener('resize', () => {
        if (activityChart) {
            activityChart.resize(
                activityChartElement.clientWidth,
                activityChartElement.clientHeight
            );
        }
    });
}

/**
 * Update portfolio composition chart
 * Shows change in portfolio value distribution over time
 * @param {Array} transactions - Filtered transaction data
 */
function updateCompositionChart(transactions) {
    const compositionChartElement = document.getElementById('compositionChart');
    if (!compositionChartElement) return;
    
    // Clear existing chart
    compositionChartElement.innerHTML = '';
    
    // Create chart
    compositionChart = LightweightCharts.createChart(compositionChartElement, {
        width: compositionChartElement.clientWidth,
        height: 300,
        layout: {
            background: { color: '#ffffff' },
            textColor: '#333333',
        },
        grid: {
            vertLines: { color: '#f0f0f0' },
            horzLines: { color: '#f0f0f0' },
        },
        rightPriceScale: {
            borderColor: '#d1d4dc',
        },
        timeScale: {
            borderColor: '#d1d4dc',
            timeVisible: true,
        },
    });
    
    // Group by symbol and calculate net transaction value
    const symbolTotals = {};
    
    // Process transactions to calculate cumulative values by symbol
    transactions.forEach(transaction => {
        const symbol = transaction.symbol;
        const amount = transaction.price * transaction.quantity * (transaction.type === 'buy' ? 1 : -1);
        
        if (!symbolTotals[symbol]) {
            symbolTotals[symbol] = { totalAmount: 0, transactions: [] };
        }
        
        symbolTotals[symbol].totalAmount += amount;
        symbolTotals[symbol].transactions.push(transaction);
    });
    
    // Get top symbols by total transaction value
    const topSymbols = Object.keys(symbolTotals)
        .map(symbol => ({ 
            symbol, 
            totalAmount: Math.abs(symbolTotals[symbol].totalAmount),
            transactions: symbolTotals[symbol].transactions 
        }))
        .sort((a, b) => b.totalAmount - a.totalAmount)
        .slice(0, 5); // Only show top 5 for clarity
    
    // Generate consistent colors for each symbol
    const colors = [
        '#2962FF', '#FF6D00', '#2E7D32', '#6A1B9A', '#C62828',
        '#00838F', '#EF6C00', '#4527A0', '#283593', '#00695C'
    ];
    
    // Add a line series for each symbol
    topSymbols.forEach((item, index) => {
        const series = compositionChart.addLineSeries({
            color: colors[index % colors.length],
            lineWidth: 2,
            title: item.symbol,
        });
        
        // Sort transactions by date
        const sortedTransactions = item.transactions.sort((a, b) => 
            new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        
        // Calculate cumulative values for line chart
        let cumulative = 0;
        const data = sortedTransactions.map(t => {
            const value = t.price * t.quantity * (t.type === 'buy' ? 1 : -1);
            cumulative += value;
            return {
                time: new Date(t.date).getTime() / 1000,
                value: cumulative
            };
        });
        
        series.setData(data);
    });
    
    // Add legend for each symbol
    let legendHTML = '<div class="chart-legend">';
    topSymbols.forEach((item, index) => {
        legendHTML += `
            <div class="legend-item">
                <span style="background-color: ${colors[index % colors.length]};" class="legend-color"></span>
                <span>${item.symbol}</span>
            </div>
        `;
    });
    legendHTML += '</div>';
    
    document.getElementById('compositionChart').insertAdjacentHTML('afterend', legendHTML);
    
    // Handle window resize for responsiveness
    window.addEventListener('resize', () => {
        if (compositionChart) {
            compositionChart.resize(
                compositionChartElement.clientWidth,
                compositionChartElement.clientHeight
            );
        }
    });
}

/**
 * Update transaction table with filtered data
 * Shows detailed transaction information in a user-friendly table format
 */
function updateTransactionTable() {
    const transactions = getFilteredTransactions();
    const tableContainer = document.getElementById('fullTransactionHistory');
    
    if (!tableContainer) return;
    
    // Show empty state if no transactions match filters
    if (transactions.length === 0) {
        tableContainer.innerHTML = '<div class="empty-transactions">No transactions match the selected filters.</div>';
        return;
    }
    
    // Generate transaction rows with all transaction details
    tableContainer.innerHTML = transactions.map(transaction => {
        const total = transaction.price * transaction.quantity;
        return `
            <div class="transaction-item">
                <div>${new Date(transaction.date).toLocaleString()}</div>
                <div>${transaction.symbol}</div>
                <div class="${transaction.type === 'buy' ? 'positive' : 'negative'}">
                    ${transaction.type.toUpperCase()}
                </div>
                <div>${transaction.quantity}</div>
                <div>${transaction.price.toFixed(2)}</div>
                <div>${total.toFixed(2)}</div>
            </div>
        `;
    }).join('');
}

/**
 * Group transactions by date
 * Used for aggregating activity by day for the activity chart
 * @param {Array} transactions - Transaction data
 * @returns {Object} Transactions grouped by date
 */
function groupTransactionsByDate(transactions) {
    const groups = {};
    
    transactions.forEach(transaction => {
        // Extract the date part only (YYYY-MM-DD) for grouping
        const date = new Date(transaction.date).toISOString().split('T')[0];
        
        if (!groups[date]) {
            groups[date] = [];
        }
        
        groups[date].push(transaction);
    });
    
    return groups;
}

/**
 * Display error message
 * Creates a temporary notification for error feedback
 * @param {string} message - Error message to display
 */
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    
    document.body.appendChild(errorDiv);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

/**
 * Update transaction table with filtered data
 * Shows detailed transaction information in a table
 */
function updateTransactionTable() {
    const transactions = getFilteredTransactions();
    const tableContainer = document.getElementById('fullTransactionHistory');
    
    if (!tableContainer) return;
    
    // Show empty state if no transactions match filters
    if (transactions.length === 0) {
        tableContainer.innerHTML = '<div class="empty-transactions">No transactions match the selected filters.</div>';
        return;
    }
    
    // Generate transaction rows
    tableContainer.innerHTML = transactions.map(transaction => {
        const total = transaction.price * transaction.quantity;
        return `
            <div class="transaction-item">
                <div>${new Date(transaction.date).toLocaleString()}</div>
                <div>${transaction.symbol}</div>
                <div class="${transaction.type === 'buy' ? 'positive' : 'negative'}">
                    ${transaction.type.toUpperCase()}
                </div>
                <div>${transaction.quantity}</div>
                <div>$${transaction.price.toFixed(2)}</div>
                <div>$${total.toFixed(2)}</div>
            </div>
        `;
    }).join('');
}

/**
 * Group transactions by date
 * Used for aggregating activity by day
 * @param {Array} transactions - Transaction data
 * @returns {Object} Transactions grouped by date
 */
function groupTransactionsByDate(transactions) {
    const groups = {};
    
    transactions.forEach(transaction => {
        // Extract the date part only (YYYY-MM-DD)
        const date = new Date(transaction.date).toISOString().split('T')[0];
        
        if (!groups[date]) {
            groups[date] = [];
        }
        
        groups[date].push(transaction);
    });
    
    return groups;
}

/**
 * Display error message
 * @param {string} message - Error message to display
 */
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    
    document.body.appendChild(errorDiv);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}