// ⚠️  READ-ONLY — DO NOT EDIT — SERVICE LOCKED ⚠️
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { State, setState, resetRailwayState, type RailwayCargoType, type RailwayServiceLevel, type RailwayDetails, type ComplianceDoc, type Quote } from './state';
import { DOMElements } from './dom';
import { showToast, updateProgressBar, switchPage, toggleLoading } from './ui';
import { Type } from '@google/genai';

// --- DATA CONSTANTS ---
const RAIL_TERMINALS: Record<string, string[]> = {
    "India": ["ICD Tughlakabad (Delhi)", "ICD Dadri (NCR)", "Mundra Port Rail", "Chennai Port Rail", "ICD Whitefield (Bengaluru)", "ICD Sanatnagar (Hyderabad)"],
    "Malaysia": ["Port Klang Westport Rail", "Port Klang Northport Rail", "Padang Besar (border to Thailand)", "Kempas Baru ICD (Johor)"],
    "Singapore": ["Tanjong Pagar Rail Terminal (Sembawang)", "Tuas Port Rail"],
    "Thailand": ["Lat Krabang ICD (Bangkok)", "Bangkok Port Rail", "Padang Besar (border to Malaysia)", "Chiang Khong (border to Laos)"],
    "Vietnam": ["ICD Phuoc Long (HCMC)", "ICD Giap Bat (Hanoi)", "Hai Phong Port Rail", "Dong Dang"],
};

// --- RENDER FUNCTION ---
function renderRailwayPage() {
    const page = document.getElementById('page-railway');
    if (!page) return;

    page.innerHTML = `
        <button class="back-btn">Back to Services</button>
        <div class="service-page-header">
            <h2>Railway Freight</h2>
            <p class="subtitle">Cross-border rail solutions for a cost-effective, eco-friendly alternative.</p>
            <div id="progress-bar-railway" data-steps="Details,Cargo & Service,Docs,Quote,Confirmation"></div>
        </div>

        <!-- Step 1: Details -->
        <div id="railway-step-details" class="service-step active">
            <form id="railway-details-form" class="form-container">
                <div class="form-section two-column">
                    <div class="input-wrapper">
                        <label for="railway-origin-terminal">Origin Terminal</label>
                        <select id="railway-origin-terminal" required></select>
                    </div>
                    <div class="input-wrapper">
                        <label for="railway-dest-terminal">Destination Terminal</label>
                        <select id="railway-dest-terminal" required></select>
                    </div>
                </div>
                <div class="form-section">
                    <h3>Cargo Details</h3>
                    <div class="input-wrapper">
                        <label for="railway-cargo-description">Description of Goods</label>
                        <textarea id="railway-cargo-description" required placeholder="e.g., 15 tons of electronics parts"></textarea>
                    </div>
                </div>
                <div class="form-actions">
                    <button type="submit" class="main-submit-btn">Next</button>
                </div>
            </form>
        </div>
        
        <!-- Step 2: Cargo & Service -->
        <div id="railway-step-cargo" class="service-step">
            <div class="form-container">
                <h3>Cargo & Service Type</h3>
                 <div class="form-section">
                    <label class="checkbox-group-label">Cargo Type</label>
                     <div id="railway-cargo-type-selector" class="service-type-selector">
                        <button type="button" class="service-type-btn active" data-type="standard-container">Standard Container</button>
                        <button type="button" class="service-type-btn" data-type="bulk-wagon">Bulk Wagon</button>
                        <button type="button" class="service-type-btn" data-type="special-cargo">Special / Oversized</button>
                    </div>
                </div>
                 <div class="form-section">
                    <label class="checkbox-group-label">Service Level</label>
                     <div id="railway-service-level-selector" class="service-type-selector">
                        <button type="button" class="service-type-btn active" data-type="standard">Standard Rail</button>
                        <button type="button" class="service-type-btn" data-type="express-block-train">Express Block Train</button>
                    </div>
                </div>
                 <div class="form-actions">
                    <button type="button" id="railway-back-to-details-btn" class="secondary-btn">Back</button>
                    <button type="button" id="railway-to-docs-btn" class="main-submit-btn">Next: Documents</button>
                </div>
            </div>
        </div>

        <!-- Step 3: Docs -->
        <div id="railway-step-docs" class="service-step">
            <div class="form-container">
                <h3>Required Documents</h3>
                <div id="railway-compliance-checklist" class="compliance-checklist"></div>
                 <div class="form-actions">
                    <button type="button" id="railway-back-to-cargo-btn" class="secondary-btn">Back</button>
                    <button type="button" id="railway-to-quote-btn" class="main-submit-btn">Get Quote</button>
                </div>
            </div>
        </div>
        
        <!-- Step 4: Quote -->
        <div id="railway-step-quote" class="service-step">
            <div class="form-container">
                <h3>Your Railway Quote</h3>
                <div id="railway-quote-summary" class="quote-summary-pro"></div>
                 <div class="form-actions">
                    <button type="button" id="railway-back-to-docs-btn" class="secondary-btn">Back</button>
                    <button type="button" id="railway-to-confirmation-btn" class="main-submit-btn">Accept & Book</button>
                </div>
            </div>
        </div>

        <!-- Step 5: Confirmation -->
        <div id="railway-step-confirmation" class="service-step">
            <div class="confirmation-container">
                <h3 id="railway-confirmation-title"></h3>
                <p id="railway-confirmation-message"></p>
                <div class="confirmation-actions">
                    <button type="button" id="railway-download-pdf-btn" class="secondary-btn">Download PDF</button>
                    <button type="button" id="railway-new-shipment-btn" class="main-submit-btn">New Shipment</button>
                </div>
            </div>
        </div>
    `;
    page.querySelector('.back-btn')?.addEventListener('click', () => switchPage('landing'));
}

// --- WIZARD LOGIC ---
function goToRailwayStep(step: number) {
    setState({ currentRailwayStep: step });
    const stepIds = ['details', 'cargo', 'docs', 'quote', 'confirmation'];
    document.querySelectorAll('#page-railway .service-step').forEach(s => s.classList.remove('active'));
    document.getElementById(`railway-step-${stepIds[step - 1]}`)?.classList.add('active');
    updateProgressBar('railway', step - 1);
}

function resetRailwayWizard() {
    resetRailwayState();
    const form = document.getElementById('railway-details-form') as HTMLFormElement | null;
    if (form) form.reset();
    populateTerminals();
    goToRailwayStep(1);
}

// --- DATA & EVENT HANDLERS ---
function populateTerminals() {
    const originSelect = document.getElementById('railway-origin-terminal') as HTMLSelectElement | null;
    const destSelect = document.getElementById('railway-dest-terminal') as HTMLSelectElement | null;
    if (!originSelect || !destSelect) return;

    const optionsHtml = Object.entries(RAIL_TERMINALS).map(([country, terminals]) => 
        `<optgroup label="${country}">${terminals.map(t => `<option value="${t}">${t}</option>`).join('')}</optgroup>`
    ).join('');
    
    originSelect.innerHTML = optionsHtml;
    destSelect.innerHTML = optionsHtml;
}

function handleDetailsSubmit(e: Event) {
    e.preventDefault();
    const originTerminal = (document.getElementById('railway-origin-terminal') as HTMLSelectElement).value;
    const destTerminal = (document.getElementById('railway-dest-terminal') as HTMLSelectElement).value;
    const cargoDescription = (document.getElementById('railway-cargo-description') as HTMLTextAreaElement).value;

    if (originTerminal === destTerminal) {
        showToast("Origin and destination terminals cannot be the same.", "error");
        return;
    }

    const details: Partial<RailwayDetails> = { originTerminal, destTerminal, cargoDescription };
    setState({ railwayDetails: { ...State.railwayDetails, ...details } as RailwayDetails });
    goToRailwayStep(2);
}

function handleCargoAndServiceSubmit() {
    const cargoType = (document.querySelector('#railway-cargo-type-selector .active') as HTMLElement)?.dataset.type as RailwayCargoType;
    const serviceLevel = (document.querySelector('#railway-service-level-selector .active') as HTMLElement)?.dataset.type as RailwayServiceLevel;
    
    setState({
        railwayDetails: { ...State.railwayDetails, cargoType, serviceLevel } as RailwayDetails
    });
    
    renderComplianceStep();
    goToRailwayStep(3);
}

function renderComplianceStep() {
    let docs: ComplianceDoc[] = [
        { id: 'doc-rail-cmr', title: 'Rail Consignment Note (CMR/CIM)', description: 'International transport document for rail.', status: 'pending', file: null, required: true },
        { id: 'doc-rail-ci', title: 'Commercial Invoice', description: 'Standard invoice for goods.', status: 'pending', file: null, required: true },
    ];
    setState({ railwayComplianceDocs: docs });
    
    const checklist = document.getElementById('railway-compliance-checklist');
    if (!checklist) return;

    checklist.innerHTML = docs.map(doc => `
        <div class="compliance-doc-item">
            <h4>${doc.title} ${doc.required ? '(Required)' : ''}</h4>
            <p>${doc.description}</p>
        </div>
    `).join('');
}

function handleGetQuote() {
    const { railwayDetails } = State;
    if (!railwayDetails) return;
    
    toggleLoading(true, "Calculating rail freight rates...");
    setTimeout(() => {
        const mockQuote: Quote = {
            carrierName: "Cross-Continental Rail",
            carrierType: "Rail Operator",
            estimatedTransitTime: railwayDetails.serviceLevel === 'express-block-train' ? "12-15 days" : "18-22 days",
            totalCost: railwayDetails.serviceLevel === 'express-block-train' ? 5500 : 4200,
            chargeableWeight: 15000,
            chargeableWeightUnit: 'kg',
            weightBasis: 'Actual',
            isSpecialOffer: false,
            notes: 'Rate per 40ft container.',
            costBreakdown: { baseShippingCost: 3800, fuelSurcharge: 300, estimatedCustomsAndTaxes: 0, optionalInsuranceCost: 0, ourServiceFee: 100 }
        };
        setState({ railwayQuote: mockQuote });

        const summary = document.getElementById('railway-quote-summary');
        if (summary) {
            summary.innerHTML = `
                <div class="review-item"><span>Operator:</span> <strong>${mockQuote.carrierName}</strong></div>
                <div class="review-item"><span>Route:</span> <strong>${railwayDetails.originTerminal} &rarr; ${railwayDetails.destTerminal}</strong></div>
                <div class="review-item"><span>Est. Transit:</span> <strong>${mockQuote.estimatedTransitTime}</strong></div>
                <div class="review-item total"><span>Total Cost:</span> <strong>$${mockQuote.totalCost.toFixed(2)}</strong></div>
            `;
        }
        toggleLoading(false);
        goToRailwayStep(4);
    }, 1200);
}

function handleConfirmBooking() {
    const bookingId = `RW-${Date.now().toString().slice(-6)}`;
    setState({ railwayBookingId: bookingId });

    const title = document.getElementById('railway-confirmation-title');
    const message = document.getElementById('railway-confirmation-message');
    if (title) title.textContent = `✅ Booking Confirmed: #${bookingId}`;
    if (message) message.textContent = `Your railway shipment from ${State.railwayDetails?.originTerminal} to ${State.railwayDetails?.destTerminal} is confirmed.`;
    
    goToRailwayStep(5);
}

// --- INITIALIZATION ---
function attachRailwayEventListeners() {
    document.getElementById('railway-details-form')?.addEventListener('submit', handleDetailsSubmit);
    
    // Cargo & Service Type selectors
    document.querySelectorAll('#railway-cargo-type-selector .service-type-btn, #railway-service-level-selector .service-type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.parentElement?.querySelectorAll('.service-type-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // Navigation
    document.getElementById('railway-back-to-details-btn')?.addEventListener('click', () => goToRailwayStep(1));
    document.getElementById('railway-to-docs-btn')?.addEventListener('click', handleCargoAndServiceSubmit);
    document.getElementById('railway-back-to-cargo-btn')?.addEventListener('click', () => goToRailwayStep(2));
    document.getElementById('railway-to-quote-btn')?.addEventListener('click', handleGetQuote);
    document.getElementById('railway-back-to-docs-btn')?.addEventListener('click', () => goToRailwayStep(3));
    document.getElementById('railway-to-confirmation-btn')?.addEventListener('click', handleConfirmBooking);
    
    document.getElementById('railway-new-shipment-btn')?.addEventListener('click', resetRailwayWizard);
}

export function startRailway() {
    try {
        setState({ currentService: 'railway' });
        renderRailwayPage();
        switchPage('railway');
        resetRailwayWizard();
        attachRailwayEventListeners();
    } catch (error) {
        console.error("Failed to initialize Railway service:", error);
        showToast("Could not load the Railway service.", "error");
        switchPage('landing');
    }
}