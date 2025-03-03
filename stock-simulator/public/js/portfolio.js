/**
 * Portfolio Management Module
 * 
 * Handles user portfolio display, visualization, and interaction.
 * This module provides a comprehensive view of the user's current holdings,
 * including valuation, profit/loss calculations, and visual representations.
 */

// Module state
let portfolioData = null;     // Cached portfolio data
let portfolioPieChart = null; // Chart instance for portfolio visualization

/**
 * Initialize portfolio functionality
 * Called when the portfolio section is first loaded or activated
 */
function initializePortfolio() {
    // Load initial portfolio data
    updatePortfolioView();
}

/**
 * Update portfolio view with latest data
 * Fetches current portfolio data and updates UI components
 */
async function updatePortfolioView() {
    try {
        // Fetch portfolio summary from API
        const response = await fetch('/api/portfolio/summary', {
            credentials: 'include' // Include auth credentials
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch portfolio data');
        }
        
        // Parse and cache data
        const data = await response.json();
        portfolioData = data;
        
        // Update cash balance display in portfolio section
        const portfolioCashBalance = document.getElementById('portfolioCashBalance');
        if (portfolioCashBalance) {
            portfolioCashBalance.textContent = data.cash.toFixed(2);
        }
        
        // Update overall balance display across all sections
        updateBalanceDisplay(data);
        
        // Update portfolio holdings list
        updatePortfolioList(data.holdings);
        
        // Create or update portfolio pie chart
        createPortfolioPieChart(data.holdings);
        
        // Update recent transaction history
        updateTransactionHistory();
    } catch (error) {
        console.error('Portfolio update failed:', error);
    }
}

/**
 * Update the portfolio list display
 * Renders list of current stock holdings with details
 * @param {Array} holdings - Array of stock holdings data
 */
function updatePortfolioList(holdings) {
    const portfolioList = document.getElementById('portfolioList');
    if (!portfolioList) return;
    
    // Display empty state if no holdings
    if (holdings.length === 0) {
        portfolioList.innerHTML = '<div class="empty-portfolio">No holdings yet. Start trading!</div>';
    } else {
        // Generate HTML for each holding
        portfolioList.innerHTML = holdings.map(holding => `
            <div class="portfolio-item" onclick="viewStockInMarket('${holding.symbol}')">
                <div class="stock-info">
                    <h4>${holding.symbol}</h4>
                    <div>${holding.quantity} shares</div>
                </div>
                <div class="stock-values">
                    <div>
                        <div>Current: ${holding.currentPrice.toFixed(2)}</div>
                        <div>Avg: ${holding.averageCost.toFixed(2)}</div>
                    </div>
                    <div>
                        <div>Value: ${holding.totalValue.toFixed(2)}</div>
                        <div class="${holding.profit >= 0 ? 'positive' : 'negative'}">
                            ${holding.profit >= 0 ? '+' : ''}${holding.profit.toFixed(2)}
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }
}

/**
 * Create the portfolio pie chart
 * Visualizes portfolio allocation across different stocks
 * @param {Array} holdings - Array of stock holdings data
 */
function createPortfolioPieChart(holdings) {
    // Only proceed if we have holdings
    if (!holdings || holdings.length === 0) {
        const pieChartContainer = document.getElementById('portfolioPieChart');
        if (pieChartContainer) {
            pieChartContainer.innerHTML = '<div class="empty-chart">No holdings to display</div>';
        }
        return;
    }
    
    // Since LightweightCharts doesn't have native pie charts, we'll create one using HTML Canvas
    const pieChartContainer = document.getElementById('portfolioPieChart');
    if (!pieChartContainer) return;
    
    // Clear existing content
    pieChartContainer.innerHTML = '';
    
    // Create canvas element
    const canvas = document.createElement('canvas');
    canvas.width = pieChartContainer.clientWidth;
    canvas.height = 400;
    pieChartContainer.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 20; // Margin from edges
    
    // Calculate total portfolio value
    const totalValue = holdings.reduce((sum, holding) => sum + holding.totalValue, 0);
    
    // Define vibrant colors for the pie slices
    const colors = [
        '#2962FF', '#FF6D00', '#2E7D32', '#6A1B9A', '#C62828',
        '#00838F', '#EF6C00', '#4527A0', '#283593', '#00695C'
    ];
    
    // Start drawing the pie chart
    let startAngle = 0;
    const holdingData = [];
    
    holdings.forEach((holding, index) => {
        // Calculate slice size proportional to holding value
        const percentage = holding.totalValue / totalValue;
        const sliceAngle = percentage * 2 * Math.PI;
        
        // Draw pie slice
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
        ctx.closePath();
        
        // Fill with appropriate color
        const color = colors[index % colors.length];
        ctx.fillStyle = color;
        ctx.fill();
        
        // Save data for legend
        holdingData.push({
            symbol: holding.symbol,
            value: holding.totalValue.toFixed(2),
            percentage: (percentage * 100).toFixed(1),
            color: color
        });
        
        // Move to next slice
        startAngle += sliceAngle;
    });
    
    // Add center white circle for donut effect
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.6, 0, 2 * Math.PI);
    ctx.fillStyle = 'white';
    ctx.fill();
    
    // Add total value text in center
    ctx.font = 'bold 24px Inter';
    ctx.fillStyle = '#333';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${totalValue.toFixed(2)}`, centerX, centerY - 15);
    
    ctx.font = '16px Inter';
    ctx.fillText('Total Value', centerX, centerY + 15);
    
    // Create legend with holdings breakdown
    const legendContainer = document.getElementById('portfolioPieChartLegend');
    if (legendContainer) {
        legendContainer.innerHTML = holdingData.map(item => `
            <div class="legend-item">
                <span class="legend-color" style="background-color: ${item.color};"></span>
                <span>${item.symbol}: ${item.value} (${item.percentage}%)</span>
            </div>
        `).join('');
    }
}

/**
 * Redirect to market view for a specific stock
 * Allows users to quickly view and trade a stock from their portfolio
 * @param {string} symbol - Stock symbol to view
 */
function viewStockInMarket(symbol) {
    // Change to market tab
    const marketLink = document.querySelector('nav a[href="#market"]');
    if (marketLink) {
        // Update navigation UI
        document.querySelectorAll('nav a').forEach(l => l.classList.remove('active'));
        marketLink.classList.add('active');
        
        // Show market section and hide other sections
        document.querySelectorAll('.content-section').forEach(s => {
            s.style.display = 'none';
        });
        
        const marketSection = document.getElementById('market-section');
        if (marketSection) {
            marketSection.style.display = 'block';
        }
        
        // Update URL hash
        window.location.hash = 'market';
        
        // Update market view with the selected symbol
        // Short delay to ensure DOM updates complete
        setTimeout(() => {
            // Use existing market function if available
            if (typeof selectMarketStock === 'function') {
                selectMarketStock(symbol);
            } else if (typeof updateMarketChartData === 'function') {
                updateMarketChartData(symbol);
            }
        }, 100);
    }
}

// Make functions globally available
window.viewStockInMarket = viewStockInMarket;
