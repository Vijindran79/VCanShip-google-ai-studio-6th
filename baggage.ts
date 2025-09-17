// ⚠️  READ-ONLY — DO NOT EDIT — SERVICE LOCKED ⚠️
import { jsPDF } from 'jspdf';
import autoTable, { type RowInput } from 'jspdf-autotable';
import { State, setState, resetBaggageState, type BaggageServiceType, type Address, BaggageDetails } from './state';
import { DOMElements } from './dom';
import { showToast, updateProgressBar, switchPage, showPrelaunchModal, toggleLoading } from './ui';
import { setLocaleByCountryName } from './LocaleSwitcher';
import { initializeStripeElements } from './payment';

const INSURANCE_RATE = 0.015; // 1.5%
const TRACKER_COST = 25.00; // Flat fee for the GPS tracker

const SHIPPING_AGREEMENT_TEXT = `
    <h4>1. Prohibited Items</h4>
    <p>You agree not to ship any items that are prohibited by law or our carrier partners. This includes, but is not limited to: hazardous materials, flammable items, aerosols, batteries, illegal substances, perishable goods, cash, and extremely fragile items. A full list is available in our Help Center.</p>
    <h4>2. Packaging</h4>
    <p>You are responsible for ensuring your baggage is packed securely in a suitable suitcase or double-walled box. Vcanship is not liable for damage resulting from inadequate packaging. All items must be packed to withstand the rigors of transit.</p>
    <h4>3. Customs, Duties, and Declarations</h4>
    <p>You are responsible for the accuracy of all customs declaration forms and for paying any duties, taxes, or fees levied by the destination country's authorities. Inaccurate declarations may result in delays, fines, or seizure of your shipment.</p>
    <h4>4. Right to Inspect</h4>
    <p>Vcanship and its carrier partners reserve the right to open and inspect any shipment without prior notice to ensure safety, security, and compliance with customs regulations.</p>
    <h4>5. Limitation of Liability</h4>
    <p>Unless additional insurance is purchased, Vcanship's liability for any loss or damage is limited to a standard amount based on weight, as outlined in our Terms of Service. This does not cover damage to fragile items or damage resulting from poor packaging.</p>
    <h4>6. Extra Protection (Insurance)</h4>
    <p>If you have opted for Extra Protection, your shipment is covered up to the declared value against loss or damage, subject to the terms and conditions of the insurance policy. Claims must be submitted within 7 days of delivery.</p>
    <br>
    <p><strong>By checking the box and proceeding, you acknowledge that you have read, understood, and agree to be bound by these shipping terms and the full Vcanship Terms of Service.</strong></p>
`;

function validateUkPostcode(postcode: string): boolean {
    if (!postcode) return false;
    // This regex is permissive but covers the basic structure of UK postcodes. Case-insensitive.
    // Allows for formats like SW1A0AA, SW1A 0AA, M1 1AE, M60 1NW, CR2 6XH, DN55 1PT, W1A 1HQ
    const postcodeRegex = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;
    return postcodeRegex.test(postcode.trim());
}

function handlePostcodeValidation(postcodeElId: string, countryElId: string): boolean {
    const postcodeEl = document.getElementById(postcodeElId) as HTMLInputElement;
    const countryEl = document.getElementById(countryElId) as HTMLInputElement;
    const errorEl = document.getElementById(`${postcodeElId}-error`);
    
    if (!postcodeEl || !countryEl || !errorEl) return true; // Fail open if elements are missing
    
    const countryValue = countryEl.value.toLowerCase();
    const isUk = countryValue.includes('united kingdom') || countryValue.includes('uk') || countryValue.includes('gb');

    if (isUk && postcodeEl.value.trim() && !validateUkPostcode(postcodeEl.value)) {
        errorEl.textContent = 'Please enter a valid UK postcode format (e.g., SW1A 0AA).';
        errorEl.classList.remove('hidden');
        return false;
    } else {
        errorEl.classList.add('hidden');
        return true;
    }
}


function renderBaggagePage() {
    const page = document.getElementById('page-baggage');
    if (!page) return;

    page.innerHTML = `
        <button class="back-btn">Back to Services</button>
        <div class="service-page-header">
            <h2>Ship Your Excess Baggage</h2>
            <p class="subtitle">Avoid expensive airline fees by sending your luggage ahead of time.</p>
            <div id="baggage-progress-bar" data-steps="Details,Quote,Payment,Confirmation"></div>
        </div>
        
        <div id="baggage-details-step" class="service-step active">
            <form id="baggage-form" class="form-container">
                <div class="form-section">
                    <h3>1. Service Type</h3>
                    <div id="baggage-service-type-selector" class="service-type-selector">
                        <button type="button" class="service-type-btn" data-service-type="door-to-door"><strong>Door-to-Door</strong><span>Complete end-to-end logistics.</span></button>
                        <button type="button" class="service-type-btn" data-service-type="door-to-airport"><strong>Door-to-Airport</strong><span>We handle pickup only.</span></button>
                        <button type="button" class="service-type-btn" data-service-type="airport-to-door"><strong>Airport-to-Door</strong><span>We handle delivery only.</span></button>
                        <button type="button" class="service-type-btn" data-service-type="airport-to-airport"><strong>Airport-to-Airport</strong><span>You handle drop-off & collection.</span></button>
                    </div>
                </div>
                
                <div class="form-section two-column">
                    <div id="baggage-pickup-section">
                        <h3>2. Pickup Details</h3>
                        <div class="address-fields">
                            <div class="input-wrapper"><label for="baggage-pickup-name">Sender Full Name</label><input type="text" id="baggage-pickup-name" required><p class="error-text hidden"></p></div>
                            <div class="input-wrapper"><label for="baggage-pickup-email">Sender Email</label><input type="email" id="baggage-pickup-email" required><p class="error-text hidden"></p></div>
                            <div class="input-wrapper"><label for="baggage-pickup-phone">Sender Phone</label><input type="tel" id="baggage-pickup-phone" required><p class="error-text hidden"></p></div>
                            <div class="input-wrapper"><label for="baggage-pickup-street">Street Address</label><input type="text" id="baggage-pickup-street" required><p class="error-text hidden"></p></div>
                            <div class="input-wrapper"><label for="baggage-pickup-city">City</label><input type="text" id="baggage-pickup-city" required><p class="error-text hidden"></p></div>
                            <div class="input-wrapper"><label for="baggage-pickup-postcode">Postcode / ZIP</label><input type="text" id="baggage-pickup-postcode" required><p class="error-text hidden" id="baggage-pickup-postcode-error"></p></div>
                            <div class="input-wrapper"><label for="baggage-pickup-country">Country</label><input type="text" id="baggage-pickup-country" required><p class="error-text hidden"></p></div>
                        </div>
                        <div class="location-fields hidden">
                            <div class="input-wrapper"><label for="baggage-pickup-location">Drop-off Airport (IATA)</label><input type="text" id="baggage-pickup-location" placeholder="e.g., LHR" required><p class="error-text hidden"></p></div>
                        </div>
                    </div>
                    <div>
                        <h3>3. Delivery Details</h3>
                        <div id="baggage-delivery-section">
                            <div class="address-fields">
                                <div class="input-wrapper"><label for="baggage-delivery-name">Recipient Full Name</label><input type="text" id="baggage-delivery-name" required><p class="error-text hidden"></p></div>
                                <div class="input-wrapper"><label for="baggage-delivery-email">Recipient Email</label><input type="email" id="baggage-delivery-email" required><p class="error-text hidden"></p></div>
                                <div class="input-wrapper"><label for="baggage-delivery-phone">Recipient Phone</label><input type="tel" id="baggage-delivery-phone" required><p class="error-text hidden"></p></div>
                                <div class="input-wrapper"><label for="baggage-delivery-street">Street Address</label><input type="text" id="baggage-delivery-street" required><p class="error-text hidden"></p></div>
                                <div class="input-wrapper"><label for="baggage-delivery-city">City</label><input type="text" id="baggage-delivery-city" required><p class="error-text hidden"></p></div>
                                <div class="input-wrapper"><label for="baggage-delivery-postcode">Postcode / ZIP</label><input type="text" id="baggage-delivery-postcode" required><p class="error-text hidden" id="baggage-delivery-postcode-error"></p></div>
                                <div class="input-wrapper"><label for="baggage-delivery-country">Country</label><input type="text" id="baggage-delivery-country" required><p class="error-text hidden"></p></div>
                            </div>
                            <div class="location-fields hidden">
                                <div class="input-wrapper"><label for="baggage-delivery-location">Collection Airport (IATA)</label><input type="text" id="baggage-delivery-location" placeholder="e.g., JFK" required><p class="error-text hidden"></p></div>
                            </div>
                        </div>
                        <div class="checkbox-wrapper" style="margin-top: 1rem;">
                            <input type="checkbox" id="baggage-same-as-pickup">
                            <label for="baggage-same-as-pickup">Delivery contact same as sender</label>
                        </div>
                    </div>
                </div>

                <div class="form-section">
                    <h3>4. Shipment Details & Options</h3>
                    <div class="form-row" style="grid-template-columns: 1fr 1fr; gap: 2rem;">
                        <div class="input-wrapper">
                            <label for="baggage-weight">Total Weight (kg)</label>
                            <input type="number" id="baggage-weight" required min="1" step="0.5" placeholder="e.g., 23.5">
                            <p class="error-text hidden"></p>
                        </div>
                        <div class="input-wrapper">
                            <label for="service-level">Service Speed</label>
                            <select id="service-level">
                                <option value="standard">Standard (5-7 days)</option>
                                <option value="express">Express (2-4 days)</option>
                                <option value="economy">Economy (8-12 days)</option>
                            </select>
                        </div>
                    </div>
                    <div class="checkbox-wrapper">
                        <input type="checkbox" id="baggage-extra-insurance" class="extra-insurance-toggle">
                        <label for="baggage-extra-insurance">Add Extra Protection</label>
                    </div>
                    <div class="conditional-fields" id="baggage-insured-value-container">
                        <div class="input-wrapper">
                            <label for="baggage-insured-value">Declared Value (${State.currentCurrency.code})</label>
                            <input type="number" id="baggage-insured-value" min="1" placeholder="e.g., 500" class="insured-value-input">
                            <p class="error-text hidden"></p>
                        </div>
                    </div>
                    <div class="checkbox-wrapper">
                        <input type="checkbox" id="baggage-purchase-tracker">
                        <label for="baggage-purchase-tracker">Add GPS Tracker (+${State.currentCurrency.symbol}25.00)</label>
                        <button type="button" class="link-btn" id="baggage-tracker-learn-more">Learn more</button>
                    </div>
                </div>

                <div class="form-actions">
                    <button type="button" id="proceed-to-quote" class="main-submit-btn">Get Quote</button>
                </div>
            </form>
        </div>

        <div id="baggage-quote-step" class="service-step">
            <div class="form-container">
                <h3>Your Quote</h3>
                <p class="subtitle">Please review your quote below. This price is valid for 24 hours.</p>
                <div class="payment-overview">
                    <div id="quote-summary-details"></div>
                    <hr style="border:none; border-top: 1px dashed var(--border-color); margin: 1rem 0;">
                    <div id="quote-summary-breakdown" class="payment-breakdown"></div>
                    <div class="review-item total"><span>Total Cost:</span> <strong id="quote-display-total"></strong></div>
                </div>
                <div class="form-actions">
                    <button type="button" class="secondary-btn" id="back-to-details">Back to Details</button>
                    <button type="button" class="main-submit-btn" id="proceed-to-payment">Proceed to Payment</button>
                </div>
            </div>
        </div>

        <div id="baggage-payment-step" class="service-step">
            <div class="form-container">
                <h3>Secure Payment</h3>
                <div class="payment-overview">
                    <div class="review-item"><strong id="payment-shipment-id"></strong></div>
                    <div class="review-item total"><strong id="payment-amount-due"></strong></div>
                </div>
                <form id="baggage-payment-form">
                    <div class="input-wrapper">
                        <label for="payment-cardholder-name">Cardholder Name</label>
                        <input type="text" id="payment-cardholder-name" required>
                    </div>
                    <!-- Stripe card element will be mounted here -->
                    <div id="baggage-card-element" class="card-element-container"></div>
                    <div id="baggage-card-errors" role="alert" class="card-errors-container"></div>
                    <div class="form-actions">
                         <button type="button" class="secondary-btn" id="back-to-quote">Back to Quote</button>
                         <button type="submit" id="confirm-payment" class="main-submit-btn">Pay & Confirm</button>
                    </div>
                </form>
            </div>
        </div>

        <div id="baggage-confirmation-step" class="service-step">
            <div class="confirmation-container">
                <h3 id="confirmation-title"></h3>
                <p id="confirmation-message">Your payment was successful. Details have been sent to your email.</p>
                <div class="confirmation-tracking">
                    <h4>Your Tracking ID</h4>
                    <div class="tracking-id-display" id="baggage-confirmation-tracking-id"></div>
                    <button class="main-submit-btn" id="baggage-confirmation-track-shipment-btn">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" /></svg>
                        <span>Track Your Shipment</span>
                    </button>
                </div>
                <div class="confirmation-actions">
                    <button class="secondary-btn" id="download-pdf">Download Summary PDF</button>
                    <button class="main-submit-btn" id="new-shipment">New Shipment</button>
                </div>
            </div>
        </div>
    `;
    
    // Re-attach all event listeners for the newly created DOM
    attachBaggageEventListeners();
}

/**
 * Calculates a baggage shipping quote based on weight, service level, and service type.
 * @param weight The weight in kg.
 * @param serviceLevel The selected service speed (express, standard, economy).
 * @param serviceType The selected service type (door-to-door, etc.).
 * @returns The base quote.
 */
function calculateBaseQuote(weight: number, serviceLevel: string, serviceType: BaggageServiceType): number {
    const speedRates: { [key: string]: number } = { express: 10.5, standard: 7.2, economy: 5.0 };
    const baseRate = speedRates[serviceLevel] || speedRates.standard;
    
    const serviceTypeMultiplier: { [key: string]: number } = {
        'door-to-door': 1.2,
        'door-to-airport': 1.1,
        'airport-to-door': 1.1,
        'airport-to-airport': 1.0
    };
    const multiplier = serviceTypeMultiplier[serviceType] || 1.0;

    const weightCharge = weight * baseRate * multiplier;
    const handlingFee = 25 * multiplier; 
    return weightCharge + handlingFee;
}

function handleStepTransition(step: 'details' | 'quote' | 'payment' | 'confirmation') {
    const nextStepIndex = ['details', 'quote', 'payment', 'confirmation'].indexOf(step);

    const currentStepElement = document.getElementById(`baggage-${State.currentBaggageStep}-step`);
    const nextStepElement = document.getElementById(`baggage-${step}-step`);
    
    if (currentStepElement && nextStepElement && currentStepElement !== nextStepElement) {
        currentStepElement.classList.remove('active');
        currentStepElement.classList.add('exiting');
        
        const onAnimationEnd = () => {
            currentStepElement.classList.remove('exiting');
            nextStepElement.classList.remove('exiting');
            nextStepElement.classList.add('active');
            currentStepElement.removeEventListener('animationend', onAnimationEnd);
        };
        currentStepElement.addEventListener('animationend', onAnimationEnd);
    } else if (nextStepElement) {
        document.querySelectorAll('#page-baggage .service-step').forEach(s => s.classList.remove('active'));
        nextStepElement.classList.add('active');
    }

    setState({ currentBaggageStep: step });
    updateProgressBar('baggage', nextStepIndex);
}

function updateBaggageFormUI() {
    const { serviceType } = State.baggageDetails!;
    
    const showPickupAddress = serviceType === 'door-to-door' || serviceType === 'door-to-airport';
    const showDeliveryAddress = serviceType === 'door-to-door' || serviceType === 'airport-to-door';

    (document.querySelector('#baggage-pickup-section .address-fields') as HTMLElement).classList.toggle('hidden', !showPickupAddress);
    (document.querySelector('#baggage-pickup-section .location-fields') as HTMLElement).classList.toggle('hidden', showPickupAddress);
    
    (document.querySelector('#baggage-delivery-section .address-fields') as HTMLElement).classList.toggle('hidden', !showDeliveryAddress);
    (document.querySelector('#baggage-delivery-section .location-fields') as HTMLElement).classList.toggle('hidden', showDeliveryAddress);

    (document.getElementById('baggage-same-as-pickup') as HTMLInputElement).parentElement!.style.display = (showPickupAddress && showDeliveryAddress) ? 'flex' : 'none';
}

function validateDetailsForm(): boolean {
    const form = document.getElementById('baggage-form');
    if (!form) return false;

    let allValid = true;
    const { pickupType, deliveryType } = State.baggageDetails!;
    const requiredFields = [
        'baggage-weight',
        ...(pickupType === 'address' ? ['baggage-pickup-name', 'baggage-pickup-email', 'baggage-pickup-phone', 'baggage-pickup-street', 'baggage-pickup-city', 'baggage-pickup-postcode', 'baggage-pickup-country'] : ['baggage-pickup-location']),
        ...(deliveryType === 'address' ? ['baggage-delivery-name', 'baggage-delivery-email', 'baggage-delivery-phone', 'baggage-delivery-street', 'baggage-delivery-city', 'baggage-delivery-postcode', 'baggage-delivery-country'] : ['baggage-delivery-location']),
    ];
    
    const validationMap: { [key: string]: string } = {
        'baggage-weight': 'Total weight is required.',
        'baggage-pickup-name': "Sender's full name is required.",
        'baggage-pickup-email': "Sender's email is required.",
        'baggage-pickup-phone': "Sender's phone number is required.",
        'baggage-pickup-street': "Sender's street address is required.",
        'baggage-pickup-city': "Sender's city is required.",
        'baggage-pickup-postcode': "Sender's postcode is required.",
        'baggage-pickup-country': "Sender's country is required.",
        'baggage-pickup-location': 'Drop-off airport code is required (e.g., LHR).',
        'baggage-delivery-name': "Recipient's full name is required.",
        'baggage-delivery-email': "Recipient's email is required.",
        'baggage-delivery-phone': "Recipient's phone number is required.",
        'baggage-delivery-street': "Recipient's street address is required.",
        'baggage-delivery-city': "Recipient's city is required.",
        'baggage-delivery-postcode': "Recipient's postcode is required.",
        'baggage-delivery-country': "Recipient's country is required.",
        'baggage-delivery-location': 'Collection airport code is required (e.g., JFK).',
    };


    // Clear all previous errors
    form.querySelectorAll('.input-wrapper').forEach(wrapper => {
        wrapper.classList.remove('input-error');
        const errorEl = wrapper.querySelector('.error-text');
        if (errorEl) {
            errorEl.classList.add('hidden');
            errorEl.textContent = '';
        }
    });

    // Validate empty fields
    requiredFields.forEach(id => {
        const input = document.getElementById(id) as HTMLInputElement;
        if (input && !input.value.trim()) {
            allValid = false;
            const wrapper = input.closest('.input-wrapper');
            const errorEl = wrapper?.querySelector('.error-text');
            if (wrapper && errorEl) {
                wrapper.classList.add('input-error');
                errorEl.textContent = validationMap[id] || 'This field is required.';
                errorEl.classList.remove('hidden');
            }
        }
    });

    // Perform postcode-specific validation
    if (pickupType === 'address' && !handlePostcodeValidation('baggage-pickup-postcode', 'baggage-pickup-country')) {
        allValid = false;
        document.getElementById('baggage-pickup-postcode')?.closest('.input-wrapper')?.classList.add('input-error');
    }
    if (deliveryType === 'address' && !handlePostcodeValidation('baggage-delivery-postcode', 'baggage-delivery-country')) {
        allValid = false;
        document.getElementById('baggage-delivery-postcode')?.closest('.input-wrapper')?.classList.add('input-error');
    }

    // Validate insurance value if checked
    const insuranceCheckbox = document.getElementById('baggage-extra-insurance') as HTMLInputElement;
    if (insuranceCheckbox.checked) {
        const insuredValueInput = document.getElementById('baggage-insured-value') as HTMLInputElement;
        const insuredValue = parseFloat(insuredValueInput.value);
        if (isNaN(insuredValue) || insuredValue <= 0) {
            allValid = false;
            const wrapper = insuredValueInput.closest('.input-wrapper');
            const errorEl = wrapper?.querySelector('.error-text');
            if (wrapper && errorEl) {
                wrapper.classList.add('input-error');
                errorEl.textContent = 'Please enter a valid declared value.';
                errorEl.classList.remove('hidden');
            }
        }
    }
    
    if (!allValid) {
        showToast('Please fill out all required fields correctly.', 'error');
    }

    return allValid;
}


function proceedToQuote() {
    if (!validateDetailsForm()) return;
    
    const { pickupType, deliveryType, serviceType } = State.baggageDetails!;

    const details: BaggageDetails = {
        serviceType,
        pickupType,
        deliveryType,
        weight: parseFloat((document.getElementById('baggage-weight') as HTMLInputElement).value),
        serviceLevel: (document.getElementById('service-level') as HTMLSelectElement).value,
        extraInsurance: (document.getElementById('baggage-extra-insurance') as HTMLInputElement).checked,
        insuredValue: (document.getElementById('baggage-extra-insurance') as HTMLInputElement).checked ? parseFloat((document.getElementById('baggage-insured-value') as HTMLInputElement).value) : 0,
        purchasedTracker: (document.getElementById('baggage-purchase-tracker') as HTMLInputElement).checked,
        shipmentId: `BGG-${Date.now().toString().slice(-6)}`,
        pickupAddress: pickupType === 'address' ? {
            name: (document.getElementById('baggage-pickup-name') as HTMLInputElement).value,
            email: (document.getElementById('baggage-pickup-email') as HTMLInputElement).value,
            phone: (document.getElementById('baggage-pickup-phone') as HTMLInputElement).value,
            street: (document.getElementById('baggage-pickup-street') as HTMLInputElement).value,
            city: (document.getElementById('baggage-pickup-city') as HTMLInputElement).value,
            postcode: (document.getElementById('baggage-pickup-postcode') as HTMLInputElement).value,
            country: (document.getElementById('baggage-pickup-country') as HTMLInputElement).value,
        } : null,
        pickupLocation: pickupType === 'location' ? (document.getElementById('baggage-pickup-location') as HTMLInputElement).value.toUpperCase() : null,
        deliveryAddress: deliveryType === 'address' ? {
            name: (document.getElementById('baggage-delivery-name') as HTMLInputElement).value,
            email: (document.getElementById('baggage-delivery-email') as HTMLInputElement).value,
            phone: (document.getElementById('baggage-delivery-phone') as HTMLInputElement).value,
            street: (document.getElementById('baggage-delivery-street') as HTMLInputElement).value,
            city: (document.getElementById('baggage-delivery-city') as HTMLInputElement).value,
            postcode: (document.getElementById('baggage-delivery-postcode') as HTMLInputElement).value,
            country: (document.getElementById('baggage-delivery-country') as HTMLInputElement).value,
        } : null,
        deliveryLocation: deliveryType === 'location' ? (document.getElementById('baggage-delivery-location') as HTMLInputElement).value.toUpperCase() : null,
    };

    const baseQuote = calculateBaseQuote(details.weight, details.serviceLevel, serviceType);
    const insuranceCost = details.extraInsurance ? details.insuredValue * INSURANCE_RATE : 0;
    const trackerCost = details.purchasedTracker ? TRACKER_COST : 0;
    const totalQuote = baseQuote + insuranceCost + trackerCost;

    setState({ 
        baggageDetails: details,
        baggageQuote: totalQuote,
        baggageInsuranceCost: insuranceCost,
        baggageTrackerCost: trackerCost
    });

    const fromLocation = details.pickupAddress ? details.pickupAddress.country : details.pickupLocation;
    const toLocation = details.deliveryAddress ? details.deliveryAddress.country : details.deliveryLocation;
    const serviceTypeName = (details.serviceType).split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    (document.getElementById('quote-summary-details') as HTMLElement).innerHTML = `
        <div class="review-item"><span>Weight:</span> <strong>${details.weight} kg</strong></div>
        <div class="review-item"><span>Service Type:</span> <strong>${serviceTypeName}</strong></div>
        <div class="review-item"><span>Route:</span> <strong>${fromLocation} &rarr; ${toLocation}</strong></div>
    `;
    (document.getElementById('quote-summary-breakdown') as HTMLElement).innerHTML = `
        <div class="review-item"><span>Base Shipping:</span> <strong>${State.currentCurrency.symbol}${baseQuote.toFixed(2)}</strong></div>
        ${details.extraInsurance ? `<div class="review-item"><span>Extra Protection:</span> <strong>${State.currentCurrency.symbol}${insuranceCost.toFixed(2)}</strong></div>` : ''}
        ${details.purchasedTracker ? `<div class="review-item"><span>GPS Tracker Device:</span> <strong>${State.currentCurrency.symbol}${trackerCost.toFixed(2)}</strong></div>` : ''}
    `;
    (document.getElementById('quote-display-total') as HTMLElement).textContent = `${State.currentCurrency.symbol}${totalQuote.toFixed(2)}`;

    handleStepTransition('quote');
}

function handleAgreementAndPay() {
    if (!State.baggageDetails || State.baggageQuote === null) return;
    DOMElements.shippingAgreementModal.classList.remove('active');
    
    (document.getElementById('payment-shipment-id') as HTMLElement).textContent = `Shipment: #${State.baggageDetails.shipmentId}`;
    (document.getElementById('payment-amount-due') as HTMLElement).textContent = `Amount Due: ${State.currentCurrency.symbol}${State.baggageQuote.toFixed(2)}`;
    (document.getElementById('payment-cardholder-name') as HTMLInputElement).value = State.baggageDetails.pickupAddress?.name || '';

    handleStepTransition('payment');
    initializeStripeElements('baggage-card-element', 'baggage-card-errors');
}

function confirmPayment() {
    if (!State.baggageDetails) return;

    const payButton = document.getElementById('confirm-payment') as HTMLButtonElement | null;
    if (!payButton || payButton.disabled) return;

    const originalButtonText = payButton.textContent;
    payButton.disabled = true;
    payButton.textContent = 'Processing...';
    toggleLoading(true, "Processing Payment...");

    // Mock payment success/failure
    setTimeout(() => {
        toggleLoading(false);
        const paymentSucceeded = Math.random() > 0.1; // 90% success rate

        if (paymentSucceeded) {
            const { pickupAddress, deliveryAddress, pickupLocation, deliveryLocation, shipmentId, purchasedTracker } = State.baggageDetails!;
            const name = pickupAddress?.name.split(' ')[0] || 'Customer';
            const from = pickupAddress ? `${pickupAddress.city}, ${pickupAddress.country}` : pickupLocation;
            const to = deliveryAddress ? `${deliveryAddress.city}, ${deliveryAddress.country}` : deliveryLocation;
            const email = pickupAddress?.email || deliveryAddress?.email || 'your email';

            const trackerMessage = purchasedTracker ? '<br>Your GPS Tracker will be included with your shipping documents.' : '';
            
            const confirmationTitleEl = document.getElementById('confirmation-title') as HTMLElement;
            if (confirmationTitleEl) {
                confirmationTitleEl.innerHTML = `
                    <div class="confirmation-icon-wrapper">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                    </div>
                    <span>Confirmation #${shipmentId}</span>
                `;
            }

            (document.getElementById('confirmation-message') as HTMLElement).innerHTML = `
                Thank you, <strong>${name}</strong>! Your payment was successful.
                <br>
                Your baggage shipment from <strong>${from}</strong> to <strong>${to}</strong> is confirmed.
                ${trackerMessage}
                <br>
                An email with your receipt and shipping labels has been sent to <strong>${email}</strong>.
            `;
            (document.getElementById('baggage-confirmation-tracking-id') as HTMLDivElement).textContent = shipmentId;
            
            handleStepTransition('confirmation');
        } else {
            showToast("Payment failed. Please try again.", "error");
            payButton.disabled = false;
            payButton.textContent = originalButtonText;
        }
    }, 1500);
}

function generateBaggagePDF() {
    if (!State.baggageDetails) return;
    const doc = new jsPDF();
    const { baggageDetails, baggageQuote, baggageInsuranceCost, baggageTrackerCost } = State;

    const headStyles = { fillColor: [0, 87, 255] as [number, number, number] };
    
    // Vcanship Header
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('VCanship', 15, 20);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('123 Global Logistics Ave, Shipping City, 12345', 15, 27);
    doc.text('support@vcanresources.com | +1 (555) 123-4567', 15, 32);

    doc.setFontSize(18);
    doc.text('Baggage Shipment Summary', 105, 45, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Shipment ID: ${baggageDetails.shipmentId}`, 105, 52, { align: 'center' });
    
    const pickupText = baggageDetails.pickupAddress 
        ? `${baggageDetails.pickupAddress.name}\n${baggageDetails.pickupAddress.email}\n${baggageDetails.pickupAddress.phone}\n${baggageDetails.pickupAddress.street}\n${baggageDetails.pickupAddress.city}, ${baggageDetails.pickupAddress.postcode}\n${baggageDetails.pickupAddress.country}`
        : `Airport Drop-off:\n${baggageDetails.pickupLocation}`;

    const deliveryText = baggageDetails.deliveryAddress
        ? `${baggageDetails.deliveryAddress.name}\n${baggageDetails.deliveryAddress.email}\n${baggageDetails.deliveryAddress.phone}\n${baggageDetails.deliveryAddress.street}\n${baggageDetails.deliveryAddress.city}, ${baggageDetails.deliveryAddress.postcode}\n${baggageDetails.deliveryAddress.country}`
        : `Airport Collection:\n${baggageDetails.deliveryLocation}`;

    autoTable(doc, {
        startY: 60,
        head: [['Pickup Details', 'Delivery Details']],
        body: [[pickupText, deliveryText]],
        theme: 'grid',
        headStyles: headStyles
    });

    const costBody: RowInput[] = [
        ['Service Type', (baggageDetails.serviceType).replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())],
        ['Weight', `${baggageDetails.weight} kg`],
        ['Service Speed', baggageDetails.serviceLevel],
        ['Extra Protection', baggageDetails.extraInsurance ? `Yes (Value: ${State.currentCurrency.symbol}${baggageDetails.insuredValue})` : 'No'],
        ['Base Shipping', `${State.currentCurrency.symbol}${(baggageQuote! - baggageInsuranceCost - baggageTrackerCost).toFixed(2)}`],
    ];

    if (baggageDetails.extraInsurance) {
        costBody.push(['Insurance Premium', `${State.currentCurrency.symbol}${baggageInsuranceCost.toFixed(2)}`]);
    }
    if (baggageDetails.purchasedTracker) {
        costBody.push(['GPS Tracker', `${State.currentCurrency.symbol}${baggageTrackerCost.toFixed(2)}`]);
    }

    costBody.push([{ content: 'Total Cost', styles: { fontStyle: 'bold' } }, { content: `${State.currentCurrency.symbol}${baggageQuote!.toFixed(2)}`, styles: { fontStyle: 'bold' } }]);


    autoTable(doc, {
        // @ts-ignore
        startY: doc.lastAutoTable.finalY + 10,
        head: [['Shipment & Cost Details', '']],
        body: costBody,
        theme: 'striped',
        headStyles: headStyles
    });

    doc.save(`Vcanship_Baggage_${baggageDetails.shipmentId}.pdf`);
}

function generateShippingAgreementPDF() {
     const doc = new jsPDF();
     doc.setFontSize(16);
     doc.text('Shipping Agreement & Terms', 105, 20, { align: 'center' });
     doc.setFontSize(10);
     const text = (document.getElementById('shipping-agreement-text') as HTMLElement).innerText;
     const splitText = doc.splitTextToSize(text, 180);
     doc.text(splitText, 15, 30);
     doc.save('Vcanship_Shipping_Agreement.pdf');
}

function handleServiceTypeChange(serviceType: BaggageServiceType) {
    setState({
        baggageDetails: {
            ...(State.baggageDetails || {}),
            serviceType,
            pickupType: serviceType.startsWith('door') ? 'address' : 'location',
            deliveryType: serviceType.endsWith('door') ? 'address' : 'location',
        } as BaggageDetails
    });

    // FIX: Cast `btn` to `HTMLButtonElement` to access its `dataset` property.
    document.querySelectorAll<HTMLButtonElement>('#baggage-service-type-selector .service-type-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.serviceType === serviceType);
    });
    updateBaggageFormUI();
}

function attachBaggageEventListeners() {
    document.querySelector('#page-baggage .back-btn')?.addEventListener('click', () => switchPage('landing'));
    // FIX: Cast `btn` to `HTMLButtonElement` to access its `dataset` property.
    document.querySelectorAll<HTMLButtonElement>('#baggage-service-type-selector .service-type-btn').forEach(btn => {
        btn.addEventListener('click', () => handleServiceTypeChange(btn.dataset.serviceType as BaggageServiceType));
    });

    document.getElementById('proceed-to-quote')?.addEventListener('click', proceedToQuote);
    document.getElementById('proceed-to-payment')?.addEventListener('click', () => DOMElements.shippingAgreementModal.classList.add('active'));
    document.getElementById('baggage-payment-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        confirmPayment();
    });

    document.getElementById('back-to-details')?.addEventListener('click', () => handleStepTransition('details'));
    document.getElementById('back-to-quote')?.addEventListener('click', () => handleStepTransition('quote'));

    document.querySelector('#baggage-confirmation-step #download-pdf')?.addEventListener('click', generateBaggagePDF);
    document.querySelector('#baggage-confirmation-step #new-shipment')?.addEventListener('click', () => {
        resetBaggageState();
        handleStepTransition('details');
        handleServiceTypeChange('door-to-door');
    });

    const insuranceToggle = document.getElementById('baggage-extra-insurance') as HTMLInputElement;
    insuranceToggle?.addEventListener('change', () => {
        document.getElementById('baggage-insured-value-container')?.classList.toggle('visible', insuranceToggle.checked);
    });

    const sameAsPickup = document.getElementById('baggage-same-as-pickup') as HTMLInputElement;
    sameAsPickup?.addEventListener('change', () => {
        if (sameAsPickup.checked) {
            ['name', 'email', 'phone', 'street', 'city', 'postcode', 'country'].forEach(field => {
                const pickupEl = document.getElementById(`baggage-pickup-${field}`) as HTMLInputElement;
                const deliveryEl = document.getElementById(`baggage-delivery-${field}`) as HTMLInputElement;
                if (pickupEl && deliveryEl) deliveryEl.value = pickupEl.value;
            });
        }
    });

    DOMElements.closeShippingAgreementModalBtn.addEventListener('click', () => DOMElements.shippingAgreementModal.classList.remove('active'));
    DOMElements.shippingAgreementCheckbox.addEventListener('change', () => {
        DOMElements.shippingAgreementProceedBtn.disabled = !DOMElements.shippingAgreementCheckbox.checked;
    });
    DOMElements.shippingAgreementProceedBtn.addEventListener('click', handleAgreementAndPay);
    DOMElements.downloadShippingAgreementPdfBtn.addEventListener('click', generateShippingAgreementPDF);

    document.getElementById('baggage-tracker-learn-more')?.addEventListener('click', () => DOMElements.trackingDeviceModal.classList.add('active'));
    DOMElements.closeTrackingDeviceModalBtn.addEventListener('click', () => DOMElements.trackingDeviceModal.classList.remove('active'));

    document.getElementById('baggage-pickup-postcode')?.addEventListener('blur', () => handlePostcodeValidation('baggage-pickup-postcode', 'baggage-pickup-country'));
    document.getElementById('baggage-delivery-postcode')?.addEventListener('blur', () => handlePostcodeValidation('baggage-delivery-postcode', 'baggage-delivery-country'));

    const handleCountryBlur = (event: Event) => {
        const input = event.target as HTMLInputElement;
        // Re-validate postcode when country changes
        if (input.id === 'baggage-pickup-country') {
            handlePostcodeValidation('baggage-pickup-postcode', 'baggage-pickup-country');
        } else if (input.id === 'baggage-delivery-country') {
            handlePostcodeValidation('baggage-delivery-postcode', 'baggage-delivery-country');
        }
        if (input.value) setLocaleByCountryName(input.value);
    };
    document.getElementById('baggage-pickup-country')?.addEventListener('blur', handleCountryBlur);
    document.getElementById('baggage-delivery-country')?.addEventListener('blur', handleCountryBlur);

    document.getElementById('baggage-confirmation-track-shipment-btn')?.addEventListener('click', () => {
        const trackingId = State.baggageDetails?.shipmentId;
        if (trackingId) {
            DOMElements.trackingIdInput.value = trackingId;
            DOMElements.trackBtn.click();
            DOMElements.trackingForm.dispatchEvent(new Event('submit'));
        }
    });
}


export function startBaggage(): void {
    try {
        setState({ currentService: 'baggage' });
        renderBaggagePage();
        
        const agreementTextContainer = document.getElementById('shipping-agreement-text');
        if (agreementTextContainer) {
            agreementTextContainer.innerHTML = SHIPPING_AGREEMENT_TEXT;
        }
        
        switchPage('baggage');
        resetBaggageState();
        handleStepTransition('details');
        handleServiceTypeChange('door-to-door');
    } catch (error) {
        console.error("Failed to initialize Baggage service:", error);
        showToast("Could not load the Baggage service.", "error");
        switchPage('landing');
    }
}