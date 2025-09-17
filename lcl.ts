// ⚠️  READ-ONLY — DO NOT EDIT — SERVICE LOCKED ⚠️
import { jsPDF } from 'jspdf';
// FIX: Import RowInput to fix fontStyle type error.
import autoTable, { RowInput } from 'jspdf-autotable';
import { State, setState, resetLclState, type LclServiceLevel, type ComplianceDoc, type LclCargoItem, type LclDetails, Quote } from './state';
import { DOMElements } from './dom';
import { showToast, switchPage, updateProgressBar, toggleLoading, showPrelaunchModal } from './ui';
import { suggestLclHsCode, getLclQuote } from './api';

function renderLclPage() {
    const page = document.getElementById('page-lcl');
    if (!page) return;

    page.innerHTML = `
        <button class="back-btn">Back to Services</button>
        <div class="service-page-header">
            <h2>LCL (Less than Container Load)</h2>
            <p class="subtitle">Pay only for the space you use in a shared container.</p>
            <div id="progress-bar-lcl" data-steps="Details,Cargo,Service,Docs,Quote,Payment,Confirmation"></div>
        </div>

        <!-- Step 1: Details -->
        <div id="lcl-step-details" class="service-step active">
            <form id="lcl-details-form" class="form-container">
                 <div class="form-section two-column">
                    <div class="input-wrapper"><label for="lcl-origin-address">Origin Address</label><input type="text" id="lcl-origin-address" required placeholder="e.g., 123 Main St, New York, USA"></div>
                    <div class="input-wrapper"><label for="lcl-dest-address">Destination Address</label><input type="text" id="lcl-dest-address" required placeholder="e.g., 21 Industrial Estate, Hamburg, Germany"></div>
                </div>
                <div class="form-section">
                    <h3>Cargo Details</h3>
                    <div class="input-wrapper"><label for="lcl-cargo-description">Description of Goods</label><textarea id="lcl-cargo-description" required placeholder="e.g., 100 boxes of cotton t-shirts"></textarea></div>
                    <div class="hs-code-suggester-wrapper">
                        <div class="input-wrapper">
                             <label for="lcl-hs-code">HS Code</label>
                             <input type="text" id="lcl-hs-code">
                        </div>
                        <button type="button" id="lcl-suggest-hs-code-btn" class="secondary-btn">Suggest with AI</button>
                    </div>
                </div>
                <div class="form-actions"><button type="submit" class="main-submit-btn">Next: Cargo Dimensions</button></div>
            </form>
        </div>

        <!-- Step 2: Cargo -->
        <div id="lcl-step-cargo" class="service-step">
            <div class="form-container">
                <h3>Cargo Dimensions & Weight</h3>
                <div id="lcl-cargo-list" style="display: flex; flex-direction: column; gap: 1rem;"></div>
                <button type="button" id="lcl-add-cargo-btn" class="secondary-btn" style="margin-top: 1rem;">Add Item</button>
                <div class="form-section" style="margin-top: 1.5rem;">
                    <div class="checkbox-wrapper"><input type="checkbox" id="lcl-is-stackable" checked><label for="lcl-is-stackable">Cargo is stackable</label></div>
                    <div class="checkbox-wrapper"><input type="checkbox" id="lcl-is-hazardous"><label for="lcl-is-hazardous">Cargo is hazardous</label></div>
                    <div id="lcl-imdg-class-container" class="input-wrapper hidden"><label for="lcl-imdg-class">IMDG Class</label><input type="text" id="lcl-imdg-class" placeholder="e.g., 3.1"></div>
                </div>
                <div id="lcl-chargeable-weight-summary" class="payment-overview" style="margin-top: 1rem;">
                    <div class="review-item"><span>Total Volume:</span> <strong><span id="lcl-total-cbm">0.000</span> m³</strong></div>
                    <div class="review-item total"><span>Chargeable Weight:</span> <strong><span id="lcl-chargeable-weight">0.00</span> kg</strong></div>
                </div>
                <div id="lcl-fcl-suggestion" class="hidden" style="text-align: center; background-color: var(--warning-bg-color); padding: 1rem; border-radius: var(--border-radius); margin-top: 1rem; color: var(--warning-text-color);">Consider booking an FCL shipment for better value.</div>
                <div class="form-actions">
                    <button type="button" id="lcl-back-to-details-btn" class="secondary-btn">Back</button>
                    <button type="button" id="lcl-to-service-btn" class="main-submit-btn">Next: Service Level</button>
                </div>
            </div>
        </div>

        <!-- Step 3: Service -->
        <div id="lcl-step-service" class="service-step">
            <div class="form-container">
                 <h3>Service & Forwarding</h3>
                 <div class="form-section">
                     <label class="checkbox-group-label">Forwarding Choice</label>
                     <div id="lcl-forwarding-choice" class="service-type-selector" style="grid-template-columns: 1fr 1fr; margin-bottom: 2rem;">
                        <button type="button" class="service-type-btn active" data-choice="vcanship">
                            <strong>Vcanship Full Service</strong>
                            <span>We consolidate, handle customs, and deliver. Recommended for most shippers.</span>
                        </button>
                        <button type="button" class="service-type-btn" data-choice="booking_only">
                            <strong>Space Booking Only</strong>
                            <span>You manage your own freight forwarding and customs.</span>
                        </button>
                     </div>
                 </div>
                 <div class="form-section">
                    <label class="checkbox-group-label">Service Level</label>
                     <div id="lcl-service-level-selector" class="service-type-selector">
                         <button type="button" class="service-type-btn active" data-service-type="standard"><strong>Standard</strong><span>Cost-effective, 25-35 days transit.</span></button>
                         <button type="button" class="service-type-btn" data-service-type="priority"><strong>Priority</strong><span>Faster consolidation, 18-25 days.</span></button>
                         <button type="button" class="service-type-btn" data-service-type="express"><strong>Express</strong><span>Fastest LCL option, 12-18 days.</span></button>
                     </div>
                 </div>
                 <div class="form-actions">
                    <button type="button" id="lcl-back-to-cargo-btn" class="secondary-btn">Back</button>
                    <button type="button" id="lcl-to-docs-btn" class="main-submit-btn">Next: Documents</button>
                </div>
            </div>
        </div>

        <!-- Step 4: Documents -->
        <div id="lcl-step-docs" class="service-step">
            <div class="form-container">
                <div id="lcl-docs-vcanship-view">
                    <h3>Compliance Documents</h3>
                    <p class="subtitle">Please upload all required documents for customs clearance.</p>
                    <div id="lcl-compliance-checklist" class="compliance-checklist"></div>
                    <p class="helper-text" style="margin-top: 1rem;">⚠️ Note: Uploading is optional to get a quote, but mandatory for booking.</p>
                </div>
                <div id="lcl-docs-booking-only-view" class="hidden">
                     <h3>You're in Control</h3>
                     <p class="subtitle" style="margin-bottom: 1rem;">You have selected to handle your own freight forwarding. You are responsible for all customs clearance, documentation, and compliance regulations.</p>
                     <p>No document uploads are required to proceed.</p>
                </div>
                <div class="form-actions">
                    <button type="button" id="lcl-back-to-service-btn" class="secondary-btn">Back</button>
                    <button id="lcl-to-quote-btn" class="main-submit-btn">Get Quote</button>
                </div>
            </div>
        </div>
        
        <!-- Step 5: Quote -->
        <div id="lcl-step-quote" class="service-step">
            <div class="form-container">
                <h3>Your LCL Quote</h3>
                <div id="lcl-quote-summary" class="quote-summary-pro"></div>
                <div class="form-actions">
                    <button type="button" id="lcl-back-to-docs-btn" class="secondary-btn">Back</button>
                    <button id="lcl-to-payment-btn" class="main-submit-btn">Book Now</button>
                </div>
            </div>
        </div>
        
        <!-- Step 6: Payment -->
        <div id="lcl-step-payment" class="service-step">
            <div class="form-container">
                 <h3>Secure Payment</h3>
                 <p class="subtitle">Enter your payment details to confirm your shipment.</p>
                 <div id="lcl-payment-overview" class="payment-overview"></div>
                 <form id="lcl-payment-form">
                    <div class="form-actions">
                        <button type="button" id="lcl-back-to-quote-btn" class="secondary-btn">Back</button>
                        <button type="submit" class="main-submit-btn">Pay & Confirm</button>
                    </div>
                </form>
            </div>
        </div>
        
        <!-- Step 7: Confirmation -->
        <div id="lcl-step-confirmation" class="service-step">
             <div class="confirmation-container">
                <h3 id="lcl-confirmation-title"></h3>
                <p id="lcl-confirmation-message"></p>
                <div class="confirmation-actions">
                    <button id="lcl-download-labels-btn" class="secondary-btn">Download PDF & Labels</button>
                    <button id="lcl-new-shipment-btn" class="main-submit-btn">New Shipment</button>
                </div>
            </div>
        </div>
    `;
    
    page.querySelector('.back-btn')?.addEventListener('click', () => switchPage('landing'));
}

// --- WIZARD NAVIGATION & STATE ---
function resetLclWizard() {
    resetLclState();
    if (DOMElements.lclDetailsForm) DOMElements.lclDetailsForm.reset();
    if (DOMElements.lclCargoList) DOMElements.lclCargoList.innerHTML = '';
    addCargoItemRow();
    if (DOMElements.lclImdgClassContainer) DOMElements.lclImdgClassContainer.classList.add('hidden');
    if (DOMElements.lclFclSuggestion) DOMElements.lclFclSuggestion.classList.add('hidden');
    goToLclStep(1);
}

function goToLclStep(step: number) {
    const stepIds = ['details', 'cargo', 'service', 'docs', 'quote', 'payment', 'confirmation'];
    const currentStepId = stepIds[State.currentLclStep - 1];
    const nextStepId = stepIds[step - 1];

    document.querySelectorAll('#page-lcl .service-step').forEach(s => s.classList.remove('active'));

    const currentStepElement = DOMElements.lclSteps[currentStepId as keyof typeof DOMElements.lclSteps];
    const nextStepElement = DOMElements.lclSteps[nextStepId as keyof typeof DOMElements.lclSteps];

    if (currentStepElement && nextStepElement && currentStepElement !== nextStepElement) {
        currentStepElement.classList.add('exiting');
        currentStepElement.addEventListener('animationend', () => {
            currentStepElement.classList.remove('active', 'exiting');
        }, { once: true });
    }
    
    if (nextStepElement) {
        nextStepElement.classList.add('active');
    }
    setState({ currentLclStep: step });
    updateProgressBar('lcl', step - 1);
}


// --- STEP 1: DETAILS ---
function handleDetailsSubmit(e: Event) {
    e.preventDefault();
    const details: Partial<LclDetails> = {
        originAddress: (document.getElementById('lcl-origin-address') as HTMLInputElement).value,
        destAddress: (document.getElementById('lcl-dest-address') as HTMLInputElement).value,
        cargoDescription: DOMElements.lclCargoDescription.value,
        hsCode: DOMElements.lclHsCodeInput.value,
    };
    setState({ lclDetails: { ...State.lclDetails, ...details } as LclDetails });
    goToLclStep(2);
}

// --- STEP 2: CARGO DETAILS ---
function addCargoItemRow() {
    const id = Date.now();
    const row = document.createElement('div');
    row.className = 'fcl-container-row'; // Reusing FCL style for consistency
    row.dataset.id = String(id);
    row.innerHTML = `
        <div class="fcl-container-fields">
            <div class="fcl-container-details-grid" style="grid-template-columns: 0.5fr 1fr 1fr 1fr 1fr; gap: 0.5rem;">
                <div class="input-wrapper"><label>Pieces</label><input type="number" class="lcl-pieces" value="1" min="1"></div>
                <div class="input-wrapper"><label>Length(cm)</label><input type="number" class="lcl-length" value="50" min="1"></div>
                <div class="input-wrapper"><label>Width(cm)</label><input type="number" class="lcl-width" value="50" min="1"></div>
                <div class="input-wrapper"><label>Height(cm)</label><input type="number" class="lcl-height" value="50" min="1"></div>
                <div class="input-wrapper"><label>Weight(kg)</label><input type="number" class="lcl-weight" value="50" min="1"></div>
            </div>
        </div>
        <button type="button" class="remove-container-btn" aria-label="Remove item">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.58.11-2.368.11a.75.75 0 000 1.5h13.236a.75.75 0 000-1.5c-.788 0-1.573-.033-2.368-.11v-.443A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clip-rule="evenodd" /></svg>
        </button>
    `;
    DOMElements.lclCargoList.appendChild(row);
    row.querySelector('.remove-container-btn')?.addEventListener('click', () => {
        if (DOMElements.lclCargoList.children.length > 1) {
            row.remove();
            updateLclCalculations();
        }
    });
    row.querySelectorAll('input').forEach(input => input.addEventListener('input', updateLclCalculations));
    updateLclCalculations();
}

function updateLclCalculations() {
    let totalCbm = 0;
    let totalWeight = 0;
    const cargoItems: LclCargoItem[] = [];

    DOMElements.lclCargoList.querySelectorAll<HTMLDivElement>('.fcl-container-row').forEach(row => {
        const item: LclCargoItem = {
            id: Number(row.dataset.id),
            pieces: parseInt((row.querySelector('.lcl-pieces') as HTMLInputElement).value) || 0,
            length: parseInt((row.querySelector('.lcl-length') as HTMLInputElement).value) || 0,
            width: parseInt((row.querySelector('.lcl-width') as HTMLInputElement).value) || 0,
            height: parseInt((row.querySelector('.lcl-height') as HTMLInputElement).value) || 0,
            weight: parseInt((row.querySelector('.lcl-weight') as HTMLInputElement).value) || 0,
        };
        cargoItems.push(item);
        
        const itemCbm = (item.length * item.width * item.height) / 1000000;
        totalCbm += itemCbm * item.pieces;
        totalWeight += item.weight * item.pieces;
    });

    const volumetricWeight = totalCbm * 1000;
    const chargeableWeight = Math.max(totalWeight, volumetricWeight);

    if (DOMElements.lclTotalCbm) DOMElements.lclTotalCbm.textContent = `${totalCbm.toFixed(3)}`;
    if (DOMElements.lclChargeableWeight) DOMElements.lclChargeableWeight.textContent = `${chargeableWeight.toFixed(2)}`;
    if (DOMElements.lclFclSuggestion) DOMElements.lclFclSuggestion.classList.toggle('hidden', totalCbm <= 15);
    
    setState({
        lclDetails: {
            ...State.lclDetails,
            cargoItems,
            isStackable: DOMElements.lclIsStackable.checked,
            isHazardous: DOMElements.lclIsHazardous.checked,
            imdgClass: DOMElements.lclIsHazardous.checked ? (document.getElementById('lcl-imdg-class') as HTMLInputElement).value : null,
            totalCbm: totalCbm,
            chargeableWeight: chargeableWeight,
        } as LclDetails
    });
}

// --- STEP 4: COMPLIANCE ---
function generateLclComplianceTemplate(title: string, description: string) {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(title, 105, 20, { align: 'center' });
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(description, 105, 30, { align: 'center' });
    doc.setLineWidth(0.5);
    doc.line(20, 35, 190, 35);

    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text('This is a sample template. Please fill in the required details below.', 20, 45);

    const startY = 60;
    const fieldHeight = 15;
    const fields = ['Reference Number:', 'Date:', 'Authorized Signature:', 'Notes:'];

    fields.forEach((field, index) => {
        const y = startY + (index * fieldHeight);
        doc.text(field, 20, y);
        doc.line(60, y + 2, 190, y + 2);
    });

    doc.save(`Vcanship_${title.replace(/\s/g, '_')}_Template.pdf`);
}

function renderComplianceStep() {
    const { lclDetails } = State;
    if (!lclDetails) return;

    const vcanshipView = document.getElementById('lcl-docs-vcanship-view');
    const bookingOnlyView = document.getElementById('lcl-docs-booking-only-view');
    if (vcanshipView && bookingOnlyView) {
        const isVcanShip = lclDetails.forwardingChoice === 'vcanship';
        vcanshipView.classList.toggle('hidden', !isVcanShip);
        bookingOnlyView.classList.toggle('hidden', isVcanShip);
    }

    let docs: ComplianceDoc[] = [
        { id: 'doc-lcl-ci', title: 'Commercial Invoice', description: 'Standard invoice for goods.', status: 'pending', file: null, required: true },
        { id: 'doc-lcl-pl', title: 'Packing List', description: 'Details of package contents.', status: 'pending', file: null, required: true }
    ];

    if (lclDetails.isHazardous) {
        docs.push({ id: 'doc-lcl-dgn', title: 'Dangerous Goods Note', description: 'Required for all hazardous materials.', status: 'pending', file: null, required: true });
    }

    setState({ lclComplianceDocs: docs });
    const checklist = document.getElementById('lcl-compliance-checklist');
    if (!checklist) return;

    checklist.innerHTML = docs.map(doc => `
        <div class="compliance-doc-item" id="${doc.id}">
            <div class="compliance-doc-info">
                <h4>${doc.title} ${doc.required ? `<span>(Required)</span>` : ''}</h4>
                <p>${doc.description}</p>
                <button class="secondary-btn download-template-btn" data-doc-title="${doc.title}" data-doc-desc="${doc.description}">Download Template</button>
            </div>
            <div class="file-drop-area">
                <div class="file-status">Click or drag to upload</div>
                <input type="file" class="file-input" data-doc-id="${doc.id}">
            </div>
        </div>`).join('');
    
    checklist.querySelectorAll('.download-template-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.currentTarget as HTMLElement;
            const title = target.dataset.docTitle || 'Document';
            const description = target.dataset.docDesc || 'Generic compliance template.';
            generateLclComplianceTemplate(title, description);
        });
    });
    
    checklist.querySelectorAll('.file-drop-area').forEach(area => {
        const input = area.querySelector('.file-input') as HTMLInputElement;
        area.addEventListener('click', () => input.click());
        input.addEventListener('change', () => {
            if (input.files?.[0]) handleLclFileUpload(input.files[0], input.dataset.docId!);
        });
    });
}

function handleLclFileUpload(file: File, docId: string) {
    const docIndex = State.lclComplianceDocs.findIndex(d => d.id === docId);
    if (docIndex > -1) {
        const updatedDocs = [...State.lclComplianceDocs];
        updatedDocs[docIndex].file = file;
        updatedDocs[docIndex].status = 'uploaded';
        setState({ lclComplianceDocs: updatedDocs });

        const statusEl = document.querySelector(`#${docId} .file-status`);
        if (statusEl) {
            statusEl.textContent = file.name;
            statusEl.classList.add('uploaded');
        }
    }
}

// --- STEP 5: QUOTE ---
async function handleGetQuote() {
    const { lclDetails } = State;
    if (!lclDetails) return;

    // For full service, check for docs
    if (lclDetails.forwardingChoice === 'vcanship') {
        const allRequiredUploaded = State.lclComplianceDocs
            .filter(d => d.required)
            .every(d => d.status === 'uploaded');
        if (!allRequiredUploaded) {
            // Show a softer warning since upload is optional for a quote
            showToast("For faster booking, please upload all required documents.", 'info');
        }
    }

    const quote = await getLclQuote(State.lclDetails!);
    if (quote) {
        setState({ lclQuote: quote });
        const summary = document.getElementById('lcl-quote-summary');
        const totalCbm = State.lclDetails?.totalCbm || 0;
        const costPerCbm = totalCbm > 0 ? (quote.totalCost / totalCbm) : 0;
        
        const serviceLevel = State.lclDetails?.serviceLevel || 'standard';
        const serviceIcons: Record<string, string> = {
            standard: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:24px;height:24px;"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125V14.25m-17.25 4.5v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5A3.375 3.375 0 0 0 6.375 7.5h1.125a3.375 3.375 0 0 0 3.375-3.375V3.75" /></svg>',
            priority: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:24px;height:24px;"><path stroke-linecap="round" stroke-linejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" /></svg>',
            express: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:24px;height:24px;"><path stroke-linecap="round" stroke-linejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" /></svg>'
        };
        const serviceLevelName = serviceLevel.charAt(0).toUpperCase() + serviceLevel.slice(1);

        if (summary) {
            summary.innerHTML = `
                <div class="quote-summary-pro-header">
                     ${serviceIcons[serviceLevel]}
                     <h3>${serviceLevelName} LCL Quote</h3>
                </div>
                <div class="quote-summary-pro-body">
                    <p class="quote-meta">Operator: <strong>${quote.carrierName}</strong></p>
                    <p class="quote-meta">Est. Transit Time: <strong>${quote.estimatedTransitTime}</strong></p>
                    <hr class="quote-divider">
                    <div class="review-item"><span>Total Volume:</span> <span>${totalCbm.toFixed(3)} m³</span></div>
                    <div class="review-item"><span>Rate:</span> <span>$${costPerCbm.toFixed(2)} / m³</span></div>
                    <div class="review-item"><span>Base Freight:</span> <span>$${quote.costBreakdown.baseShippingCost.toFixed(2)}</span></div>
                    <div class="review-item"><span>Surcharges:</span> <span>$${quote.costBreakdown.fuelSurcharge.toFixed(2)}</span></div>
                    <hr class="quote-divider">
                    <div class="review-item total">
                        <span>Total Cost:</span>
                        <strong class="total-cost-amount">$${quote.totalCost.toFixed(2)}</strong>
                    </div>
                </div>
            `;
        }
        goToLclStep(5);
    }
}


// --- STEP 7: CONFIRMATION & PDF ---
function handleConfirmBooking() {
    const bookingId = `LCL-${Date.now().toString().slice(-6)}`;
    setState({ lclBookingId: bookingId });
    
    const title = document.getElementById('lcl-confirmation-title');
    const message = document.getElementById('lcl-confirmation-message');

    if(title) {
        title.innerHTML = `
            <div class="confirmation-icon-wrapper">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
            </div>
            <span>Booking Confirmed: #${bookingId}</span>
        `;
    }
    if(message && State.lclDetails) message.innerHTML = `Your LCL shipment from <strong>${State.lclDetails.originAddress}</strong> to <strong>${State.lclDetails.destAddress}</strong> is confirmed.`;

    goToLclStep(7);
}

function generateLclPdf() {
    const { lclDetails, lclQuote, lclBookingId } = State;
    if (!lclDetails || !lclBookingId) {
        showToast("Cannot generate PDF, booking data is missing.", "error");
        return;
    }

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('LCL Shipment Confirmation & Labels', 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Booking ID: ${lclBookingId}`, 105, 27, { align: 'center' });

    const body: RowInput[] = [
        ['Route', `${lclDetails.originAddress} to ${lclDetails.destAddress}`],
        ['Cargo', lclDetails.cargoDescription],
        ['Total Volume', `${lclDetails.totalCbm?.toFixed(3) || 'N/A'} m³`],
        ['Chargeable Weight', `${lclDetails.chargeableWeight?.toFixed(2) || 'N/A'} kg`],
        ['Service Level', lclDetails.serviceLevel || 'N/A'],
        ['Hazardous', lclDetails.isHazardous ? `Yes (IMDG: ${lclDetails.imdgClass || 'N/A'})` : 'No'],
        ['Stackable', lclDetails.isStackable ? 'Yes' : 'No'],
    ];
    
    if (lclQuote) {
        body.push([
            { content: 'Total Paid', styles: { fontStyle: 'bold' } },
            { content: `$${lclQuote.totalCost.toFixed(2)}`, styles: { fontStyle: 'bold' } }
        ]);
    }

    autoTable(doc, {
        startY: 35,
        head: [['Shipment Details', '']],
        body: body,
        theme: 'striped',
        headStyles: { fillColor: [13, 148, 136] } // LCL Teal color
    });
    
    // Add a section for labels
    doc.addPage();
    doc.setFontSize(16);
    doc.text('Shipping Labels', 105, 20, { align: 'center' });

    let labelY = 30;
    const totalCargoItems = lclDetails.cargoItems.reduce((sum, item) => sum + item.pieces, 0);
    let currentItem = 0;

    lclDetails.cargoItems.forEach((item) => {
        for(let i = 0; i < item.pieces; i++) {
            currentItem++;
            if (labelY > 240) { // New page if labels overflow
                doc.addPage();
                labelY = 20;
            }
            doc.rect(20, labelY, 85, 50); // Label border
            doc.setFontSize(10);
            doc.text(`Piece: ${currentItem} of ${totalCargoItems}`, 22, labelY + 7);
            doc.text(`To: ${lclDetails.destAddress}`, 22, labelY + 14);
            doc.text(`Booking ID: ${lclBookingId}`, 22, labelY + 21);
            doc.text(`Dims: ${item.length}x${item.width}x${item.height}cm`, 22, labelY+28);
            doc.text(`Weight: ${item.weight}kg`, 22, labelY+35);
            labelY += 60; // Spacing for next label
        }
    });

    doc.save(`Vcanship_LCL_${lclBookingId}.pdf`);
}


// --- ATTACH EVENT LISTENERS ---
function attachLclEventListeners() {
    DOMElements.lclDetailsForm?.addEventListener('submit', handleDetailsSubmit);
    DOMElements.lclSuggestHsCodeBtn?.addEventListener('click', suggestLclHsCode);
    DOMElements.lclAddCargoBtn?.addEventListener('click', addCargoItemRow);
    DOMElements.lclIsHazardous?.addEventListener('change', () => {
        DOMElements.lclImdgClassContainer.classList.toggle('hidden', !DOMElements.lclIsHazardous.checked);
        updateLclCalculations();
    });
    DOMElements.lclIsStackable?.addEventListener('change', updateLclCalculations);

    // Navigation buttons
    DOMElements.lclNav.backToDetails?.addEventListener('click', () => goToLclStep(1));
    DOMElements.lclNav.toService?.addEventListener('click', () => goToLclStep(3));
    
    DOMElements.lclNav.backToCargo?.addEventListener('click', () => goToLclStep(2));
    DOMElements.lclNav.toDocs?.addEventListener('click', () => {
         const serviceLevel = (document.querySelector('#lcl-service-level-selector .active') as HTMLElement)?.dataset.serviceType as LclServiceLevel;
         const forwardingChoice = (document.querySelector('#lcl-forwarding-choice .active') as HTMLElement)?.dataset.choice as 'vcanship' | 'booking_only';
         setState({ lclDetails: { ...State.lclDetails, serviceLevel, forwardingChoice } as LclDetails });
         renderComplianceStep();
         goToLclStep(4);
    });

    DOMElements.lclNav.backToService?.addEventListener('click', () => goToLclStep(3));
    DOMElements.lclNav.toQuote?.addEventListener('click', handleGetQuote);

    DOMElements.lclNav.backToDocs?.addEventListener('click', () => goToLclStep(4));
    DOMElements.lclNav.toPayment?.addEventListener('click', () => {
        const paymentOverview = document.getElementById('lcl-payment-overview');
        const quoteSummary = document.getElementById('lcl-quote-summary');
        if(paymentOverview && quoteSummary) {
            paymentOverview.innerHTML = quoteSummary.innerHTML;
        }
        goToLclStep(6);
    });

    DOMElements.lclNav.backToQuote?.addEventListener('click', () => goToLclStep(5));
    DOMElements.lclPaymentForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        toggleLoading(true, "Processing payment...");
        setTimeout(() => {
            toggleLoading(false);
            handleConfirmBooking();
        }, 1500);
    });

    DOMElements.lclNav.newShipment?.addEventListener('click', resetLclWizard);
    DOMElements.lclNav.downloadLabels?.addEventListener('click', generateLclPdf);
}

// --- INITIALIZATION ---
// FIX: Rename function to `startLcl` to match import in router.ts
export function startLcl() {
    try {
        setState({ currentService: 'lcl' });
        renderLclPage();
        switchPage('lcl');
        resetLclWizard();
        attachLclEventListeners();
    } catch (error) {
        console.error("Failed to initialize LCL service:", error);
        showToast("Could not load the LCL service.", "error");
        switchPage('landing');
    }
}