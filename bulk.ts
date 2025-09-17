// ⚠️  READ-ONLY — DO NOT EDIT — SERVICE LOCKED ⚠️
import SignaturePad from 'signature_pad';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { State, setState, resetBulkState, type MasterCargoItem, type BulkDetails, type ComplianceDoc, type BrokerBid, type CharterType } from './state';
import { DOMElements } from './dom';
import { showToast, switchPage, updateProgressBar, toggleLoading } from './ui';
import { Type } from '@google/genai';

// --- DATA CONSTANTS ---

const MASTER_CARGO_LIST: MasterCargoItem[] = [
    // LIQUID BULK
    { name: 'Crude Oil (Light)', category: 'Liquid Bulk', vesselType: 'tanker', stowageFactor: 1.15, isHazardous: true, hazardClass: '3', requiredDocs: [{id: 'doc-msds', title: 'MSDS', description: 'Material Safety Data Sheet'}] },
    { name: 'Gasoline (Mogas)', category: 'Liquid Bulk', vesselType: 'tanker', stowageFactor: 1.35, isHazardous: true, hazardClass: '3', requiredDocs: [{id: 'doc-msds', title: 'MSDS', description: 'Material Safety Data Sheet'}] },
    { name: 'Palm Oil', category: 'Liquid Bulk', vesselType: 'tanker', stowageFactor: 1.08, isHazardous: false, requiredDocs: [{id: 'doc-origin', title: 'Certificate of Origin', description: 'Proof of origin for food products'}] },
    { name: 'Methanol', category: 'Liquid Bulk', vesselType: 'tanker', stowageFactor: 1.26, isHazardous: true, hazardClass: '3', requiredDocs: [{id: 'doc-msds', title: 'MSDS', description: 'Material Safety Data Sheet'}] },
    // DRY BULK
    { name: 'Iron Ore (Fines)', category: 'Dry Bulk', vesselType: 'break-bulk', stowageFactor: 0.45, isHazardous: false, requiredDocs: [{id: 'doc-moisture', title: 'TML & Moisture Certificate', description: 'Test for transportable moisture limit'}] },
    { name: 'Wheat', category: 'Dry Bulk', vesselType: 'break-bulk', stowageFactor: 1.3, isHazardous: false, requiredDocs: [{id: 'doc-phyto', title: 'Phytosanitary Certificate', description: 'Certifies grain is free of pests'}] },
    { name: 'Cement Clinker', category: 'Dry Bulk', vesselType: 'break-bulk', stowageFactor: 0.7, isHazardous: false, requiredDocs: [] },
    { name: 'Scrap Steel (HMS 1&2)', category: 'Dry Bulk', vesselType: 'break-bulk', stowageFactor: 1.4, isHazardous: false, requiredDocs: [{id: 'doc-quality', title: 'Quality Inspection Certificate', description: 'Pre-shipment inspection certificate'}] },
    // PROJECT CARGO
    { name: 'Wind Turbine Blade', category: 'Project & Heavy-Lift', vesselType: 'heavy-lift', stowageFactor: 8.0, isHazardous: false, requiredDocs: [{id: 'doc-lashing', title: 'Lashing & Securing Plan', description: 'Detailed plan for securing oversized cargo'}] },
    { name: 'Power Plant Transformer', category: 'Project & Heavy-Lift', vesselType: 'heavy-lift', stowageFactor: 3.5, isHazardous: false, requiredDocs: [{id: 'doc-lashing', title: 'Lashing & Securing Plan', description: 'Detailed plan for securing oversized cargo'}] },
    // FOREST PRODUCTS
    { name: 'Logs (Softwood)', category: 'Forest Products', vesselType: 'break-bulk', stowageFactor: 2.0, isHazardous: false, requiredDocs: [{id: 'doc-fumigation', title: 'Fumigation Certificate', description: 'Proof of treatment against pests'}]},
];

const PORT_SPECIFIC_RULES = {
    'Houston': { docs: [{ id: 'doc-isf', title: 'ISF 10+2 Filing', description: 'Required for all US-bound ocean cargo' }], fees: 150 },
    'Rotterdam': { docs: [{ id: 'doc-ens', title: 'EU Entry Summary Declaration (ENS)', description: 'Required for goods entering the EU customs territory' }], fees: 100 },
    'Singapore': { docs: [{ id: 'doc-psa', title: 'PSA Slot Booking Confirmation', description: 'Port of Singapore Authority booking confirmation' }], fees: 200 },
    'Qingdao': { docs: [{ id: 'doc-gacc', title: 'China GACC Pre-entry Declaration', description: 'General Administration of Customs China declaration' }], fees: 120 },
};

let signaturePad: SignaturePad | null = null;

function renderBulkPage() {
    const page = document.getElementById('page-bulk');
    if (!page) return;

    page.innerHTML = `
         <button class="back-btn">Back to Services</button>
        <div class="service-page-header">
            <h2>Bulk & Charter</h2>
            <p class="subtitle">Charter vessels for bulk, break-bulk, and project cargo shipments.</p>
            <div id="progress-bar-bulk" data-steps="Cargo,Route,Market,Docs,Bids,Payment,Confirmation"></div>
        </div>

        <!-- Step 1: Cargo -->
        <div id="bulk-step-cargo" class="service-step active">
            <form id="bulk-details-form" class="form-container">
                <div class="form-section">
                    <h3>Cargo Details</h3>
                    <div class="input-wrapper">
                        <label for="bulk-cargo-search">Search Cargo Type</label>
                        <input type="search" id="bulk-cargo-search" autocomplete="off">
                        <div id="bulk-cargo-search-results"></div>
                    </div>
                    <div class="form-grid">
                        <div class="input-wrapper"><label for="bulk-vessel-type">Suggested Vessel</label><select id="bulk-vessel-type"><option value="tanker">Tanker</option><option value="barge">Barge</option><option value="break-bulk">Break-bulk</option><option value="heavy-lift">Heavy-lift</option></select></div>
                        <div class="input-wrapper"><label for="bulk-stowage-factor">Stowage Factor</label><input type="number" id="bulk-stowage-factor" step="0.01"></div>
                        <div class="input-wrapper"><label for="bulk-cargo-volume">Volume (MT)</label><input type="number" id="bulk-cargo-volume" required></div>
                        <div class="checkbox-wrapper"><input type="checkbox" id="bulk-is-hazardous"><label for="bulk-is-hazardous">Hazardous</label></div>
                    </div>
                </div>
                <div class="form-actions"><button type="submit" class="main-submit-btn">Next: Route</button></div>
            </form>
        </div>

        <!-- Step 2: Route -->
        <div id="bulk-step-route" class="service-step">
            <div class="form-container">
                <h3>Route & Dates</h3>
                <div class="form-section two-column">
                    <div class="input-wrapper"><label for="bulk-origin-port">Origin Port</label><input type="text" id="bulk-origin-port" required></div>
                    <div class="input-wrapper"><label for="bulk-dest-port">Destination Port</label><input type="text" id="bulk-dest-port" required></div>
                </div>
                <div class="form-section">
                    <label>Laycan (Layday Cancelling Date)</label>
                     <div class="form-grid">
                        <div class="input-wrapper"><label for="bulk-laycan-from">From</label><input type="date" id="bulk-laycan-from" required></div>
                        <div class="input-wrapper"><label for="bulk-laycan-to">To</label><input type="date" id="bulk-laycan-to" required></div>
                    </div>
                </div>
                 <div class="form-section">
                    <h3>Charter Type</h3>
                    <div id="bulk-charter-type-selector" class="service-type-selector">
                        <button type="button" class="service-type-btn active" data-service-type="voyage">Voyage Charter</button>
                        <button type="button" class="service-type-btn" data-service-type="time">Time Charter</button>
                    </div>
                </div>
                <div class="form-actions">
                    <button type="button" id="bulk-back-to-details-btn" class="secondary-btn">Back</button>
                    <button type="button" id="bulk-to-market-btn" class="main-submit-btn">Next: Market</button>
                </div>
            </div>
        </div>

        <!-- Remaining Steps -->
        <div id="bulk-step-market" class="service-step"><div class="form-container"><h3>Market Analysis</h3><button id="bulk-request-quotes-btn" class="main-submit-btn">Broadcast to Broker Network</button><div class="form-actions"><button type="button" id="bulk-back-to-route-btn" class="secondary-btn">Back</button></div></div></div>
        <div id="bulk-step-docs" class="service-step"><div class="form-container"><h3>Compliance Docs</h3><div id="bulk-compliance-checklist"></div><div class="form-actions"><button type="button" id="bulk-back-to-market-btn" class="secondary-btn">Back</button><button id="bulk-to-bids-btn" class="main-submit-btn">Next: View Bids</button></div></div></div>
        <div id="bulk-step-bids" class="service-step"><div class="form-container"><h3>Broker Bids</h3><div id="bulk-bids-table-container"></div><div id="bulk-charter-party-section" class="hidden"><h3>Sign Charter Party</h3><canvas id="bulk-signature-canvas"></canvas><button type="button" id="bulk-signature-clear-btn" class="secondary-btn">Clear</button></div><div class="form-actions"><button type="button" id="bulk-back-to-docs-btn" class="secondary-btn">Back</button><button id="bulk-to-payment-btn" class="main-submit-btn">Next: Payment</button></div></div></div>
        <div id="bulk-step-payment" class="service-step"><div class="form-container"><h3>Payment</h3><div id="bulk-payment-overview"></div><form id="bulk-payment-form"><div class="form-actions"><button type="button" id="bulk-back-to-charter-btn" class="secondary-btn">Back</button><button type="submit" class="main-submit-btn">Pay</button></div></form></div></div>
        <div id="bulk-step-confirmation" class="service-step"><div class="confirmation-container"><h3 id="bulk-confirmation-title"></h3><p id="bulk-confirmation-message"></p><div class="confirmation-actions"><button id="bulk-download-bundle-btn" class="secondary-btn">Download</button><button id="bulk-new-shipment-btn" class="main-submit-btn">New Shipment</button></div></div></div>
    `;

    page.querySelector('.back-btn')?.addEventListener('click', () => switchPage('landing'));
}


// --- WIZARD NAVIGATION & STATE ---

function resetBulkWizard() {
    resetBulkState();
    DOMElements.bulkDetailsForm.reset();
    DOMElements.bulkCargoSearchResults.classList.remove('active');
    goToBulkStep(1);
}

function goToBulkStep(step: number) {
    const stepIds = ['cargo', 'route', 'market', 'docs', 'bids', 'payment', 'confirmation'];
    const currentStepId = stepIds[State.currentBulkStep - 1];
    const nextStepId = stepIds[step - 1];
    
    document.querySelectorAll('#page-bulk .service-step').forEach(s => s.classList.remove('active'));

    const currentStepElement = DOMElements.bulkSteps[currentStepId as keyof typeof DOMElements.bulkSteps];
    const nextStepElement = DOMElements.bulkSteps[nextStepId as keyof typeof DOMElements.bulkSteps];

    if (currentStepElement && nextStepElement && currentStepElement !== nextStepElement) {
        currentStepElement.classList.add('exiting');
        currentStepElement.addEventListener('animationend', () => {
            currentStepElement.classList.remove('active', 'exiting');
        }, { once: true });
    }
    
    if (nextStepElement) {
        nextStepElement.classList.add('active');
    }
    setState({ currentBulkStep: step });
    updateProgressBar('bulk', step - 1);

    if (step === 5) { // Bids step, initialize signature pad when section is shown
        setTimeout(() => initializeSignaturePad(), 100);
    }
}


// --- STEP 1: CARGO ---

function handleCargoSearch(e: Event) {
    const input = e.target as HTMLInputElement;
    const searchTerm = input.value.toLowerCase();
    const resultsContainer = DOMElements.bulkCargoSearchResults;

    if (searchTerm.length < 2) {
        resultsContainer.innerHTML = '';
        resultsContainer.classList.remove('active');
        return;
    }

    const filtered = MASTER_CARGO_LIST.filter(c => c.name.toLowerCase().includes(searchTerm));
    if (filtered.length > 0) {
        resultsContainer.innerHTML = filtered.map(c => `
            <div class="cargo-result-item" data-cargo-name="${c.name}">
                <strong>${c.name}</strong>
                <small>${c.category}</small>
            </div>
        `).join('');
        resultsContainer.classList.add('active');
    } else {
        resultsContainer.innerHTML = '';
        resultsContainer.classList.remove('active');
    }
}

function handleCargoSelect(e: Event) {
    const target = e.target as HTMLDivElement;
    const itemElement = target.closest<HTMLElement>('.cargo-result-item');
    if (!itemElement) return;

    const cargoName = itemElement.dataset.cargoName;
    const selectedCargo = MASTER_CARGO_LIST.find(c => c.name === cargoName);
    if (!selectedCargo) return;

    DOMElements.bulkCargoSearch.value = selectedCargo.name;
    DOMElements.bulkVesselType.value = selectedCargo.vesselType;
    DOMElements.bulkStowageFactor.value = String(selectedCargo.stowageFactor);
    DOMElements.bulkIsHazardous.checked = selectedCargo.isHazardous;
    DOMElements.bulkCargoSearchResults.classList.remove('active');
    
    setState({ bulkDetails: { ...State.bulkDetails, selectedCargo } as BulkDetails });
}

function handleDetailsSubmit(e: Event) {
    e.preventDefault();
    const details = {
        vesselType: DOMElements.bulkVesselType.value as 'tanker' | 'barge' | 'break-bulk' | 'heavy-lift',
        cargoVolume: parseFloat(DOMElements.bulkCargoVolume.value),
        stowageFactor: parseFloat(DOMElements.bulkStowageFactor.value),
        isHazardous: DOMElements.bulkIsHazardous.checked,
    };
    setState({ bulkDetails: { ...State.bulkDetails, ...details } as BulkDetails });
    goToBulkStep(2);
}

// --- STEP 4: COMPLIANCE DOCS ---

function renderComplianceStep() {
    let docs: ComplianceDoc[] = [
        { id: 'doc-ci', title: 'Commercial Invoice', description: 'Standard invoice for goods.', status: 'pending', file: null, required: true },
        { id: 'doc-pl', title: 'Packing List', description: 'Details of package contents.', status: 'pending', file: null, required: true },
        { id: 'doc-bl', title: 'Bill of Lading (Draft)', description: 'Draft of the transport contract.', status: 'pending', file: null, required: true },
    ];
    
    const { selectedCargo, originPort, destPort } = State.bulkDetails!;

    // Add docs from selected cargo
    if (selectedCargo?.requiredDocs) {
        selectedCargo.requiredDocs.forEach(d => {
            if (!docs.some(existing => existing.id === d.id)) {
                 docs.push({ ...d, status: 'pending', file: null, required: true });
            }
        });
    }

    // Add docs from port-specific rules
    const originRules = Object.entries(PORT_SPECIFIC_RULES).find(([port]) => originPort.toLowerCase().includes(port.toLowerCase()));
    const destRules = Object.entries(PORT_SPECIFIC_RULES).find(([port]) => destPort.toLowerCase().includes(port.toLowerCase()));
    
    if (originRules) {
        originRules[1].docs.forEach(d => docs.push({ ...d, status: 'pending', file: null, required: true, description: `${d.description} (Origin Port)` }));
    }
    if (destRules) {
         destRules[1].docs.forEach(d => docs.push({ ...d, status: 'pending', file: null, required: true, description: `${d.description} (Destination Port)` }));
    }

    setState({ bulkComplianceDocs: docs });

    const groupedDocs = docs.reduce((acc, doc) => {
        const category = doc.id.startsWith('doc-c') ? 'Commercial' : doc.id.startsWith('doc-p') ? 'Port' : 'Cargo-Specific';
        if(!acc[category]) acc[category] = [];
        acc[category].push(doc);
        return acc;
    }, {} as Record<string, ComplianceDoc[]>);
    
    DOMElements.bulkComplianceChecklist.innerHTML = Object.entries(groupedDocs).map(([category, docs]) => `
        <h4>${category} Documents</h4>
        ${docs.map(doc => `
            <div class="compliance-doc-item" id="${doc.id}">
                <div class="compliance-doc-info">
                    <h5>${doc.title} ${doc.required ? '<span>(Required)</span>' : ''}</h5>
                    <p>${doc.description}</p>
                </div>
                <div class="file-drop-area">
                    <div class="file-status">Click or drag file</div>
                    <input type="file" class="file-input" accept=".pdf" data-doc-id="${doc.id}">
                </div>
            </div>`).join('')}
    `).join('');

    // Add event listeners for file uploads
    document.querySelectorAll('#bulk-compliance-checklist .file-drop-area').forEach(area => {
        const input = area.querySelector('.file-input') as HTMLInputElement;
        area.addEventListener('click', () => input.click());
        // Drag-drop listeners
    });
}

// --- STEP 5: BIDS ---

async function renderBidsStep() {
    if (!State.api || !State.bulkDetails) {
        showToast("AI service or shipment details are not available.", "error");
        return;
    }
    toggleLoading(true, 'Broadcasting to broker network with AI...');

    const { selectedCargo, cargoVolume, originPort, destPort } = State.bulkDetails;
    const prompt = `Generate a list of 2 realistic broker bids for a bulk shipment of ${cargoVolume} MT of ${selectedCargo?.name} from ${originPort} to ${destPort}. The response must be a valid JSON array of objects. Each object must have "id", "brokerName", "vesselName", "rate" (number), "rateType" (either 'per_ton' or 'lumpsum'), and "totalCost" (number). Calculate totalCost correctly based on the rate and volume.`;

    const bidSchema = {
        type: Type.OBJECT,
        properties: {
            id: { type: Type.STRING },
            brokerName: { type: Type.STRING },
            vesselName: { type: Type.STRING },
            rate: { type: Type.NUMBER },
            rateType: { type: Type.STRING, enum: ['per_ton', 'lumpsum'] },
            totalCost: { type: Type.NUMBER },
        },
        required: ['id', 'brokerName', 'vesselName', 'rate', 'rateType', 'totalCost']
    };

    try {
        const response = await State.api.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    items: bidSchema,
                }
            }
        });
        const bids: BrokerBid[] = JSON.parse(response.text);
        setState({ bulkDetails: { ...State.bulkDetails, bids } as BulkDetails });

        DOMElements.bulkBidsTableContainer.innerHTML = `
            <table>
                <thead><tr><th>Broker</th><th>Vessel</th><th>Rate</th><th>Total Cost</th><th>Action</th></tr></thead>
                <tbody>
                    ${bids.map(bid => `
                        <tr>
                            <td>${bid.brokerName}</td>
                            <td>${bid.vesselName}</td>
                            <td>$${bid.rate.toFixed(2)} ${bid.rateType === 'lumpsum' ? '(LS)' : '/ton'}</td>
                            <td>$${bid.totalCost.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                            <td><button class="secondary-btn accept-bid-btn" data-bid-id="${bid.id}">Accept Bid</button></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        document.querySelectorAll('.accept-bid-btn').forEach(btn => btn.addEventListener('click', (e) => {
            const bidId = (e.target as HTMLButtonElement).dataset.bidId;
            const acceptedBid = State.bulkDetails!.bids.find(b => b.id === bidId);
            setState({ bulkDetails: { ...State.bulkDetails, acceptedBid } as BulkDetails });
            DOMElements.bulkCharterPartySection.classList.remove('hidden');
            showToast(`Bid from ${acceptedBid?.brokerName} accepted. Please review and sign the charter party.`, 'success');
        }));

        goToBulkStep(5);

    } catch (error) {
        console.error("AI Bid Generation Error:", error);
        showToast("Failed to get broker bids from AI.", "error");
    } finally {
        toggleLoading(false);
    }
}

// --- STEP 6: Charter Party ---
function initializeSignaturePad() {
    const canvas = DOMElements.bulkSignatureCanvas;
    if (!canvas || signaturePad) return;
    signaturePad = new SignaturePad(canvas, { backgroundColor: 'rgb(255, 255, 255)' });
    
    function resizeCanvas() {
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        canvas.width = canvas.offsetWidth * ratio;
        canvas.height = canvas.offsetHeight * ratio;
        canvas.getContext("2d")?.scale(ratio, ratio);
        signaturePad?.clear();
    }
    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();
}

// --- PDF GENERATION ---
function generateBulkPdf() {
    const { bulkDetails } = State;
    if (!bulkDetails || !bulkDetails.bookingId || !bulkDetails.acceptedBid) {
        showToast("Cannot generate PDF, booking data missing.", "error");
        return;
    }
    const { bookingId, acceptedBid, selectedCargo } = bulkDetails;
    const doc = new jsPDF();
    const headStyles = { fillColor: [239, 68, 68] as [number, number, number] }; // Red for bulk theme

    // Vcanship Header
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('VCanship', 15, 20);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('123 Global Logistics Ave, Shipping City, 12345', 15, 27);
    doc.text('support@vcanresources.com | +1 (555) 123-4567', 15, 32);

    doc.setFontSize(18);
    doc.text('Bulk Charter Confirmation', 105, 45, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Booking ID: ${bookingId}`, 105, 52, { align: 'center' });
    
    autoTable(doc, {
        startY: 60,
        head: [['Charter Details', '']],
        body: [
            ['Vessel', acceptedBid.vesselName],
            ['Broker', acceptedBid.brokerName],
            ['Route', `${bulkDetails.originPort} to ${bulkDetails.destPort}`],
            ['Laycan', `${bulkDetails.laycanFrom} to ${bulkDetails.laycanTo}`],
            ['Cargo', `${selectedCargo?.name} (${bulkDetails.cargoVolume} MT)`],
            [{ content: 'Total Charter Hire', styles: { fontStyle: 'bold' } }, { content: `$${acceptedBid.totalCost.toLocaleString()}`, styles: { fontStyle: 'bold' } }]
        ],
        theme: 'striped', headStyles
    });

    if (bulkDetails.signatureDataUrl) {
        // @ts-ignore
        let finalY = doc.lastAutoTable.finalY;
        doc.setFontSize(12);
        doc.text('Charter Party Executed By:', 14, finalY + 15);
        doc.addImage(bulkDetails.signatureDataUrl, 'PNG', 14, finalY + 20, 80, 40);
    }
    
    doc.save(`Vcanship_Bulk_${bookingId}.pdf`);
}


// --- WIZARD FLOW CONTROL ---
function setupEventListeners() {
    DOMElements.bulkDetailsForm.addEventListener('submit', handleDetailsSubmit);
    DOMElements.bulkCargoSearch.addEventListener('keyup', handleCargoSearch);
    DOMElements.bulkCargoSearchResults.addEventListener('click', handleCargoSelect);

    // Navigation
    DOMElements.bulkNav.backToDetails.addEventListener('click', () => goToBulkStep(1));
    DOMElements.bulkNav.toMarket.addEventListener('click', () => {
        const details = {
            originPort: DOMElements.bulkOriginPort.value,
            destPort: DOMElements.bulkDestPort.value,
            laycanFrom: DOMElements.bulkLaycanFrom.value,
            laycanTo: DOMElements.bulkLaycanTo.value,
            charterType: (document.querySelector('#bulk-charter-type-selector .active') as HTMLElement).dataset.serviceType as CharterType,
        };
        setState({ bulkDetails: { ...State.bulkDetails, ...details } as BulkDetails });
        goToBulkStep(3);
    });

    DOMElements.bulkNav.backToRoute.addEventListener('click', () => goToBulkStep(2));
    DOMElements.bulkRequestQuotesBtn.addEventListener('click', () => {
        renderComplianceStep();
        goToBulkStep(4);
    });
    
    DOMElements.bulkNav.backToMarket.addEventListener('click', () => goToBulkStep(3));
    DOMElements.bulkNav.toBids.addEventListener('click', renderBidsStep);

    DOMElements.bulkNav.backToDocs.addEventListener('click', () => goToBulkStep(4));
    DOMElements.bulkNav.toPayment.addEventListener('click', () => {
         if (signaturePad?.isEmpty()) {
            showToast("Please provide your signature to execute the charter party.", 'error');
            return;
        }
        const signatureDataUrl = signaturePad!.toDataURL();
        setState({ bulkDetails: { ...State.bulkDetails, signatureDataUrl } as BulkDetails });
        DOMElements.bulkPaymentOverview.innerHTML = `<span>Final Charter Hire:</span><strong>$${State.bulkDetails?.acceptedBid?.totalCost.toLocaleString()}</strong>`;
        goToBulkStep(6);
    });

    DOMElements.bulkSignatureClearBtn.addEventListener('click', () => signaturePad?.clear());
    DOMElements.bulkNav.backToCharter.addEventListener('click', () => goToBulkStep(5));
    DOMElements.bulkPaymentForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const payButton = DOMElements.bulkPaymentForm.querySelector('button[type="submit"]') as HTMLButtonElement | null;
        if (!payButton || payButton.disabled) return;

        const originalButtonText = payButton.textContent;
        payButton.disabled = true;
        payButton.textContent = 'Processing...';
        toggleLoading(true, "Processing Payment...");

        setTimeout(() => {
            toggleLoading(false);
            const paymentSucceeded = Math.random() > 0.1;

            if (paymentSucceeded) {
                const bookingId = `BLK-${Date.now().toString().slice(-6)}`;
                setState({ bulkDetails: { ...State.bulkDetails, bookingId } as BulkDetails });
                DOMElements.bulkConfirmationTitle.textContent = `✅ Charter Confirmed!`;
                DOMElements.bulkConfirmationMessage.innerHTML = `Your booking <strong>#${bookingId}</strong> for ${State.bulkDetails?.selectedCargo?.name} is confirmed.`;
                goToBulkStep(7);
            } else {
                showToast("Payment failed. Please try again.", "error");
                payButton.disabled = false;
                payButton.textContent = originalButtonText;
            }
        }, 1500);
    });

    DOMElements.bulkNav.newShipment.addEventListener('click', resetBulkWizard);
    DOMElements.bulkNav.downloadBundle.addEventListener('click', generateBulkPdf);
}

// --- MAIN EXPORT ---
export const startBulk = () => {
    setState({ currentService: 'bulk' });
    renderBulkPage();
    switchPage('bulk');
    resetBulkWizard();
    setupEventListeners();
};