// ⚠️  READ-ONLY — DO NOT EDIT — SERVICE LOCKED ⚠️
import { DOMElements } from './dom';
import { State, setState } from './state';
import { showToast, switchPage, updateProgressBar, toggleLoading } from './ui';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

let stripe: any; 
let cardElement: any;

export function initializeStripeElements(elementId: string, errorElementId: string) {
    if (!stripe) {
        // IMPORTANT: Replace with your actual publishable key in a real environment.
        // Using a placeholder to avoid exposing a real key.
        const stripePublishableKey = 'pk_test_YOUR_PUBLISHABLE_KEY';
        if (stripePublishableKey.includes('YOUR_PUBLISHABLE_KEY')) {
            console.warn("Stripe is using a placeholder key. Please replace it with your actual publishable key.");
        }
        stripe = (window as any).Stripe(stripePublishableKey);
    }
    if (!stripe) return; // Guard if Stripe fails to load

    const elements = stripe.elements();
    const style = {
        base: {
            color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#E2E8F0' : '#334155',
            fontFamily: '"Inter", sans-serif',
            fontSize: '16px',
        },
    };

    cardElement = elements.create('card', { style });

    const cardContainer = document.getElementById(elementId);
    if (cardContainer) {
        while (cardContainer.firstChild) cardContainer.removeChild(cardContainer.firstChild);
        cardElement.mount(cardContainer);
    }
    
    cardElement.on('change', (event: any) => {
        const displayError = document.getElementById(errorElementId);
        if (displayError) {
            displayError.textContent = event.error ? event.error.message : '';
        }
    });
}

function populatePaymentPage() {
    if (!State.paymentContext) {
        showToast("No shipment selected. Please start a new quote.", "error");
        switchPage('landing');
        return;
    }
    const { quote, shipmentId, origin, destination } = State.paymentContext;
    DOMElements.paymentPage.overview.innerHTML = `
        <div class="review-item"><span>Shipment ID:</span> <strong>#${shipmentId}</strong></div>
        <div class="review-item"><span>Route:</span> <strong>${origin} &rarr; ${destination}</strong></div>
        <div class="review-item total"><span>Amount Due:</span> <strong>${State.currentCurrency.symbol}${quote.totalCost.toFixed(2)}</strong></div>
    `;

    initializeStripeElements('card-element', 'card-errors');
}

function handlePaymentSuccess() {
    toggleLoading(false);
    if (!State.paymentContext) return;

    const { shipmentId, origin, destination } = State.paymentContext;

    DOMElements.confirmationPage.title.textContent = `✅ Shipment #${shipmentId} is Confirmed!`;
    DOMElements.confirmationPage.message.textContent = `Your shipment from ${origin} to ${destination} has been successfully booked.`;
    (document.getElementById('confirmation-tracking-id') as HTMLDivElement).textContent = shipmentId;
    
    switchPage('confirmation');
}

function generateConfirmationPDF() {
    if (!State.paymentContext) return;

    const doc = new jsPDF();
    const { quote, shipmentId } = State.paymentContext;
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
    doc.text('Shipment Confirmation', 105, 45, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`ID: ${shipmentId}`, 105, 52, { align: 'center' });

    autoTable(doc, {
        startY: 60,
        head: [['Cost Details', 'Amount']],
        body: [
            ['Base Shipping', `${State.currentCurrency.symbol}${quote.costBreakdown.baseShippingCost.toFixed(2)}`],
            ['Surcharges', `${State.currentCurrency.symbol}${quote.costBreakdown.fuelSurcharge.toFixed(2)}`],
            ['Fees & Taxes', `${State.currentCurrency.symbol}${quote.costBreakdown.estimatedCustomsAndTaxes.toFixed(2)}`],
            [{ content: 'Total Paid', styles: { fontStyle: 'bold' } }, { content: `${State.currentCurrency.symbol}${quote.totalCost.toFixed(2)}`, styles: { fontStyle: 'bold' } }]
        ],
        theme: 'striped', headStyles,
    });

    doc.save(`Vcanship_Confirmation_${shipmentId}.pdf`);
}

async function handlePaymentFormSubmit(e: Event) {
    e.preventDefault();
    toggleLoading(true, "Processing payment...");
    // Mock payment success
    setTimeout(handlePaymentSuccess, 1500);
}

function handlePaymentBack() {
    switchPage('results');
    updateProgressBar('results', 1);
}

export function initializePaymentPage() {
    // This generic page is now deprecated in favor of service-specific payment steps.
    // The event listeners are handled within each service module.
    const form = DOMElements.paymentPage.form;
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            showToast("Please use a specific service to make a payment.", "info");
        });
    }

    // Still need the confirmation page listeners
    DOMElements.confirmationPage.newShipmentBtn.addEventListener('click', () => switchPage('landing'));
    DOMElements.confirmationPage.pdfBtn.addEventListener('click', generateConfirmationPDF);

    const trackBtn = document.getElementById('confirmation-track-shipment-btn');
    trackBtn?.addEventListener('click', () => {
        if (State.paymentContext?.shipmentId) {
            DOMElements.trackingIdInput.value = State.paymentContext.shipmentId;
            DOMElements.trackBtn.click();
            DOMElements.trackingForm.dispatchEvent(new Event('submit'));
        }
    });
    
    const paymentPageElement = document.getElementById('page-payment');
    if (paymentPageElement) {
        new MutationObserver((mutations) => {
            if (mutations.some(m => (m.target as HTMLElement).classList.contains('active'))) {
                // Do not auto-populate, as this page is now a fallback.
            }
        }).observe(paymentPageElement, { attributes: true, attributeFilter: ['class'] });
    }
}
