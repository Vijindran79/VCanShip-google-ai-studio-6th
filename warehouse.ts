// ⚠️  READ-ONLY — DO NOT EDIT — SERVICE LOCKED ⚠️
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { State, setState, resetWarehouseState, type Facility, type WarehouseDetails, type ComplianceDoc, type WarehouseServiceLevel } from './state';
import { DOMElements } from './dom';
import { showToast, updateProgressBar, switchPage, toggleLoading } from './ui';

// --- DATA CONSTANTS ---
const FACILITIES: Facility[] = [
  {"id":"AEJAFZ","name":"Jebel Ali Free Zone","country":"UAE","types":["FZ","Bonded","Cold","Haz","Open"],"lat":25.02,"lon":55.06, availability: 15000, price: 12.50 },
  {"id":"SGJUR","name":"Jurong Port Tank Farm","country":"SG","types":["Tank","Bonded","Haz"],"lat":1.26,"lon":103.69, availability: 50000, price: 25.00 },
  {"id":"INICD","name":"ICD Tughlakabad","country":"IN","types":["Bonded","Covered"],"lat":28.50,"lon":77.32, availability: 8000, price: 8.00 },
  {"id":"NLRTM","name":"Rotterdam Cold Store","country":"NL","types":["Cold","Bonded","Haz"],"lat":51.92,"lon":4.47, availability: 12000, price: 22.75 }
];

function renderWarehousePage() {
    const page = document.getElementById('page-warehouse');
    if (!page) return;

    page.innerHTML = `
        <button class="back-btn">Back to Services</button>
        <div class="service-page-header">
            <h2>On-Demand Warehousing</h2>
            <p class="subtitle">Find and book warehouse space instantly.</p>
            <div id="progress-bar-warehouse" data-steps="Location,Cargo,Service,Docs,Quote,Payment,Confirmation"></div>
        </div>

        <!-- Step 1: Location -->
        <div id="warehouse-step-location" class="service-step active">
            <div class="warehouse-layout">
                <aside class="warehouse-filters">
                    <h4>Filters</h4>
                    <div class="input-wrapper">
                        <label for="warehouse-location-search">Search by Name/Country</label>
                        <input type="search" id="warehouse-location-search">
                    </div>
                    <div id="warehouse-filters">
                        <label>Facility Type</label>
                        <div class="checkbox-wrapper"><input type="checkbox" id="filter-bonded" value="Bonded"><label for="filter-bonded">Bonded</label></div>
                        <div class="checkbox-wrapper"><input type="checkbox" id="filter-cold" value="Cold"><label for="filter-cold">Cold Storage</label></div>
                        <div class="checkbox-wrapper"><input type="checkbox" id="filter-haz" value="Hazmat"><label for="filter-haz">Hazmat</label></div>
                    </div>
                    <button id="warehouse-apply-filters-btn" class="secondary-btn">Apply</button>
                </aside>
                <main id="warehouse-facility-list" class="warehouse-results"></main>
            </div>
        </div>
        
        <!-- Step 2: Cargo -->
        <div id="warehouse-step-cargo" class="service-step">
            <form id="warehouse-cargo-form" class="form-container">
                <h3>Cargo Details</h3>
                <div class="input-wrapper"><label for="warehouse-cargo-description">Description</label><textarea id="warehouse-cargo-description" required></textarea></div>
                <div class="input-wrapper"><label for="warehouse-pallet-count">Pallet Count</label><input type="number" id="warehouse-pallet-count" required min="1"></div>
                <div class="checkbox-wrapper"><input type="checkbox" id="warehouse-requires-temp-control"><label for="warehouse-requires-temp-control">Requires Temp Control</label></div>
                <div id="warehouse-temp-container" class="conditional-fields"><label for="warehouse-temp-min">Min Temp (°C): <span id="warehouse-temp-display">5°C</span></label><input type="range" id="warehouse-temp-min" min="-20" max="20" value="5"></div>
                <div class="checkbox-wrapper"><input type="checkbox" id="warehouse-is-hazardous"><label for="warehouse-is-hazardous">Hazardous</label></div>
                <div id="warehouse-hazmat-container" class="conditional-fields"><label for="warehouse-un-number">UN Number</label><input type="text" id="warehouse-un-number"></div>
                <div class="form-actions">
                    <button type="button" id="warehouse-back-to-location-btn" class="secondary-btn">Back</button>
                    <button type="submit" class="main-submit-btn">Next: Service Level</button>
                </div>
            </form>
        </div>
        
        <!-- Step 3: Service -->
        <div id="warehouse-step-service" class="service-step">
            <div class="form-container">
                <h3>Service Level</h3>
                <p class="subtitle">Choose the level of service you require at the facility.</p>
                <div id="warehouse-service-level-selector" class="service-type-selector">
                    <button type="button" class="service-type-btn active" data-service-type="standard">
                        <strong>Standard Storage</strong>
                        <span>Basic storage and handling of your pallets.</span>
                    </button>
                    <button type="button" class="service-type-btn" data-service-type="value-added">
                        <strong>Value-Added Services</strong>
                        <span>Includes pick & pack, labeling, and quality control.</span>
                    </button>
                </div>
                <div class="form-actions">
                    <button type="button" id="warehouse-back-to-cargo-btn" class="secondary-btn">Back</button>
                    <button type="button" id="warehouse-to-docs-btn" class="main-submit-btn">Next: Documents</button>
                </div>
            </div>
        </div>

        <!-- Step 4: Docs -->
        <div id="warehouse-step-docs" class="service-step">
            <div class="form-container">
                <h3>Compliance Documents</h3>
                <p class="subtitle">Upload required documents for storage.</p>
                <div id="warehouse-compliance-checklist" class="compliance-checklist"></div>
                <div class="form-actions">
                    <button type="button" id="warehouse-back-to-service-btn" class="secondary-btn">Back</button>
                    <button type="button" id="warehouse-proceed-to-quote" class="main-submit-btn">Next: Get Quote</button>
                </div>
            </div>
        </div>

        <!-- Step 5: Quote -->
        <div id="warehouse-step-quote" class="service-step">
            <div class="form-container">
                <h3>Quote Summary</h3>
                <div id="warehouse-quote-summary" class="payment-overview"></div>
                <div class="form-actions">
                    <button type="button" id="warehouse-back-to-docs-btn" class="secondary-btn">Back</button>
                    <button type="button" id="warehouse-proceed-to-payment" class="main-submit-btn">Proceed to Payment</button>
                </div>
            </div>
        </div>

        <!-- Step 6: Payment -->
        <div id="warehouse-step-payment" class="service-step">
            <div class="form-container">
                <h3>Secure Payment</h3>
                <div id="warehouse-payment-overview" class="payment-overview"></div>
                <form id="warehouse-payment-form">
                    <div class="input-wrapper">
                        <label for="warehouse-payment-cardholder-name">Cardholder Name</label>
                        <input type="text" id="warehouse-payment-cardholder-name" required>
                    </div>
                    <div id="warehouse-card-element" class="card-element-container"></div>
                    <div id="warehouse-card-errors" role="alert" class="card-errors-container"></div>
                    <div class="form-actions">
                        <button type="button" id="warehouse-back-to-quote-btn" class="secondary-btn">Back</button>
                        <button type="submit" id="warehouse-confirm-payment" class="main-submit-btn">Pay & Confirm</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Step 7: Confirmation -->
        <div id="warehouse-step-confirmation" class="service-step">
            <div class="confirmation-container">
                <h3 id="warehouse-confirmation-title"></h3>
                <p id="warehouse-confirmation-message"></p>
                <div class="confirmation-actions">
                    <button id="warehouse-download-pdf-btn" class="secondary-btn">Download Summary</button>
                    <button id="warehouse-new-booking-btn" class="main-submit-btn">New Booking</button>
                </div>
            </div>
        </div>
    `;

    page.querySelector('.back-btn')?.addEventListener('click', () => switchPage('landing'));
}


// --- WIZARD NAVIGATION & STATE ---

function resetWarehouseWizard() {
    resetWarehouseState();
    const cargoForm = document.getElementById('warehouse-cargo-form') as HTMLFormElement;
    if (cargoForm) cargoForm.reset();
    DOMElements.warehouseFacilityList.innerHTML = '';
    goToWarehouseStep(1);
    renderFacilityList(FACILITIES);
}

function goToWarehouseStep(step: number) {
    const stepIds = ['location', 'cargo', 'service', 'docs', 'quote', 'payment', 'confirmation'];
    
    // Deactivate all steps
    document.querySelectorAll('#page-warehouse .service-step').forEach(s => s.classList.remove('active'));

    // Activate the target step
    const nextStepId = stepIds[step - 1];
    const nextStepElement = document.getElementById(`warehouse-step-${nextStepId}`);
    if (nextStepElement) {
        nextStepElement.classList.add('active');
    }
    
    setState({ currentWarehouseStep: step });
    updateProgressBar('warehouse', step - 1);
}

// --- STEP 1: LOCATION ---

function renderFacilityList(facilities: Facility[]) {
    if (facilities.length === 0) {
        DOMElements.warehouseFacilityList.innerHTML = '<p class="helper-text">No facilities match your criteria.</p>';
        return;
    }

    DOMElements.warehouseFacilityList.innerHTML = facilities.map(f => `
        <div class="facility-card" data-facility-id="${f.id}">
            <div class="facility-card-info">
                <h5>${f.name}</h5>
                <p>${f.country}</p>
                <div class="facility-card-tags">
                    ${f.types.map(t => `<span class="facility-tag">${t}</span>`).join('')}
                </div>
            </div>
            <div class="facility-card-price">
                <p>from</p>
                <strong>$${f.price.toFixed(2)}</strong>
                <p>/pallet/day</p>
            </div>
        </div>
    `).join('');

    DOMElements.warehouseFacilityList.querySelectorAll('.facility-card').forEach(card => {
        card.addEventListener('click', () => {
            const facilityId = (card as HTMLElement).dataset.facilityId;
            const selectedFacility = FACILITIES.find(fac => fac.id === facilityId);
            if (selectedFacility) {
                setState({ warehouseDetails: { ...State.warehouseDetails, selectedFacility } as WarehouseDetails });
                goToWarehouseStep(2);
            }
        });
    });
}

function handleFilterFacilities() {
    const searchTerm = DOMElements.warehouseLocationSearch.value.toLowerCase();
    const selectedTypes = Array.from(DOMElements.warehouseFilterCheckboxes)
        .filter(cb => (cb as HTMLInputElement).checked)
        .map(cb => (cb as HTMLInputElement).value);
    
    const filtered = FACILITIES.filter(f => {
        const matchesSearch = searchTerm ? f.name.toLowerCase().includes(searchTerm) || f.country.toLowerCase().includes(searchTerm) : true;
        const matchesType = selectedTypes.length > 0 ? selectedTypes.every(type => f.types.includes(type)) : true;
        return matchesSearch && matchesType;
    });

    renderFacilityList(filtered);
}

// --- STEP 2: CARGO ---
function handleCargoSubmit(e: Event) {
    e.preventDefault();
    const details = {
        cargoDescription: (document.getElementById('warehouse-cargo-description') as HTMLTextAreaElement).value,
        palletCount: parseInt((document.getElementById('warehouse-pallet-count') as HTMLInputElement).value, 10),
        requiresTempControl: (document.getElementById('warehouse-requires-temp-control') as HTMLInputElement).checked,
        tempMin: (document.getElementById('warehouse-requires-temp-control') as HTMLInputElement).checked ? parseInt((document.getElementById('warehouse-temp-min') as HTMLInputElement).value, 10) : undefined,
        isHazardous: (document.getElementById('warehouse-is-hazardous') as HTMLInputElement).checked,
        unNumber: (document.getElementById('warehouse-is-hazardous') as HTMLInputElement).checked ? (document.getElementById('warehouse-un-number') as HTMLInputElement).value : null,
    };
    setState({ warehouseDetails: { ...State.warehouseDetails, ...details } as WarehouseDetails });
    goToWarehouseStep(3);
}


// --- STEP 4: COMPLIANCE ---

function renderComplianceStep() {
    const { warehouseDetails } = State;
    if (!warehouseDetails || !warehouseDetails.selectedFacility) return;

    let docs: ComplianceDoc[] = [
        { id: 'doc-wh-ci', title: 'Commercial Invoice', description: 'Standard invoice for goods.', status: 'pending', file: null, required: true },
        { id: 'doc-wh-pl', title: 'Packing List', description: 'Details of package contents.', status: 'pending', file: null, required: true }
    ];

    if (warehouseDetails.isHazardous) {
        docs.push({ id: 'doc-wh-msds', title: 'MSDS/DGD', description: 'Material Safety Data Sheet for hazardous goods.', status: 'pending', file: null, required: true });
    }
    if (warehouseDetails.requiresTempControl) {
        docs.push({ id: 'doc-wh-temp', title: 'Temperature Log', description: 'Log of temperature during transit to warehouse.', status: 'pending', file: null, required: false });
    }
    if (warehouseDetails.selectedFacility.types.includes('Bonded')) {
         docs.push({ id: 'doc-wh-bond', title: 'Bonded Cargo Declaration', description: 'Required for entry into a bonded facility.', status: 'pending', file: null, required: true });
    }

    setState({ warehouseComplianceDocs: docs });

    DOMElements.warehouseComplianceChecklist.innerHTML = docs.map(doc => `
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

    document.querySelectorAll('#warehouse-compliance-checklist .file-drop-area').forEach(area => {
        const input = area.querySelector('.file-input') as HTMLInputElement;
        area.addEventListener('click', () => input.click());
        input.addEventListener('change', () => {
            if (input.files?.[0]) handleWarehouseFileUpload(input.files[0], input.dataset.docId!);
        });
    });
}

function handleWarehouseFileUpload(file: File, docId: string) {
    const docIndex = State.warehouseComplianceDocs.findIndex(d => d.id === docId);
    if (docIndex > -1) {
        const updatedDocs = [...State.warehouseComplianceDocs];
        updatedDocs[docIndex] = { ...updatedDocs[docIndex], file, status: 'uploaded' };
        setState({ warehouseComplianceDocs: updatedDocs });

        const docElement = document.getElementById(docId);
        const statusEl = docElement?.querySelector('.file-status');
        if (statusEl) {
            statusEl.textContent = file.name;
            statusEl.classList.add('uploaded');
        }
    }
}

// --- STEP 5: QUOTE ---
function renderQuoteStep() {
    const { warehouseDetails } = State;
    if (!warehouseDetails || !warehouseDetails.selectedFacility) return;

    const { selectedFacility, palletCount, serviceLevel } = warehouseDetails;
    const baseCost = selectedFacility.price * palletCount;
    const serviceMultiplier = serviceLevel === 'value-added' ? 1.5 : 1.0;
    const totalCost = baseCost * serviceMultiplier * 30; // Assume 30 days

    const summaryEl = document.getElementById('warehouse-quote-summary');
    if (summaryEl) {
        summaryEl.innerHTML = `
            <div class="review-item"><span>Facility:</span> <strong>${selectedFacility.name}</strong></div>
            <div class="review-item"><span>Pallet Count:</span> <strong>${palletCount}</strong></div>
            <div class="review-item"><span>Daily Rate:</span> <strong>$${(baseCost * serviceMultiplier).toFixed(2)} / day</strong></div>
            <div class="review-item total"><span>Est. 30-Day Cost:</span> <strong>$${totalCost.toFixed(2)}</strong></div>
        `;
    }
    goToWarehouseStep(5);
}

// --- STEP 6 & 7 & PDF ---
function generateWarehousePdf() {
    const { warehouseDetails, warehouseBookingId } = State;
    if (!warehouseDetails || !warehouseBookingId || !warehouseDetails.selectedFacility) return;

    const doc = new jsPDF();

    // Vcanship Header
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('VCanship', 15, 20);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('123 Global Logistics Ave, Shipping City, 12345', 15, 27);
    doc.text('support@vcanresources.com | +1 (555) 123-4567', 15, 32);

    doc.setFontSize(18);
    doc.text('Warehouse Booking Confirmation', 105, 45, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Booking ID: ${warehouseBookingId}`, 105, 52, { align: 'center' });

    autoTable(doc, {
        startY: 60,
        head: [['Booking Details', '']],
        body: [
            ['Facility', `${warehouseDetails.selectedFacility.name}, ${warehouseDetails.selectedFacility.country}`],
            ['Cargo', warehouseDetails.cargoDescription],
            ['Pallet Count', `${warehouseDetails.palletCount}`],
            ['Service Level', warehouseDetails.serviceLevel || 'N/A'],
            ['Hazardous', warehouseDetails.isHazardous ? `Yes (UN: ${warehouseDetails.unNumber || 'N/A'})` : 'No'],
            ['Temp. Control', warehouseDetails.requiresTempControl ? `Yes (${warehouseDetails.tempMin}°C)` : 'No'],
        ],
    });

    doc.save(`Vcanship_Warehouse_${warehouseBookingId}.pdf`);
}

// --- INITIALIZATION ---
export const startWarehouse = () => {
    setState({ currentService: 'warehouse' });
    renderWarehousePage();
    switchPage('warehouse');
    resetWarehouseWizard();

    // Event listeners
    DOMElements.warehouseApplyFiltersBtn.addEventListener('click', handleFilterFacilities);
    DOMElements.warehouseLocationSearch.addEventListener('input', handleFilterFacilities);
    DOMElements.warehouseFilterCheckboxes.forEach(cb => cb.addEventListener('change', handleFilterFacilities));
    (document.getElementById('warehouse-cargo-form') as HTMLFormElement)?.addEventListener('submit', handleCargoSubmit);

    const tempControl = document.getElementById('warehouse-requires-temp-control') as HTMLInputElement;
    tempControl?.addEventListener('change', () => {
        document.getElementById('warehouse-temp-container')?.classList.toggle('visible', tempControl.checked);
    });
    const tempRange = document.getElementById('warehouse-temp-min') as HTMLInputElement;
    tempRange?.addEventListener('input', () => {
        const tempDisplay = document.getElementById('warehouse-temp-display');
        if (tempDisplay) tempDisplay.textContent = `${tempRange.value}°C`;
    });
    const isHaz = document.getElementById('warehouse-is-hazardous') as HTMLInputElement;
    isHaz?.addEventListener('change', () => {
        document.getElementById('warehouse-hazmat-container')?.classList.toggle('visible', isHaz.checked);
    });

    DOMElements.warehouseServiceLevelSelector?.querySelectorAll('.service-type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const serviceLevel = (btn as HTMLElement).dataset.serviceType as WarehouseServiceLevel;
            setState({ warehouseDetails: { ...State.warehouseDetails, serviceLevel } as WarehouseDetails });
            btn.parentElement?.querySelectorAll('.service-type-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // Navigation
    document.getElementById('warehouse-back-to-location-btn')?.addEventListener('click', () => goToWarehouseStep(1));
    document.getElementById('warehouse-back-to-cargo-btn')?.addEventListener('click', () => goToWarehouseStep(2));
    document.getElementById('warehouse-back-to-service-btn')?.addEventListener('click', () => goToWarehouseStep(3));
    document.getElementById('warehouse-back-to-docs-btn')?.addEventListener('click', () => goToWarehouseStep(4));
    document.getElementById('warehouse-back-to-quote-btn')?.addEventListener('click', () => goToWarehouseStep(5));
    
    document.getElementById('warehouse-to-docs-btn')?.addEventListener('click', () => {
        renderComplianceStep();
        goToWarehouseStep(4);
    });

    document.getElementById('warehouse-proceed-to-quote')?.addEventListener('click', () => {
        const allRequiredUploaded = State.warehouseComplianceDocs
            .filter(d => d.required)
            .every(d => d.status === 'uploaded');
        if (!allRequiredUploaded) {
            showToast("Please upload all required documents.", 'error');
            return;
        }
        renderQuoteStep();
    });

    document.getElementById('warehouse-proceed-to-payment')?.addEventListener('click', () => {
        const paymentOverview = document.getElementById('warehouse-payment-overview');
        const quoteSummary = document.getElementById('warehouse-quote-summary');
        if(paymentOverview && quoteSummary) {
            paymentOverview.innerHTML = quoteSummary.innerHTML;
        }
        goToWarehouseStep(6);
    });

    document.getElementById('warehouse-payment-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const payButton = document.getElementById('warehouse-confirm-payment') as HTMLButtonElement | null;
        if (!payButton || payButton.disabled) return;
        
        const originalButtonText = payButton.textContent;
        payButton.disabled = true;
        payButton.textContent = 'Processing...';
        toggleLoading(true, "Processing Payment...");

        setTimeout(() => {
            toggleLoading(false);
            const paymentSucceeded = Math.random() > 0.1;

            if (paymentSucceeded) {
                const bookingId = `WH-${Date.now().toString().slice(-6)}`;
                setState({ warehouseBookingId: bookingId });
                (document.getElementById('warehouse-confirmation-title') as HTMLElement).textContent = `✅ Booking Confirmed!`;
                (document.getElementById('warehouse-confirmation-message') as HTMLElement).innerHTML = `Your booking <strong>#${bookingId}</strong> at ${State.warehouseDetails?.selectedFacility?.name} is confirmed.`;
                goToWarehouseStep(7);
            } else {
                showToast("Payment failed. Please try again.", "error");
                payButton.disabled = false;
                payButton.textContent = originalButtonText;
            }
        }, 1500);
    });

    document.getElementById('warehouse-new-booking-btn')?.addEventListener('click', resetWarehouseWizard);
    document.getElementById('warehouse-download-pdf-btn')?.addEventListener('click', generateWarehousePdf);
};