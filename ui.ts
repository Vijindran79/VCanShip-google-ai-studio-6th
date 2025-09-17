// ⚠️  READ-ONLY — DO NOT EDIT — SERVICE LOCKED ⚠️
import { DOMElements } from './dom';
import { State, setState, type Page } from './state';

/**
 * Updates the progress bar for service pages.
 * @param service The service to update the progress bar for.
 * @param currentStep The current step index (0-based).
 */
export const updateProgressBar = (service: string, currentStep: number) => {
    const progressBarContainer = document.getElementById(`progress-bar-${service}`);
    if (!progressBarContainer) return;

    const steps = progressBarContainer.dataset.steps?.split(',') || [];
    let html = '<ol class="progress-steps" role="list" aria-label="Shipment Progress">';
    steps.forEach((step, index) => {
        let status = '';
        let ariaCurrent = '';
        if (index < currentStep) {
            status = 'completed';
        } else if (index === currentStep) {
            status = 'active';
            ariaCurrent = 'aria-current="step"';
        }
        const statusText = status === '' ? 'pending' : status;
        // Add a visually-hidden span for screen reader context
        html += `<li class="progress-step ${status}" ${ariaCurrent} role="listitem">
                    <span class="visually-hidden">Step ${index + 1} of ${steps.length}, ${step}: ${statusText}.</span>
                    ${step}
                 </li>`;
    });
    html += '</ol>';
    progressBarContainer.innerHTML = html;
};

/**
 * Updates the active state of sidebar links based on the current service.
 */
function updateSidebarActiveState() {
    const sidebar = document.getElementById('app-sidebar');
    const service = State.currentService;
    if (!sidebar || !service) {
        // Clear active state if no service is selected (e.g., on landing page)
        document.querySelectorAll('#app-sidebar .sidebar-link').forEach(link => link.classList.remove('active'));
        return;
    }
    
    sidebar.querySelectorAll('.sidebar-link').forEach(link => {
        const linkEl = link as HTMLElement;
        const linkService = linkEl.dataset.service;

        if (linkService && linkService === service) {
            linkEl.classList.add('active');
        } else {
            linkEl.classList.remove('active');
        }
    });
}

/**
 * Switches the visible page. This function ensures that only one page is active at a time.
 * @param newPage The ID of the page to switch to.
 */
export const switchPage = (newPage: Page) => {
    if (State.currentPage === newPage) return;

    const currentPageElement = document.getElementById(`page-${State.currentPage}`);
    const newPageElement = document.getElementById(`page-${newPage}`);

    // Immediately hide the current page.
    if (currentPageElement) {
        currentPageElement.classList.remove('active');
    }
    
    // Show the new page, which will trigger the 'page-enter' animation.
    if (newPageElement) {
        newPageElement.classList.add('active');
        setState({ currentPage: newPage });
        updateSidebarActiveState(); // Update sidebar on every page change
        window.scrollTo(0, 0); // Scroll to top on page change
    } else {
        console.error(`Page switch failed: Element for page '${newPage}' not found.`);
        // Fallback to landing page if the target doesn't exist to prevent a blank screen.
        if (State.currentPage !== 'landing') {
             switchPage('landing');
        }
    }
};


/**
 * Shows a toast notification with an updated design and new 'warning' type.
 * @param message The message to display.
 * @param type The type of toast (success, error, info, warning).
 * @param duration Duration in milliseconds.
 */
export function showToast(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', duration: number = 3000) {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;

    const icons = {
        success: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>`,
        error: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>`,
        info: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" /></svg>`,
        warning: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>`,
    };
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');

    toast.innerHTML = `
        <div class="toast-icon">${icons[type]}</div>
        <div class="toast-message">${message}</div>
    `;
    
    toastContainer.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    }, duration);
}

/**
 * Toggles the loading overlay.
 * @param show True to show, false to hide.
 * @param text The text to display on the overlay.
 */
export const toggleLoading = (show: boolean, text: string = 'Please wait...') => {
    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingText = document.getElementById('loading-progress-text');
    if (!loadingOverlay || !loadingText) return;

    loadingText.textContent = text;
    loadingOverlay.classList.toggle('active', show);
};

/**
 * Shows the authentication modal.
 */
export function showAuthModal() {
    DOMElements.authModal.classList.add('active');
}

/**
 * Hides the authentication modal.
 */
export function closeAuthModal() {
    DOMElements.authModal.classList.remove('active');
}

/**
 * Shows the pre-launch "coming soon" modal.
 */
export function showPrelaunchModal() {
    const modal = document.getElementById('prelaunch-modal');
    if (modal) {
        modal.classList.add('active');
    }
}

/**
 * Hides the pre-launch "coming soon" modal.
 */
export function closePrelaunchModal() {
    const modal = document.getElementById('prelaunch-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}