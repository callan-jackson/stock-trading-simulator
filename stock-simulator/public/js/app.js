/**
 * Main Application Controller
 * 
 * This script handles initialization, navigation, and shared functionality
 * across the application. It orchestrates the interaction between different
 * modules and maintains application state.
 */

// Initialize the application when DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

/**
 * Main application initialization function
 * Sets up navigation, checks authentication, and starts data refresh
 */
async function initializeApp() {
    // Setup navigation handlers
    setupNavigation();
    
    // Check authentication status before proceeding
    await checkAuthStatus();
    
    // Start automatic data refresh for all sections
    startDataRefresh();
}

/**
 * Set up navigation event handlers
 * Handles tab switching and URL hash-based routing
 */
function setupNavigation() {
    const navLinks = document.querySelectorAll('nav a');
    navLinks.forEach(link => {
        // Skip logout button as it has special handling
        if (link.id === 'logout-btn') return;
        
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Update active navigation state
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            // Extract section ID from href attribute (removing the # symbol)
            const sectionId = link.getAttribute('href').substring(1);
            handleNavigation(sectionId);
        });
    });
    
    // Check if URL already has a hash and navigate to that section
    if (window.location.hash) {
        const sectionId = window.location.hash.substring(1);
        const navLink = document.querySelector(`nav a[href="#${sectionId}"]`);
        if (navLink) {
            navLinks.forEach(l => l.classList.remove('active'));
            navLink.classList.add('active');
            handleNavigation(sectionId);
        }
    } else {
        // Default to home section if no hash is present
        handleNavigation('home');
    }
}

/**
 * Navigate to a specific section/page of the application
 * @param {string} section - The ID of the section to display
 */
function handleNavigation(section) {
    // Hide all content sections
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(s => {
        s.style.display = 'none';
    });
    
    // Show selected section
    const selectedSection = document.getElementById(`${section}-section`);
    if (selectedSection) {
        selectedSection.style.display = 'block';
        
        // Update URL hash for bookmarking and back-button support
        window.location.hash = section;
        
        // Update content based on section
        updateSectionContent(section);
    }
}

/**
 * Update content for a specific section
 * Calls the appropriate initialization function for each section
 * @param {string} section - The ID of the section to update
 */
function updateSectionContent(section) {
    switch(section) {
        case 'home':
            updateHomeData();
            break;
        case 'market':
            // Check if the function exists before calling
            if (typeof initializeMarketPage === 'function') {
                initializeMarketPage();
            }
            break;
        case 'portfolio':
            if (typeof initializePortfolio === 'function') {
                initializePortfolio();
            } else {
                // Fallback to basic portfolio update if full init isn't available
                updatePortfolioView();
            }
            break;
        case 'history':
            if (typeof initializeHistoryPage === 'function') {
                initializeHistoryPage();
            }
            break;
    }
}

/**
 * Handle authentication state changes
 * Updates UI based on whether user is authenticated
 * @param {boolean} isAuthenticated - Whether the user is logged in
 */
async function handleAuthStateChange(isAuthenticated) {
    const authSection = document.getElementById('auth-section');
    const mainContent = document.getElementById('main-content');
    
    if (authSection && mainContent) {
        if (isAuthenticated) {
            try {
                // Clear any existing transaction history for security
                const transactionHistory = document.getElementById('transactionHistory');
                if (transactionHistory) {
                    transactionHistory.innerHTML = '';
                }
                
                // Fetch portfolio summary immediately after authentication
                const response = await fetch('/api/portfolio/summary', {
                    credentials: 'include' // Include cookies for authentication
                });
                
                if (response.ok) {
                    const data = await response.json();
                    
                    // Update UI with user's balance information
                    updateBalanceDisplay(data);
                }
                
                // Show main application content
                authSection.style.display = 'none';
                mainContent.style.display = 'flex';
                
                // Check if URL has a hash and navigate to that section
                const sectionId = window.location.hash ? window.location.hash.substring(1) : 'home';
                handleNavigation(sectionId);
                
                // Check if user is newly registered to launch tutorial
                const isNewlyRegistered = sessionStorage.getItem('newlyRegistered') === 'true';
                if (isNewlyRegistered && typeof window.startTutorial === 'function') {
                    // Tutorial will auto-start via the tutorial.js initialization
                    console.log('New user detected, tutorial will start automatically');
                }
                
            } catch (error) {
                console.error('Error fetching portfolio data:', error);
                showError('Failed to load portfolio data');
            }
        } else {
            // Show authentication forms when not authenticated
            authSection.style.display = 'flex';
            mainContent.style.display = 'none';
        }
    }
}

/**
 * Update balance display across all sections
 * @param {Object} data - Portfolio data containing cash, totalValue, and profit
 */
function updateBalanceDisplay(data) {
    const cashBalance = document.getElementById('cashBalance');
    const totalValue = document.getElementById('totalValue');
    const profitLoss = document.getElementById('profitLoss');
    const homeTotalValue = document.getElementById('homeTotalValue');
    const homeProfitLoss = document.getElementById('homeProfitLoss');

    // Update cash balance
    if (cashBalance) cashBalance.textContent = data.cash.toFixed(2);
    
    // Update portfolio page metrics
    if (totalValue) totalValue.textContent = `$${data.totalValue.toFixed(2)}`;
    if (profitLoss) {
        profitLoss.textContent = `$${data.profit.toFixed(2)}`;
        profitLoss.className = 'value ' + (data.profit >= 0 ? 'positive' : 'negative');
    }
    
    // Update home page metrics
    if (homeTotalValue) homeTotalValue.textContent = `$${data.totalValue.toFixed(2)}`;
    if (homeProfitLoss) {
        homeProfitLoss.textContent = `$${data.profit.toFixed(2)}`;
        homeProfitLoss.className = 'value ' + (data.profit >= 0 ? 'positive' : 'negative');
    }
}

/**
 * Update home section data from the API
 */
async function updateHomeData() {
    try {
        const response = await fetch('/api/portfolio/summary', {
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            updateBalanceDisplay(data);
        }
    } catch (error) {
        console.error('Error updating home data:', error);
    }
}

/**
 * Start automatic data refresh for active section
 * Refreshes data every minute based on which section is active
 */
function startDataRefresh() {
    // Update data every minute based on active section
    setInterval(() => {
        const activeSection = window.location.hash.substring(1) || 'home';
        updateSectionContent(activeSection);
    }, 60000); // 60000ms = 1 minute
}

/**
 * Update portfolio view with current data
 * Fetches latest portfolio data and updates UI elements
 */
async function updatePortfolioView() {
    try {
        const response = await fetch('/api/portfolio/summary', {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch portfolio data');
        }
        
        const data = await response.json();
        
        // Update balance display across all sections
        updateBalanceDisplay(data);
        
        // Update portfolioCashBalance in portfolio section
        const portfolioCashBalance = document.getElementById('portfolioCashBalance');
        if (portfolioCashBalance) {
            portfolioCashBalance.textContent = data.cash.toFixed(2);
        }
        
        // Update portfolio list with current holdings
        const portfolioList = document.getElementById('portfolioList');
        if (portfolioList) {
            if (data.holdings.length === 0) {
                portfolioList.innerHTML = '<div class="empty-portfolio">No holdings yet. Start trading!</div>';
            } else {
                // Generate HTML for each holding
                portfolioList.innerHTML = data.holdings.map(holding => `
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
        
        // Check if we need to create/update the pie chart
        if (typeof createPortfolioPieChart === 'function') {
            createPortfolioPieChart(data.holdings);
        }
        
        // Update transaction history in portfolio section
        updateTransactionHistory();
    } catch (error) {
        console.error('Portfolio update failed:', error);
    }
}

/**
 * Update transaction history display
 * Fetches recent transactions and updates the UI
 */
async function updateTransactionHistory() {
    try {
        const response = await fetch('/api/portfolio/transactions', {
            credentials: 'include',
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch transaction history');
        }
        
        const transactions = await response.json();
        
        // Update transaction list in portfolio section
        const transactionHistory = document.getElementById('transactionHistory');
        if (transactionHistory) {
            transactionHistory.innerHTML = '';
            
            if (transactions.length === 0) {
                transactionHistory.innerHTML = '<div class="empty-transactions">No transactions yet.</div>';
            } else {
                // Show the most recent 10 transactions
                const recentTransactions = transactions.slice(0, 10);
                transactionHistory.innerHTML = recentTransactions.map(transaction => `
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

/**
 * Display an error message to the user
 * Creates a temporary notification that fades after 5 seconds
 * @param {string} message - The error message to display
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
 * Display a success message to the user
 * Creates a temporary notification that fades after 3 seconds
 * @param {string} message - The success message to display
 */
function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    
    document.body.appendChild(successDiv);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        successDiv.remove();
    }, 3000);
}
