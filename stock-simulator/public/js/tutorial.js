/**
 * Interactive Tutorial System
 * 
 * Provides a guided onboarding experience for new users.
 * This module creates an interactive, step-by-step overlay that
 * helps users learn how to use the application by highlighting
 * key elements and providing context-sensitive explanations.
 */

// State variables
let currentTutorialStep = 0;  // Current step index
let tutorialActive = false;   // Whether tutorial is currently running
let tutorialSteps = [];       // Step definitions

/**
 * Initialize the tutorial system
 * Sets up event listeners and checks for new user status
 */
function initializeTutorial() {
    // Check if the user has already completed the tutorial
    const tutorialCompleted = localStorage.getItem('tutorialCompleted');
    
    // Register event listener for navigation during tutorial
    document.querySelectorAll('nav a').forEach(link => {
        if (link.id !== 'restart-tutorial') {
            link.addEventListener('click', handleTutorialNavigation);
        }
    });
    
    // Add event listener for manual tutorial restart button
    const restartButton = document.getElementById('restart-tutorial');
    if (restartButton) {
        restartButton.addEventListener('click', (e) => {
            e.preventDefault();
            // Clear the completed flag to force tutorial to show
            localStorage.removeItem('tutorialCompleted');
            // Start tutorial
            startTutorial();
        });
    }
    
    // Check if this is a new registration
    const isNewRegistration = sessionStorage.getItem('newlyRegistered');
    if (isNewRegistration === 'true' && tutorialCompleted !== 'true') {
        // Clear the flag
        sessionStorage.removeItem('newlyRegistered');
        
        // Start tutorial after a short delay to allow the UI to load
        setTimeout(() => {
            startTutorial();
        }, 1000);
    }
    
    // Debug: Add manual trigger for testing in console
    window.startTutorialManually = startTutorial;
}

/**
 * Define all tutorial steps for each page
 * Each step includes title, content, target element, and position
 */
function defineTutorialSteps() {
    tutorialSteps = [
        // Welcome step
        {
            title: "Welcome to Stock Sim!",
            content: "Let's take a quick tour to help you get started. Click 'Next' to continue or 'Skip' to exit the tutorial at any time.",
            element: ".logo",
            position: "right",
            page: "home"
        },
        // Home page steps
        {
            title: "Navigation",
            content: "Use these links to navigate between different sections of the app.",
            element: "nav",
            position: "far-right", // Special position for navigation
            page: "home"
        },
        {
            title: "Cash Balance",
            content: "This shows your available cash for trading stocks.",
            element: ".cash-balance",
            position: "far-bottom", // Special position for cash balance
            page: "home"
        },
        {
            title: "Features Overview",
            content: "These cards explain the key features of Stock Sim.",
            element: ".feature-grid",
            position: "top",
            page: "home"
        },
        {
            title: "Portfolio Summary",
            content: "View your portfolio's total value and profit/loss at a glance.",
            element: ".metrics-summary",
            position: "top",
            page: "home"
        },
        
        // Market page steps
        {
            title: "Market Research",
            content: "This is where you can research stocks and execute trades.",
            element: "#market-section h1",
            position: "bottom",
            page: "market"
        },
        {
            title: "Stock Search",
            content: "Search for any stock by name or ticker symbol.",
            element: "#marketStockSearch",
            position: "bottom",
            page: "market"
        },
        {
            title: "Stock Chart",
            content: "View detailed price charts with technical indicators to inform your trading decisions.",
            element: "#marketStockChart",
            position: "top",
            page: "market"
        },
        {
            title: "Trade Stocks",
            content: "Buy or sell stocks by entering a symbol and quantity here.",
            element: ".trade-box",
            position: "left",
            page: "market"
        },
        
        // Portfolio page steps
        {
            title: "Portfolio Overview",
            content: "Track your portfolio's performance, including total value and profit/loss.",
            element: ".metrics",
            position: "bottom",
            page: "portfolio"
        },
        {
            title: "Portfolio Composition",
            content: "This pie chart shows how your investments are distributed across different stocks.",
            element: "#portfolioPieChart",
            position: "top",
            page: "portfolio"
        },
        {
            title: "Your Holdings",
            content: "View details of all stocks you currently own. Click on any holding to view it in the Market page.",
            element: ".portfolio-list",
            position: "left",
            page: "portfolio"
        },
        {
            title: "Recent Transactions",
            content: "Review your most recent buy and sell transactions.",
            element: ".transaction-history",
            position: "top",
            page: "portfolio"
        },
        
        // History page steps
        {
            title: "Transaction History",
            content: "Analyze your trading activity over time.",
            element: "#history-section h1",
            position: "bottom",
            page: "history"
        },
        {
            title: "History Filters",
            content: "Filter your transaction history by type and date range.",
            element: ".history-filters",
            position: "bottom",
            page: "history"
        },
        {
            title: "Trading Activity Chart",
            content: "Visualize your trading activity over time with this chart.",
            element: "#activityChart",
            position: "top",
            page: "history"
        },
        {
            title: "Portfolio Composition Chart",
            content: "See how your investments have evolved over time.",
            element: "#compositionChart",
            position: "top",
            page: "history"
        },
        
        // Final step
        {
            title: "You're All Set!",
            content: "You've completed the tutorial. Happy trading! Remember you start with $10,000 in virtual cash.",
            element: ".logo",
            position: "right",
            page: "home"
        }
    ];
}

/**
 * Start the tutorial sequence
 * Creates overlay and shows first step
 */
function startTutorial() {
    // Define all tutorial steps
    defineTutorialSteps();
    
    // Create the tutorial overlay elements
    createTutorialOverlay();
    
    // Reset to first step
    currentTutorialStep = 0;
    tutorialActive = true;
    
    // Navigate to the first step's page and show the step
    navigateToStepPage(currentTutorialStep);
}

/**
 * Create the tutorial overlay DOM elements
 * Sets up the visual components for the tutorial
 */
function createTutorialOverlay() {
    // Remove existing overlay if any
    const existingOverlay = document.getElementById('tutorial-overlay');
    if (existingOverlay) {
        existingOverlay.remove();
    }
    
    // Create overlay container
    const overlay = document.createElement('div');
    overlay.id = 'tutorial-overlay';
    
    // Create semi-transparent backdrop
    const backdrop = document.createElement('div');
    backdrop.id = 'tutorial-backdrop';
    
    // Create tutorial box for instructions
    const tutorialBox = document.createElement('div');
    tutorialBox.id = 'tutorial-box';
    
    // Create directional arrow element
    const arrow = document.createElement('div');
    arrow.id = 'tutorial-arrow';
    
    // Create highlight element to focus on target
    const highlight = document.createElement('div');
    highlight.id = 'tutorial-highlight';
    
    // Create title element
    const title = document.createElement('h3');
    title.id = 'tutorial-title';
    
    // Create content element
    const content = document.createElement('div');
    content.id = 'tutorial-content';
    
    // Create button container
    const buttonContainer = document.createElement('div');
    buttonContainer.id = 'tutorial-buttons';
    
    // Create Skip button
    const skipButton = document.createElement('button');
    skipButton.id = 'tutorial-skip';
    skipButton.textContent = 'Skip Tutorial';
    skipButton.addEventListener('click', endTutorial);
    
    // Create Next button
    const nextButton = document.createElement('button');
    nextButton.id = 'tutorial-next';
    nextButton.textContent = 'Next';
    nextButton.addEventListener('click', nextTutorialStep);
    
    // Assemble elements
    buttonContainer.appendChild(skipButton);
    buttonContainer.appendChild(nextButton);
    
    tutorialBox.appendChild(title);
    tutorialBox.appendChild(content);
    tutorialBox.appendChild(buttonContainer);
    
    overlay.appendChild(backdrop);
    overlay.appendChild(highlight);
    overlay.appendChild(arrow);
    overlay.appendChild(tutorialBox);
    
    // Add to DOM
    document.body.appendChild(overlay);
}

/**
 * Navigate to the page needed for the current tutorial step
 * @param {number} stepIndex - Index of the step to navigate to
 */
function navigateToStepPage(stepIndex) {
    const step = tutorialSteps[stepIndex];
    const targetPage = step.page;
    
    // Get the current page
    const currentPageHash = window.location.hash.substring(1);
    const currentPage = currentPageHash || 'home';
    
    // If we're already on the right page, just show the step
    if (currentPage === targetPage) {
        showTutorialStep(stepIndex);
        return;
    }
    
    // Otherwise, navigate to the right page
    const navLink = document.querySelector(`nav a[href="#${targetPage}"]`);
    if (navLink) {
        // Temporarily remove the navigation event listener to avoid conflicts
        document.querySelectorAll('nav a').forEach(link => {
            link.removeEventListener('click', handleTutorialNavigation);
        });
        
        // Trigger the navigation click
        navLink.click();
        
        // Re-add the event listener
        document.querySelectorAll('nav a').forEach(link => {
            link.addEventListener('click', handleTutorialNavigation);
        });
        
        // Show the step after a delay to allow page transition to complete
        setTimeout(() => {
            showTutorialStep(stepIndex);
        }, 300);
    }
}

/**
 * Display a specific tutorial step
 * Positions overlay elements and updates content
 * @param {number} stepIndex - Index of the step to show
 */
function showTutorialStep(stepIndex) {
    // Handle reaching the end of the tutorial
    if (stepIndex >= tutorialSteps.length) {
        endTutorial();
        return;
    }
    
    const step = tutorialSteps[stepIndex];
    const title = document.getElementById('tutorial-title');
    const content = document.getElementById('tutorial-content');
    const tutorialBox = document.getElementById('tutorial-box');
    const arrow = document.getElementById('tutorial-arrow');
    const highlight = document.getElementById('tutorial-highlight');
    const nextButton = document.getElementById('tutorial-next');
    
    // Update content
    title.textContent = step.title;
    content.textContent = step.content;
    
    // Update next button text for last step
    if (stepIndex === tutorialSteps.length - 1) {
        nextButton.textContent = 'Finish';
    } else {
        nextButton.textContent = 'Next';
    }
    
    // Position everything
    const targetElement = document.querySelector(step.element);
    if (targetElement) {
        // Get element position
        const rect = targetElement.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // Scroll element into view if needed
        const windowHeight = window.innerHeight;
        const elementTop = rect.top + scrollTop;
        const elementBottom = rect.bottom + scrollTop;
        
        if (elementTop < scrollTop || elementBottom > scrollTop + windowHeight) {
            // Element is not in view, scroll to it
            window.scrollTo({
                top: elementTop - 100,
                behavior: 'smooth'
            });
        }
        
        // Position the highlight
        highlight.style.top = `${rect.top + scrollTop}px`;
        highlight.style.left = `${rect.left}px`;
        highlight.style.width = `${rect.width}px`;
        highlight.style.height = `${rect.height}px`;
        
        // Position the arrow and tutorial box based on specified position
        let arrowTop, arrowLeft, boxTop, boxLeft;
        
        switch (step.position) {
            case 'top':
                // Arrow points up, box below element
                arrowTop = rect.bottom + scrollTop + 10;
                arrowLeft = rect.left + (rect.width / 2);
                boxTop = arrowTop + 10;
                boxLeft = arrowLeft - 150;
                arrow.className = 'arrow-top';
                break;
            case 'bottom':
                // Arrow points down, box above element
                arrowTop = rect.top + scrollTop - 15;
                arrowLeft = rect.left + (rect.width / 2);
                boxTop = arrowTop - 220;  // Increase distance to prevent overlap
                boxLeft = arrowLeft - 150;
                arrow.className = 'arrow-bottom';
                break;
            case 'left':
                // Arrow points left, box to the right of element
                arrowTop = rect.top + scrollTop + (rect.height / 2);
                arrowLeft = rect.right + 10;
                boxTop = arrowTop - 120;
                boxLeft = arrowLeft + 15;
                arrow.className = 'arrow-left';
                break;
            case 'right':
                // Arrow points right, box to the left of element
                arrowTop = rect.top + scrollTop + (rect.height / 2);
                arrowLeft = rect.left - 15;
                boxTop = arrowTop - 120;
                boxLeft = arrowLeft - 320;
                arrow.className = 'arrow-right';
                break;
            case 'far-right':
                // Special case for navigation - position far to the right
                arrowTop = rect.top + scrollTop + (rect.height / 2);
                arrowLeft = rect.right + 10;
                boxTop = arrowTop - 120;
                boxLeft = arrowLeft + 50; // Position further right
                arrow.className = 'arrow-left';
                break;
            case 'far-bottom':
                // Special case for cash balance - position far below
                arrowTop = rect.bottom + scrollTop + 10;
                arrowLeft = rect.left + (rect.width / 2);
                boxTop = arrowTop + 40; // Position much further below
                boxLeft = arrowLeft - 150;
                arrow.className = 'arrow-top';
                break;
            default:
                // Default to bottom
                arrowTop = rect.top + scrollTop - 15;
                arrowLeft = rect.left + (rect.width / 2);
                boxTop = arrowTop - 220;
                boxLeft = arrowLeft - 150;
                arrow.className = 'arrow-bottom';
        }
        
        // Apply positions
        arrow.style.top = `${arrowTop}px`;
        arrow.style.left = `${arrowLeft}px`;
        
        tutorialBox.style.top = `${boxTop}px`;
        tutorialBox.style.left = `${boxLeft}px`;
        
        // Make sure tutorial box is entirely visible within viewport
        const boxRect = tutorialBox.getBoundingClientRect();
        if (boxRect.left < 10) {
            tutorialBox.style.left = '10px';
        }
        if (boxRect.right > window.innerWidth - 10) {
            tutorialBox.style.left = `${window.innerWidth - boxRect.width - 10}px`;
        }
        if (boxRect.top < 10) {
            tutorialBox.style.top = '10px';
        }
        if (boxRect.bottom > window.innerHeight - 10) {
            tutorialBox.style.top = `${window.innerHeight - boxRect.height - 10}px`;
        }
        
        // Show all elements
        document.getElementById('tutorial-overlay').classList.add('visible');
    }
}

/**
 * Move to the next tutorial step
 */
function nextTutorialStep() {
    currentTutorialStep++;
    
    if (currentTutorialStep < tutorialSteps.length) {
        navigateToStepPage(currentTutorialStep);
    } else {
        endTutorial();
    }
}

/**
 * Handle navigation during tutorial
 * Keeps tutorial context when user navigates between pages
 * @param {Event} e - Click event
 */
function handleTutorialNavigation(e) {
    if (!tutorialActive) return;
    
    // Prevent default navigation behavior
    e.preventDefault();
    
    // Get the target page from the href
    const targetPageHash = e.currentTarget.getAttribute('href');
    const targetPage = targetPageHash.substring(1);
    
    // Find the next step that matches this page
    let nextMatchingStepIndex = -1;
    for (let i = currentTutorialStep + 1; i < tutorialSteps.length; i++) {
        if (tutorialSteps[i].page === targetPage) {
            nextMatchingStepIndex = i;
            break;
        }
    }
    
    // If we found a matching step, jump to it
    if (nextMatchingStepIndex !== -1) {
        currentTutorialStep = nextMatchingStepIndex;
        navigateToStepPage(currentTutorialStep);
    } else {
        // If no matching step found, allow normal navigation and hide tutorial temporarily
        const navLink = document.querySelector(`nav a[href="#${targetPage}"]`);
        if (navLink) {
            document.getElementById('tutorial-overlay').classList.remove('visible');
            navLink.click();
        }
    }
}

/**
 * End the tutorial
 * Cleans up tutorial elements and marks as completed
 */
function endTutorial() {
    tutorialActive = false;
    
    // Hide the overlay with animation
    const overlay = document.getElementById('tutorial-overlay');
    if (overlay) {
        overlay.classList.remove('visible');
        setTimeout(() => {
            overlay.remove();
        }, 300);
    }
    
    // Mark tutorial as completed in local storage
    localStorage.setItem('tutorialCompleted', 'true');
    
    // Remove event listener for navigation
    document.querySelectorAll('nav a').forEach(link => {
        link.removeEventListener('click', handleTutorialNavigation);
    });
}

// Initialize on document ready
document.addEventListener('DOMContentLoaded', initializeTutorial);

// Make functions available globally
window.startTutorial = startTutorial;
window.skipTutorial = endTutorial;