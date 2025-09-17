// ⚠️  READ-ONLY — DO NOT EDIT — SERVICE LOCKED ⚠️
import SignaturePad from 'signature_pad';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { State, setState, resetFclState, type Quote, type FclServiceType, type ComplianceDoc, FclFlashSlot, FclContainer, FclDetails } from './state';
import { DOMElements } from './dom';
import { getFclQuotes, getHsCodeSuggestions } from './api';
import { showToast, switchPage, updateProgressBar, toggleLoading, showPrelaunchModal } from './ui';
import { Type } from '@google/genai';

const CONTAINER_TYPES = ["20' Standard", "40' Standard", "40' High Cube", "45' High Cube", "20' Reefer", "40' Reefer"];
let signaturePad: SignaturePad | null = null;
let hsCodeSearchTimeout: number | null = null;

const MOCK_PORT_COORDS: { [key: string]: { top: number; left: number } } = {
    'CNSHA': { top: 45, left: 80 }, // Shanghai
    'SGSIN': { top: 62, left: 74 }, // Singapore
    'NLRTM': { top: 35, left: 48 }, // Rotterdam
    'DEHAM': { top: 34, left: 50 }, // Hamburg
    'USLAX': { top: 45, left: 18 }, // Los Angeles
    'USLGB': { top: 45, left: 18 }, // Long Beach (same as LAX for this map)
    'USNYC': { top: 42, left: 30 }, // New York
    'GBFXT': { top: 35, left: 46 }, // Felixstowe
    'AEJEA': { top: 50, left: 58 }, // Jebel Ali
};


// --- UI RENDERING ---
function renderFclPage() {
    const page = document.getElementById('page-fcl');
    if (!page) return;

    page.innerHTML = `
        <button class="back-btn">Back to Services</button>
        <div class="service-page-header">
            <h2>FCL (Full Container Load)</h2>
            <p class="subtitle">Book a dedicated container for your shipment.</p>
            <div id="progress-bar-fcl" data-steps="Details,Quote & Docs,Agreement,Confirmation"></div>
        </div>

        <!-- Step 1: Details -->
        <div id="fcl-step-details" class="service-step active">
             <div class="dashboard-card" style="margin-bottom: 2rem;">
                <h3>Flash Slots (Instant Booking)</h3>
                <p class="subtitle">Book last-minute container space at a discounted rate.</p>
                <div id="fcl-flash-grid-container" class="fcl-flash-grid">
                    <!-- Flash slots will be rendered here -->
                </div>
            </div>
            <h3 class="section-title" style="text-align: center; margin-top: 0; margin-bottom: 2rem;">Or Get a Custom Quote</h3>

            <form id="fcl-quote-form" class="form-container" novalidate>
                <div class="form-section">
                    <h3>Service Type</h3>
                    <div id="fcl-service-type-selector" class="service-type-selector">
                        <button type="button" class="service-type-btn" data-service-type="port-to-port"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.82m5.84-2.56a17.96 17.96 0 0 0-5.84-2.56m0 0A17.965 17.965 0 0 1 12 2.25a17.965 17.965 0 0 1 5.841 2.56m-8.481 4.68-4.68 8.482a2.25 2.25 0 0 1-3.182 0l-1.26-1.26a2.25 2.25 0 0 1 0-3.182l8.48-4.681a2.25 2.25 0 0 1 3.182 0l1.26 1.26a2.25 2.25 0 0 1 0 3.182Z" /></svg><strong>Port-to-Port</strong><span>You handle haulage to/from ports.</span></button>
                        <button type="button" class="service-type-btn" data-service-type="door-to-port"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125V14.25m-17.25 4.5v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5A3.375 3.375 0 0 0 6.375 7.5h1.125a3.375 3.375 0 0 0 3.375-3.375V3.75M17.25 18.75v-1.875a3.375 3.375 0 0 1 3.375-3.375h1.5c.621 0 1.125.504 1.125 1.125v1.5a3.375 3.375 0 0 1-3.375 3.375h-1.125" /></svg><strong>Door-to-Port</strong><span>We handle pickup, you handle destination.</span></button>
                        <button type="button" class="service-type-btn" data-service-type="port-to-door"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg><strong>Port-to-Door</strong><span>You handle pickup, we handle destination.</span></button>
                        <button type="button" class="service-type-btn" data-service-type="door-to-door"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125V14.25m-17.25 4.5v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5A3.375 3.375 0 0 0 6.375 7.5h1.125a3.375 3.375 0 0 0 3.375-3.375V3.75m1.5-1.5-3.375 3.375" /></svg><strong>Door-to-Door</strong><span>Complete end-to-end logistics.</span></button>
                    </div>
                </div>
                <div class="form-section two-column">
                    <div id="fcl-pickup-section">
                        <h3>Pickup</h3>
                        <div id="fcl-pickup-address-fields" class="hidden">
                             <div class="input-wrapper"><label for="fcl-pickup-name">Sender Name/Company</label><input type="text" id="fcl-pickup-name" required></div>
                             <div class="input-wrapper"><label for="fcl-pickup-country">Country</label><input type="text" id="fcl-pickup-country" required></div>
                        </div>
                        <div id="fcl-pickup-location-fields">
                             <div class="input-wrapper"><label for="fcl-pickup-port">Origin Port (UN/LOCODE)</label><input type="text" id="fcl-pickup-port" placeholder="e.g., CNSHA" required></div>
                        </div>
                    </div>
                    <div id="fcl-delivery-section">
                        <h3>Delivery</h3>
                         <div id="fcl-delivery-address-fields" class="hidden">
                             <div class="input-wrapper"><label for="fcl-delivery-name">Recipient Name/Company</label><input type="text" id="fcl-delivery-name" required></div>
                             <div class="input-wrapper"><label for="fcl-delivery-country">Country</label><input type="text" id="fcl-delivery-country" required></div>
                        </div>
                        <div id="fcl-delivery-location-fields">
                             <div class="input-wrapper"><label for="fcl-delivery-port">Destination Port (UN/LOCODE)</label><input type="text" id="fcl-delivery-port" placeholder="e.g., NLRTM" required></div>
                        </div>
                    </div>
                </div>
                <div class="form-section">
                    <h3>Container Details</h3>
                    <div id="fcl-container-list"></div>
                    <button type="button" id="add-container-btn" class="secondary-btn">Add Container</button>
                </div>
                <div class="form-section">
                    <h3>Cargo Details</h3>
                    <div class="input-wrapper"><label for="fcl-cargo-description">Description of Goods</label><textarea id="fcl-cargo-description" required placeholder="Type a detailed description to get HS code suggestions..."></textarea></div>
                    <div class="hs-code-suggester-wrapper">
                        <div class="input-wrapper">
                            <label for="fcl-hs-code">HS Code</label>
                            <input type="text" id="fcl-hs-code" autocomplete="off">
                             <div class="hs-code-suggestions" id="fcl-hs-code-suggestions"></div>
                        </div>
                    </div>
                </div>
                <div class="form-actions"><button type="submit" class="main-submit-btn">Get Quote & Docs</button></div>
            </form>
        </div>
        
        <!-- Step 2: Combined Quote & Compliance -->
        <div id="fcl-step-quote-compliance" class="service-step">
            <div class="form-container">
                <div class="form-section two-column" style="align-items: flex-start; gap: 2.5rem;">
                    
                    <!-- Left Column: Route & Quote -->
                    <div id="fcl-quote-summary-container">
                        <h3>Route & Quote</h3>
                        <div id="fcl-route-visualizer-container">
                            <!-- Map will be rendered here by JS -->
                        </div>
                        <div id="fcl-quote-summary" class="quote-summary-pro">
                            <!-- Quote will be rendered here -->
                        </div>
                    </div>

                    <!-- Right Column: Forwarding Choice & Compliance -->
                    <div id="fcl-compliance-container">
                        <h3>Forwarding & Add-ons</h3>
                         <div id="fcl-forwarding-choice" class="service-type-selector" style="grid-template-columns: 1fr; margin-bottom: 2rem;">
                            <button type="button" class="service-type-btn active" data-choice="vcanship">
                                <strong>Vcanship Full Service</strong>
                                <span>We handle freight forwarding, customs, and documentation. Recommended.</span>
                            </button>
                            <button type="button" class="service-type-btn" data-choice="own">
                                <strong>Container Booking Only</strong>
                                <span>You manage your own freight forwarding and customs.</span>
                            </button>
                        </div>
                        
                        <div id="fcl-compliance-checklist-wrapper">
                             <h3>Compliance Requirements</h3>
                             <div id="fcl-compliance-checklist"></div>
                        </div>

                        <div id="fcl-compliance-disclaimer" class="hidden">
                            <h3>You're in Control</h3>
                            <p>You have selected to handle your own freight forwarding. You are responsible for all customs clearance, documentation, and compliance regulations.</p>
                        </div>
                        
                        <div id="fcl-addons-section" style="margin-top: 2rem;">
                            <h3>Optional Add-ons</h3>
                            <div class="checkbox-wrapper task-completion-checkbox">
                                <input type="checkbox" id="fcl-insurance-checkbox">
                                <label for="fcl-insurance-checkbox">Add Marine Cargo Insurance</label>
                            </div>
                            <div id="fcl-insurance-fields" class="conditional-fields" style="padding-left: 0; border-left: none; margin-top: 1rem;">
                                <div class="input-wrapper">
                                    <label for="fcl-declared-value">Declared Cargo Value (${State.currentCurrency.code})</label>
                                    <input type="number" id="fcl-declared-value" min="0" placeholder="e.g., 50000">
                                </div>
                            </div>
                        </div>

                        <div id="fcl-acknowledgement-section" style="margin-top: 2rem;">
                             <div class="checkbox-wrapper task-completion-checkbox">
                                <input type="checkbox" id="fcl-compliance-ack-checkbox">
                                <label for="fcl-compliance-ack-checkbox">I acknowledge the document requirements and will ensure compliance.</label>
                            </div>
                        </div>

                    </div>
                </div>
                <div class="form-actions">
                    <button type="button" id="fcl-back-to-details-btn" class="secondary-btn">Back</button>
                    <button type="button" id="fcl-to-agreement-btn" class="main-submit-btn" disabled>Next: Agreement</button>
                </div>
            </div>
        </div>


        <!-- Step 3: Agreement -->
        <div id="fcl-step-agreement" class="service-step">
            <div class="form-container">
                <h3>Sign Agreement</h3>
                <p class="subtitle">Please review the dynamically generated agreement below and type your full name in the box to confirm.</p>
                <div id="fcl-agreement-text" class="agreement-text" style="height: 300px; overflow-y: auto; padding: 1rem; border: 1px solid var(--border-color); border-radius: var(--border-radius); background-color: var(--background-color);"></div>
                <div class="input-wrapper" style="margin-top: 1.5rem;">
                    <label for="fcl-typed-signature">Type Full Name / Company Name to Sign</label>
                    <input type="text" id="fcl-typed-signature" required autocomplete="name" placeholder="e.g., John Doe or Global Logistics Inc.">
                </div>
                <div class="booking-terms-summary">
                    <details>
                        <summary>📦 Booking Terms Summary (click to expand)</summary>
                        <div class="terms-content">
                            <h4>VCanShip Booking Terms Summary</h4>
                            <p>VCanShip is a global logistics marketplace powered by freight-forwarder-grade intelligence. We connect users to trusted logistics providers, warehouses, and customs agents—while guiding every step with AI-powered tools, compliance checks, and transparent pricing.</p>
                            <h4>🛠️ How It Works</h4>
                            <ul>
                                <li><strong>Marketplace Backbone:</strong> We partner with main carriers and fulfillment providers to offer competitive rates and reliable service.</li>
                                <li><strong>Smart Guidance:</strong> Our platform flags restricted items, suggests customs alternatives, and helps users avoid costly delays.</li>
                                <li><strong>Modular Services:</strong> Users can choose full-service shipping or container-only. Add warehousing, trade finance, or compliance support as needed.</li>
                                <li><strong>Transparent Terms:</strong> Users book directly with vetted providers. VCanShip facilitates the process but does not operate transport equipment or handle cargo directly.</li>
                            </ul>
                            <h4>⚖️ Legal & Compliance</h4>
                            <ul>
                                <li>VCanShip is not liable for delays, damages, or customs decisions.</li>
                                <li>All bookings are fulfilled under the terms of the selected provider.</li>
                                <li>Users are responsible for cargo insurance and compliance with international trade laws.</li>
                                <li>Disputes are governed by English law and may be resolved via arbitration in London under LMAA rules.</li>
                            </ul>
                        </div>
                    </details>
                    <div class="checkbox-wrapper" style="margin-top: 1rem;">
                        <input type="checkbox" id="fcl-terms-checkbox">
                        <label for="fcl-terms-checkbox">I’ve reviewed the booking terms and understand the cancellation and compliance policies.</label>
                    </div>
                </div>
                 <div class="form-actions">
                    <button type="button" id="fcl-back-to-compliance-btn" class="secondary-btn">Back</button>
                    <button type="button" id="fcl-to-payment-btn" class="main-submit-btn" disabled>Accept & Book</button>
                </div>
            </div>
        </div>

        <!-- Step 4: Confirmation -->
        <div id="fcl-step-confirmation" class="service-step">
            <div class="confirmation-container">
                <h3 id="fcl-confirmation-title"></h3>
                <p id="fcl-confirmation-message"></p>
                <div class="confirmation-actions">
                    <button id="fcl-download-docs-btn" class="secondary-btn">Download Booking Bundle</button>
                    <button id="fcl-new-shipment-btn" class="main-submit-btn">New FCL Shipment</button>
                </div>
            </div>
        </div>
    `;
    
    page.querySelector('.back-btn')?.addEventListener('click', () => switchPage('landing'));
}

function generateSamplePdf(docTitle: string) {
    try {
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text(`Sample: ${docTitle}`, 105, 20, { align: 'center' });
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text('This is a sample document provided by Vcanship for reference purposes.', 105, 30, { align: 'center' });
        doc.setLineWidth(0.5);
        doc.line(20, 35, 190, 35);
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text('Please replace this with your official, completed documentation.', 20, 45);
        
        doc.setFontSize(10);
        doc.text('Field 1: _________________________', 20, 60);
        doc.text('Field 2: _________________________', 20, 70);
        doc.text('Signature: _______________________', 20, 90);
        
        doc.save(`Vcanship_Sample_${docTitle.replace(/[\s()]/g, '_')}.pdf`);
    } catch(e) {
        console.error("jsPDF error:", e);
        showToast("Could not generate sample PDF.", "error");
    }
}

function handleFclFileUpload(file: File, docId: string) {
    const docIndex = State.fclComplianceDocs.findIndex(d => d.id === docId);
    if (docIndex > -1) {
        const updatedDocs = [...State.fclComplianceDocs];
        updatedDocs[docIndex] = { ...updatedDocs[docIndex], file, status: 'uploaded' };
        setState({ fclComplianceDocs: updatedDocs });
        
        const docItem = document.getElementById(docId);
        if (!docItem) return;

        const idleView = docItem.querySelector('.file-drop-area-idle') as HTMLElement;
        const uploadedView = docItem.querySelector('.file-drop-area-uploaded') as HTMLElement;
        const dropArea = docItem.querySelector('.file-drop-area') as HTMLElement;

        if (idleView && uploadedView && dropArea) {
            idleView.style.display = 'none';
            uploadedView.style.display = 'flex';
            uploadedView.innerHTML = `
                <div class="file-info">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="file-icon">
                      <path fill-rule="evenodd" d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0 0 18.375 9h-7.5A3.75 3.75 0 0 1 7.125 5.25V1.5H5.625Zm7.5 0v3.75c0 .621.504 1.125 1.125 1.125h3.75a3.75 3.75 0 0 1-3.75 3.75h-7.5a.75.75 0 0 0-.75.75v11.25c0 .414.336.75.75.75h12.75a.75.75 0 0 0 .75-.75V12.75a.75.75 0 0 0-.75-.75h-7.5a2.25 2.25 0 0 1-2.25-2.25V1.5h-1.5Z" clip-rule="evenodd" />
                    </svg>
                    <div class="file-details">
                        <span class="file-name">${file.name}</span>
                        <span class="file-status-badge">Uploaded</span>
                    </div>
                </div>
                <button type="button" class="remove-file-btn" aria-label="Remove file" data-doc-id="${docId}">&times;</button>
            `;
            dropArea.style.borderColor = 'var(--success-border-color)';
            docItem.dataset.status = 'uploaded';
            showToast(`${file.name} uploaded.`, 'success');
        }
    }
}

function handleRemoveFclFile(docId: string) {
    const docIndex = State.fclComplianceDocs.findIndex(d => d.id === docId);
     if (docIndex > -1) {
        const updatedDocs = [...State.fclComplianceDocs];
        const removedFileName = updatedDocs[docIndex].file?.name || 'File';
        updatedDocs[docIndex] = { ...updatedDocs[docIndex], file: null, status: 'pending' };
        setState({ fclComplianceDocs: updatedDocs });

        const docItem = document.getElementById(docId);
        if (!docItem) return;

        const idleView = docItem.querySelector('.file-drop-area-idle') as HTMLElement;
        const uploadedView = docItem.querySelector('.file-drop-area-uploaded') as HTMLElement;
        const dropArea = docItem.querySelector('.file-drop-area') as HTMLElement;
        const fileInput = docItem.querySelector('.file-input') as HTMLInputElement;

        if(idleView && uploadedView && dropArea && fileInput) {
            idleView.style.display = 'flex';
            uploadedView.style.display = 'none';
            uploadedView.innerHTML = '';
            dropArea.style.borderColor = 'var(--border-color)';
            docItem.dataset.status = 'pending';
            fileInput.value = ''; // Reset the file input
            showToast(`${removedFileName} removed.`, 'info');
        }
    }
}

// --- WIZARD NAVIGATION & STATE ---
function resetFclWizard() {
    if (State.fclSlotIntervalId) {
        clearInterval(State.fclSlotIntervalId);
        setState({ fclSlotIntervalId: null });
    }
    resetFclState();
    if(DOMElements.fclQuoteForm) DOMElements.fclQuoteForm.reset();
    if(DOMElements.fclContainerList) DOMElements.fclContainerList.innerHTML = '';
    addContainerRow(); // Add one row by default
    handleServiceTypeChange('port-to-port');
    goToFclStep(1);
    renderFlashSlots();
}

function goToFclStep(step: number) {
    const stepIds = ['details', 'quote-compliance', 'agreement', 'confirmation'];
    const currentStepId = stepIds[State.currentFclStep - 1];
    const nextStepId = stepIds[step - 1];

    document.querySelectorAll('#page-fcl .service-step').forEach(s => s.classList.remove('active'));
    
    const nextStepElement = document.getElementById(`fcl-step-${nextStepId}`);

    if (nextStepElement) {
        nextStepElement.classList.add('active');
    }
    
    setState({ currentFclStep: step });
    updateProgressBar('fcl', step - 1);
}

// --- STEP 1: DETAILS ---
function renderFlashSlots() {
    const container = document.getElementById('fcl-flash-grid-container');
    if (!container) return;

    if (State.fclFlashSlots.length === 0) {
        container.innerHTML = `<p class="helper-text">No flash slots currently available. Please check back later or get a custom quote below.</p>`;
        return;
    }

    container.innerHTML = State.fclFlashSlots.map(slot => `
        <div class="flash-slot-card">
            <div class="flash-slot-details">
                <h4>${slot.route}</h4>
                <p>${slot.container} | ETD: ${slot.etd}</p>
                <div class="slot-availability">
                    <progress max="${slot.slotsTotal}" value="${slot.slotsSold}"></progress>
                    <span>${slot.slotsTotal - slot.slotsSold} of ${slot.slotsTotal} slots left</span>
                </div>
            </div>
            <div class="flash-slot-price">
                <strong>${State.currentCurrency.symbol}${slot.price.toFixed(2)}</strong>
                <button class="main-submit-btn book-flash-slot-btn" data-slot-id="${slot.id}">Book Now</button>
            </div>
        </div>
    `).join('');
}


function handleBookFlashSlot(slotId: string) {
    const slot = State.fclFlashSlots.find(s => s.id === slotId);
    if (!slot) {
        showToast("This slot is no longer available.", "error");
        return;
    }

    const [originPort, destPort] = slot.route.split(' → ');

    const details: FclDetails = {
        serviceType: 'port-to-port',
        pickupType: 'location',
        deliveryType: 'location',
        pickupAddress: null,
        deliveryAddress: null,
        pickupPort: originPort.trim(),
        deliveryPort: destPort.trim(),
        cargoDescription: `Booked via Flash Slot: ${slot.container}`,
        hsCode: '0000.00',
        containers: [{ type: slot.container, quantity: 1, weight: 20, weightUnit: 'TON' }],
    };

    const quote: Quote = {
        carrierName: 'Flash Slot Carrier',
        carrierType: 'Ocean Carrier',
        estimatedTransitTime: 'Varies',
        chargeableWeight: 20000,
        chargeableWeightUnit: 'kg',
        weightBasis: 'Actual',
        isSpecialOffer: true,
        totalCost: slot.price,
        costBreakdown: {
            baseShippingCost: slot.price * 0.8,
            fuelSurcharge: slot.price * 0.15,
            estimatedCustomsAndTaxes: 0,
            optionalInsuranceCost: 0,
            ourServiceFee: slot.price * 0.05,
        },
        notes: `Flash Slot Booking for ${slot.container}`,
    };
    
    setState({ fclDetails: details, fclQuote: quote });
    
    const mockComplianceDocs: ComplianceDoc[] = [
        { id: `doc-flash-bol`, title: 'Bill of Lading', description: 'Transport contract', status: 'pending', file: null, required: true },
        { id: `doc-flash-ci`, title: 'Commercial Invoice', description: 'For customs declaration.', status: 'pending', file: null, required: true },
    ];
    setState({ fclComplianceDocs: mockComplianceDocs });

    goToFclStep(2);
    renderQuoteAndCompliance();
    showToast(`Flash Slot for ${slot.route} selected!`, 'success');
}


function addContainerRow() {
    const row = document.createElement('div');
    row.className = 'fcl-container-row';
    row.innerHTML = `
        <div class="fcl-container-fields">
            <div class="fcl-container-details-grid">
                <div class="input-wrapper">
                    <label>Type</label>
                    <select class="fcl-container-type">${CONTAINER_TYPES.map(t => `<option value="${t}">${t}</option>`).join('')}</select>
                </div>
                <div class="input-wrapper"><label>Quantity</label><input type="number" class="fcl-container-quantity" value="1" min="1"></div>
                <div class="input-wrapper"><label>Weight</label><input type="number" class="fcl-container-weight" value="10" min="1"></div>
                <div class="input-wrapper">
                    <label>Unit</label>
                    <select class="fcl-container-weight-unit"><option value="TON">Tons</option><option value="KG">Kg</option></select>
                </div>
            </div>
        </div>
        <button type="button" class="remove-container-btn" aria-label="Remove container">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.58.11-2.368.11a.75.75 0 000 1.5h13.236a.75.75 0 000-1.5c-.788 0-1.573-.033-2.368-.11v-.443A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clip-rule="evenodd" /></svg>
        </button>
    `;
    DOMElements.fclContainerList.appendChild(row);
    row.querySelector('.remove-container-btn')?.addEventListener('click', () => {
        if (DOMElements.fclContainerList.children.length > 1) {
            row.remove();
        } else {
            showToast("You must specify at least one container.", "info");
        }
    });
}

function handleServiceTypeChange(serviceType: FclServiceType) {
    setState({
        fclDetails: { ...(State.fclDetails || {}), serviceType } as FclDetails
    });
    
    document.querySelectorAll('#fcl-service-type-selector .service-type-btn').forEach(btn => {
        btn.classList.toggle('active', (btn as HTMLElement).dataset.serviceType === serviceType);
    });

    const showPickupAddress = serviceType === 'door-to-door' || serviceType === 'door-to-port';
    const showDeliveryAddress = serviceType === 'door-to-door' || serviceType === 'port-to-door';

    DOMElements.fclPickupAddressFields.classList.toggle('hidden', !showPickupAddress);
    DOMElements.fclPickupLocationFields.classList.toggle('hidden', showPickupAddress);
    DOMElements.fclDeliveryAddressFields.classList.toggle('hidden', !showDeliveryAddress);
    DOMElements.fclDeliveryLocationFields.classList.toggle('hidden', showDeliveryAddress);

    (DOMElements.fclPickupName).required = showPickupAddress;
    (DOMElements.fclPickupCountry).required = showPickupAddress;
    (DOMElements.fclPickupPortInput).required = !showPickupAddress;
    (DOMElements.fclDeliveryName).required = showDeliveryAddress;
    (DOMElements.fclDeliveryCountry).required = showDeliveryAddress;
    (DOMElements.fclDeliveryPortInput).required = !showDeliveryAddress;
}

function handleHsCodeSearch(e: Event) {
    const input = e.target as HTMLInputElement;
    const query = input.value.trim();
    const suggestionsContainer = document.getElementById('fcl-hs-code-suggestions');

    if (!suggestionsContainer) return;

    if (hsCodeSearchTimeout) clearTimeout(hsCodeSearchTimeout);

    if (query.length < 3) {
        suggestionsContainer.innerHTML = '';
        suggestionsContainer.classList.remove('active');
        return;
    }
    
    hsCodeSearchTimeout = window.setTimeout(async () => {
        const suggestions = await getHsCodeSuggestions(query);
        if (suggestions.length > 0) {
            suggestionsContainer.innerHTML = suggestions.map(s => `
                <div class="hs-code-suggestion-item" data-code="${s.code}">
                    <strong>${s.code}</strong> - ${s.description}
                </div>
            `).join('');
            suggestionsContainer.classList.add('active');
        } else {
            suggestionsContainer.innerHTML = '';
            suggestionsContainer.classList.remove('active');
        }
    }, 300);
}

// --- STEP 2: QUOTE & COMPLIANCE ---
async function handleQuoteFormSubmit(e: Event) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    if (!form.checkValidity()) {
        showToast("Please fill in all required fields.", "error");
        return;
    }

    const containers: FclContainer[] = Array.from(document.querySelectorAll('#fcl-container-list .fcl-container-row')).map(row => ({
        type: (row.querySelector('.fcl-container-type') as HTMLSelectElement).value,
        quantity: parseInt((row.querySelector('.fcl-container-quantity') as HTMLInputElement).value, 10),
        weight: parseInt((row.querySelector('.fcl-container-weight') as HTMLInputElement).value, 10),
        weightUnit: (row.querySelector('.fcl-container-weight-unit') as HTMLSelectElement).value,
    }));
    
    const serviceType = State.fclDetails!.serviceType;
    const details: FclDetails = {
        serviceType,
        pickupType: serviceType.startsWith('door') ? 'address' : 'location',
        deliveryType: serviceType.endsWith('door') ? 'address' : 'location',
        pickupAddress: serviceType.startsWith('door') ? { name: DOMElements.fclPickupName.value, country: DOMElements.fclPickupCountry.value } : null,
        deliveryAddress: serviceType.endsWith('door') ? { name: DOMElements.fclDeliveryName.value, country: DOMElements.fclDeliveryCountry.value } : null,
        pickupPort: !serviceType.startsWith('door') ? DOMElements.fclPickupPortInput.value : null,
        deliveryPort: !serviceType.endsWith('door') ? DOMElements.fclDeliveryPortInput.value : null,
        cargoDescription: DOMElements.fclCargoDescription.value,
        hsCode: DOMElements.fclHsCodeInput.value,
        containers,
    };
    setState({ fclDetails: details });
    
    // --- Render Skeletons ---
    goToFclStep(2);
    document.getElementById('fcl-quote-summary')!.innerHTML = '<div class="quote-summary-pro-skeleton"></div>';
    document.getElementById('fcl-compliance-checklist')!.innerHTML = '<div class="compliance-checklist-skeleton"></div>';

    const apiResponse = await getFclQuotes(details);
    if (apiResponse && apiResponse.quotes.length > 0) {
        const quote = apiResponse.quotes[0];
        // FIX: Explicitly type the mapped object as ComplianceDoc to prevent type inference issues with the 'status' property.
        const complianceDocs: ComplianceDoc[] = (apiResponse.complianceReport.requirements || []).map((req: any, i: number): ComplianceDoc => ({
            id: `doc-${i}`,
            title: req.title,
            description: req.details,
            status: 'pending',
            file: null,
            required: true,
        }));
        setState({ fclQuote: quote, fclComplianceDocs: complianceDocs });
        renderQuoteAndCompliance();
    } else {
        showToast("No quotes found for this route.", "error");
        goToFclStep(1);
    }
}

function renderFclRouteVisualizer() {
    const container = document.getElementById('fcl-route-visualizer-container');
    if (!container || !State.fclDetails) return;

    const originPort = (State.fclDetails.pickupPort || '').toUpperCase();
    const destPort = (State.fclDetails.deliveryPort || '').toUpperCase();

    // Find a match for the start of the port code if full code is not found
    const findPort = (code: string) => {
        if (!code) return null;
        if (MOCK_PORT_COORDS[code]) return MOCK_PORT_COORDS[code];
        const key = Object.keys(MOCK_PORT_COORDS).find(k => code.startsWith(k));
        return key ? MOCK_PORT_COORDS[key] : null;
    };

    const originCoords = findPort(originPort);
    const destCoords = findPort(destPort);

    if (!originCoords || !destCoords) {
        container.innerHTML = `
            <div class="fcl-route-visualizer unavailable">
                <div class="fcl-route-map-image"></div>
                <div class="unavailable-overlay">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="unavailable-icon"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
                    <h4>Route Visualization Unavailable</h4>
                    <p class="helper-text">Could not map one or more specified ports. Please check the UN/LOCODEs.</p>
                </div>
            </div>`;
        return;
    }

    const { top: startY, left: startX } = originCoords;
    const { top: endY, left: endX } = destCoords;

    // Calculate a simple control point for the curve
    const controlX = (startX + endX) / 2 + (startY - endY) * 0.2; // Add some horizontal curve
    const controlY = (startY + endY) / 2 - Math.abs(startX - endX) * 0.2; // Add some vertical curve
    
    container.innerHTML = `
    <div class="fcl-route-visualizer">
        <div class="fcl-route-map-image"></div>
        <div class="fcl-map-pin origin" style="top: ${startY}%; left: ${startX}%;" title="Origin: ${originPort}">O</div>
        <div class="fcl-map-pin destination" style="top: ${endY}%; left: ${endX}%;" title="Destination: ${destPort}">D</div>
        <svg class="fcl-route-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path class="fcl-route-path" d="M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}" vector-effect="non-scaling-stroke" />
        </svg>
    </div>
    `;
}

function updateFclTotalCost() {
    const { fclQuote, fclInsuranceCost } = State;
    const quoteSummary = document.getElementById('fcl-quote-summary');
    if (!fclQuote || !quoteSummary) return;

    const baseCost = fclQuote.totalCost;
    const totalCost = baseCost + fclInsuranceCost;

    quoteSummary.innerHTML = `
        <div class="quote-summary-pro-header">
            <img src="https://logo.clearbit.com/${fclQuote.carrierName.toLowerCase().replace(/\s/g, '')}.com?size=40" alt="${fclQuote.carrierName}" class="carrier-logo" onerror="this.style.display='none'">
            <h3>${fclQuote.carrierName}</h3>
        </div>
        <div class="quote-summary-pro-body">
            <p class="quote-meta">Est. Transit Time: <strong>${fclQuote.estimatedTransitTime}</strong></p>
            <hr class="quote-divider">
            <div class="review-item"><span>Base Freight:</span> <span>${State.currentCurrency.symbol}${fclQuote.costBreakdown.baseShippingCost.toFixed(2)}</span></div>
            <div class="review-item"><span>Surcharges:</span> <span>${State.currentCurrency.symbol}${fclQuote.costBreakdown.fuelSurcharge.toFixed(2)}</span></div>
            <div id="fcl-insurance-line-item" class="review-item ${fclInsuranceCost > 0 ? '' : 'hidden'}">
                <span>Marine Insurance:</span> <span>${State.currentCurrency.symbol}${fclInsuranceCost.toFixed(2)}</span>
            </div>
            <hr class="quote-divider">
            <div class="review-item total">
                <span>Total Cost:</span>
                <strong class="total-cost-amount">${State.currentCurrency.symbol}${totalCost.toFixed(2)}</strong>
            </div>
        </div>
    `;
}

function renderQuoteAndCompliance() {
    const { fclQuote, fclComplianceDocs } = State;
    const complianceChecklist = document.getElementById('fcl-compliance-checklist');
    
    renderFclRouteVisualizer();
    updateFclTotalCost(); // Initial render of the quote
    
    if (fclComplianceDocs && complianceChecklist) {
        complianceChecklist.innerHTML = fclComplianceDocs.map(doc => `
             <div class="compliance-doc-item" id="${doc.id}" data-status="${doc.status}">
                <div class="compliance-doc-info">
                    <h4>${doc.title}</h4>
                    <p>${doc.description}</p>
                    <button type="button" class="secondary-btn download-sample-btn" data-doc-title="${doc.title}">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" /><path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" /></svg>
                        Download Sample
                    </button>
                </div>
                <div class="file-drop-area" data-doc-id="${doc.id}">
                    <div class="file-drop-area-idle">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="upload-icon">
                          <path fill-rule="evenodd" d="M11.47 2.47a.75.75 0 0 1 1.06 0l4.5 4.5a.75.75 0 0 1-1.06 1.06l-3.22-3.22V16.5a.75.75 0 0 1-1.5 0V4.81L8.03 8.03a.75.75 0 0 1-1.06-1.06l4.5-4.5ZM3 15.75A2.25 2.25 0 0 1 5.25 18h13.5A2.25 2.25 0 0 1 21 15.75v-3a.75.75 0 0 1 1.5 0v3A3.75 3.75 0 0 1 18.75 19.5H5.25A3.75 3.75 0 0 1 1.5 15.75v-3a.75.75 0 0 1 1.5 0v3Z" clip-rule="evenodd" />
                        </svg>
                        <p><strong>Click to upload</strong> or drag & drop</p>
                        <p class="file-types">PDF, DOCX (max 5MB)</p>
                    </div>
                    <div class="file-drop-area-uploaded" style="display: none;"></div>
                    <input type="file" class="file-input" accept=".pdf,.doc,.docx" data-doc-id="${doc.id}">
                </div>
            </div>
        `).join('');
        
        complianceChecklist.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            const downloadBtn = target.closest<HTMLElement>('.download-sample-btn');
            if (downloadBtn?.dataset.docTitle) {
                generateSamplePdf(downloadBtn.dataset.docTitle);
                return;
            }
            const removeBtn = target.closest<HTMLElement>('.remove-file-btn');
            if (removeBtn?.dataset.docId) {
                handleRemoveFclFile(removeBtn.dataset.docId);
                return;
            }
            const dropArea = target.closest<HTMLElement>('.file-drop-area');
            if (dropArea) {
                (dropArea.querySelector('.file-input') as HTMLInputElement)?.click();
            }
        });

        complianceChecklist.querySelectorAll<HTMLElement>('.file-drop-area').forEach(area => {
            const input = area.querySelector('.file-input') as HTMLInputElement;
            const docId = area.dataset.docId!;

            input.addEventListener('change', () => {
                if (input.files && input.files.length > 0) {
                    handleFclFileUpload(input.files[0], docId);
                }
            });

            area.addEventListener('dragover', (e) => { e.preventDefault(); area.classList.add('dragover'); });
            area.addEventListener('dragleave', () => area.classList.remove('dragover'));
            area.addEventListener('drop', (e: DragEvent) => {
                e.preventDefault();
                area.classList.remove('dragover');
                if (e.dataTransfer?.files?.[0]) {
                    handleFclFileUpload(e.dataTransfer.files[0], docId);
                    input.value = '';
                }
            });
        });
    }
}


// --- STEP 3: AGREEMENT ---
function generateAgreementText() {
    const { fclDetails, fclQuote, fclInsuranceCost } = State;
    if (!fclDetails || !fclQuote) return 'Agreement could not be generated.';
    const totalCost = fclQuote.totalCost + fclInsuranceCost;
    return `
        <h4>1. Parties</h4>
        <p>This FCL Booking Agreement is between the Shipper (hereinafter "you") and Vcanship (hereinafter "we").</p>
        <h4>2. Scope of Service</h4>
        <p>We agree to arrange for the ocean carriage of your cargo from <strong>${fclDetails.pickupPort || fclDetails.pickupAddress?.country}</strong> to <strong>${fclDetails.deliveryPort || fclDetails.deliveryAddress?.country}</strong>.</p>
        <h4>3. Cargo Details</h4>
        <p>You declare the cargo is: "${fclDetails.cargoDescription}" with HS Code ${fclDetails.hsCode}. Total containers: ${fclDetails.containers.reduce((sum, c) => sum + c.quantity, 0)}.</p>
        <h4>4. Financial Terms</h4>
        <p>The total agreed freight charge is <strong>${State.currentCurrency.symbol}${totalCost.toFixed(2)}</strong>, payable in full before cargo release at origin.</p>
        ${fclInsuranceCost > 0 ? `<h4>5. Insurance</h4><p>This agreement includes Marine Cargo Insurance up to the declared value of ${State.currentCurrency.symbol}${State.fclDeclaredValue}.</p>` : ''}
    `;
}

// --- FINAL STEPS ---

function handleConfirmPayment() {
    const payButton = document.getElementById('fcl-confirm-payment-btn') as HTMLButtonElement | null;
    if (!payButton || payButton.disabled) return;
    
    const originalButtonText = payButton.textContent;
    payButton.disabled = true;
    payButton.textContent = 'Processing...';
    toggleLoading(true, "Processing Payment...");

    setTimeout(() => {
        toggleLoading(false);
        const paymentSucceeded = Math.random() > 0.1;

        if (paymentSucceeded) {
            const bookingId = `FCL-${Date.now().toString().slice(-6)}`;
            setState({ fclBookingId: bookingId });
            (DOMElements.fclConfirmationTitle as HTMLElement).textContent = '✅ Booking Confirmed!';
            // FIX: Correct property from 'destPort' to 'deliveryPort' and improve logic for door/port services.
            const origin = State.fclDetails?.pickupPort || State.fclDetails?.pickupAddress?.country;
            const destination = State.fclDetails?.deliveryPort || State.fclDetails?.deliveryAddress?.country;
            (DOMElements.fclConfirmationMessage as HTMLElement).innerHTML = `Your FCL booking <strong>#${bookingId}</strong> from ${origin} to ${destination} is confirmed.`;
            goToFclStep(4);
        } else {
            showToast("Payment failed. Please try again.", "error");
            payButton.disabled = false;
            payButton.textContent = originalButtonText;
        }
    }, 1500);
}
// --- EVENT LISTENERS & INITIALIZATION ---

function attachFclEventListeners() {
    DOMElements.fclQuoteForm?.addEventListener('submit', handleQuoteFormSubmit);
    document.getElementById('add-container-btn')?.addEventListener('click', addContainerRow);
    
    document.querySelectorAll('#fcl-service-type-selector .service-type-btn').forEach(btn => {
        btn.addEventListener('click', (e) => handleServiceTypeChange((e.currentTarget as HTMLElement).dataset.serviceType as FclServiceType));
    });

    DOMElements.fclHsCodeInput?.addEventListener('input', handleHsCodeSearch);
    document.getElementById('fcl-hs-code-suggestions')?.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const item = target.closest<HTMLElement>('.hs-code-suggestion-item');
        if (item?.dataset.code && DOMElements.fclHsCodeInput) {
            DOMElements.fclHsCodeInput.value = item.dataset.code;
            (document.getElementById('fcl-hs-code-suggestions') as HTMLElement).classList.remove('active');
        }
    });

    // Navigation
    DOMElements.fclNav.backToDetails?.addEventListener('click', () => goToFclStep(1));
    
    DOMElements.fclNav.backToCompliance?.addEventListener('click', () => goToFclStep(2));
    
    DOMElements.fclNav.toPayment?.addEventListener('click', () => {
        const signatureInput = document.getElementById('fcl-typed-signature') as HTMLInputElement;
        if (!signatureInput.value.trim()) {
            showToast('Please type your name to sign the agreement.', 'error');
            return;
        }
        
        // Mock payment & confirmation
        toggleLoading(true, "Confirming booking...");
        setTimeout(() => {
            toggleLoading(false);
            const bookingId = `FCL-${Date.now().toString().slice(-6)}`;
            setState({ fclBookingId: bookingId });
            const confirmationTitle = document.getElementById('fcl-confirmation-title');
            const confirmationMessage = document.getElementById('fcl-confirmation-message');
            const origin = State.fclDetails?.pickupPort || State.fclDetails?.pickupAddress?.country;
            const destination = State.fclDetails?.deliveryPort || State.fclDetails?.deliveryAddress?.country;
            if (confirmationTitle) confirmationTitle.textContent = '✅ Booking Confirmed!';
            if (confirmationMessage) confirmationMessage.innerHTML = `Your FCL booking <strong>#${bookingId}</strong> from ${origin} to ${destination} is confirmed.`;
            goToFclStep(4);
        }, 1500);
    });
    
    DOMElements.fclNav.newShipment?.addEventListener('click', resetFclWizard);
    DOMElements.fclNav.downloadDocs?.addEventListener('click', () => showToast('PDF generation is not implemented in this demo.', 'info'));

    // Event delegation for flash slots
    document.getElementById('fcl-flash-grid-container')?.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const bookBtn = target.closest<HTMLButtonElement>('.book-flash-slot-btn');
        if (bookBtn?.dataset.slotId) {
            handleBookFlashSlot(bookBtn.dataset.slotId);
        }
    });
    
    document.getElementById('fcl-forwarding-choice')?.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const choiceBtn = target.closest<HTMLButtonElement>('.service-type-btn');
        if (choiceBtn) {
            document.querySelectorAll('#fcl-forwarding-choice .service-type-btn').forEach(b => b.classList.remove('active'));
            choiceBtn.classList.add('active');
            
            const isVcanShip = choiceBtn.dataset.choice === 'vcanship';
            document.getElementById('fcl-compliance-checklist-wrapper')?.classList.toggle('hidden', !isVcanShip);
            document.getElementById('fcl-compliance-disclaimer')?.classList.toggle('hidden', isVcanShip);
        }
    });

    // Insurance and Compliance Ack Listeners
    const insuranceCheckbox = document.getElementById('fcl-insurance-checkbox') as HTMLInputElement;
    const declaredValueInput = document.getElementById('fcl-declared-value') as HTMLInputElement;
    const complianceAckCheckbox = document.getElementById('fcl-compliance-ack-checkbox') as HTMLInputElement;
    const toAgreementBtn = document.getElementById('fcl-to-agreement-btn') as HTMLButtonElement;

    insuranceCheckbox?.addEventListener('change', () => {
        const fields = document.getElementById('fcl-insurance-fields');
        fields?.classList.toggle('visible', insuranceCheckbox.checked);
        if (!insuranceCheckbox.checked) {
            declaredValueInput.value = '';
            setState({ fclInsuranceAdded: false, fclDeclaredValue: 0, fclInsuranceCost: 0 });
            updateFclTotalCost();
        } else {
             setState({ fclInsuranceAdded: true });
        }
    });

    declaredValueInput?.addEventListener('input', () => {
        const value = parseFloat(declaredValueInput.value) || 0;
        const premium = value * 0.005; // 0.5% premium
        setState({ fclDeclaredValue: value, fclInsuranceCost: premium });
        updateFclTotalCost();
    });

    complianceAckCheckbox?.addEventListener('change', () => {
        if(toAgreementBtn) toAgreementBtn.disabled = !complianceAckCheckbox.checked;
    });

    // Agreement Step Listeners
    const updateFclAgreementButtonState = () => {
        const signatureInput = document.getElementById('fcl-typed-signature') as HTMLInputElement;
        const termsCheckbox = document.getElementById('fcl-terms-checkbox') as HTMLInputElement;
        const toPaymentBtn = document.getElementById('fcl-to-payment-btn') as HTMLButtonElement;

        if (toPaymentBtn && signatureInput && termsCheckbox) {
            toPaymentBtn.disabled = !signatureInput.value.trim() || !termsCheckbox.checked;
        }
    };

    DOMElements.fclNav.toAgreement?.addEventListener('click', () => {
        goToFclStep(3);
        const agreementTextEl = document.getElementById('fcl-agreement-text');
        if (agreementTextEl) agreementTextEl.innerHTML = generateAgreementText();
        updateFclAgreementButtonState();
    });

    document.getElementById('fcl-typed-signature')?.addEventListener('input', updateFclAgreementButtonState);
    document.getElementById('fcl-terms-checkbox')?.addEventListener('change', updateFclAgreementButtonState);
}

// FIX: Add missing exported function 'startFcl'
export function startFcl() {
    setState({ currentService: 'fcl' });
    renderFclPage();
    switchPage('fcl');
    resetFclWizard();
    attachFclEventListeners();
}