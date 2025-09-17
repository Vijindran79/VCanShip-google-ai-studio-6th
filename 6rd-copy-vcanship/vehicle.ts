// ⚠️  READ-ONLY — DO NOT EDIT — SERVICE LOCKED ⚠️
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { State, setState, resetVehicleState, type Quote, type ShippingMethod, type VehicleDetails } from './state';
import { DOMElements } from './dom';
import { showToast, switchPage, updateProgressBar, toggleLoading, showPrelaunchModal } from './ui';
import { type GenerateContentResponse, Type } from '@google/genai';

let uploadedVehicleFiles: File[] = [];

function renderVehiclePage() {
    const page = document.getElementById('page-vehicle');
    if (!page) return;

    page.innerHTML = `
        <button class="back-btn">Back to Services</button>
        <div class="service-page-header">
            <h2>Vehicle Shipping</h2>
            <p class="subtitle">Get an instant quote for shipping your vehicle internationally.</p>
            <div id="progress-bar-vehicle" data-steps="Details,Dimensions,Method,Quote,Payment,Confirmation"></div>
        </div>

        <!-- Step 1: Details -->
        <div id="vehicle-step-details" class="service-step active">
            <form id="vehicle-details-form" class="form-container">
                <div class="form-section two-column">
                    <div class="input-wrapper"><label for="vehicle-origin-port">Origin Port</label><input type="text" id="vehicle-origin-port" required placeholder="e.g., Jebel Ali"></div>
                    <div class="input-wrapper"><label for="vehicle-dest-port">Destination Port</label><input type="text" id="vehicle-dest-port" required placeholder="e.g., Long Beach"></div>
                </div>
                <div class="form-section">
                    <h3>Vehicle Information</h3>
                    <div class="form-grid">
                        <div class="input-wrapper"><label for="vehicle-make">Make</label><input type="text" id="vehicle-make" required placeholder="e.g., Toyota"></div>
                        <div class="input-wrapper"><label for="vehicle-model">Model</label><input type="text" id="vehicle-model" required placeholder="e.g., Land Cruiser"></div>
                        <div class="input-wrapper"><label for="vehicle-year">Year</label><input type="number" id="vehicle-year" required placeholder="e.g., 2023"></div>
                        <div class="input-wrapper"><label for="vehicle-condition">Condition</label>
                            <select id="vehicle-condition"><option value="new">New</option><option value="used">Used</option></select>
                        </div>
                    </div>
                     <div class="checkbox-wrapper" style="margin-top: 1rem;">
                        <input type="checkbox" id="vehicle-can-roll" checked>
                        <label for="vehicle-can-roll">The vehicle is operable and can be rolled (RoRo)</label>
                    </div>
                </div>
                <div class="form-actions"><button type="submit" class="main-submit-btn">Next: Dimensions</button></div>
            </form>
        </div>
        
        <!-- Step 2: Dimensions -->
        <div id="vehicle-step-dimensions" class="service-step">
            <div class="form-container">
                <h3>Dimensions & Photo</h3>
                <p class="subtitle">Upload a photo for AI-powered dimension detection or enter manually.</p>
                <div id="vehicle-photo-drop-area" class="file-drop-area" style="width: 100%; height: 120px; margin-bottom: 1rem;">
                     <div id="vehicle-photo-status" class="file-status">Click or drag a photo here</div>
                     <input type="file" id="vehicle-photo-input" class="file-input" accept="image/*" multiple>
                </div>
                <div id="vehicle-photo-previews-container"></div>
                <div class="form-section">
                    <div class="form-grid" style="grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));">
                        <div class="input-wrapper"><label for="vehicle-length">Length (m)</label><input type="number" id="vehicle-length" required step="0.01"></div>
                        <div class="input-wrapper"><label for="vehicle-width">Width (m)</label><input type="number" id="vehicle-width" required step="0.01"></div>
                        <div class="input-wrapper"><label for="vehicle-height">Height (m)</label><input type="number" id="vehicle-height" required step="0.01"></div>
                        <div class="input-wrapper"><label for="vehicle-weight">Weight (t)</label><input type="number" id="vehicle-weight" required step="0.01"></div>
                    </div>
                </div>
                <div class="form-actions">
                    <button type="button" id="vehicle-back-to-details-btn" class="secondary-btn">Back</button>
                    <button type="button" id="vehicle-to-method-btn" class="main-submit-btn">Next: Shipping Method</button>
                </div>
            </div>
        </div>

        <!-- Step 3: Method -->
        <div id="vehicle-step-method" class="service-step">
            <div class="form-container">
                <h3>Select Shipping Method</h3>
                <div id="vehicle-shipping-options"></div>
                <div class="form-actions">
                    <button type="button" id="vehicle-back-to-dims-btn" class="secondary-btn">Back</button>
                    <button type="button" id="vehicle-to-quote-btn" class="main-submit-btn" disabled>Get Quote</button>
                </div>
            </div>
        </div>

        <!-- Step 4: Quote -->
        <div id="vehicle-step-quote" class="service-step">
            <div class="form-container">
                 <div id="vehicle-quote-summary"></div>
                 <div id="vehicle-compliance-summary"></div>
                 <div class="form-actions">
                    <button type="button" id="vehicle-back-to-method-btn" class="secondary-btn">Back</button>
                    <button type="button" id="vehicle-to-payment-btn" class="main-submit-btn">Proceed to Payment</button>
                </div>
            </div>
        </div>

        <!-- Step 5: Payment -->
        <div id="vehicle-step-payment" class="service-step">
            <div class="form-container">
                <h3>Secure Payment</h3>
                <div id="vehicle-payment-overview" class="payment-overview"></div>
                <form id="vehicle-payment-form">
                    <!-- Payment fields would go here -->
                    <div class="form-actions">
                         <button type="button" id="vehicle-back-to-quote-btn" class="secondary-btn">Back</button>
                         <button type="submit" class="main-submit-btn">Pay & Confirm</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Step 6: Confirmation -->
        <div id="vehicle-step-confirmation" class="service-step">
             <div class="confirmation-container">
                <h3 id="vehicle-confirmation-title"></h3>
                <p id="vehicle-confirmation-message"></p>
                <div class="confirmation-actions">
                    <button id="vehicle-download-docs-btn" class="secondary-btn">Download Summary</button>
                    <button id="vehicle-new-shipment-btn" class="main-submit-btn">New Shipment</button>
                </div>
            </div>
        </div>
    `;
}

// FIX: Add missing functions for wizard navigation and initialization
function goToVehicleStep(step: number) {
    setState({ currentVehicleStep: step });
    const stepIds = ['details', 'dimensions', 'method', 'quote', 'payment', 'confirmation'];
    document.querySelectorAll('#page-vehicle .service-step').forEach(s => s.classList.remove('active'));
    const stepEl = DOMElements.vehicleSteps[stepIds[step - 1] as keyof typeof DOMElements.vehicleSteps];
    if (stepEl) {
        stepEl.classList.add('active');
    }
    updateProgressBar('vehicle', step - 1);
}

function resetVehicleWizard() {
    resetVehicleState();
    const form = document.getElementById('vehicle-details-form') as HTMLFormElement | null;
    if(form) form.reset();
    goToVehicleStep(1);
}

function attachVehicleEventListeners() {
    document.querySelector('#page-vehicle .back-btn')?.addEventListener('click', () => switchPage('landing'));

    // Navigation using DOMElements
    DOMElements.vehicleDetailsForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        goToVehicleStep(2);
    });
    DOMElements.vehicleNav.backToDetails.addEventListener('click', () => goToVehicleStep(1));
    DOMElements.vehicleNav.toMethod.addEventListener('click', () => goToVehicleStep(3));
    DOMElements.vehicleNav.backToDims.addEventListener('click', () => goToVehicleStep(2));
    DOMElements.vehicleNav.toQuote.addEventListener('click', () => goToVehicleStep(4));
    DOMElements.vehicleNav.backToMethod.addEventListener('click', () => goToVehicleStep(3));
    DOMElements.vehicleNav.toPayment.addEventListener('click', () => goToVehicleStep(5));
    DOMElements.vehicleNav.backToQuote.addEventListener('click', () => goToVehicleStep(4));
    DOMElements.vehicleNav.newShipment.addEventListener('click', resetVehicleWizard);

    DOMElements.vehiclePaymentForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        toggleLoading(true, "Processing payment...");
        setTimeout(() => {
            toggleLoading(false);
            const bookingId = `VEH-${Date.now().toString().slice(-6)}`;
            setState({ vehicleBookingId: bookingId });

            const confirmationTitle = document.getElementById('vehicle-confirmation-title');
            const confirmationMessage = document.getElementById('vehicle-confirmation-message');

            if (confirmationTitle) confirmationTitle.textContent = `✅ Booking Confirmed!`;
            if (confirmationMessage) confirmationMessage.innerHTML = `Your vehicle shipment booking <strong>#${bookingId}</strong> is confirmed.`;
            
            goToVehicleStep(6); // Go to confirmation
        }, 1500);
    });
}

export function startVehicle() {
    setState({ currentService: 'vehicle' });
    renderVehiclePage();
    switchPage('vehicle');
    resetVehicleWizard();
    attachVehicleEventListeners();
}