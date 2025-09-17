// ⚠️  READ-ONLY — DO NOT EDIT — SERVICE LOCKED ⚠️
import { DOMElements } from './dom';
import { mountService } from './router';
import { switchPage, showToast, showPrelaunchModal, closePrelaunchModal, toggleLoading } from './ui';
import { Page, Service, State, setState } from './state';
import { initializeApi } from './api';
import { initializePaymentPage } from './payment';
import { initializeLocaleSwitcher } from './LocaleSwitcher';
import { initializeAuth, handleLogout, updateUIForAuthState } from './auth';
import { initializeStaticPages } from './static_pages';
import { initializeDashboard } from './dashboard';
import { initializeAccountPages }from './account';
import { Chat } from '@google/genai';
import { initializeI18n, updateStaticUIText } from './i18n';

// --- Global state for live tracking simulation ---
let liveTrackingInterval: number | null = null;
let iotSimulationInterval: number | null = null;

// --- Theme Management ---
function applyTheme(theme: 'light' | 'dark') {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('vcanship-theme', theme);
    if (DOMElements.themeToggle) {
        DOMElements.themeToggle.checked = theme === 'dark';
    }
}

function initializeTheme() {
    const savedTheme = localStorage.getItem('vcanship-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = savedTheme || (prefersDark ? 'dark' : 'light');
    applyTheme(theme as 'light' | 'dark');

    DOMElements.themeToggle?.addEventListener('change', () => {
        applyTheme(DOMElements.themeToggle.checked ? 'dark' : 'light');
    });
}

// --- Sidebar Initialization ---
function initializeSidebar() {
    const sidebarEl = document.getElementById('app-sidebar');
    if (!sidebarEl) return;

    const mainServices = ['parcel', 'airfreight', 'fcl', 'lcl'];
    const otherServices: { id: Service, name: string }[] = [
        { id: 'vehicle', name: 'Vehicle Shipping' },
        { id: 'railway', name: 'Railway Freight' },
        { id: 'inland', name: 'Inland Trucking' },
        { id: 'bulk', name: 'Bulk & Charter' },
        { id: 'rivertug', name: 'River Barge & Tug' },
        // FIX: Changed 'warehousing' to 'warehouse' to match the 'Service' type.
        { id: 'warehouse', name: 'Warehousing' },
        { id: 'schedules', name: 'Schedules & Lanes' },
        { id: 'register', name: 'Trade Finance' },
    ];
    
    const pinnedServices: { id: Service, name: string }[] = [
        { id: 'ecommerce', name: 'Launch Your Global Store' },
        { id: 'service-provider-register', name: 'Become a Partner' },
    ];

    const createLink = (service: { id: Service, name: string }) => 
        `<a href="#" class="sidebar-link static-link" data-service="${service.id}">${service.name}</a>`;
    
    sidebarEl.innerHTML = `
        <nav>
            <div class="sidebar-links">
                ${otherServices.map(createLink).join('')}
            </div>
            <div class="sidebar-pinned-links">
                ${pinnedServices.map(createLink).join('')}
            </div>
        </nav>
    `;
}

// --- Mobile Navigation ---
function initializeMobileNav() {
    const toggleBtn = document.getElementById('mobile-nav-toggle');
    const sidebar = document.getElementById('app-sidebar');
    const overlay = document.getElementById('mobile-nav-overlay');

    if (!toggleBtn || !sidebar || !overlay) return;

    const closeMobileNav = () => {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
        toggleBtn.setAttribute('aria-expanded', 'false');
    };

    const openMobileNav = () => {
        sidebar.classList.add('active');
        overlay.classList.add('active');
        toggleBtn.setAttribute('aria-expanded', 'true');
    };

    toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isActive = sidebar.classList.contains('active');
        isActive ? closeMobileNav() : openMobileNav();
    });

    overlay.addEventListener('click', closeMobileNav);

    sidebar.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.closest('.sidebar-link')) {
            closeMobileNav();
        }
    });
}


// --- Enhanced Tracking Feature ---

function stopLiveTrackingSimulation() {
    if (liveTrackingInterval) {
        clearInterval(liveTrackingInterval);
        liveTrackingInterval = null;
    }
    if (iotSimulationInterval) {
        clearInterval(iotSimulationInterval);
        iotSimulationInterval = null;
    }
}

function startLiveTrackingSimulation(trackingId: string) {
    stopLiveTrackingSimulation(); // Stop any previous simulation

    const modal = document.getElementById('live-tracking-modal');
    const closeBtn = document.getElementById('close-live-tracking-modal-btn');
    const subtitle = document.getElementById('live-tracking-subtitle');
    const statusEl = document.getElementById('live-tracking-status');
    const originEl = document.getElementById('live-tracking-origin');
    const destEl = document.getElementById('live-tracking-dest');
    const etaEl = document.getElementById('live-tracking-eta');
    const eventsContainer = document.getElementById('live-tracking-events-container');
    const shipmentIcon = document.getElementById('shipment-icon');
    
    // IoT Elements
    const iotTempEl = document.getElementById('iot-temp');
    const iotHumidityEl = document.getElementById('iot-humidity');
    const iotShockEl = document.getElementById('iot-shock');


    if (!modal || !closeBtn || !subtitle || !eventsContainer || !shipmentIcon || !statusEl || !originEl || !destEl || !etaEl || !iotTempEl || !iotHumidityEl || !iotShockEl) {
        console.error("Live tracking modal elements not found.");
        return;
    }

    // Mock journey data
    const mockJourney = {
        origin: 'New York, NY',
        destination: 'Los Angeles, CA',
        eta: '2024-07-29',
        events: [
            { status: 'Out for Delivery', location: 'Los Angeles, CA', date: '2024-07-28' },
            { status: 'Arrived at Local Facility', location: 'Los Angeles, CA', date: '2024-07-28' },
            { status: 'Departed from Hub', location: 'Dallas, TX', date: '2024-07-27' },
            { status: 'In Transit', location: 'Chicago, IL', date: '2024-07-26' },
            { status: 'Shipment Picked Up', location: 'New York, NY', date: '2024-07-25' },
        ],
        // Map icon start/end coordinates (top, left) in percent
        startPos: { top: 80, left: 15 },
        endPos: { top: 20, left: 85 },
        durationSeconds: 10, // Total animation time
    };
    
    // Populate modal content
    subtitle.textContent = `Tracking ID: ${trackingId}`;
    originEl.textContent = mockJourney.origin;
    destEl.textContent = mockJourney.destination;
    etaEl.textContent = mockJourney.eta;
    statusEl.textContent = 'In Transit';
    
    eventsContainer.innerHTML = `
        <ol class="tracking-events">
            ${mockJourney.events.map((event, index) => `
                <li class="tracking-event ${index === 0 ? 'latest' : ''}">
                    <div class="event-status">${event.status}</div>
                    <div class="event-details">
                        <span>${event.location}</span>
                        <span>${event.date}</span>
                    </div>
                </li>
            `).join('')}
        </ol>
    `;
    
    // Show the modal
    DOMElements.trackingModal.classList.remove('active'); // Close the old one
    modal.classList.add('active');

    // Start GPS animation
    let progress = 0; // from 0 to 1
    const totalSteps = mockJourney.durationSeconds * 10; // 10 steps per second
    const stepIntervalMs = 100;

    liveTrackingInterval = window.setInterval(() => {
        progress += 1 / totalSteps;
        if (progress >= 1) {
            progress = 1;
            stopLiveTrackingSimulation();
            if(statusEl) statusEl.textContent = 'Arrived at Destination Hub';
        }
        
        const currentTop = mockJourney.startPos.top + (mockJourney.endPos.top - mockJourney.startPos.top) * progress;
        const currentLeft = mockJourney.startPos.left + (mockJourney.endPos.left - mockJourney.startPos.left) * progress;
        
        shipmentIcon.style.top = `${currentTop}%`;
        shipmentIcon.style.left = `${currentLeft}%`;
        
    }, stepIntervalMs);

    // Start IoT simulation
    iotSimulationInterval = window.setInterval(() => {
        // Temp: fluctuate around 22.5
        iotTempEl.textContent = `${(22.5 + (Math.random() - 0.5) * 1.5).toFixed(1)}°C`;
        // Humidity: fluctuate around 45%
        iotHumidityEl.textContent = `${(45 + (Math.random() - 0.5) * 5).toFixed(0)}%`;
        // Shock: small chance of a warning
        const shockVal = Math.random();
        if (shockVal > 0.98) {
             iotShockEl.textContent = 'High';
             iotShockEl.className = 'iot-alert';
        } else if (shockVal > 0.9) {
             iotShockEl.textContent = 'Warn';
             iotShockEl.className = 'iot-warn';
        } else {
             iotShockEl.textContent = 'OK';
             iotShockEl.className = 'iot-ok';
        }
    }, 2000);

    closeBtn.addEventListener('click', () => {
        modal.classList.remove('active');
        stopLiveTrackingSimulation();
    }, { once: true });
}

async function handleTrackingFormSubmit(e: Event) {
    try {
        e.preventDefault();
        const trackingId = DOMElements.trackingIdInput.value.trim();
        if (!trackingId) return;

        // Show a quick spinner in the original modal
        DOMElements.trackingResultsContainer.innerHTML = `<div class="loading-spinner" style="margin: 2rem auto;"></div>`;

        // Simulate a lookup delay
        await new Promise(res => setTimeout(res, 750));
        
        // Launch the new enhanced tracking view
        startLiveTrackingSimulation(trackingId);
    } catch (error) {
        console.error("Error in tracking form submission:", error);
        showToast("Failed to process tracking request.", "error");
        DOMElements.trackingResultsContainer.innerHTML = `<p class="error-text" style="text-align: center; margin-top: 1rem;">An error occurred. Please try again.</p>`;
    }
}


function initializeTracking() {
    DOMElements.trackBtn?.addEventListener('click', () => DOMElements.trackingModal.classList.add('active'));
    DOMElements.closeTrackingModalBtn?.addEventListener('click', () => DOMElements.trackingModal.classList.remove('active'));
    DOMElements.trackingForm?.addEventListener('submit', handleTrackingFormSubmit);
}

// --- Inspector Portal & Blockchain Feature ---
function showBlockchainModal(shipmentId: string) {
    const modal = document.getElementById('blockchain-modal');
    const closeBtn = document.getElementById('close-blockchain-modal-btn');
    const subtitle = document.getElementById('blockchain-modal-subtitle');
    const timeline = document.getElementById('blockchain-timeline-container');

    if (!modal || !closeBtn || !subtitle || !timeline) return;

    subtitle.textContent = `Immutable ledger for Shipment #${shipmentId}`;
    
    // Mock blockchain data
    const events = [
        { status: 'Customs Cleared', verified: true, ts: '2024-07-28 09:15 UTC' },
        { status: 'Arrived at Destination Port', verified: true, ts: '2024-07-28 02:30 UTC' },
        { status: 'Departed Origin Port', verified: true, ts: '2024-07-25 18:00 UTC' },
        { status: 'Cargo Loaded on Vessel', verified: true, ts: '2024-07-25 11:45 UTC' },
        { status: 'Pickup Confirmed', verified: true, ts: '2024-07-24 14:00 UTC' },
    ];
    
    timeline.innerHTML = `
         <ol class="blockchain-timeline">
            ${events.map(event => `
                <li class="blockchain-event ${event.verified ? 'verified' : ''}">
                    <div class="blockchain-event-status">${event.status}</div>
                    <div class="blockchain-event-details">
                        <span>Timestamp: ${event.ts}</span>
                        <span class="blockchain-hash">Hash: 0x${[...Array(60)].map(() => Math.floor(Math.random() * 16).toString(16)).join('')}</span>
                    </div>
                </li>
            `).join('')}
        </ol>
    `;
    
    modal.classList.add('active');
    closeBtn.addEventListener('click', () => modal.classList.remove('active'), { once: true });
}


function initializeInspectorPortal() {
    DOMElements.complianceBtn?.addEventListener('click', () => DOMElements.inspectorModal.classList.add('active'));
    DOMElements.closeInspectorModalBtn?.addEventListener('click', () => DOMElements.inspectorModal.classList.remove('active'));

    document.body.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const blockchainBtn = target.closest('#inspector-blockchain-btn');
        if (blockchainBtn) {
            const shipmentIdEl = document.getElementById('inspector-shipment-id-display');
            if (shipmentIdEl) {
                showBlockchainModal(shipmentIdEl.textContent || 'Unknown');
            }
        }
    });
}

// --- Chatbot ---
async function initializeChatbot() {
    const fab = document.getElementById('chatbot-fab');
    const chatWindow = document.getElementById('chat-window');
    const closeBtn = document.getElementById('close-chat-btn');
    const chatHistory = document.getElementById('chat-history');
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input') as HTMLInputElement;
    const micBtn = document.getElementById('mic-btn') as HTMLButtonElement;

    if (!fab || !chatWindow || !closeBtn || !chatHistory || !chatForm || !chatInput || !micBtn) return;

    let chatSession: Chat | null = null;
    let isChatOpen = false;

    const systemInstruction = `# ROLE: VCanship Customer Support Agent
You are a friendly and helpful AI assistant for VCanship, a global logistics company. Your goal is to answer user questions and assist them with their shipping needs.

## Capabilities:
- **Answer questions:** You can answer questions about our services, tracking, shipping processes, and general logistics.
- **Provide service information:** Our services include: Send a Parcel, Air Freight, Excess Baggage, FCL Shipping, LCL Shipping, Vehicle Shipping, Railway Freight, Inland Trucking, Bulk & Charter, River Barge & Tug, Warehousing, and E-commerce Solutions.
- **Guide users:** If a user wants to book a service, guide them to the correct page on our website by saying "You can get started with [Service Name] by selecting it on our homepage."
- **Track shipments:** If a user provides a tracking number or asks how to track, tell them to use the "Track" button in the main header for real-time updates.
- **Be conversational:** Maintain a friendly, professional, and helpful tone. Keep answers concise and easy to understand.

## Behavior:
- Your first message is always: "Hello! I'm the VCanship Assistant. How can I help you with your shipping needs today?"
- Do not make up information you don't know. If you are unsure, politely state that you cannot answer and suggest they contact the human support team via the email in the footer.
`;

    const addMessageToHistory = (message: string, sender: 'bot' | 'user') => {
        const messageEl = document.createElement('div');
        messageEl.className = `chat-message ${sender}-message`;
        messageEl.textContent = message;
        chatHistory.appendChild(messageEl);
        chatHistory.scrollTop = chatHistory.scrollHeight;
    };

    const showBotTyping = (show: boolean) => {
        let typingIndicator = chatHistory.querySelector('.bot-typing-indicator');
        if (show) {
            if (!typingIndicator) {
                typingIndicator = document.createElement('div');
                typingIndicator.className = 'chat-message bot-message bot-typing-indicator';
                typingIndicator.innerHTML = '<span></span><span></span><span></span>';
                chatHistory.appendChild(typingIndicator);
                chatHistory.scrollTop = chatHistory.scrollHeight;
            }
        } else {
            typingIndicator?.remove();
        }
    };
    
    const startNewChat = () => {
        if (!State.api) {
            addMessageToHistory("Sorry, the Vcanship Assistant is currently unavailable. Please try again later.", "bot");
            chatInput.disabled = true;
            chatInput.placeholder = "Assistant is offline.";
            return;
        }

        chatSession = State.api.chats.create({
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction: systemInstruction,
            },
        });
        
        chatHistory.innerHTML = '';
        addMessageToHistory("Hello! I'm the VCanship Assistant. How can I help you with your shipping needs today?", "bot");
    };

    const toggleChat = () => {
        isChatOpen = !isChatOpen;
        chatWindow.classList.toggle('hidden', !isChatOpen);
        if (isChatOpen && !chatSession) {
            startNewChat();
        }
    };

    fab.addEventListener('click', toggleChat);
    closeBtn.addEventListener('click', toggleChat);

    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!chatSession) return;

        const userInput = chatInput.value.trim();
        if (!userInput) return;

        addMessageToHistory(userInput, 'user');
        chatInput.value = '';
        showBotTyping(true);
        chatInput.disabled = true;

        try {
            const response = await chatSession.sendMessage({ message: userInput });
            showBotTyping(false);
            addMessageToHistory(response.text, 'bot');
        } catch (error) {
            console.error("Chatbot API error:", error);
            showBotTyping(false);
            addMessageToHistory("Sorry, I encountered an error. Please try again.", "bot");
        } finally {
            chatInput.disabled = false;
            chatInput.focus();
        }
    });

    // --- Voice Input ---
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        let isListening = false;

        micBtn.addEventListener('click', () => {
            if (isListening) {
                recognition.stop();
            } else {
                try {
                    recognition.start();
                } catch (e) {
                    console.error("Speech recognition failed to start:", e);
                    showToast("Could not start voice recognition. Please try again.", "error");
                }
            }
        });

        recognition.onstart = () => {
            isListening = true;
            micBtn.classList.add('listening');
            chatInput.placeholder = 'Listening...';
        };

        recognition.onend = () => {
            isListening = false;
            micBtn.classList.remove('listening');
            chatInput.placeholder = 'Ask about services, tracking...';
            chatInput.focus();
        };

        recognition.onerror = (event: any) => {
            console.error('Speech recognition error:', event.error);
            let errorMessage = 'Voice recognition failed. Please try again.';
            if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                errorMessage = 'Microphone access denied. Please allow it in your browser settings.';
            } else if (event.error === 'no-speech') {
                errorMessage = 'No speech was detected.';
            }
            showToast(errorMessage, 'error');
            isListening = false;
            // Ensure UI is reset on error
            micBtn.classList.remove('listening');
            chatInput.placeholder = 'Ask about services, tracking...';
        };

        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            chatInput.value = transcript;
        };

    } else {
        console.warn("Speech Recognition API not supported.");
        micBtn.style.display = 'none';
    }
}

// --- PRE-LAUNCH MODAL ---
function initializePrelaunchModal() {
    const closeBtn = document.getElementById('close-prelaunch-modal-btn');
    const backHomeBtn = document.getElementById('prelaunch-back-home-btn');

    closeBtn?.addEventListener('click', closePrelaunchModal);
    backHomeBtn?.addEventListener('click', () => {
        closePrelaunchModal();
        switchPage('landing');
    });
}

// --- Voice Search Feature ---
function initializeVoiceSearch() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
        console.warn("Speech Recognition API not supported, hiding voice search button.");
        document.body.insertAdjacentHTML('beforeend', '<style>#voice-search-btn { display: none !important; }</style>');
        return;
    }
    
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    let isListening = false;

    const serviceKeywords: { [key: string]: Service } = {
        'parcel': 'parcel', 'parcels': 'parcel', 'air': 'airfreight', 'air freight': 'airfreight',
        'baggage': 'baggage', 'luggage': 'baggage', 'fcl': 'fcl', 'full container': 'fcl',
        'lcl': 'lcl', 'less container': 'lcl', 'vehicle': 'vehicle', 'car': 'vehicle',
        'rail': 'railway', 'railway': 'railway', 'train': 'railway', 'bulk': 'bulk',
        'charter': 'bulk', 'barge': 'rivertug', 'tug': 'rivertug', 'river': 'rivertug',
        'warehouse': 'warehouse', 'warehousing': 'warehouse', 'ecommerce': 'ecommerce', 'e-commerce': 'ecommerce',
        'schedule': 'schedules', 'schedules': 'schedules', 'finance': 'register',
        'register': 'service-provider-register', 'partner': 'service-provider-register',
    };

    document.body.addEventListener('click', (e) => {
        const voiceBtn = (e.target as HTMLElement).closest('#voice-search-btn');
        if (!voiceBtn) return;
        
        if (isListening) {
            recognition.stop();
        } else {
            try {
                recognition.start();
            } catch (err) {
                console.error("Speech recognition failed to start:", err);
                showToast("Could not start voice recognition.", "error");
            }
        }
    });

    recognition.onstart = () => {
        isListening = true;
        document.getElementById('voice-search-btn')?.classList.add('listening');
        showToast("Listening...", "info", 2000);
    };

    recognition.onend = () => {
        isListening = false;
        document.getElementById('voice-search-btn')?.classList.remove('listening');
    };
    
    recognition.onerror = (event: any) => {
        let errorMessage = 'Voice recognition failed.';
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            errorMessage = 'Microphone access denied. Please allow it in your browser settings.';
        } else if (event.error === 'no-speech') {
            errorMessage = 'No speech was detected. Please try again.';
        }
        showToast(errorMessage, 'error');
        isListening = false;
    };

    recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript.toLowerCase();
        let serviceFound: Service | null = null;
        
        for (const keyword in serviceKeywords) {
            if (transcript.includes(keyword)) {
                serviceFound = serviceKeywords[keyword];
                break;
            }
        }
        
        if (serviceFound) {
            const serviceName = serviceFound.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            showToast(`Navigating to ${serviceName}...`, 'success');
            mountService(serviceFound);
        } else {
            showToast(`Sorry, I didn't recognize that service. You said: "${transcript}"`, 'warning');
        }
    };
}

// --- Global Error Boundary ---
function initializeGlobalErrorHandler() {
    window.addEventListener('error', (event) => {
        console.error('Unhandled Globa Error:', event.error, event.message);
        // Avoid spamming toasts for minor errors
        if (event.message.includes('ResizeObserver')) return;

        showToast('An unexpected error occurred. Please refresh the page.', 'error', 5000);
        toggleLoading(false); // Ensure loading is always hidden on a fatal error
    });

    window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled Promise Rejection:', event.reason);
        showToast('An operation failed unexpectedly. Please try again.', 'error', 5000);
        toggleLoading(false);
    });
}


// --- MAIN INITIALIZATION ---
async function main() {
    // Core Initializations
    initializeGlobalErrorHandler();
    initializeTheme();
    initializeApi();
    await initializeI18n(); // Wait for translations to load
    initializeLocaleSwitcher();
    initializeSidebar();
    initializeMobileNav();
    
    // Listen for locale changes to update global currency state
    window.addEventListener('locale-change', (e: Event) => {
        const detail = (e as CustomEvent).detail;
        if (detail.currency) {
            setState({
                currentCurrency: detail.currency
            });
            // After a language change, re-render static text that might be on the page
            updateStaticUIText();
        }
    });

    initializeAuth(); 
    
    // Page & Feature Initializations
    initializeTracking();
    initializeInspectorPortal();
    initializePaymentPage();
    initializeChatbot();
    initializePrelaunchModal();
    initializeVoiceSearch();
    
    // New World-Class Feature Initializations
    initializeStaticPages();
    initializeDashboard();
    initializeAccountPages();

    // Event Delegation for all major navigation
    document.body.addEventListener('click', (e: MouseEvent) => {
        const target = e.target as HTMLElement;

        // Handle service triggers from the landing page, sidebar, or dashboard
        const serviceTrigger = target.closest<HTMLElement>('[data-service]');
        if (serviceTrigger) {
            e.preventDefault();
            const service = serviceTrigger.dataset.service;
            if (service) {
                mountService(service);
            }
            return; // Exit after handling
        }

        // Handle static page links from anywhere (except those handled by service triggers)
        const staticLink = target.closest<HTMLElement>('.static-link:not([data-service])');
        if (staticLink) {
            e.preventDefault();
            const page = staticLink.dataset.page as Page;
            if (page) {
                switchPage(page);
            }
            return; // Exit after handling
        }
        
        // Handle logout button
        const logoutButton = target.closest<HTMLElement>('#logout-btn');
        if (logoutButton) {
             e.preventDefault();
             handleLogout();
             return; // Exit after handling
        }
    });

    // Check auth state on load
    updateUIForAuthState();
    
    // Hide loading overlay once initialization is complete
    toggleLoading(false);
}

// --- Run on DOMContentLoaded ---
document.addEventListener('DOMContentLoaded', main);