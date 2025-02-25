// Main application initialization
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

async function initializeApp() {
    // Setup navigation
    setupNavigation();
    
    // Check auth status first
    await checkAuthStatus();
    
    // Setup trade buttons
    const buyBtn = document.getElementById('buyBtn');
    const sellBtn = document.getElementById('sellBtn');
    
    if (buyBtn) buyBtn.addEventListener('click', () => executeTrade('buy'));
    if (sellBtn) sellBtn.addEventListener('click', () => executeTrade('sell'));
    
    // Setup quantity input to calculate total cost
    const quantityInput = document.getElementById('quantity');
    if (quantityInput) {
        quantityInput.addEventListener('input', updateTotalCost);
    }
    
    // Start auto-refresh for data
    startDataRefresh();
}

function setupNavigation() {
    const navLinks = document.querySelectorAll('nav a');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            // Handle navigation
            const section = link.getAttribute('href').substring(1);
            handleNavigation(section);
        });
    });
}

function handleNavigation(section) {
    // Hide all main content sections
    const sections = ['home', 'market', 'portfolio', 'history'];
    sections.forEach(s => {
        const element = document.getElementById(`${s}-section`);
        if (element) {
            element.style.display = 'none';
        }
    });
    
    // Show selected section
    const selectedSection = document.getElementById(`${section}-section`);
    if (selectedSection) {
        selectedSection.style.display = 'block';
    }
    
    // Update data based on section
    switch(section) {
        case 'home':
            updateChartData();
            updatePortfolioView();
            break;
        case 'market':
            // Additional market data updates
            break;
        case 'portfolio':
            updatePortfolioView();
            break;
        case 'history':
            updateTransactionHistory();
            break;
    }
}

// Handle auth state changes
async function handleAuthStateChange(isAuthenticated) {
    const authSection = document.getElementById('auth-section');
    const mainContent = document.getElementById('main-content');
    
    if (authSection && mainContent) {
        if (isAuthenticated) {
            try {
                // Clear any existing transaction history
                const transactionHistory = document.getElementById('transactionHistory');
                if (transactionHistory) {
                    transactionHistory.innerHTML = '';
                }
                
                // Fetch portfolio summary immediately after auth
                const response = await fetch('/api/portfolio/summary', {
                    credentials: 'include'
                });
                
                if (response.ok) {
                    const data = await response.json();
                    
                    // Update UI with balance
                    const cashBalance = document.getElementById('cashBalance');
                    const totalValue = document.getElementById('totalValue');
                    const profitLoss = document.getElementById('profitLoss');

                    if (cashBalance) cashBalance.textContent = data.cash.toFixed(2);
                    if (totalValue) totalValue.textContent = `$${data.totalValue.toFixed(2)}`;
                    if (profitLoss) profitLoss.textContent = `$${data.profit.toFixed(2)}`;
                }
                
                // Show main content
                authSection.style.display = 'none';
                mainContent.style.display = 'flex';
                
                // Initialize other components
                initializeChart();
                updatePortfolioView();
                // Fetch fresh transaction data for this user
                updateTransactionHistory();
            } catch (error) {
                console.error('Error fetching portfolio data:', error);
                showError('Failed to load portfolio data');
            }
        } else {
            authSection.style.display = 'flex';
            mainContent.style.display = 'none';
        }
    }
}

// Start auto-refresh for data
function startDataRefresh() {
    // Update chart data every minute
    setInterval(() => {
        const chart = document.getElementById('stockChart');
        if (chart && chart.style.display !== 'none') {
            updateChartData();
        }
    }, 60000);
    
    // Update portfolio data every 30 seconds
    setInterval(() => {
        if (document.getElementById('main-content').style.display !== 'none') {
            updatePortfolioView();
        }
    }, 30000);
}

// Update portfolio view
async function updatePortfolioView() {
    try {
        const response = await fetch('/api/portfolio/summary', {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch portfolio data');
        }
        
        const data = await response.json();
        
        // Update cash balance
        document.getElementById('cashBalance').textContent = data.cash.toFixed(2);
        
        // Update total value
        document.getElementById('totalValue').textContent = `$${data.totalValue.toFixed(2)}`;
        
        // Update profit/loss
        const profitLossElement = document.getElementById('profitLoss');
        const profit = data.profit;
        profitLossElement.textContent = `$${profit.toFixed(2)}`;
        profitLossElement.className = 'value ' + (profit >= 0 ? 'positive' : 'negative');
        
        // Update portfolio list
        const portfolioList = document.getElementById('portfolioList');
        if (portfolioList) {
            if (data.holdings.length === 0) {
                portfolioList.innerHTML = '<div class="empty-portfolio">No holdings yet. Start trading!</div>';
            } else {
                portfolioList.innerHTML = data.holdings.map(holding => `
                    <div class="portfolio-item" onclick="selectStock('${holding.symbol}')">
                        <div class="stock-info">
                            <h4>${holding.symbol}</h4>
                            <div>${holding.quantity} shares</div>
                        </div>
                        <div class="stock-values">
                            <div>
                                <div>Current: $${holding.currentPrice.toFixed(2)}</div>
                                <div>Avg: $${holding.averageCost.toFixed(2)}</div>
                            </div>
                            <div>
                                <div>Value: $${holding.totalValue.toFixed(2)}</div>
                                <div class="${holding.profit >= 0 ? 'positive' : 'negative'}">
                                    ${holding.profit >= 0 ? '+' : ''}$${holding.profit.toFixed(2)}
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('');
            }
        }
    } catch (error) {
        console.error('Portfolio update failed:', error);
    }
}

// Update transaction history
async function updateTransactionHistory() {
    try {
        console.log('Updating transaction history for current user...');
        
        const response = await fetch('/api/portfolio/transactions', {
            credentials: 'include',
            // Add cache-busting query parameter
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch transaction history');
        }
        
        const transactions = await response.json();
        console.log(`Received ${transactions.length} transactions for current user`);
        
        // Update transaction list
        const transactionHistory = document.getElementById('transactionHistory');
        if (transactionHistory) {
            // Clear existing transactions first
            transactionHistory.innerHTML = '';
            
            if (transactions.length === 0) {
                transactionHistory.innerHTML = '<div class="empty-transactions">No transactions yet.</div>';
            } else {
                transactionHistory.innerHTML = transactions.map(transaction => `
                    <div class="transaction-item">
                        <div>${new Date(transaction.date).toLocaleString()}</div>
                        <div>${transaction.symbol}</div>
                        <div class="${transaction.type === 'buy' ? 'positive' : 'negative'}">
                            ${transaction.type.toUpperCase()}
                        </div>
                        <div>${transaction.quantity}</div>
                        <div>$${transaction.price.toFixed(2)}</div>
                    </div>
                `).join('');
            }
        }
    } catch (error) {
        console.error('Transaction history update failed:', error);
    }
}

// Execute trade
async function executeTrade(type) {
    const symbol = document.getElementById('symbol').value;
    const quantity = parseInt(document.getElementById('quantity').value);
    
    if (!symbol || isNaN(quantity) || quantity <= 0) {
        showError('Please enter a valid symbol and quantity');
        return;
    }
    
    try {
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
            showSuccess(`Successfully ${type === 'buy' ? 'bought' : 'sold'} ${quantity} shares of ${symbol}`);
            updatePortfolioView();
            updateTransactionHistory();
            
            // Clear form
            document.getElementById('quantity').value = '';
            updateTotalCost();
        } else {
            showError(data.error || 'Trade failed');
        }
    } catch (error) {
        console.error('Trade execution failed:', error);
        showError('Trade execution failed');
    }
}

// Update total cost when quantity changes
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

// Error handling
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

// Success message
function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    
    document.body.appendChild(successDiv);
    
    setTimeout(() => {
        successDiv.remove();
    }, 3000);
}