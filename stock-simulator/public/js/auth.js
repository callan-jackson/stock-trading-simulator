/**
 * Authentication Handler Module
 * 
 * Manages user authentication flow including:
 * - Login and registration form handling
 * - Authentication state management
 * - Session validation
 * - Logout functionality
 */

// Initialize authentication when DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeAuth();
});

/**
 * Initialize authentication module and set up event listeners
 */
function initializeAuth() {
    // Check if user is already logged in
    checkAuthStatus();
    
    // Get references to auth-related elements
    const showRegisterLink = document.getElementById('show-register');
    const showLoginLink = document.getElementById('show-login');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const logoutBtn = document.getElementById('logout-btn');
    
    // Set up form toggle - show register form
    if (showRegisterLink) {
        showRegisterLink.addEventListener('click', (e) => {
            e.preventDefault();
            loginForm.style.display = 'none';
            registerForm.style.display = 'block';
        });
    }
    
    // Set up form toggle - show login form
    if (showLoginLink) {
        showLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            registerForm.style.display = 'none';
            loginForm.style.display = 'block';
        });
    }
    
    // Set up form submission handlers
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
    
    // Set up logout handler
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
}

/**
 * Check if the user has a valid session
 * Verifies JWT token with the backend
 */
async function checkAuthStatus() {
    try {
        const response = await fetch('/api/auth/user', {
            credentials: 'include' // Include cookies for JWT token
        });
        
        if (response.ok) {
            const userData = await response.json();
            handleAuthStateChange(true);
            
            // Update user welcome message with username
            const userWelcome = document.getElementById('user-welcome');
            if (userWelcome) {
                userWelcome.innerHTML = `<p>Welcome, ${userData.username}</p>`;
            }
        } else {
            // Not authenticated
            handleAuthStateChange(false);
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        handleAuthStateChange(false);
    }
}

/**
 * Handle login form submission
 * @param {Event} e - Form submission event
 */
async function handleLogin(e) {
    e.preventDefault();
    
    // Get form values
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    const errorDiv = document.getElementById('login-error');
    
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password }),
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Clear form input values
            document.getElementById('login-username').value = '';
            document.getElementById('login-password').value = '';
            
            // Update UI for authenticated state
            handleAuthStateChange(true);
            
            // Update user welcome message
            const userWelcome = document.getElementById('user-welcome');
            if (userWelcome) {
                userWelcome.innerHTML = `<p>Welcome, ${data.user.username}</p>`;
            }
            
            // Show success message
            showSuccess('Login successful!');
        } else {
            // Show error message
            if (errorDiv) {
                errorDiv.textContent = data.error || 'Login failed';
                errorDiv.style.display = 'block';
                
                // Hide error after 5 seconds
                setTimeout(() => {
                    errorDiv.style.display = 'none';
                }, 5000);
            } else {
                showError(data.error || 'Login failed');
            }
        }
    } catch (error) {
        console.error('Login error:', error);
        showError('Login failed. Please try again.');
    }
}

/**
 * Handle registration form submission
 * @param {Event} e - Form submission event
 */
async function handleRegister(e) {
    e.preventDefault();
    
    // Get form values
    const username = document.getElementById('register-username').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const errorDiv = document.getElementById('register-error');
    
    // Basic client-side validation
    if (!username || !email || !password) {
        if (errorDiv) {
            errorDiv.textContent = 'Please fill in all fields';
            errorDiv.style.display = 'block';
            
            // Hide error after 5 seconds
            setTimeout(() => {
                errorDiv.style.display = 'none';
            }, 5000);
        }
        return;
    }
    
    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email, password }),
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Clear form values
            document.getElementById('register-username').value = '';
            document.getElementById('register-email').value = '';
            document.getElementById('register-password').value = '';
            
            // Set flag for new registration to trigger tutorial
            localStorage.setItem('tutorialCompleted', 'false'); // Force tutorial to show
            sessionStorage.setItem('newlyRegistered', 'true');
            
            // Update UI for authenticated state
            handleAuthStateChange(true);
            
            // Update user welcome message
            const userWelcome = document.getElementById('user-welcome');
            if (userWelcome) {
                userWelcome.innerHTML = `<p>Welcome, ${data.user.username}</p>`;
            }
            
            // Show success message
            showSuccess('Registration successful!');
            
            // Trigger tutorial with a slight delay to ensure UI is ready
            setTimeout(() => {
                if (typeof window.startTutorial === 'function') {
                    window.startTutorial();
                }
            }, 1500);
        } else {
            // Show error message
            if (errorDiv) {
                errorDiv.textContent = data.error || 'Registration failed';
                errorDiv.style.display = 'block';
                
                // Hide error after 5 seconds
                setTimeout(() => {
                    errorDiv.style.display = 'none';
                }, 5000);
            } else {
                showError(data.error || 'Registration failed');
            }
        }
    } catch (error) {
        console.error('Registration error:', error);
        showError('Registration failed. Please try again.');
    }
}

/**
 * Handle logout button click
 * @param {Event} e - Click event
 */
async function handleLogout(e) {
    e.preventDefault();
    
    try {
        const response = await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include'
        });
        
        if (response.ok) {
            // Update UI for unauthenticated state
            handleAuthStateChange(false);
            showSuccess('Logged out successfully');
        } else {
            showError('Logout failed');
        }
    } catch (error) {
        console.error('Logout error:', error);
        showError('Logout failed');
    }
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

/**
 * Display success message
 * @param {string} message - Success message to display
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
