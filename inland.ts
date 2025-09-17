// ⚠️  READ-ONLY — DO NOT EDIT — SERVICE LOCKED ⚠️
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { State, setState, resetInlandState, type InlandDetails, type Truck } from './state';
import { DOMElements } from './dom';
import { showToast, switchPage, updateProgressBar, toggleLoading } from './ui';

// --- WIZARD NAVIGATION & STATE ---

function goToInlandStep(step: number) {
    const stepElements = [
        DOMElements.inlandSteps.map,
        DOMElements.inlandSteps.cargo,
        DOMElements.inlandSteps.board,
        DOMElements.inlandSteps.docs,
        DOMElements.inlandSteps.payment,
        DOMElements.inlandTrackingView, // This serves as the confirmation step
    ];
    
    document.querySelectorAll('#page-inland .service-step').forEach(s => s.classList.remove('active'));

    const nextStepElement = stepElements[step - 1];
    
    if (nextStepElement) {
        // The tracking view is not a direct child of the page in the same way, handle it.
        if (nextStepElement.id === 'inland-tracking-view') {
             const paymentView = document.getElementById('inland-payment-view');
             if(paymentView) paymentView.classList.remove('active'); // Hide payment view if showing confirmation
        }
        nextStepElement.classList.add('active');
    }
    
    setState({ currentInlandStep: step });
    updateProgressBar('inland', step - 1);
}

function resetInlandWizard() {
    resetInlandState();
    if(DOMElements.inlandMapForm) DOMElements.inlandMapForm.reset();
    goToInlandStep(1);
}


// --- UI & LOGIC ---

// Mock Data for trucks
const mockTrucks: Truck[] = [
    { id: 'truck1', driverName: 'John S.', driverRating: 4.8, etaPickupMin: 60, price: 850, vehicleType: 'curtainsider', gps_lat: 0, gps_lon: 0 },
    { id: 'truck2', driverName: 'Maria G.', driverRating: 4.9, etaPickupMin: 90, price: 920, vehicleType: 'box', gps_lat: 0, gps_lon: 0 },
    { id: 'truck3', driverName: 'Chen W.', driverRating: 4.7, etaPickupMin: 45, price: 820, vehicleType: 'flatbed', gps_lat: 0, gps_lon: 0 },
];

function renderTruckBoard() {
    DOMElements.inlandTruckBoardList.innerHTML = `<div class="loading-spinner"></div>`;
    
    setTimeout(() => {
        setState({ availableTrucks: mockTrucks });
        DOMElements.inlandTruckBoardList.innerHTML = mockTrucks.map(truck => `
            <div class="truck-card">
                <div class="truck-info">
                    <h4>${truck.vehicleType.charAt(0).toUpperCase() + truck.vehicleType.slice(1)}</h4>
                    <p>Driver: ${truck.driverName} (${'★'.repeat(Math.round(truck.driverRating))}${'☆'.repeat(5 - Math.round(truck.driverRating))})</p>
                    <p>ETA to pickup: ~${truck.etaPickupMin} mins</p>
                </div>
                <div class="truck-price">
                    <strong>$${truck.price.toFixed(2)}</strong>
                    <button class="main-submit-btn book-truck-btn" data-truck-id="${truck.id}">Book Now</button>
                </div>
            </div>
        `).join('');

        DOMElements.inlandTruckBoardList.querySelectorAll('.book-truck-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const truckId = (e.currentTarget as HTMLElement).dataset.truckId;
                const selectedTruck = State.availableTrucks.find(t => t.id === truckId);
                if (selectedTruck) {
                    setState({ inlandDetails: { ...State.inlandDetails, selectedTruck } as InlandDetails });
                    goToInlandStep(4); // Go to docs
                }
            });
        });
    }, 1000);
}

function renderInlandPage() {
    const page = document.getElementById('page-inland');
    if (!page) return;

    page.innerHTML = `
        <button class="back-btn">Back to Services</button>
        <div class="service-page-header">
            <h2>Inland Trucking</h2>
            <p class="subtitle">Book FTL & LTL shipments with our live digital freight marketplace.</p>
            <div id="progress-bar-inland" data-steps="Map,Cargo,Board,Docs,Payment,Confirmation"></div>
        </div>

        <!-- Step 1: Map -->
        <div id="inland-step-map" class="service-step active">
            <form id="inland-map-form" class="form-container">
                <h3>Route Details</h3>
                <div class="form-section two-column">
                    <div class="input-wrapper"><label for="inland-origin-search">Origin Address</label><input type="text" id="inland-origin-search" required></div>
                    <div class="input-wrapper"><label for="inland-dest-search">Destination Address</label><input type="text" id="inland-dest-search" required></div>
                </div>
                <div class="form-section">
                    <div class="checkbox-wrapper toggle-switch">
                        <input type="checkbox" id="inland-ftl-toggle">
                        <label for="inland-ftl-toggle">
                            <span>LTL (Less than Truckload)</span>
                            <span>FTL (Full Truckload)</span>
                        </label>
                    </div>
                </div>
                <div class="form-actions"><button type="submit" class="main-submit-btn">Next: Cargo Details</button></div>
            </form>
        </div>

        <!-- Step 2: Cargo -->
        <div id="inland-step-cargo" class="service-step">
            <div class="form-container">
                <h3>Cargo Details</h3>
                 <div class="form-section">
                    <div class="input-wrapper"><label for="inland-cargo-description">Description of Goods</label><textarea id="inland-cargo-description" required></textarea></div>
                    <div class="input-wrapper"><label for="inland-cargo-weight">Total Weight (kg)</label><input type="number" id="inland-cargo-weight" min="1" required></div>
                </div>
                <div class="form-actions">
                    <button type="button" id="inland-back-to-map-btn" class="secondary-btn">Back</button>
                    <button type="button" id="inland-to-board-btn" class="main-submit-btn">Find Trucks</button>
                </div>
            </div>
        </div>

        <!-- Step 3: Truck Board -->
        <div id="inland-step-board" class="service-step">
            <div class="form-container">
                <h3>Available Trucks</h3>
                <div id="inland-truck-board-list"></div>
                 <div class="form-actions">
                    <button type="button" id="inland-back-to-cargo-btn" class="secondary-btn">Back</button>
                </div>
            </div>
        </div>
        
        <!-- Step 4: Docs -->
        <div id="inland-step-docs" class="service-step">
             <div class="form-container">
                <h3>Documents</h3>
                <p>Document upload is not required for this demo. Please proceed to payment.</p>
                 <div class="form-actions">
                    <button type="button" id="inland-back-to-board-btn" class="secondary-btn">Back</button>
                    <button type="button" id="inland-to-payment-btn" class="main-submit-btn">Next: Payment</button>
                </div>
            </div>
        </div>

        <!-- Step 5: Payment -->
        <div id="inland-step-payment" class="service-step">
            <div id="inland-payment-view">
                <div class="form-container">
                    <h3>Secure Payment</h3>
                    <div id="inland-payment-overview" class="payment-overview"></div>
                    <form id="inland-payment-form">
                        <div class="form-actions">
                            <button type="button" class="secondary-btn" id="inland-back-from-payment-btn">Back</button>
                            <button type="submit" class="main-submit-btn">Pay & Book</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
        
         <!-- Step 6: Confirmation -->
        <div id="inland-tracking-view" class="service-step">
            <div class="confirmation-container">
                <h3 id="inland-tracking-title"></h3>
                <p>Your booking is confirmed. You can track your truck in real-time.</p>
                <div class="confirmation-actions">
                    <button id="inland-download-docs-btn" class="secondary-btn">Download BOL</button>
                    <button id="inland-new-booking-btn" class="main-submit-btn">New Booking</button>
                </div>
            </div>
        </div>
    `;
    page.querySelector('.back-btn')?.addEventListener('click', () => switchPage('landing'));
}

// --- EVENT HANDLERS ---

function handleMapSubmit(e: Event) {
    e.preventDefault();
    const details: Partial<InlandDetails> = {
        originAddress: DOMElements.inlandOriginSearch.value,
        destAddress: DOMElements.inlandDestSearch.value,
        loadType: DOMElements.inlandFtlToggle.checked ? 'FTL' : 'LTL',
    };
    setState({ inlandDetails: { ...State.inlandDetails, ...details } as InlandDetails });
    goToInlandStep(2);
}

function handleCargoSubmit() {
    const details: Partial<InlandDetails> = {
        cargoDescription: (document.getElementById('inland-cargo-description') as HTMLTextAreaElement).value,
        weight: parseFloat((document.getElementById('inland-cargo-weight') as HTMLInputElement).value),
    };
    setState({ inlandDetails: { ...State.inlandDetails, ...details } as InlandDetails });
    renderTruckBoard();
    goToInlandStep(3);
}

function handlePaymentSubmit(e: Event) {
    e.preventDefault();
    const payButton = (e.target as HTMLFormElement).querySelector('button[type="submit"]') as HTMLButtonElement | null;
    if (!payButton || payButton.disabled) return;

    const originalButtonText = payButton.textContent;
    payButton.disabled = true;
    payButton.textContent = 'Processing...';
    toggleLoading(true, "Processing Payment...");
    
    setTimeout(() => {
        toggleLoading(false);
        const paymentSucceeded = Math.random() > 0.1;

        if (paymentSucceeded) {
            const bookingId = `INL-${Date.now().toString().slice(-6)}`;
            setState({ inlandDetails: { ...State.inlandDetails, bookingId } as InlandDetails });
            
            DOMElements.inlandTrackingTitle.textContent = `✅ Booking Confirmed: #${bookingId}`;

            goToInlandStep(6);
        } else {
            showToast("Payment failed. Please try again.", "error");
            payButton.disabled = false;
            payButton.textContent = originalButtonText;
        }
    }, 1500);
}

function generateInlandPdf() {
    if (!State.inlandDetails || !State.inlandDetails.bookingId) return;
    const { bookingId, originAddress, destAddress, selectedTruck } = State.inlandDetails;

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Bill of Lading (BOL)', 105, 15, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Booking ID: ${bookingId}`, 105, 22, { align: 'center' });
    
    autoTable(doc, {
        startY: 30,
        head: [['Shipment Details', '']],
        body: [
            ['From', originAddress],
            ['To', destAddress],
            ['Carrier', `Truck #${selectedTruck?.id}`],
            ['Driver', selectedTruck?.driverName || 'N/A'],
            ['Total Cost', `$${selectedTruck?.price.toFixed(2)}`],
        ],
    });
    
    doc.save(`Vcanship_BOL_${bookingId}.pdf`);
}

function attachInlandEventListeners() {
    DOMElements.inlandMapForm?.addEventListener('submit', handleMapSubmit);

    DOMElements.inlandNav.backToMap?.addEventListener('click', () => goToInlandStep(1));
    DOMElements.inlandNav.toBoard?.addEventListener('click', handleCargoSubmit);
    DOMElements.inlandNav.backToCargo?.addEventListener('click', () => goToInlandStep(2));
    DOMElements.inlandNav.backToBoard?.addEventListener('click', () => goToInlandStep(3));
    DOMElements.inlandNav.toPayment?.addEventListener('click', () => {
        const { selectedTruck } = State.inlandDetails!;
        DOMElements.inlandPaymentOverview.innerHTML = `
            <div class="review-item"><span>Truck:</span> <strong>${selectedTruck?.vehicleType} with ${selectedTruck?.driverName}</strong></div>
            <div class="review-item total"><span>Total Cost:</span> <strong>$${selectedTruck?.price.toFixed(2)}</strong></div>
        `;
        goToInlandStep(5);
    });

    DOMElements.inlandPaymentForm?.addEventListener('submit', handlePaymentSubmit);
    document.getElementById('inland-back-from-payment-btn')?.addEventListener('click', () => goToInlandStep(4));

    DOMElements.inlandNav.newBooking?.addEventListener('click', resetInlandWizard);
    DOMElements.inlandNav.downloadDocs?.addEventListener('click', generateInlandPdf);
}

// --- INITIALIZATION ---

export function startInland() {
    setState({ currentService: 'inland' });
    renderInlandPage();
    switchPage('inland');
    resetInlandWizard();
    attachInlandEventListeners();
}
