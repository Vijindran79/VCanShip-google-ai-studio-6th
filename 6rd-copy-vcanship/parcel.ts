// ⚠️  READ-ONLY — DO NOT EDIT — SERVICE LOCKED ⚠️
import { jsPDF } from 'jspdf';
import { State, setState, type Quote, type Address, resetParcelState, type DropOffLocation, ApiResponse } from './state';
import { getShippingQuotes, getDropoffLocations, getHsCodeSuggestions } from './api';
import { showToast, switchPage, updateProgressBar, toggleLoading } from './ui';
import { DOMElements } from './dom';
import { initializeStripeElements } from './payment';
import { createQuoteCard } from './components';
import { t } from './i18n';

function validateUkPostcode(postcode: string): boolean {
    if (!postcode) return false;
    // This regex is permissive but covers the basic structure of UK postcodes. Case-insensitive.
    // Allows for formats like SW1A0AA, SW1A 0AA, M1 1AE, M60 1NW, CR2 6XH, DN55 1PT, W1A 1HQ
    const postcodeRegex = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;
    return postcodeRegex.test(postcode.trim());
}

function handlePostcodeValidation(postcodeElId: string, countryElId: string, errorElId: string): boolean {
    const postcodeEl = document.getElementById(postcodeElId) as HTMLInputElement;
    const countryEl = document.getElementById(countryElId) as HTMLInputElement;
    const errorEl = document.getElementById(errorElId);
    
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


function goToParcelStep(step: number) {
    document.querySelectorAll('#page-parcel .service-step').forEach(s => s.classList.remove('active'));
    const stepEl = document.getElementById(`parcel-step-${step}`);
    if (stepEl) {
        stepEl.classList.add('active');
        updateProgressBar('parcel', step - 1);
    }
    if (step === 4) {
        const printBtn = document.getElementById('parcel-print-label-btn');
        if (printBtn) {
            // FIX: Always show the print label button on the confirmation screen,
            // regardless of pickup or dropoff type, to ensure the option is always available.
            printBtn.classList.remove('hidden');
        }
    }
}

function handleHeavyItemCheck() {
    const weightInput = document.getElementById('package-weight') as HTMLInputElement;
    const banner = document.getElementById('heavy-item-banner');
    if (!weightInput || !banner) return;

    const weight = parseFloat(weightInput.value);
    banner.classList.toggle('hidden', isNaN(weight) || weight <= 30);
}

function handlePickupTypeChange(type: 'pickup' | 'dropoff') {
    setState({ parcelPickupType: type, parcelUserCoordinates: null }); // Reset coordinates on type change
    document.querySelectorAll('#parcel-pickup-type-selector .service-type-btn').forEach(btn => {
        btn.classList.toggle('active', (btn as HTMLElement).dataset.type === type);
    });
    document.getElementById('parcel-pickup-fields')?.classList.toggle('hidden', type === 'dropoff');
    document.getElementById('parcel-dropoff-fields')?.classList.toggle('hidden', type === 'pickup');
    
    const helperTextEl = document.getElementById('geolocation-helper-text');
    if (type === 'dropoff' && navigator.geolocation) {
        if (!helperTextEl) return;

        helperTextEl.textContent = 'Detecting your location...';
        // The modal itself will show a loading spinner. No need for a full-page overlay.

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                setState({ parcelUserCoordinates: { lat: latitude, lng: longitude } });
                showToast("Location detected! Finding nearest drop-off points.", "success");
                helperTextEl.innerHTML = `
                    We've detected your location to start your search.
                    <br>
                    <strong>This is not the pickup address.</strong> You can change the search by entering a postcode.
                `;
                await openDropoffMapModal();
            },
            (error) => {
                let message = "Could not detect location. Please enter your postcode manually.";
                if (error.code === error.PERMISSION_DENIED) {
                    message = "Location access denied. Please enter your postcode manually.";
                }
                showToast(message, "warning");
                helperTextEl.textContent = "Enter your postcode to find drop-off locations.";
                (document.getElementById('parcel-dropoff-postcode') as HTMLInputElement)?.focus();
            },
            { timeout: 5000, enableHighAccuracy: false }
        );
    } else if (type === 'pickup' && helperTextEl) {
        helperTextEl.textContent = '';
    }
}


function handleDropoffLocationSelect(location: { id: string; name: string; address: string; postcode: string; country: string; hasPrinting: boolean; }) {
    setState({ parcelSelectedDropoffLocation: location });
    const display = document.querySelector('#parcel-dropoff-fields .selected-location-display');
    if (display) {
        display.innerHTML = `
            <strong>${location.name}</strong>
            <p>${location.address}, ${location.postcode}</p>
        `;
    }
    DOMElements.dropoffMapModal.classList.remove('active');
}

async function openDropoffMapModal() {
    const modal = DOMElements.dropoffMapModal;
    const listContainer = DOMElements.dropoffMapListContainer;
    const cancelBtn = document.getElementById('cancel-dropoff-select-btn') as HTMLButtonElement;
    const postcodeEl = document.getElementById('parcel-dropoff-postcode') as HTMLInputElement;

    if (!modal || !listContainer || !cancelBtn) return;

    modal.classList.add('active');
    cancelBtn.addEventListener('click', () => modal.classList.remove('active'), { once: true });
    
    listContainer.innerHTML = `<div class="loading-spinner" style="margin: 2rem auto;"></div>`;

    const countryCodeEl = document.querySelector('#locale-country-button-content span:last-child');
    const currentCountryCode = countryCodeEl?.textContent?.trim().toUpperCase() || 'GB';
    
    let locations: DropOffLocation[] = [];
    let message = '';
    
    try {
        // Prioritize using detected coordinates if available
        if (State.parcelUserCoordinates) {
            locations = await getDropoffLocations({
                country: currentCountryCode,
                coordinates: State.parcelUserCoordinates
            });
            message = `<p class="helper-text" style="padding: 0 1rem 1rem;">Showing nearest locations based on your current position.</p>`;
        } else {
            const postcode = postcodeEl?.value.trim();
            if (!postcode) {
                showToast("Please enter a postcode or allow location access to find nearby points.", "warning");
                listContainer.innerHTML = `<p class="helper-text" style="padding: 1rem;">Please enter a postcode to search.</p>`;
                return;
            }
            if (currentCountryCode === 'GB' && !validateUkPostcode(postcode)) {
                showToast("Please enter a valid UK postcode format.", "error");
                const errorEl = document.getElementById('parcel-dropoff-postcode-error');
                if (errorEl) {
                    errorEl.textContent = 'Please enter a valid UK postcode format (e.g., SW1A 0AA).';
                    errorEl.classList.remove('hidden');
                }
                listContainer.innerHTML = `<p class="helper-text" style="padding: 1rem;">Please enter a valid UK postcode to search.</p>`;
                return;
            }
            locations = await getDropoffLocations({
                country: currentCountryCode,
                postcode: postcode
            });
            message = `<p class="helper-text" style="padding: 0 1rem 1rem;">Showing nearest locations to postcode "${postcode}".</p>`;
        }

        if (locations.length === 0) {
            const postcode = postcodeEl?.value.trim();
            listContainer.innerHTML = `<p class="helper-text" style="padding: 1rem;">No locations found for postcode "${postcode}". Please try another search.</p>`;
            return;
        }
        
        // Render the list from the API response
        listContainer.innerHTML = `
            ${message}
            <ul>
                ${locations.map((loc, index) => {
                    // FIX: Escape double quotes in the JSON string for the data-location attribute
                    // to prevent "Unterminated string in JSON" errors if the data contains quotes.
                    const safeLocData = JSON.stringify(loc).replace(/"/g, '&quot;');
                    return `
                    <li class="dropoff-location-item" id="item-loc-${index}" data-location="${safeLocData}">
                        <h4>${loc.name}</h4>
                        <p>${loc.address}</p>
                        <p class="location-distance">${loc.distance}</p>
                        <p class="helper-text" style="margin-top: 0.5rem;">Hours: ${loc.hours}</p>
                        <div class="location-services">
                            ${loc.offersLabelPrinting 
                                ? `<span class="service-tag printing-available"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>Printing Available</span>` 
                                : `<span class="service-tag print-at-home"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" /></svg>Print at Home</span>`
                            }
                        </div>
                    </li>
                `;
                }).join('')}
            </ul>
        `;
    
        // Add Interactivity
        listContainer.querySelectorAll('.dropoff-location-item').forEach(item => {
            item.addEventListener('click', () => {
                const locData = (item as HTMLElement).dataset.location;
                if (locData) {
                    const parsedLoc: DropOffLocation = JSON.parse(locData.replace(/&quot;/g, '"'));
                    
                    const addressParts = parsedLoc.address.split(',').map((s: string) => s.trim());
                    const postcode = addressParts.pop() || '';
                    const address = addressParts.join(', ');

                    const locationForState = {
                        id: `loc-${parsedLoc.name.replace(/\s/g, '')}`,
                        name: parsedLoc.name,
                        address: address,
                        postcode: postcode,
                        country: currentCountryCode,
                        hasPrinting: parsedLoc.offersLabelPrinting
                    };

                    handleDropoffLocationSelect(locationForState);
                }
            });
        });

    } catch (error) {
        console.error('Error fetching dropoff locations:', error);
        listContainer.innerHTML = `<p class="helper-text error-text" style="padding: 1rem;">An error occurred while searching for locations. Please try again.</p>`;
    }
}

async function handleDetailsFormSubmit(e: Event) {
    e.preventDefault();
    const form = (e.target as HTMLElement).closest('form');
    if (!form) return;

    let allValid = true;

    const validationMap: { [key: string]: string } = {
        'dest-name': "Recipient's full name is required.",
        'dest-street': "Recipient's street address is required.",
        'dest-city': "Recipient's city is required.",
        'dest-postcode': "Recipient's postcode is required.",
        'dest-country': "Recipient's country is required.",
        'package-weight': 'Package weight is required.',
        'package-length': 'Package length is required.',
        'package-width': 'Package width is required.',
        'package-height': 'Package height is required.',
        'item-description': 'A description of the item is required.',
        'origin-name': "Sender's full name is required.",
        'origin-street': "Sender's street address is required.",
        'origin-city': "Sender's city is required.",
        'origin-postcode': "Sender's postcode is required.",
        'origin-country': "Sender's country is required.",
    };

    const requiredFieldIds = [
        'dest-name', 'dest-street', 'dest-city', 'dest-postcode', 'dest-country',
        'package-weight', 'package-length', 'package-width', 'package-height', 'item-description'
    ];
    if (State.parcelPickupType === 'pickup') {
        requiredFieldIds.push('origin-name', 'origin-street', 'origin-city', 'origin-postcode', 'origin-country');
    }

    form.querySelectorAll('.input-wrapper').forEach(wrapper => {
        wrapper.classList.remove('input-error');
        const errorEl = wrapper.querySelector('.error-text');
        if (errorEl) {
            errorEl.classList.add('hidden');
            errorEl.textContent = '';
        }
    });

    requiredFieldIds.forEach(id => {
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
    
    if (State.parcelInsuranceAdded) {
        const declaredValueInput = document.getElementById('parcel-declared-value') as HTMLInputElement;
        const value = parseFloat(declaredValueInput.value);
        if (!declaredValueInput.value.trim() || isNaN(value) || value <= 0) {
            allValid = false;
            const wrapper = declaredValueInput.closest('.input-wrapper');
            const errorEl = wrapper?.querySelector('.error-text');
            if (wrapper && errorEl) {
                wrapper.classList.add('input-error');
                errorEl.textContent = 'Please enter a valid declared value greater than zero.';
                errorEl.classList.remove('hidden');
            }
        }
    }

    if (State.parcelPickupType === 'pickup') {
        if (!handlePostcodeValidation('origin-postcode', 'origin-country', 'origin-postcode-error')) {
            allValid = false;
            document.getElementById('origin-postcode')?.closest('.input-wrapper')?.classList.add('input-error');
        }
    }
    if (!handlePostcodeValidation('dest-postcode', 'dest-country', 'dest-postcode-error')) {
        allValid = false;
        document.getElementById('dest-postcode')?.closest('.input-wrapper')?.classList.add('input-error');
    }

    if (State.parcelPickupType === 'dropoff' && !State.parcelSelectedDropoffLocation) {
        allValid = false;
        showToast('Please select a drop-off location.', 'error');
        document.getElementById('find-location-btn')?.focus();
    }

    if (!allValid) {
        showToast('Please fill out all required fields and correct any errors.', 'error');
        return;
    }

    let origin: Address;
    const destination: Address = {
        name: (document.getElementById('dest-name') as HTMLInputElement).value,
        street: (document.getElementById('dest-street') as HTMLInputElement).value,
        city: (document.getElementById('dest-city') as HTMLInputElement).value,
        postcode: (document.getElementById('dest-postcode') as HTMLInputElement).value,
        country: (document.getElementById('dest-country') as HTMLInputElement).value,
    };

    if (State.parcelPickupType === 'pickup') {
        origin = {
            name: (document.getElementById('origin-name') as HTMLInputElement).value,
            street: (document.getElementById('origin-street') as HTMLInputElement).value,
            city: (document.getElementById('origin-city') as HTMLInputElement).value,
            postcode: (document.getElementById('origin-postcode') as HTMLInputElement).value,
            country: (document.getElementById('origin-country') as HTMLInputElement).value,
        };
    } else { 
        const { name, address, postcode, country } = State.parcelSelectedDropoffLocation!;
        const addressParts = address.split(',').map(s => s.trim());
        const street = addressParts[0] || '';
        const city = addressParts[1] || '';

        origin = {
            name: name,
            street: street,
            city: city,
            country: country,
            postcode: postcode,
        };
    }
    
    setState({ parcelOrigin: origin, parcelDestination: destination });

    const formData = {
        origin, destination,
        weight: parseFloat((document.getElementById('package-weight') as HTMLInputElement).value),
        length: parseInt((document.getElementById('package-length') as HTMLInputElement).value),
        width: parseInt((document.getElementById('package-width') as HTMLInputElement).value),
        height: parseInt((document.getElementById('package-height') as HTMLInputElement).value),
        description: (document.getElementById('item-description') as HTMLTextAreaElement).value,
    };
    
    goToParcelStep(2);
    
    const quotesContainer = DOMElements.parcel.quotesContainer;
    const warningsContainer = DOMElements.parcel.warningsContainer;
    const sidebarContainer = document.getElementById('parcel-sidebar-container');

    if (quotesContainer) {
        quotesContainer.innerHTML = `
            <h3>Your Quotes</h3>
            <div id="quotes-skeleton">
                <div class="quote-card-skeleton"></div><div class="quote-card-skeleton"></div><div class="quote-card-skeleton"></div>
            </div>`;
    }
    if (warningsContainer) warningsContainer.innerHTML = '';
    if (sidebarContainer) {
        sidebarContainer.innerHTML = `
            <div class="results-section"><div class="compliance-checklist-skeleton" style="height: 150px;"></div></div>
            <div class="results-section"><div class="compliance-checklist-skeleton" style="height: 120px;"></div></div>
        `;
    }

    try {
        const apiResponse = await getShippingQuotes(formData);
        if (apiResponse) {
            renderResults(apiResponse, origin, destination);
        } else {
            throw new Error("API returned no response.");
        }
    } catch (error) {
        console.error('Error getting quotes:', error);
        if (quotesContainer) {
            quotesContainer.innerHTML = '<p class="error-text" style="text-align:center; padding: 2rem;">Sorry, we couldn\'t fetch quotes at this time. Please try again later.</p>';
        }
    }
}

function renderResults(response: ApiResponse, origin: Address, destination: Address) {
    const { itemWarning, complianceReport, quotes, costSavingOpportunities, nextSteps } = response;

    const warningsContainer = DOMElements.parcel.warningsContainer;
    const quotesContainer = DOMElements.parcel.quotesContainer;
    const sidebarContainer = document.getElementById('parcel-sidebar-container');
    const mainSubtitle = document.getElementById('parcel-main-subtitle');

    // Clear all containers first
    if (warningsContainer) warningsContainer.innerHTML = '';
    if (quotesContainer) quotesContainer.innerHTML = '';
    if (sidebarContainer) sidebarContainer.innerHTML = '';
    
    if (mainSubtitle) {
        const originLocation = State.parcelPickupType === 'dropoff' ? State.parcelSelectedDropoffLocation?.name : origin.country;
        mainSubtitle.textContent = `We've found the best rates for your shipment from ${originLocation} to ${destination.country}.`;
    }

    if (itemWarning && warningsContainer) {
        warningsContainer.innerHTML = `<div class="results-section item-warning-banner">${itemWarning}</div>`;
    }

    // Build sidebar HTML string
    let sidebarHtml = '';

    if (complianceReport) {
        const statusClass = `compliance-status-${complianceReport.status.toLowerCase().replace(/\s/g, '-')}`;
        sidebarHtml += `
            <div class="results-section">
                <h3><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 1a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 1Zm3.536 2.464a.75.75 0 0 1 1.06 0l1.06 1.06a.75.75 0 0 1-1.06 1.06l-1.06-1.06a.75.75 0 0 1 0-1.06ZM18 10a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5h1.5A.75.75 0 0 1 18 10ZM10 18a.75.75 0 0 1 .75-.75h.01a.75.75 0 0 1 0 1.5H10.75a.75.75 0 0 1-.75-.75ZM4.464 15.536a.75.75 0 0 1 0-1.06l1.06-1.06a.75.75 0 0 1 1.06 1.06l-1.06 1.06a.75.75 0 0 1-1.06 0ZM2 10a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5h-1.5A.75.75 0 0 1 2 10ZM5.536 4.464a.75.75 0 0 1 1.06 0l1.06 1.06a.75.75 0 0 1-1.06 1.06L5.536 5.524a.75.75 0 0 1 0-1.06ZM10 4a6 6 0 1 0 0 12 6 6 0 0 0 0-12Z" clip-rule="evenodd" /></svg> Compliance Report</h3>
                <div class="compliance-report">
                    <div class="compliance-report-header">
                        <span class="compliance-status-badge ${statusClass}">${complianceReport.status}</span>
                        <p>${complianceReport.summary}</p>
                    </div>
                    ${complianceReport.requirements.length > 0 ? `<ul>${complianceReport.requirements.map(req => `<li><strong>${req.title}:</strong> ${req.details}</li>`).join('')}</ul>` : ''}
                </div>
            </div>`;
    }

    if (costSavingOpportunities && costSavingOpportunities.length > 0) {
        sidebarHtml += `
            <div class="results-section">
                <h3><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" /><path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-11.25a.75.75 0 0 0-1.5 0v4.59L7.3 9.24a.75.75 0 0 0-1.1 1.02l3.25 3.5a.75.75 0 0 0 1.1 0l3.25-3.5a.75.75 0 1 0-1.1-1.02l-1.95 2.1v-4.59Z" clip-rule="evenodd" /></svg> AI Savings Advisor</h3>
                ${costSavingOpportunities.map(opp => `<div class="cost-saving-opportunity"><h4>${opp.title}</h4><p>${opp.description}</p></div>`).join('')}
            </div>`;
    }

    if (nextSteps) {
        sidebarHtml += `<div class="results-section"><h3>Next Steps</h3><p>${nextSteps}</p></div>`;
    }
    
    // Populate sidebar
    if (sidebarContainer) {
        sidebarContainer.innerHTML = sidebarHtml;
    }

    // Add insurance cost to quotes before rendering
    const insuranceCost = State.parcelInsuranceCost;
    let finalQuotes = [...quotes];

    if (insuranceCost > 0) {
        finalQuotes = quotes.map(quote => {
            const newQuote = JSON.parse(JSON.stringify(quote));
            newQuote.costBreakdown.optionalInsuranceCost = insuranceCost;
            newQuote.totalCost += insuranceCost;
            return newQuote;
        });
    }

    if (finalQuotes && finalQuotes.length > 0 && quotesContainer) {
        quotesContainer.innerHTML = `<h3>Your Quotes</h3>${finalQuotes.map(quote => createQuoteCard(quote)).join('')}`;
    } else if (quotesContainer) {
        quotesContainer.innerHTML = '<p class="helper-text" style="text-align: center; padding: 2rem;">No quotes available for this route. This may be due to compliance restrictions on the item you are trying to send.</p>';
    }
}

function updateParcelPaymentSummary() {
    const { parcelSelectedQuote, parcelPremiumTrackingAdded, parcelPremiumTrackingCost, currentCurrency, parcelOrigin, parcelDestination } = State;
    if (!parcelSelectedQuote || !parcelOrigin || !parcelDestination) return;

    const summaryDetailsEl = document.getElementById('parcel-payment-summary-details');
    const totalDisplayEl = document.getElementById('parcel-total-due-display');

    if (!summaryDetailsEl || !totalDisplayEl) return;

    let total = parcelSelectedQuote.totalCost;
    if (parcelPremiumTrackingAdded) {
        total += parcelPremiumTrackingCost;
    }

    const insuranceLine = parcelSelectedQuote.costBreakdown.optionalInsuranceCost > 0
        ? `<div class="review-item"><span>Insurance:</span> <strong>${currentCurrency.symbol}${parcelSelectedQuote.costBreakdown.optionalInsuranceCost.toFixed(2)}</strong></div>`
        : '';
    
    summaryDetailsEl.innerHTML = `
        <div class="review-item"><span>From:</span> <strong>${parcelOrigin.city || parcelOrigin.name}, ${parcelOrigin.country}</strong></div>
        <div class="review-item"><span>To:</span> <strong>${parcelDestination.city}, ${parcelDestination.country}</strong></div>
        <div class="review-item"><span>Carrier:</span> <strong>${parcelSelectedQuote.carrierName}</strong></div>
        ${insuranceLine}
        <hr>
    `;

    totalDisplayEl.textContent = `${currentCurrency.symbol}${total.toFixed(2)}`;
}

function handleSelectQuote(e: Event) {
    const button = (e.target as HTMLElement).closest('.select-quote-btn') as HTMLButtonElement;
    if (!button?.dataset.quote) return;
    
    const quote: Quote = JSON.parse(button.dataset.quote.replace(/&quot;/g, '"'));
    setState({ parcelSelectedQuote: quote, parcelPremiumTrackingAdded: false });
    
    const premiumTrackingCheckbox = document.getElementById('parcel-premium-tracking-checkbox') as HTMLInputElement;
    if (premiumTrackingCheckbox) premiumTrackingCheckbox.checked = false;

    updateParcelPaymentSummary();
    
    goToParcelStep(3);
    initializeStripeElements('parcel-card-element', 'parcel-card-errors');
}

function handleViewBreakdown(e: Event) {
    const button = (e.target as HTMLElement).closest('.view-breakdown-btn') as HTMLButtonElement;
    if (!button?.dataset.quote) return;

    const quote: Quote = JSON.parse(button.dataset.quote.replace(/&quot;/g, '"'));
    const modal = document.getElementById('price-breakdown-modal');
    if (modal) {
        (document.getElementById('breakdown-modal-subtitle') as HTMLElement).textContent = `Details for your ${quote.carrierName} quote.`;
        
        const insuranceLine = quote.costBreakdown.optionalInsuranceCost > 0 
            ? `<div class="review-item"><span>Parcel Insurance:</span> <strong>${State.currentCurrency.symbol}${quote.costBreakdown.optionalInsuranceCost.toFixed(2)}</strong></div>`
            : '';

        (document.getElementById('breakdown-details-container') as HTMLElement).innerHTML = `
            <div class="review-item"><span>Base Shipping:</span> <strong>${State.currentCurrency.symbol}${quote.costBreakdown.baseShippingCost.toFixed(2)}</strong></div>
            <div class="review-item"><span>Fuel Surcharge:</span> <strong>${State.currentCurrency.symbol}${quote.costBreakdown.fuelSurcharge.toFixed(2)}</strong></div>
            <div class="review-item"><span>Est. Customs & Taxes:</span> <strong>${State.currentCurrency.symbol}${quote.costBreakdown.estimatedCustomsAndTaxes.toFixed(2)}</strong></div>
            ${insuranceLine}
            <div class="review-item"><span>Our Service Fee:</span> <strong>${State.currentCurrency.symbol}${quote.costBreakdown.ourServiceFee.toFixed(2)}</strong></div>
            <hr>
            <div class="review-item total"><span>Total:</span> <strong>${State.currentCurrency.symbol}${quote.totalCost.toFixed(2)}</strong></div>
        `;
        modal.classList.add('active');
        document.getElementById('close-breakdown-modal-btn')?.addEventListener('click', () => modal.classList.remove('active'), { once: true });
    }
}

function handlePaymentSubmit(e: Event) {
    e.preventDefault();
    toggleLoading(true, "Processing payment...");
    setTimeout(() => {
        toggleLoading(false);
        const confirmationTitle = document.getElementById('parcel-confirmation-title') as HTMLHeadingElement;
        const confirmationMessage = document.getElementById('parcel-confirmation-message') as HTMLParagraphElement;
        const trackingIdEl = document.getElementById('parcel-confirmation-tracking-id') as HTMLDivElement;
        const trackingId = `PAR-${Date.now().toString().slice(-6)}`;
        
        const insuranceMessage = State.parcelInsuranceAdded
            ? ` Your parcel is insured for a declared value of ${State.currentCurrency.symbol}${State.parcelDeclaredValue.toFixed(2)}.`
            : '';
            
        const premiumTrackingMessage = State.parcelPremiumTrackingAdded
            ? ' Your premium live tracking is now active.'
            : '';

        if (confirmationTitle) {
            confirmationTitle.innerHTML = `
                <div class="confirmation-icon-wrapper">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                </div>
                <span>Shipment Confirmed!</span>
            `;
        }
        
        confirmationMessage.textContent = 'Your parcel has been booked. Details have been sent to your email.' + insuranceMessage + premiumTrackingMessage;
        trackingIdEl.textContent = trackingId;

        goToParcelStep(4);
    }, 1500);
}

function generateShippingLabelPdf() {
    if (!State.parcelOrigin || !State.parcelDestination || !State.parcelSelectedQuote) {
        showToast("Missing data to generate label.", "error");
        return;
    }
    const doc = new jsPDF();
    const trackingId = (document.getElementById('parcel-confirmation-tracking-id') as HTMLDivElement).textContent;

    doc.setFontSize(10);
    doc.text(`Carrier: ${State.parcelSelectedQuote.carrierName}`, 10, 10);
    
    doc.rect(5, 15, 100, 50);
    doc.setFontSize(8);
    doc.text('FROM:', 10, 20);
    doc.setFontSize(10);
    doc.text(State.parcelOrigin.name || '', 10, 25);
    doc.text(State.parcelOrigin.street || '', 10, 30);
    doc.text(`${State.parcelOrigin.city}, ${State.parcelOrigin.country}`, 10, 35);
    
    doc.rect(5, 70, 100, 50);
    doc.setFontSize(8);
    doc.text('TO:', 10, 75);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(State.parcelDestination.name || '', 10, 82);
    doc.text(State.parcelDestination.street || '', 10, 89);
    doc.text(`${State.parcelDestination.city}, ${State.parcelDestination.country}`, 10, 96);
    doc.setFont('helvetica', 'normal');

    // Mock barcode
    doc.setFont('Libre Barcode 39');
    doc.setFontSize(36);
    doc.text(`*${trackingId}*`, 105, 140, {align: 'center'});

    doc.save(`Shipping_Label_${trackingId}.pdf`);
}

function renderParcelPage() {
    const page = document.getElementById('page-parcel');
    if (!page) return;

    page.innerHTML = `
        <button class="back-btn">${t('parcel.back_to_services')}</button>
        <div class="service-page-header">
            <h2>${t('parcel.title')}</h2>
            <p id="parcel-main-subtitle" class="subtitle">${t('parcel.subtitle')}</p>
            <div id="progress-bar-parcel" data-steps="Details,Quote,Payment,Confirmation"></div>
        </div>

        <!-- Step 1: Details -->
        <div id="parcel-step-1" class="service-step">
             <form id="parcel-quote-form" class="form-container" novalidate>
                <div class="form-section">
                    <h3>${t('parcel.pickup_option')}</h3>
                    <div id="parcel-pickup-type-selector" class="service-type-selector" style="grid-template-columns: 1fr 1fr;">
                        <button type="button" class="service-type-btn" data-type="pickup">
                            <strong>${t('parcel.schedule_pickup')}</strong>
                            <span>${t('parcel.schedule_pickup_desc')}</span>
                        </button>
                        <button type="button" class="service-type-btn" data-type="dropoff">
                            <strong>${t('parcel.drop_off')}</strong>
                            <span>${t('parcel.drop_off_desc')}</span>
                        </button>
                    </div>
                </div>
                <div class="form-section two-column">
                    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
                        <div id="parcel-pickup-fields">
                            <h3>${t('parcel.origin')}</h3>
                            <div class="input-wrapper"><label for="origin-name">${t('parcel.full_name')}</label><input type="text" id="origin-name" required><p class="error-text hidden"></p></div>
                            <div class="input-wrapper"><label for="origin-street">${t('parcel.street_address')}</label><input type="text" id="origin-street" required><p class="error-text hidden"></p></div>
                            <div class="input-wrapper"><label for="origin-city">${t('parcel.city')}</label><input type="text" id="origin-city" required><p class="error-text hidden"></p></div>
                            <div class="input-wrapper"><label for="origin-postcode">${t('parcel.postcode')}</label><input type="text" id="origin-postcode" required><p class="error-text hidden" id="origin-postcode-error"></p></div>
                            <div class="input-wrapper"><label for="origin-country">${t('parcel.country')}</label><input type="text" id="origin-country" required><p class="error-text hidden"></p></div>
                        </div>
                        <div id="parcel-dropoff-fields" class="hidden">
                            <h3>Drop-off Location</h3>
                            <div class="input-wrapper">
                                <label for="parcel-dropoff-postcode">Your Postcode / City</label>
                                <input type="text" id="parcel-dropoff-postcode" placeholder="Enter postcode to find locations">
                                <p class="error-text hidden" id="parcel-dropoff-postcode-error"></p>
                                <p class="helper-text" id="geolocation-helper-text" style="margin-top: 0.5rem;"></p>
                            </div>
                            <button type="button" id="find-location-btn" class="secondary-btn" style="margin-top: 1rem;">Find Location</button>
                            <div class="selected-location-display" style="margin-top: 1.5rem;">
                                <p class="helper-text">No location selected.</p>
                            </div>
                        </div>
                        <div>
                            <h3>${t('parcel.package_details')}</h3>
                            <div class="form-grid" style="grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));">
                                <div class="input-wrapper"><label for="package-weight">${t('parcel.weight_kg')}</label><input type="number" id="package-weight" required min="0.1" step="0.1"><p class="error-text hidden"></p></div>
                                <div class="input-wrapper"><label for="package-length">${t('parcel.length_cm')}</label><input type="number" id="package-length" required min="1"><p class="error-text hidden"></p></div>
                                <div class="input-wrapper"><label for="package-width">${t('parcel.width_cm')}</label><input type="number" id="package-width" required min="1"><p class="error-text hidden"></p></div>
                                <div class="input-wrapper"><label for="package-height">${t('parcel.height_cm')}</label><input type="number" id="package-height" required min="1"><p class="error-text hidden"></p></div>
                            </div>
                            <div id="heavy-item-banner" class="info-banner hidden" style="margin-top: 1.5rem;">
                                <div class="info-banner-icon">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" /></svg>
                                </div>
                                <div class="info-banner-text">
                                    <h4>Heavy Item?</h4>
                                    <p>For items over 30kg, consider our LCL or Air Freight services for better value and handling.</p>
                                </div>
                            </div>
                        </div>
                        <div>
                            <h3>Optional Add-ons</h3>
                            <div class="checkbox-wrapper">
                                <input type="checkbox" id="parcel-insurance-checkbox">
                                <label for="parcel-insurance-checkbox">Add Parcel Insurance</label>
                            </div>
                            <div class="conditional-fields" id="parcel-insurance-fields">
                                <div class="input-wrapper">
                                    <label for="parcel-declared-value">Declared Value (${State.currentCurrency.symbol})</label>
                                    <input type="number" id="parcel-declared-value" min="1" step="0.01" placeholder="e.g., 500">
                                    <p class="helper-text" id="parcel-insurance-cost-display"></p>
                                    <p class="error-text hidden" id="parcel-declared-value-error"></p>
                                </div>
                            </div>
                        </div>
                        <div>
                            <h3>${t('parcel.item_details')}</h3>
                            <div class="input-wrapper"><label for="item-description">${t('parcel.description')}</label><textarea id="item-description" required placeholder="e.g., Men's Cotton T-Shirts"></textarea><p class="error-text hidden"></p></div>
                            <div class="hs-code-suggester-wrapper" style="margin-top: 1rem;">
                                <div class="input-wrapper">
                                    <label for="hs-code">${t('parcel.hs_code_optional')}</label>
                                    <input type="text" id="hs-code" autocomplete="off">
                                    <div class="hs-code-suggestions" id="parcel-hs-code-suggestions"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                     <div>
                        <h3>${t('parcel.destination')}</h3>
                        <div class="input-wrapper"><label for="dest-name">${t('parcel.full_name')}</label><input type="text" id="dest-name" required><p class="error-text hidden"></p></div>
                        <div class="input-wrapper"><label for="dest-street">${t('parcel.street_address')}</label><input type="text" id="dest-street" required><p class="error-text hidden"></p></div>
                        <div class="input-wrapper"><label for="dest-city">${t('parcel.city')}</label><input type="text" id="dest-city" required><p class="error-text hidden"></p></div>
                        <div class="input-wrapper"><label for="dest-postcode">${t('parcel.postcode')}</label><input type="text" id="dest-postcode" required><p class="error-text hidden" id="dest-postcode-error"></p></div>
                        <div class="input-wrapper"><label for="dest-country">${t('parcel.country')}</label><input type="text" id="dest-country" required><p class="error-text hidden"></p></div>
                    </div>
                </div>
                <div class="form-actions"><button type="submit" class="main-submit-btn">${t('parcel.get_quotes')}</button></div>
            </form>
        </div>

        <!-- Step 2: Quotes -->
        <div id="parcel-step-2" class="service-step">
            <div id="parcel-warnings-container"></div>
            <div class="results-layout-grid">
                <main id="parcel-quotes-container" class="results-main-content">
                    <div id="quotes-skeleton">
                        <div class="quote-card-skeleton"></div>
                        <div class="quote-card-skeleton"></div>
                        <div class="quote-card-skeleton"></div>
                    </div>
                </main>
                <aside id="parcel-sidebar-container" class="results-sidebar"></aside>
            </div>
            <div class="form-actions" style="justify-content: flex-start; margin-top: 2rem;">
                <button id="parcel-back-to-details" class="secondary-btn">Back to Details</button>
            </div>
        </div>
        
        <!-- Step 3: Payment -->
        <div id="parcel-step-3" class="service-step">
            <div class="payment-layout-grid">
                <div class="payment-form-container">
                    <h3>Payment Method</h3>
                    <div class="payment-method-selector">
                        <button class="payment-method-btn active" data-method="card"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M18.667 19.333H5.333a2 2 0 0 1-2-2V8.667a2 2 0 0 1 2-2h13.334a2 2 0 0 1 2 2v8.666a2 2 0 0 1-2 2ZM4.667 4.667h14.666v2H4.667v-2Z" /></svg> Card</button>
                        <button class="payment-method-btn" data-method="paypal"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M8.22 6.366c.216-1.12.936-1.74 2.376-1.74 1.32 0 2.22.6 2.448 1.68l.06.36c.12.66.564 1.02 1.296 1.02.6 0 1.116-.3 1.236-.9l.084-.36c.24-1.02 1.02-1.5 2.22-1.5 1.02 0 1.68.48 1.884 1.38.216 1-.228 2.22-.888 2.82-.6.54-1.38.84-2.352.84-.792 0-1.428-.276-1.884-.816-.12-.132-.156-.216-.252-.6l-.168-.72c-.12-.54-.516-.864-1.116-.864-.54 0-1.02.276-1.164.756l-.06.24c-.18.78-.732 1.236-1.5 1.236-.6 0-1.104-.24-1.452-.66-.432-.48-.636-1.14-.504-1.92Z M13.38 8.646c.12.48.54.84 1.08.84.54 0 .96-.3 1.08-.72l.06-.3c.18-.78.78-1.26 1.56-1.26.66 0 1.152.36 1.284.9.156.6-.108 1.32-.48 1.74-.42.42-.96.6-1.62.6-.9 0-1.632-.42-2.076-1.14l-.12-.24a.936.936 0 0 0-.816-.54c-.54 0-.96.3-1.08.72l-.18.72c-.24 1.02-1.02 1.56-2.16 1.56-1.26 0-2.1-.6-2.376-1.8-.12-.72.06-1.38.42-1.86.36-.42.9-.66 1.5-.66.84 0 1.5.42 1.884 1.14Z M2.333 9.406c.06-.24.12-.48.18-.72.6-2.34 2.52-3.6 5.1-3.6 1.56 0 2.88.6 3.54 1.74.72-1.2 2.1-1.98 3.84-1.98 2.46 0 4.26 1.32 4.8 3.48.3 1.14-.12 2.4-.84 3.3-.66.84-1.62 1.26-2.82 1.26-1.08 0-2.052-.36-2.76-1.14-.24-.24-.36-.48-.48-.72l-.18-.84c-.24-.96-1.02-1.56-2.04-1.56-1.02 0-1.8.6-2.04 1.56l-.12.54c-.24.9-1.02 1.44-1.98 1.44-1.56 0-2.82-.72-3.3-2.1-.24-.72-.24-1.44-.06-2.1Z"/></svg></button>
                        <button class="payment-method-btn" data-method="gpay"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M19.38 8.31a7.47 7.47 0 0 0-1.35-4.2 7.41 7.41 0 0 0-4.14-2.65h-3.8a7.44 7.44 0 0 0-5.87 3.06 7.53 7.53 0 0 0 .18 9.81 7.42 7.42 0 0 0 5.4 3.1h.29a7.43 7.43 0 0 0 5.61-2.91 7.35 7.35 0 0 0 2.6-5.18 7.41 7.41 0 0 0-.88-4.03Zm-8.46 8.35h3.45a4.12 4.12 0 0 0 4-4.22c0-2.29-1.84-4.16-4.1-4.16h-5.22l2.25 2.25h2.33a1.94 1.94 0 1 1 0 3.88h-1.2l-2.7 2.7.24.25a4.15 4.15 0 0 0 1 .3Z" /></svg></button>
                        <button class="payment-method-btn" data-method="applepay"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M17.2 12.15c.01-2.92 2.38-4.13 2.5-4.17-1.1-1.63-2.83-1.83-3.46-1.85-1.39-.12-2.73.8-3.46.8s-1.8-.86-3.2-.8c-1.63 0-3.2.92-4.13 2.44C3.99 11.58 5.1 15.3 6.38 17.26c.6.92 1.3 1.9 2.26 1.88.92 0 1.23-.6 2.69-.62 1.46 0 1.73.6 2.69.6.98.01 1.61-.9 2.18-1.8.7-1.1 1.12-2.27 1.15-2.32-.04-.02-2.31-.9-2.34-3.27ZM14.93 5.32c.63-.77 1.06-1.8.92-2.88-.89.07-1.92.67-2.58 1.44-.6.7-1.12 1.77-.96 2.77 1 .07 2.06-.54 2.62-1.33Z" /></svg></button>
                        <button class="payment-method-btn" data-method="alipay"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M15.4 22.398H8.6L3.8 3.598h16.4l-4.8 18.8zM14.2 1.598H9.8c-.8 0-1.4.6-1.4 1.4s.6 1.4 1.4 1.4h4.4c.8 0 1.4-.6 1.4-1.4s-.6-1.4-1.4-1.4zm3.9 9.2c.4-.2.6-.6.4-1-.2-.4-.6-.6-1-.4l-2.7 1.3c-.4.2-.6.6-.4 1s.6.6 1 .4l2.7-1.3z" /></svg></button>
                    </div>
                    <form id="parcel-payment-form">
                        <div class="input-wrapper"><label for="parcel-cardholder-name">Cardholder Name</label><input type="text" id="parcel-cardholder-name" required></div>
                        <div id="parcel-card-element" class="card-element-container"></div>
                        <div id="parcel-card-errors" role="alert" class="card-errors-container"></div>
                        <div class="security-badges">
                            <div class="badge-item"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" d="M12 1.5a5.25 5.25 0 0 0-5.25 5.25v3a3 3 0 0 0-3 3v6.75a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3v-6.75a3 3 0 0 0-3-3v-3c0-2.9-2.35-5.25-5.25-5.25Zm3.75 8.25v-3a3.75 3.75 0 1 0-7.5 0v3h7.5Z" clip-rule="evenodd" /></svg><span>Secure SSL</span></div>
                            <div class="badge-item"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" d="M12.516 2.17a.75.75 0 0 0-1.032 0L3.32 9.344a5.25 5.25 0 0 0-1.562 3.856v2.578c0 3.328 2.145 6.26 5.234 7.502a.75.75 0 0 0 .506 0c3.09-1.242 5.234-4.174 5.234-7.502v-2.578a5.25 5.25 0 0 0-1.562-3.856L12.516 2.17ZM11.25 10.5a.75.75 0 0 1 .75-.75h.008a.75.75 0 0 1 .75.75v.008a.75.75 0 0 1-.75.75h-.008a.75.75 0 0 1-.75-.75v-.008Zm.011 2.24a.75.75 0 0 1 .75-.75h.004a.75.75 0 0 1 .75.75v3.25a.75.75 0 0 1-1.5 0v-3.25Z" clip-rule="evenodd" /></svg><span>PCI Compliant</span></div>
                        </div>
                         <div class="form-actions" style="margin-top: 1rem;">
                            <button type="button" id="parcel-back-to-quotes" class="secondary-btn">Back to Quotes</button>
                            <button type="submit" class="main-submit-btn">Pay & Confirm</button>
                        </div>
                    </form>
                </div>
                <aside id="parcel-payment-summary" class="payment-summary-card">
                    <h4>Order Summary</h4>
                    <div id="parcel-payment-summary-details"></div>
                    <div class="payment-addons">
                        <div class="checkbox-wrapper">
                            <input type="checkbox" id="parcel-premium-tracking-checkbox">
                            <label for="parcel-premium-tracking-checkbox">Upgrade to Premium Live Tracking (+${State.currentCurrency.symbol}${State.parcelPremiumTrackingCost.toFixed(2)})</label>
                        </div>
                    </div>
                    <div id="parcel-payment-summary-total">
                         <div class="review-item total"><span>Total Due:</span> <strong id="parcel-total-due-display">...</strong></div>
                    </div>
                </aside>
            </div>
        </div>

        <!-- Step 4: Confirmation -->
        <div id="parcel-step-4" class="service-step">
            <div class="confirmation-container">
                <h3 id="parcel-confirmation-title"></h3><p id="parcel-confirmation-message"></p>
                <div class="confirmation-tracking">
                    <h4>Your Tracking ID</h4>
                    <div class="tracking-id-display" id="parcel-confirmation-tracking-id"></div>
                </div>
                <div class="confirmation-actions">
                     <button id="parcel-print-label-btn" class="secondary-btn">Print Label (PDF)</button>
                     <button id="parcel-new-shipment-btn" class="main-submit-btn">New Shipment</button>
                </div>
            </div>
        </div>
    `;
}

function calculateAndStoreInsurance() {
    const insuranceCheckbox = document.getElementById('parcel-insurance-checkbox') as HTMLInputElement;
    const declaredValueInput = document.getElementById('parcel-declared-value') as HTMLInputElement;
    const costDisplay = document.getElementById('parcel-insurance-cost-display');

    if (!insuranceCheckbox || !declaredValueInput || !costDisplay) return;

    if (!insuranceCheckbox.checked) {
        setState({
            parcelInsuranceAdded: false,
            parcelDeclaredValue: 0,
            parcelInsuranceCost: 0,
        });
        costDisplay.textContent = '';
        return;
    }

    const declaredValue = parseFloat(declaredValueInput.value) || 0;
    if (declaredValue <= 0) {
        setState({
            parcelInsuranceAdded: true, // It's checked, but value is 0
            parcelDeclaredValue: 0,
            parcelInsuranceCost: 0,
        });
        costDisplay.textContent = '';
        return;
    }

    const MIN_INSURANCE_PREMIUM = 5.00;
    const INSURANCE_RATE = 0.005; // 0.5%

    const calculatedPremium = declaredValue * INSURANCE_RATE;
    const finalPremium = Math.max(calculatedPremium, MIN_INSURANCE_PREMIUM);

    setState({
        parcelInsuranceAdded: true,
        parcelDeclaredValue: declaredValue,
        parcelInsuranceCost: finalPremium,
    });

    costDisplay.textContent = `Insurance cost: ${State.currentCurrency.symbol}${finalPremium.toFixed(2)}`;
}

export function initializeParcelService() {
    renderParcelPage();
    resetParcelState();
    goToParcelStep(1);
    handlePickupTypeChange('pickup');

    // Attach event listeners after rendering
    document.querySelector('#page-parcel .back-btn')?.addEventListener('click', () => switchPage('landing'));
    document.getElementById('parcel-quote-form')?.addEventListener('submit', handleDetailsFormSubmit);
    document.getElementById('package-weight')?.addEventListener('input', handleHeavyItemCheck);
    
    document.querySelectorAll('#parcel-pickup-type-selector .service-type-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const type = (e.currentTarget as HTMLElement).dataset.type as 'pickup' | 'dropoff';
            handlePickupTypeChange(type);
        });
    });

    document.getElementById('find-location-btn')?.addEventListener('click', openDropoffMapModal);

    const dropoffPostcodeEl = document.getElementById('parcel-dropoff-postcode') as HTMLInputElement;
    dropoffPostcodeEl?.addEventListener('blur', () => {
        const errorEl = document.getElementById('parcel-dropoff-postcode-error');
        if (!errorEl) return;

        const countryCodeEl = document.querySelector('#locale-country-button-content span:last-child');
        const currentCountryCode = countryCodeEl?.textContent?.trim().toUpperCase() || 'GB';

        if (currentCountryCode === 'GB' && dropoffPostcodeEl.value.trim() && !validateUkPostcode(dropoffPostcodeEl.value)) {
            errorEl.textContent = 'Please enter a valid UK postcode format (e.g., SW1A 0AA).';
            errorEl.classList.remove('hidden');
        } else {
            errorEl.classList.add('hidden');
        }
    });

    // Add blur validation for new postcode fields
    document.getElementById('origin-postcode')?.addEventListener('blur', () => handlePostcodeValidation('origin-postcode', 'origin-country', 'origin-postcode-error'));
    document.getElementById('dest-postcode')?.addEventListener('blur', () => handlePostcodeValidation('dest-postcode', 'dest-country', 'dest-postcode-error'));

    document.getElementById('parcel-back-to-details')?.addEventListener('click', () => goToParcelStep(1));
    document.getElementById('parcel-payment-form')?.addEventListener('submit', handlePaymentSubmit);
    document.getElementById('parcel-back-to-quotes')?.addEventListener('click', () => goToParcelStep(2));
    document.getElementById('parcel-new-shipment-btn')?.addEventListener('click', () => {
        resetParcelState();
        goToParcelStep(1);
        handlePickupTypeChange('pickup');
    });
    
    document.getElementById('parcel-print-label-btn')?.addEventListener('click', generateShippingLabelPdf);

    // Using event delegation for dynamically added quote cards
    const page = document.getElementById('page-parcel');
    page?.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.closest('.select-quote-btn')) {
            handleSelectQuote(e);
        } else if (target.closest('.view-breakdown-btn')) {
            handleViewBreakdown(e);
        }
    });

    // Insurance listeners
    const insuranceCheckbox = document.getElementById('parcel-insurance-checkbox') as HTMLInputElement;
    const insuranceFields = document.getElementById('parcel-insurance-fields');
    const declaredValueInput = document.getElementById('parcel-declared-value') as HTMLInputElement;
    
    insuranceCheckbox?.addEventListener('change', () => {
        insuranceFields?.classList.toggle('visible', insuranceCheckbox.checked);
        if (!insuranceCheckbox.checked) {
            declaredValueInput.value = '';
        }
        calculateAndStoreInsurance();
    });
    
    declaredValueInput?.addEventListener('input', calculateAndStoreInsurance);

    // Premium Tracking Listener
    const premiumTrackingCheckbox = document.getElementById('parcel-premium-tracking-checkbox') as HTMLInputElement;
    premiumTrackingCheckbox?.addEventListener('change', () => {
        const isChecked = premiumTrackingCheckbox.checked;
        setState({ parcelPremiumTrackingAdded: isChecked });
        updateParcelPaymentSummary();
    });

    // HS Code Suggester Logic
    let hsCodeSearchTimeout: number | null = null;
    const descriptionInput = document.getElementById('item-description') as HTMLInputElement;
    const hsCodeInput = document.getElementById('hs-code') as HTMLInputElement;
    const suggestionsContainer = document.getElementById('parcel-hs-code-suggestions');

    descriptionInput?.addEventListener('input', () => {
        const query = descriptionInput.value.trim();
        if (hsCodeSearchTimeout) clearTimeout(hsCodeSearchTimeout);
        if (query.length < 5 || !suggestionsContainer) {
            suggestionsContainer?.classList.remove('active');
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
                suggestionsContainer.classList.remove('active');
            }
        }, 500);
    });

    suggestionsContainer?.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const item = target.closest<HTMLElement>('.hs-code-suggestion-item');
        if (item && item.dataset.code && hsCodeInput) {
            hsCodeInput.value = item.dataset.code;
            suggestionsContainer.classList.remove('active');
        }
    });

    // Hide suggestions when clicking outside
    document.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (!target.closest('.hs-code-suggester-wrapper')) {
            suggestionsContainer?.classList.remove('active');
        }
    });
}

export const startParcel = () => {
    setState({ currentService: 'parcel' });
    initializeParcelService();
    switchPage('parcel');
};