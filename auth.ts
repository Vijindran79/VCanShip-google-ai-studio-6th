// ⚠️  READ-ONLY — DO NOT EDIT — SERVICE LOCKED ⚠️
import { DOMElements } from './dom';
import { State, setState } from './state';
import { switchPage, showAuthModal, closeAuthModal, toggleLoading } from './ui';
import { mountService } from './router';

// --- MOCK USER SESSION MANAGEMENT ---

/**
 * Checks localStorage for a saved user session.
 */
function checkSession() {
    const savedUser = localStorage.getItem('vcanship_user');
    if (savedUser) {
        setState({
            isLoggedIn: true,
            currentUser: JSON.parse(savedUser)
        });
    }
}

/**
 * Updates the UI based on the current authentication state.
 */
export function updateUIForAuthState() {
    const { isLoggedIn, currentUser } = State;

    // Toggle header buttons
    DOMElements.loginBtn.classList.toggle('hidden', isLoggedIn);
    DOMElements.myAccountDropdown.classList.toggle('hidden', !isLoggedIn);
    
    // Update "My Account" button text
    if (isLoggedIn && currentUser) {
        DOMElements.myAccountBtn.textContent = `Hi, ${currentUser.name.split(' ')[0]}`;
    }

    // Show/hide dashboard link in main nav
    const dashboardLink = document.getElementById('header-dashboard-link');
    if (dashboardLink) {
        dashboardLink.style.display = isLoggedIn ? 'inline-block' : 'none';
    }

    // Update landing page hero content
    const heroContent = document.querySelector('#page-landing .hero');
    if (heroContent) {
        const heroActionsHtml = `
            <div class="hero-actions">
                <button class="cta-btn" id="hero-get-started-btn">${isLoggedIn ? 'View Services' : 'Get Started'}</button>
                <button class="secondary-btn" id="voice-search-btn" aria-label="Search services by voice">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width: 1.5em; height: 1.5em;">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                        <path stroke-linecap="round" stroke-linejoin="round" d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    </svg>
                </button>
             </div>
        `;
    
        if (isLoggedIn && currentUser) {
            heroContent.innerHTML = `
                <h2>Welcome back, ${currentUser.name}!</h2>
                <p id="welcome-message">What would you like to ship today?</p>
                ${heroActionsHtml}
            `;
        } else {
            heroContent.innerHTML = `
                <h2>Ship Anything, Anywhere.</h2>
                <p>AI-Powered Shipping Solutions.</p>
                ${heroActionsHtml}
            `;
        }

        // Attach listener for the new button
        const getStartedBtn = heroContent.querySelector('#hero-get-started-btn');
        getStartedBtn?.addEventListener('click', () => {
            document.querySelector('#page-landing .services-grid')?.scrollIntoView({ behavior: 'smooth' });
        });
    }
}


// --- MODAL AND FORM LOGIC ---

/**
 * Toggles between the login and signup views within the modal.
 * @param viewToShow The view to display ('login' or 'signup').
 */
function switchAuthView(viewToShow: 'login' | 'signup') {
    const isLogin = viewToShow === 'login';
    DOMElements.loginView.classList.toggle('hidden', !isLogin);
    DOMElements.signupView.classList.toggle('hidden', isLogin);
    DOMElements.loginToggleText.classList.toggle('hidden', !isLogin);
    DOMElements.signupToggleText.classList.toggle('hidden', isLogin);
}

// --- AUTHENTICATION ACTIONS ---

/**
 * Finalizes the login process for any authentication method.
 * @param user The user object to log in.
 */
function completeLogin(user: { name: string, email: string }) {
    localStorage.setItem('vcanship_user', JSON.stringify(user));
    setState({ isLoggedIn: true, currentUser: user });
    
    updateUIForAuthState();
    closeAuthModal();
    
    if (State.postLoginRedirectService) {
        mountService(State.postLoginRedirectService);
        setState({ postLoginRedirectService: null });
    } else {
        switchPage('dashboard');
    }
}

/**
 * Handles a mock social login.
 * @param provider The social provider ('Google' or 'Apple').
 */
function handleSocialLogin(provider: 'Google' | 'Apple') {
    toggleLoading(true, `Signing in with ${provider}...`);

    // Simulate the async nature of social logins
    setTimeout(() => {
        const user = {
            name: provider === 'Google' ? 'Gia Lee' : 'Alex Chen',
            email: provider === 'Google' ? 'gia.lee@example.com' : 'alex.chen@icloud.com',
        };
        
        toggleLoading(false);
        completeLogin(user);
    }, 1500); // 1.5 second delay to simulate redirect and callback
}


/**
 * Handles the email/password login process.
 * @param e The form submission event.
 */
function handleLogin(e: Event) {
    e.preventDefault();
    const email = DOMElements.loginEmail.value;
    // For this demo, we create a mock user based on the email.
    const name = email.split('@')[0].replace(/[^a-zA-Z]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    const user = { name, email };
    
    completeLogin(user);
}

/**
 * Handles the email/password signup process.
 * @param e The form submission event.
 */
function handleSignup(e: Event) {
    e.preventDefault();
    const name = DOMElements.signupName.value;
    const email = DOMElements.signupEmail.value;

    const user = { name, email };
    
    completeLogin(user);
}

/**
 * Handles the logout process.
 */
export function handleLogout() {
    localStorage.removeItem('vcanship_user');
    setState({ isLoggedIn: false, currentUser: null });
    updateUIForAuthState();
    switchPage('landing'); // Redirect to landing page after logout
}


// --- INITIALIZATION ---

/**
 * Sets up all event listeners for the authentication flow.
 */
export function initializeAuth() {
    // Check for existing session on page load
    checkSession();
    
    // Modal controls
    DOMElements.loginBtn.addEventListener('click', showAuthModal);
    DOMElements.closeAuthModalBtn.addEventListener('click', closeAuthModal);

    // View switching
    DOMElements.showSignupBtn.addEventListener('click', () => switchAuthView('signup'));
    DOMElements.showLoginBtn.addEventListener('click', () => switchAuthView('login'));
    
    // Form submissions
    DOMElements.loginForm.addEventListener('submit', handleLogin);
    DOMElements.signupForm.addEventListener('submit', handleSignup);

    // Social Logins
    DOMElements.googleLoginBtn?.addEventListener('click', () => handleSocialLogin('Google'));
    DOMElements.appleLoginBtn?.addEventListener('click', () => handleSocialLogin('Apple'));
}