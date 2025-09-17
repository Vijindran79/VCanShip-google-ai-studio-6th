// ⚠️  READ-ONLY — DO NOT EDIT — SERVICE LOCKED ⚠️
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { State, setState, resetAirfreightState, type AirfreightDetails, type ComplianceDoc, type Quote, type AirfreightServiceLevel, type AirfreightCargoPiece } from './state';
import { showToast, switchPage, updateProgressBar, toggleLoading, showPrelaunchModal } from './ui';
import { DOMElements } from './dom';
import { type GenerateContentResponse } from '@google/genai';

// --- DATA CONSTANTS ---
const CARGO_MATRIX = [
    { category: 'General Cargo', examples: 'textiles, electronics, auto-parts', code: 'GCR' },
    { category: 'Pharma & Life-Science', examples: 'vaccines, insulin, blood plasma', code: 'PER, RCL' },
    { category: 'Perishables', examples: 'fresh fruit, flowers, meat, seafood', code: 'PER' },
    { category: 'Live Animals', examples: 'pets, day-old chicks, fish fry', code: 'AVI' },
    { category: 'Dangerous Goods', examples: 'lithium batteries, aerosols, paint', code: 'DGR' },
    { category: 'Valuables', examples: 'gold bars, banknotes, jewellery', code: 'VAL' },
    { category: 'Vulnerable', examples: 'high-value electronics', code: 'VAL' },
    { category: 'Human Remains', examples: 'ashes, coffin', code: 'HUM' },
    { category: 'AOG Spares', examples: 'aircraft engines, tyres', code: 'AOG' },
    { category: 'Courier & E-commerce', examples: 'parcels, documents', code: 'CE' },
    { category: 'Oversized / Heavy', examples: 'oil-rig part', code: 'OOG' },
    { category: 'Mail & Diplomatic Bags', examples: 'mail', code: 'MAIL' },
];

// --- UI RENDERING ---
function renderAirfreightPage() {
    const page = document.getElementById('page-airfreight');
    if (!page) return;

    page.innerHTML = `
        <button class="back-btn">Back to Services</button>
        <div class="service-page-header">
            <h2>Ship with Air Freight</h2>
            <p class="subtitle">Fast and reliable global air cargo solutions.</p>
            <div id="progress-bar-airfreight" data-steps="Details,Dimensions,Service,Docs,Rates,Confirmation"></div>
        </div>

        <!-- Step 1: Details -->
        <div id="airfreight-step-details" class="service-step active">
            <form id="airfreight-details-form" class="form-container">
                <div class="form-section">
                    <h3>1. What are you shipping?</h3>
                    <div class="input-wrapper">
                        <label for="airfreight-cargo-type">Cargo Category</label>
                        <select id="airfreight-cargo-type" required></select>
                    </div>
                    <div class="input-wrapper">
                        <label for="airfreight-cargo-description">Detailed Cargo Description</label>
                        <textarea id="airfreight-cargo-description" placeholder="e.g., 10 boxes of smartphones, model X" required></textarea>
                    </div>
                     <div class="input-wrapper">
                        <label for="airfreight-hs-code">HS Code (auto-detected)</label>
                        <input type="text" id="airfreight-hs-code" placeholder="Will be filled by AI" readonly>
                    </div>
                </div>
                 <div class="form-section two-column">
                    <div>
                        <h3>2. Where is it going?</h3>
                        <div class="input-wrapper">
                            <label for="airfreight-origin-airport">Origin Airport (IATA Code)</label>
                            <input type="text" id="airfreight-origin-airport" placeholder="e.g., LAX" required>
                        </div>
                    </div>
                    <div>
                        <h3 style="visibility: hidden;">Destination</h3>
                         <div class="input-wrapper">
                            <label for="airfreight-dest-airport">Destination Airport (IATA Code)</label>
                            <input type="text" id="airfreight-dest-airport" placeholder="e.g., LHR" required>
                        </div>
                    </div>
                </div>
                <div class="form-actions">
                    <button type="submit" class="main-submit-btn">Next: Dimensions</button>
                </div>
            </form>
        </div>

        <!-- Step 2: Dimensions -->
        <div id="airfreight-step-dims" class="service-step">
            <div class="form-container">
                <h3>3. Dimensions & Weight</h3>
                <p class="subtitle">Add each group of pieces with the same dimensions.</p>
                <div id="airfreight-cargo-list" style="display: flex; flex-direction: column; gap: 1rem;"></div>
                <div class="form-actions" style="justify-content: flex-start; margin-top: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 1.5rem;">
                    <button type="button" id="airfreight-add-piece-btn" class="secondary-btn">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width: 1.25em; height: 1.25em;"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                        Add Piece Group
                    </button>
                </div>
                <div id="airfreight-chargeable-weight-summary" class="payment-overview" style="margin-top: 2rem;"></div>
                <div class="form-actions">
                    <button type="button" id="airfreight-back-to-details-btn" class="secondary-btn">Back</button>
                    <button type="button" id="airfreight-to-service-btn" class="main-submit-btn">Next: Service Level</button>
                </div>
            </div>
        </div>
        
        <!-- Step 3: Service -->
        <div id="airfreight-step-service" class="service-step">
            <div class="form-container">
                <h3>4. Service Level</h3>
                <p class="subtitle">Choose the speed and service required for your shipment.</p>
                <div id="airfreight-service-level-selector" class="service-type-selector">
                    <button type="button" class="service-type-btn active" data-service-type="standard">
                        <strong>Standard</strong>
                        <span>Cost-effective solution, 3-5 days.</span>
                    </button>
                    <button type="button" class="service-type-btn" data-service-type="priority">
                        <strong>Priority</strong>
                        <span>Express service, 1-2 days.</span>
                    </button>
                    <button type="button" class="service-type-btn" data-service-type="charter">
                        <strong>Charter</strong>
                        <span>Dedicated aircraft for special requirements.</span>
                    </button>
                </div>
                 <div class="form-actions">
                    <button type="button" id="airfreight-back-to-dims-btn" class="secondary-btn">Back</button>
                    <button type="button" id="airfreight-to-docs-btn" class="main-submit-btn">Next: Documents</button>
                </div>
            </div>
        </div>

        <!-- Step 4: Documents -->
        <div id="airfreight-step-docs" class="service-step">
            <div class="form-container">
                <h3>5. Compliance Documents</h3>
                <p class="subtitle">Please upload all required documents for your shipment.</p>
                <div id="airfreight-compliance-checklist" class="compliance-checklist"></div>
                <div class="form-actions">
                    <button type="button" id="airfreight-back-to-service-btn" class="secondary-btn">Back</button>
                    <button type="button" id="airfreight-to-rates-btn" class="main-submit-btn">Get Rates</button>
                </div>
            </div>
        </div>

        <!-- Step 5: Rates -->
        <div id="airfreight-step-rates" class="service-step">
            <div class="form-container">
                <h3>Your AI-Powered Quote</h3>
                 <div id="airfreight-rates-container" class="payment-overview"></div>
                  <div class="form-actions">
                    <button type="button" id="airfreight-back-to-docs-btn" class="secondary-btn">Back</button>
                    <button type="button" id="airfreight-to-confirmation-btn" class="main-submit-btn">Book Now</button>
                </div>
            </div>
        </div>

        <!-- Step 6: Confirmation -->
        <div id="airfreight-step-confirmation" class="service-step">
            <div class="confirmation-container">
                <h3 id="airfreight-confirmation-title"></h3>
                <p id="airfreight-confirmation-message"></p>
                <div class="confirmation-tracking">
                    <h4>Your Air Waybill (AWB)</h4>
                    <div class="tracking-id-display" id="airfreight-confirmation-awb"></div>
                </div>
                <div class="confirmation-actions">
                    <button id="airfreight-download-pdf-btn" class="secondary-btn">Download PDF Summary</button>
                    <button id="airfreight-new-shipment-btn" class="main-submit-btn">New Shipment</button>
                </div>
            </div>
        </div>
    `;
}

// --- WIZARD NAVIGATION & STATE ---

function resetAirfreightWizard() {
    resetAirfreightState();
    (document.getElementById('airfreight-details-form') as HTMLFormElement)?.reset();
    const cargoList = document.getElementById('airfreight-cargo-list');
    if (cargoList) cargoList.innerHTML = '';
    addCargoPieceRow();
    goToAirfreightStep(1);
}

function goToAirfreightStep(step: number) {
    const stepIds = ['details', 'dims', 'service', 'docs', 'rates', 'confirmation'];
    const currentStepId = stepIds[State.currentAirfreightStep - 1];
    const nextStepId = stepIds[step - 1];

    const currentStepElement = document.getElementById(`airfreight-step-${currentStepId}`);
    const nextStepElement = document.getElementById(`airfreight-step-${nextStepId}`);

    if (currentStepElement && nextStepElement && currentStepElement !== nextStepElement) {
        currentStepElement.classList.add('exiting');
        currentStepElement.addEventListener('animationend', () => {
            currentStepElement.classList.remove('active', 'exiting');
        }, { once: true });
    }
    
    document.querySelectorAll('#page-airfreight .service-step').forEach(s => s.classList.remove('active'));
    if (nextStepElement) {
        nextStepElement.classList.add('active');
    }
    setState({ currentAirfreightStep: step });
    updateProgressBar('airfreight', step - 1);
}

// --- STEP 1: WHAT & WHERE ---
function populateCargoTypes() {
    const cargoTypeSelect = document.getElementById('airfreight-cargo-type') as HTMLSelectElement;
    if(cargoTypeSelect) {
        cargoTypeSelect.innerHTML = CARGO_MATRIX.map(c => `<option value="${c.code}">${c.category} - (${c.examples})</option>`).join('');
    }
}

async function handleDetailsSubmit(e: Event) {
    e.preventDefault();
    toggleLoading(true, "Fetching trade data...");
    
    // In a real app, call Google Trade API here to get HS code
    await new Promise(res => setTimeout(res, 500)); // Simulate API call
    const hsCodeInput = document.getElementById('airfreight-hs-code') as HTMLInputElement;
    if (hsCodeInput) hsCodeInput.value = "8517.12"; // Mock HS Code
    showToast("HS Code auto-detected.", "success");
    
    const details: Partial<AirfreightDetails> = {
        cargoCategory: (document.getElementById('airfreight-cargo-type') as HTMLSelectElement).value,
        cargoDescription: (document.getElementById('airfreight-cargo-description') as HTMLTextAreaElement).value,
        hsCode: (document.getElementById('airfreight-hs-code') as HTMLInputElement).value,
        originAirport: (document.getElementById('airfreight-origin-airport') as HTMLInputElement).value.toUpperCase(),
        destAirport: (document.getElementById('airfreight-dest-airport') as HTMLInputElement).value.toUpperCase(),
    };
    setState({ airfreightDetails: { ...State.airfreightDetails, ...details } as AirfreightDetails });
    toggleLoading(false);
    goToAirfreightStep(2);
}

// --- STEP 2: DIMENSIONS & WEIGHT ---
function addCargoPieceRow() {
    const cargoList = document.getElementById('airfreight-cargo-list');
    if (!cargoList) return;

    const id = Date.now();
    const pieceCount = cargoList.children.length + 1;
    const row = document.createElement('div');
    row.className = 'airfreight-cargo-piece form-grid';
    row.style.gridTemplateColumns = 'auto repeat(5, 1fr)';
    row.style.gap = '1rem';
    row.style.alignItems = 'flex-end';
    row.dataset.id = String(id);
    row.innerHTML = `
        <span class="piece-number" style="font-weight: 600; padding-bottom: 0.75rem;">#${pieceCount}</span>
        <div class="input-wrapper"><label>Pieces</label><input type="number" class="airfreight-pieces" value="1" min="1"></div>
        <div class="input-wrapper"><label>Length (cm)</label><input type="number" class="airfreight-length" value="50" min="1"></div>
        <div class="input-wrapper"><label>Width (cm)</label><input type="number" class="airfreight-width" value="50" min="1"></div>
        <div class="input-wrapper"><label>Height (cm)</label><input type="number" class="airfreight-height" value="50" min="1"></div>
        <div class="input-wrapper"><label>Weight (kg)</label><input type="number" class="airfreight-weight" value="20" min="1"></div>
    `;
    cargoList.appendChild(row);
    row.querySelectorAll('input').forEach(input => input.addEventListener('input', updateChargeableWeight));
    updateChargeableWeight();
}

function updateChargeableWeight() {
    const cargoList = document.getElementById('airfreight-cargo-list');
    const summaryEl = document.getElementById('airfreight-chargeable-weight-summary');
    if (!cargoList || !summaryEl) return;

    let totalActualWeight = 0;
    let totalVolume = 0;
    const cargoPieces: AirfreightCargoPiece[] = [];

    cargoList.querySelectorAll<HTMLDivElement>('.airfreight-cargo-piece').forEach(row => {
        const piece: AirfreightCargoPiece = {
            id: Number(row.dataset.id),
            pieces: parseInt((row.querySelector('.airfreight-pieces') as HTMLInputElement).value) || 0,
            length: parseInt((row.querySelector('.airfreight-length') as HTMLInputElement).value) || 0,
            width: parseInt((row.querySelector('.airfreight-width') as HTMLInputElement).value) || 0,
            height: parseInt((row.querySelector('.airfreight-height') as HTMLInputElement).value) || 0,
            weight: parseInt((row.querySelector('.airfreight-weight') as HTMLInputElement).value) || 0,
        };
        cargoPieces.push(piece);

        const pieceVolume = (piece.length * piece.width * piece.height) / 1000000; // in cubic meters
        totalVolume += pieceVolume * piece.pieces;
        totalActualWeight += piece.weight * piece.pieces;
    });

    const volumetricWeight = totalVolume * 167; // IATA standard: 1 cbm = 167 kg
    const chargeableWeight = Math.max(totalActualWeight, volumetricWeight);

    summaryEl.innerHTML = `
        <div class="review-item"><span>Total Actual Weight:</span> <strong>${totalActualWeight.toFixed(2)} kg</strong></div>
        <div class="review-item"><span>Total Volume:</span> <strong>${totalVolume.toFixed(3)} m³</strong></div>
        <div class="review-item total"><span>Chargeable Weight:</span> <strong>${chargeableWeight.toFixed(2)} kg</strong></div>
    `;

    const currentDetails = State.airfreightDetails || {} as Partial<AirfreightDetails>;
    setState({ airfreightDetails: { ...currentDetails, cargoPieces, chargeableWeight } as AirfreightDetails });
}

// --- STEP 3: SERVICE ---
function handleServiceNext() {
    const serviceLevel = (document.querySelector('#airfreight-service-level-selector .active') as HTMLElement)?.dataset.serviceType as AirfreightServiceLevel;
    setState({ airfreightDetails: { ...State.airfreightDetails, serviceLevel } as AirfreightDetails });
    renderComplianceStep();
    goToAirfreightStep(4);
}

// --- STEP 4: DOCS ---
function renderComplianceStep() {
    const { airfreightDetails } = State;
    if (!airfreightDetails) return;

    let docs: ComplianceDoc[] = [
        { id: 'doc-af-ci', title: 'Commercial Invoice', description: 'Standard invoice for goods.', status: 'pending', file: null, required: true },
        { id: 'doc-af-pl', title: 'Packing List', description: 'Details of package contents.', status: 'pending', file: null, required: true }
    ];

    if (airfreightDetails.cargoCategory === 'DGR') {
        docs.push({ id: 'doc-af-dgd', title: 'Shipper\'s Declaration for Dangerous Goods', description: 'IATA-required form for all DGR shipments.', status: 'pending', file: null, required: true });
    }
    if (airfreightDetails.cargoCategory === 'AVI') {
        docs.push({ id: 'doc-af-avi', title: 'Live Animals Certificate', description: 'Health and vaccination certificates for live animals.', status: 'pending', file: null, required: true });
    }

    setState({ airfreightComplianceDocs: docs });

    DOMElements.airfreightComplianceChecklist.innerHTML = docs.map(doc => `
        <div class="compliance-doc-item" id="${doc.id}">
            <div class="compliance-doc-info">
                <h4>${doc.title} ${doc.required ? '<span>(Required)</span>' : ''}</h4>
                <p>${doc.description}</p>
            </div>
            <div class="file-drop-area">
                <div class="file-status">Click or drag file</div>
                <input type="file" class="file-input" accept=".pdf" data-doc-id="${doc.id}">
            </div>
        </div>
    `).join('');

    document.querySelectorAll('#airfreight-compliance-checklist .file-drop-area').forEach(area => {
        const input = area.querySelector('.file-input') as HTMLInputElement;
        area.addEventListener('click', () => input.click());
        input.addEventListener('change', () => {
            if (input.files?.[0]) handleAirfreightFileUpload(input.files[0], input.dataset.docId!);
        });
    });
}

function handleAirfreightFileUpload(file: File, docId: string) {
    const docIndex = State.airfreightComplianceDocs.findIndex(d => d.id === docId);
    if (docIndex > -1) {
        const updatedDocs = [...State.airfreightComplianceDocs];
        updatedDocs[docIndex] = { ...updatedDocs[docIndex], file, status: 'uploaded' };
        setState({ airfreightComplianceDocs: updatedDocs });

        const docElement = document.getElementById(docId);
        const statusEl = docElement?.querySelector('.file-status');
        if (statusEl) {
            statusEl.textContent = file.name;
            statusEl.classList.add('uploaded');
        }
    }
}

// --- STEP 5: RATES ---
async function handleGetRates() {
    const allRequiredUploaded = State.airfreightComplianceDocs
        .filter(d => d.required)
        .every(d => d.status === 'uploaded');
    
    if (!allRequiredUploaded) {
        showToast("Please upload all required documents.", 'error');
        return;
    }

    toggleLoading(true, "Getting live air freight rates...");
    // Mock API call to get rates
    await new Promise(res => setTimeout(res, 1500));
    
    // FIX: Add missing properties to the mockQuote object to conform to the Quote type.
    const mockQuote: Quote = {
        carrierName: "Emirates SkyCargo",
        carrierType: "Airline",
        estimatedTransitTime: "3 Days",
        chargeableWeight: State.airfreightDetails!.chargeableWeight,
        chargeableWeightUnit: 'kg',
        weightBasis: 'Dimensional',
        isSpecialOffer: false,
        totalCost: State.airfreightDetails!.chargeableWeight * 5.5, // Mock rate
        costBreakdown: {
            baseShippingCost: State.airfreightDetails!.chargeableWeight * 4.0,
            fuelSurcharge: State.airfreightDetails!.chargeableWeight * 1.0,
            estimatedCustomsAndTaxes: State.airfreightDetails!.chargeableWeight * 0.25,
            optionalInsuranceCost: 0,
            ourServiceFee: State.airfreightDetails!.chargeableWeight * 0.25,
        },
        notes: "Rate based on chargeable weight."
    };
    setState({ airfreightQuote: mockQuote });

    DOMElements.airfreightRatesContainer.innerHTML = `
        <div class="review-item"><span>Airline:</span> <strong>${mockQuote.carrierName}</strong></div>
        <div class="review-item"><span>Est. Transit:</span> <strong>${mockQuote.estimatedTransitTime}</strong></div>
        <div class="review-item total"><span>Total Cost:</span> <strong>$${mockQuote.totalCost.toFixed(2)}</strong></div>
    `;
    toggleLoading(false);
    goToAirfreightStep(5);
}

// --- STEP 6: CONFIRMATION ---
function handleConfirmBooking() {
    const bookButton = DOMElements.airfreightNav.toConfirmation;
    if (bookButton.disabled) return;

    const originalText = bookButton.textContent;
    bookButton.disabled = true;
    bookButton.textContent = 'Processing...';

    toggleLoading(true, "Confirming booking...");

    setTimeout(() => {
        toggleLoading(false);
        bookButton.disabled = false;
        bookButton.textContent = originalText;

        const bookingId = `180-${Date.now().toString().slice(-8)}`; // Mock AWB
        setState({ airfreightBookingId: bookingId });
        
        const titleEl = DOMElements.airfreightConfirmationTitle;
        const msgEl = DOMElements.airfreightConfirmationMessage;
        const awbEl = DOMElements.airfreightConfirmationAWB;

        if (titleEl) titleEl.textContent = '✅ Booking Confirmed!';
        if (msgEl) msgEl.textContent = 'Your air freight shipment is confirmed. Details and documents have been sent to your email.';
        if (awbEl) awbEl.textContent = bookingId;
        
        goToAirfreightStep(6); // Go to confirmation step
    }, 1500);
}


function generateAirfreightPdf() {
    const { airfreightDetails, airfreightQuote, airfreightBookingId } = State;
    if (!airfreightDetails || !airfreightQuote || !airfreightBookingId) {
        showToast("Cannot generate PDF, booking data missing.", "error");
        return;
    }

    const doc = new jsPDF();
    const headStyles = { fillColor: [2, 132, 199] as [number, number, number] };

    doc.setFontSize(18);
    doc.text('Air Waybill (AWB) Summary', 105, 15, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`AWB: ${airfreightBookingId}`, 105, 22, { align: 'center' });

    autoTable(doc, {
        startY: 30,
        head: [['Shipment Details', '']],
        body: [
            ['Route', `${airfreightDetails.originAirport} to ${airfreightDetails.destAirport}`],
            ['Cargo', airfreightDetails.cargoDescription],
            ['Chargeable Weight', `${airfreightDetails.chargeableWeight.toFixed(2)} kg`],
            ['Airline', airfreightQuote.carrierName],
            ['Est. Transit', airfreightQuote.estimatedTransitTime],
            [{ content: 'Total Paid', styles: { fontStyle: 'bold' } }, { content: `$${airfreightQuote.totalCost.toFixed(2)}`, styles: { fontStyle: 'bold' } }]
        ],
        theme: 'striped', headStyles
    });
    doc.save(`Vcanship_AWB_${airfreightBookingId}.pdf`);
}

function attachAirfreightEventListeners() {
    document.querySelector('#page-airfreight .back-btn')?.addEventListener('click', () => switchPage('landing'));
    DOMElements.airfreightDetailsForm?.addEventListener('submit', handleDetailsSubmit);
    DOMElements.airfreightAddPieceBtn?.addEventListener('click', addCargoPieceRow);

    DOMElements.airfreightServiceLevelSelector?.querySelectorAll('.service-type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.parentElement?.querySelectorAll('.service-type-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // Navigation
    DOMElements.airfreightNav.backToDetails.addEventListener('click', () => goToAirfreightStep(1));
    DOMElements.airfreightNav.toService.addEventListener('click', () => goToAirfreightStep(3));

    DOMElements.airfreightNav.backToDims.addEventListener('click', () => goToAirfreightStep(2));
    DOMElements.airfreightNav.toDocs.addEventListener('click', handleServiceNext);

    DOMElements.airfreightNav.backToService.addEventListener('click', () => goToAirfreightStep(3));
    DOMElements.airfreightNav.toRates.addEventListener('click', handleGetRates);
    
    DOMElements.airfreightNav.backToDocs.addEventListener('click', () => goToAirfreightStep(4));
    DOMElements.airfreightNav.toConfirmation.addEventListener('click', handleConfirmBooking);

    DOMElements.airfreightNav.newShipment.addEventListener('click', resetAirfreightWizard);
    DOMElements.airfreightNav.downloadPDF.addEventListener('click', generateAirfreightPdf);
}

export function startAirfreight() {
    setState({ currentService: 'airfreight' });
    renderAirfreightPage();
    switchPage('airfreight');
    resetAirfreightWizard();
    populateCargoTypes();
    attachAirfreightEventListeners();
}