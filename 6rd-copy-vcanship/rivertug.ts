// ⚠️  READ-ONLY — DO NOT EDIT — SERVICE LOCKED ⚠️
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { State, setState, resetRiverTugState, type Quote, type ComplianceDoc, type RiverTugDetails, type BargeType } from './state';
import { DOMElements } from './dom';
import { showToast, switchPage, updateProgressBar, toggleLoading, showPrelaunchModal } from './ui';
import { Type } from '@google/genai';

// --- WIZARD NAVIGATION & STATE ---

function resetRiverTugWizard() {
    resetRiverTugState();
    DOMElements.riverTug.detailsForm.reset();
    goToRiverTugStep(1);
}

function goToRiverTugStep(step: number) {
    const stepIds = ['details', 'docs', 'quote', 'confirmation'];
    const currentStepId = stepIds[State.currentRiverTugStep - 1];
    const nextStepId = stepIds[step - 1];

    const currentStepElement = DOMElements.riverTug.steps[currentStepId as keyof typeof DOMElements.riverTug.steps];
    const nextStepElement = DOMElements.riverTug.steps[nextStepId as keyof typeof DOMElements.riverTug.steps];

    if (currentStepElement && nextStepElement && currentStepElement !== nextStepElement) {
        currentStepElement.classList.add('exiting');
        currentStepElement.addEventListener('animationend', () => {
            currentStepElement.classList.remove('active', 'exiting');
        }, { once: true });
    }

    if (nextStepElement) {
        nextStepElement.classList.add('active');
    }
    setState({ currentRiverTugStep: step });
    updateProgressBar('rivertug', step - 1);
}

// --- RENDER FUNCTION ---
function renderRiverTugPage() {
    const page = document.getElementById('page-rivertug');
    if (!page) return;

    page.innerHTML = `
        <button class="back-btn">Back to Services</button>
        <div class="service-page-header">
            <h2>River Barge & Tug Charter</h2>
            <p class="subtitle">Book inland waterway transport for your bulk and project cargo.</p>
            <div id="progress-bar-rivertug" data-steps="Details,Documents,Quote,Confirmation"></div>
        </div>

        <!-- Step 1: Details -->
        <div id="rivertug-step-details" class="service-step active">
            <form id="rivertug-details-form" class="form-container">
                <div class="form-section two-column">
                    <div class="input-wrapper">
                        <label for="rivertug-origin-port">Origin Port/Terminal</label>
                        <input type="text" id="rivertug-origin-port" placeholder="e.g., Port of Duisburg" required>
                    </div>
                    <div class="input-wrapper">
                        <label for="rivertug-dest-port">Destination Port/Terminal</label>
                        <input type="text" id="rivertug-dest-port" placeholder="e.g., Port of Rotterdam" required>
                    </div>
                </div>
                <div class="form-section">
                    <h3>Cargo Details</h3>
                    <div class="input-wrapper">
                        <label for="rivertug-cargo-description">Cargo Description</label>
                        <textarea id="rivertug-cargo-description" placeholder="e.g., 2000 tons of coal" required></textarea>
                    </div>
                    <div class="input-wrapper">
                        <label for="rivertug-cargo-volume">Cargo Volume (Metric Tons)</label>
                        <input type="number" id="rivertug-cargo-volume" placeholder="2000" min="1" required>
                    </div>
                    <div class="checkbox-wrapper">
                        <input type="checkbox" id="rivertug-is-hazardous">
                        <label for="rivertug-is-hazardous">This is a hazardous shipment</label>
                    </div>
                </div>
                <div class="form-section">
                    <h3>Barge Type</h3>
                    <div id="rivertug-barge-type-selector" class="service-type-selector">
                        <button type="button" class="service-type-btn active" data-barge-type="deck"><strong>Deck Barge</strong><span>For project cargo, equipment</span></button>
                        <button type="button" class="service-type-btn" data-barge-type="hopper"><strong>Hopper Barge</strong><span>For dry bulk like coal, grain</span></button>
                        <button type="button" class="service-type-btn" data-barge-type="tank"><strong>Tank Barge</strong><span>For liquid bulk</span></button>
                        <button type="button" class="service-type-btn" data-barge-type="spud"><strong>Spud Barge</strong><span>Stationary platform</span></button>
                    </div>
                </div>
                <div class="form-actions">
                    <button type="submit" class="main-submit-btn">Proceed to Documents</button>
                </div>
            </form>
        </div>

        <!-- Step 2: Documents -->
        <div id="rivertug-step-docs" class="service-step">
            <div class="form-container">
                <h3>Required Documents</h3>
                <p class="subtitle">Please upload all required documents for your shipment.</p>
                <div id="rivertug-compliance-checklist" class="compliance-checklist"></div>
                <div class="form-actions">
                    <button type="button" id="rivertug-back-to-details-btn" class="secondary-btn">Back</button>
                    <button type="button" id="rivertug-to-quote-btn" class="main-submit-btn">Get Quote</button>
                </div>
            </div>
        </div>

        <!-- Step 3: Quote -->
        <div id="rivertug-step-quote" class="service-step">
            <div class="form-container">
                <div id="rivertug-quote-summary"></div>
                <div class="form-actions">
                    <button type="button" id="rivertug-back-to-docs-btn" class="secondary-btn">Back</button>
                    <button type="button" id="rivertug-to-confirmation-btn" class="main-submit-btn">Accept & Book</button>
                </div>
            </div>
        </div>

        <!-- Step 4: Confirmation -->
        <div id="rivertug-step-confirmation" class="service-step">
            <div class="confirmation-container">
                <h3 id="rivertug-confirmation-title"></h3>
                <p id="rivertug-confirmation-message"></p>
                <div class="confirmation-actions">
                    <button id="rivertug-download-bundle-btn" class="secondary-btn">Download Documents</button>
                    <button id="rivertug-new-shipment-btn" class="main-submit-btn">New Shipment</button>
                </div>
            </div>
        </div>
    `;

    const backBtn = page.querySelector('.back-btn');
    backBtn?.addEventListener('click', () => switchPage('landing'));
}


// --- STEP 1: DETAILS ---
function handleDetailsSubmit(e: Event) {
    e.preventDefault();
    const bargeType = (document.querySelector('#rivertug-barge-type-selector .service-type-btn.active') as HTMLElement)?.dataset.bargeType as BargeType;

    const details: RiverTugDetails = {
        originPort: DOMElements.riverTug.originPort.value,
        destPort: DOMElements.riverTug.destPort.value,
        cargoDescription: DOMElements.riverTug.cargoDescription.value,
        cargoVolume: parseInt(DOMElements.riverTug.cargoVolume.value, 10),
        bargeType: bargeType,
        isHazardous: DOMElements.riverTug.isHazardous.checked,
    };
    setState({ riverTugDetails: details });
    renderComplianceStep();
    goToRiverTugStep(2);
}

// --- STEP 2: COMPLIANCE DOCS ---
function renderComplianceStep() {
    const { riverTugDetails } = State;
    if (!riverTugDetails) return;

    let docs: ComplianceDoc[] = [
        { id: 'doc-rt-ci', title: 'Commercial Invoice', description: 'Standard invoice for goods.', status: 'pending', file: null, required: true },
        { id: 'doc-rt-pl', title: 'Packing List / Weight Certificate', description: 'Details of cargo contents and weight.', status: 'pending', file: null, required: true },
        { id: 'doc-rt-cmn', title: 'Consignment Note (CMR/Waybill)', description: 'Transport document for inland waterways.', status: 'pending', file: null, required: true },
    ];

    if (riverTugDetails.isHazardous) {
        docs.push({ id: 'doc-rt-adn', title: 'ADN Dangerous Goods Note', description: 'Required for hazardous materials on European inland waterways.', status: 'pending', file: null, required: true });
    }
     if (riverTugDetails.bargeType === 'tank') {
        docs.push({ id: 'doc-rt-coc', title: 'Certificate of Cleaning', description: 'Ensures tank is clean for liquid cargo.', status: 'pending', file: null, required: true });
    }

    setState({ riverTugComplianceDocs: docs });

    DOMElements.riverTug.complianceChecklist.innerHTML = docs.map(doc => `
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

    document.querySelectorAll('#rivertug-compliance-checklist .file-drop-area').forEach(area => {
        const input = area.querySelector('.file-input') as HTMLInputElement;
        area.addEventListener('click', () => input.click());
        input.addEventListener('change', () => {
            if (input.files?.[0]) handleRiverTugFileUpload(input.files[0], input.dataset.docId!);
        });
    });
}

function handleRiverTugFileUpload(file: File, docId: string) {
    const docIndex = State.riverTugComplianceDocs.findIndex(d => d.id === docId);
    if (docIndex > -1) {
        const updatedDocs = [...State.riverTugComplianceDocs];
        updatedDocs[docIndex] = { ...updatedDocs[docIndex], file, status: 'uploaded' };
        setState({ riverTugComplianceDocs: updatedDocs });

        const docElement = document.getElementById(docId);
        const statusEl = docElement?.querySelector('.file-status');
        if (statusEl) {
            statusEl.textContent = file.name;
            statusEl.classList.add('uploaded');
        }
    }
}

// --- STEP 3: QUOTE ---
async function handleGetQuote() {
    if (!State.api || !State.riverTugDetails) {
        showToast("AI service or shipment details are not available.", "error");
        return;
    }
    const allRequiredUploaded = State.riverTugComplianceDocs.filter(d => d.required).every(d => d.status === 'uploaded');
    if (!allRequiredUploaded) {
        showToast("Please upload all required documents.", 'error');
        return;
    }

    toggleLoading(true, 'Calculating inland waterway rates with AI...');

    const prompt = `Generate a single realistic quote for a river barge shipment. Details: ${JSON.stringify(State.riverTugDetails)}. The response must be a JSON object with "carrierName" (a real inland waterway operator), "carrierType" ("Barge Operator"), "estimatedTransitTime", "totalCost", "notes", and a "costBreakdown" object (baseShippingCost, fuelSurcharge, estimatedCustomsAndTaxes, optionalInsuranceCost, ourServiceFee).`;
    const quoteSchema = {
        type: Type.OBJECT,
        properties: {
            carrierName: { type: Type.STRING },
            carrierType: { type: Type.STRING },
            estimatedTransitTime: { type: Type.STRING },
            totalCost: { type: Type.NUMBER },
            notes: { type: Type.STRING },
            costBreakdown: {
                type: Type.OBJECT,
                properties: {
                    baseShippingCost: { type: Type.NUMBER },
                    fuelSurcharge: { type: Type.NUMBER },
                    estimatedCustomsAndTaxes: { type: Type.NUMBER },
                    optionalInsuranceCost: { type: Type.NUMBER },
                    ourServiceFee: { type: Type.NUMBER },
                },
                required: ['baseShippingCost', 'fuelSurcharge', 'estimatedCustomsAndTaxes', 'optionalInsuranceCost', 'ourServiceFee']
            }
        },
        required: ['carrierName', 'carrierType', 'estimatedTransitTime', 'totalCost', 'costBreakdown', 'notes']
    };

    try {
        const response = await State.api.models.generateContent({
             model: 'gemini-2.5-flash',
             contents: prompt,
             config: { 
                 responseMimeType: 'application/json', 
                 responseSchema: quoteSchema
            }
         });
        const quote: Quote = JSON.parse(response.text);
        setState({ riverTugQuote: quote });

        DOMElements.riverTug.quoteSummary.innerHTML = `
            <h4>Quote Summary</h4>
            <div class="review-item"><span>Operator:</span> <strong>${quote.carrierName}</strong></div>
            <div class="review-item"><span>Route:</span> <strong>${State.riverTugDetails.originPort} &rarr; ${State.riverTugDetails.destPort}</strong></div>
            <div class="review-item"><span>Est. Transit Time:</span> <strong>${quote.estimatedTransitTime}</strong></div>
            <div class="review-item total"><span>Total Cost:</span> <strong>$${quote.totalCost.toFixed(2)}</strong></div>
        `;
        goToRiverTugStep(3);
    } catch (error) {
        console.error("AI RiverTug Quote Error:", error);
        showToast("Failed to generate quote.", "error");
    } finally {
        toggleLoading(false);
    }
}

// --- STEP 4: CONFIRMATION & PDF ---
function handleConfirmBooking() {
    const bookButton = DOMElements.riverTug.nav.toConfirmation;
    if (bookButton.disabled) return;

    const originalText = bookButton.textContent;
    bookButton.disabled = true;
    bookButton.textContent = 'Processing...';

    toggleLoading(true, "Confirming booking...");

    setTimeout(() => {
        toggleLoading(false);
        bookButton.disabled = false;
        bookButton.textContent = originalText;

        const bookingId = `RT-${Date.now().toString().slice(-6)}`;
        setState({ riverTugBookingId: bookingId });

        const titleEl = DOMElements.riverTug.confirmationTitle;
        const msgEl = DOMElements.riverTug.confirmationMessage;

        if (titleEl) titleEl.textContent = `✅ Charter Confirmed: #${bookingId}`;
        if (msgEl) msgEl.textContent = `Your river barge charter is confirmed.`;
        
        goToRiverTugStep(4);
    }, 1500);
}


function generateRiverTugPdf() {
    const { riverTugDetails, riverTugQuote, riverTugBookingId } = State;
    if (!riverTugDetails || !riverTugBookingId) { 
        showToast('Could not generate PDF. Booking data is missing.', 'error');
        return; 
    }

    const doc = new jsPDF();
    const headStyles = { fillColor: [2, 132, 199] as [number, number, number] }; // A blue color for waterways

    doc.setFontSize(18);
    doc.text('River Barge Shipment Confirmation', 105, 15, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Booking ID: ${riverTugBookingId}`, 105, 22, { align: 'center' });

    autoTable(doc, {
        startY: 30,
        head: [['Shipment Details', '']],
        body: [
            ['Route', `${riverTugDetails.originPort} to ${riverTugDetails.destPort}`],
            ['Cargo', `${riverTugDetails.cargoDescription} (${riverTugDetails.cargoVolume} MT)`],
            ['Barge Type', riverTugDetails.bargeType],
            ['Hazardous', riverTugDetails.isHazardous ? 'Yes' : 'No'],
        ],
        theme: 'striped', headStyles
    });
    
    if (riverTugQuote) {
        autoTable(doc, {
            // @ts-ignore
            startY: doc.lastAutoTable.finalY + 10,
            head: [['Cost Breakdown', 'Amount']],
            body: [
                 ['Operator', riverTugQuote.carrierName],
                 ['Est. Transit', riverTugQuote.estimatedTransitTime],
                 [{ content: 'Total Paid', styles: { fontStyle: 'bold' } }, { content: `$${riverTugQuote.totalCost.toFixed(2)}`, styles: { fontStyle: 'bold' } }]
            ],
            theme: 'striped', headStyles
        });
    }

    doc.save(`Vcanship_RiverTug_${riverTugBookingId}.pdf`);
}

// --- INITIALIZATION ---
export const startRiverTug = () => {
    setState({ currentService: 'rivertug' });
    renderRiverTugPage();
    switchPage('rivertug');
    resetRiverTugWizard();

    // Event Listeners
    DOMElements.riverTug.detailsForm.addEventListener('submit', handleDetailsSubmit);
    DOMElements.riverTug.bargeTypeSelector.querySelectorAll('.service-type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.parentElement?.querySelectorAll('.service-type-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    DOMElements.riverTug.nav.backToDetails.addEventListener('click', () => goToRiverTugStep(1));
    DOMElements.riverTug.nav.toQuote.addEventListener('click', handleGetQuote);

    DOMElements.riverTug.nav.backToDocs.addEventListener('click', () => goToRiverTugStep(2));
    DOMElements.riverTug.nav.toConfirmation.addEventListener('click', handleConfirmBooking);

    DOMElements.riverTug.nav.newShipment.addEventListener('click', resetRiverTugWizard);
    DOMElements.riverTug.nav.downloadBundle.addEventListener('click', generateRiverTugPdf);
};