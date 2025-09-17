// ⚠️  READ-ONLY — DO NOT EDIT — SERVICE LOCKED ⚠️
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { State, setState, resetTradeFinanceState, TradeFinanceAssessment } from './state';
import { switchPage, showToast, updateProgressBar, toggleLoading } from './ui';
import { DOMElements } from './dom';
import { Type } from '@google/genai';


// --- RENDER FUNCTION ---

function renderRegisterPage() {
    const page = DOMElements.register.page;
    if (!page) return;

    page.innerHTML = `
        <button class="back-btn">Back to Services</button>
        <div class="service-page-header">
            <h2>Trade Finance Application</h2>
            <p class="subtitle">Unlock capital and manage risk with our integrated solutions.</p>
            <div id="progress-bar-register" data-steps="Service,Details,Assessment,Review,Confirmation"></div>
        </div>

        <!-- Step 1: Select Service -->
        <div id="tf-step-service" class="service-step">
            <div class="form-container">
                <h3>Select a Financial Product</h3>
                <div id="tf-service-selector" class="service-type-selector">
                    <button type="button" class="service-type-btn" data-service="invoice-financing">
                        <strong>Invoice Financing</strong>
                        <span>Get cash advances on your unpaid invoices.</span>
                    </button>
                    <button type="button" class="service-type-btn" data-service="po-financing">
                        <strong>Purchase Order Financing</strong>
                        <span>Fund your suppliers to fulfill large orders.</span>
                    </button>
                    <button type="button" class="service-type-btn" data-service="escrow">
                        <strong>Escrow Services</strong>
                        <span>Secure high-value transactions with a neutral third party.</span>
                    </button>
                </div>
            </div>
        </div>

        <!-- Step 2: Application Details -->
        <div id="tf-step-details" class="service-step">
            <form id="tf-details-form" class="form-container">
                <div class="form-section">
                    <h3>Your Company Details</h3>
                    <div class="input-wrapper"><label for="tf-company-name">Company Name</label><input type="text" id="tf-company-name" required></div>
                    <div class="input-wrapper"><label for="tf-company-country">Country of Operation</label><input type="text" id="tf-company-country" required></div>
                </div>
                <div class="form-section">
                    <h3 id="tf-dynamic-form-title">Financing Details</h3>
                    <div class="input-wrapper"><label for="tf-amount">Amount Required (${State.currentCurrency.code})</label><input type="number" id="tf-amount" required min="1000"></div>
                    <div class="input-wrapper"><label for="tf-tenor">Tenor (Days)</label><input type="number" id="tf-tenor" required min="30" max="180" placeholder="e.g., 90"></div>
                    <div id="tf-invoice-fields" class="hidden tf-dynamic-fields">
                        <div class="input-wrapper"><label for="tf-invoice-value">Total Invoice Value</label><input type="number" id="tf-invoice-value" min="1000"></div>
                    </div>
                    <div id="tf-po-fields" class="hidden tf-dynamic-fields">
                        <div class="input-wrapper"><label for="tf-po-value">Total Purchase Order Value</label><input type="number" id="tf-po-value" min="1000"></div>
                    </div>
                     <div id="tf-escrow-fields" class="hidden tf-dynamic-fields">
                        <div class="input-wrapper"><label for="tf-transaction-desc">Brief Transaction Description</label><textarea id="tf-transaction-desc"></textarea></div>
                    </div>
                </div>
                <div class="form-actions">
                    <button type="button" id="tf-back-to-service-btn" class="secondary-btn">Back</button>
                    <button type="submit" id="tf-to-assessment-btn" class="main-submit-btn">Get AI Assessment</button>
                </div>
            </form>
        </div>

        <!-- Step 3: AI Assessment -->
        <div id="tf-step-assessment" class="service-step">
            <div class="form-container">
                <div id="tf-assessment-result">
                     <div class="loading-spinner"></div>
                     <p class="helper-text" style="text-align: center; margin-top: 1rem;">Our AI underwriter is analyzing your application...</p>
                </div>
                <div class="form-actions">
                    <button type="button" id="tf-back-to-details-btn" class="secondary-btn">Back</button>
                    <button type="button" id="tf-to-review-btn" class="main-submit-btn hidden">Proceed to Review</button>
                </div>
            </div>
        </div>
        
        <!-- Step 4: Review -->
        <div id="tf-step-review" class="service-step">
             <div class="form-container">
                <h3>Review Your Application</h3>
                <div id="tf-review-details" class="payment-overview"></div>
                <div class="form-actions">
                    <button type="button" id="tf-back-to-assessment-btn" class="secondary-btn">Back</button>
                    <button type="button" id="tf-to-confirmation-btn" class="main-submit-btn">Submit Application</button>
                </div>
            </div>
        </div>

        <!-- Step 5: Confirmation -->
        <div id="tf-step-confirmation" class="service-step">
            <div class="confirmation-container">
                <h3>Application Submitted!</h3>
                <p>Your application has been received. Our team will be in touch within 24 hours.</p>
                <div class="confirmation-tracking">
                    <h4>Your Application ID</h4>
                    <div class="tracking-id-display" id="tf-confirmation-id"></div>
                </div>
                <div class="confirmation-actions">
                    <button id="tf-download-pdf-btn" class="secondary-btn">Download PDF Summary</button>
                    <button id="tf-new-application-btn" class="main-submit-btn">New Application</button>
                </div>
            </div>
        </div>
    `;

    page.querySelector('.back-btn')?.addEventListener('click', () => switchPage('landing'));
}

// --- WIZARD NAVIGATION & STATE ---
function goToTradeFinanceStep(step: number) {
    setState({ currentTradeFinanceStep: step });
    const stepIds = ['service', 'details', 'assessment', 'review', 'confirmation'];
    document.querySelectorAll('#page-register .service-step').forEach(s => s.classList.remove('active'));
    const stepEl = DOMElements.register.steps[stepIds[step - 1] as keyof typeof DOMElements.register.steps];
    if (stepEl) stepEl.classList.add('active');
    updateProgressBar('register', step - 1);
}

// --- STEP 1: SERVICE SELECTION ---
function handleServiceSelect(e: Event) {
    const target = e.target as HTMLElement;
    const btn = target.closest<HTMLButtonElement>('.service-type-btn');
    if (!btn || !btn.dataset.service) return;

    const service = btn.dataset.service;
    setState({ tradeFinanceService: service });

    const dynamicTitle = document.getElementById('tf-dynamic-form-title') as HTMLHeadingElement;
    document.querySelectorAll('.tf-dynamic-fields').forEach(el => el.classList.add('hidden'));

    if (service === 'invoice-financing') {
        dynamicTitle.textContent = 'Invoice Details';
        document.getElementById('tf-invoice-fields')?.classList.remove('hidden');
    } else if (service === 'po-financing') {
        dynamicTitle.textContent = 'Purchase Order Details';
        document.getElementById('tf-po-fields')?.classList.remove('hidden');
    } else if (service === 'escrow') {
        dynamicTitle.textContent = 'Escrow Details';
        document.getElementById('tf-escrow-fields')?.classList.remove('hidden');
    }

    goToTradeFinanceStep(2);
}

// --- STEP 2: DETAILS FORM ---
function handleDetailsSubmit(e: Event) {
    e.preventDefault();
    const service = State.tradeFinanceService;
    const applicationData = {
        companyName: (document.getElementById('tf-company-name') as HTMLInputElement).value,
        country: (document.getElementById('tf-company-country') as HTMLInputElement).value,
        amount: (document.getElementById('tf-amount') as HTMLInputElement).value,
        tenor: (document.getElementById('tf-tenor') as HTMLInputElement).value,
        service,
        ...(service === 'invoice-financing' && { invoiceValue: (document.getElementById('tf-invoice-value') as HTMLInputElement).value }),
        ...(service === 'po-financing' && { poValue: (document.getElementById('tf-po-value') as HTMLInputElement).value }),
        ...(service === 'escrow' && { transactionDesc: (document.getElementById('tf-transaction-desc') as HTMLTextAreaElement).value }),
    };

    setState({ tradeFinanceApplicationData: applicationData });
    runAIAssessment();
    goToTradeFinanceStep(3);
}

// --- STEP 3: AI ASSESSMENT ---
async function runAIAssessment() {
    if (!State.api) {
        showToast("AI service is unavailable. Using mock assessment.", "warning");
        const mockAssessment: TradeFinanceAssessment = {
            riskLevel: 'Low',
            preliminaryOffer: 'Advance rate up to 85% at a discount rate of 1.2% per 30 days.',
            requiredDocuments: ['Commercial Invoice', 'Bill of Lading', 'Company Registration Document']
        };
        setState({ tradeFinanceAssessment: mockAssessment });
        renderAIAssessment(mockAssessment);
        return;
    }
    toggleLoading(true, "AI Underwriter is analyzing your application...");

    const prompt = `
        Act as an AI trade finance underwriter. Based on the following application data, provide a preliminary risk assessment.
        Data: ${JSON.stringify(State.tradeFinanceApplicationData)}
        Respond with a JSON object containing:
        1. "riskLevel": A string, either "Low", "Medium", or "High".
        2. "preliminaryOffer": A concise string summarizing a potential offer (e.g., "Advance rate up to 85% at a discount rate of 1.2% per 30 days.").
        3. "requiredDocuments": An array of strings listing typical documents needed for this type of financing (e.g., ["Commercial Invoice", "Bill of Lading"]).
    `;

    const schema = {
        type: Type.OBJECT,
        properties: {
            riskLevel: { type: Type.STRING, enum: ['Low', 'Medium', 'High'] },
            preliminaryOffer: { type: Type.STRING },
            requiredDocuments: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ['riskLevel', 'preliminaryOffer', 'requiredDocuments']
    };

    try {
        const response = await State.api.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: schema,
            }
        });

        const assessment = JSON.parse(response.text) as TradeFinanceAssessment;
        setState({ tradeFinanceAssessment: assessment });
        renderAIAssessment(assessment);
    } catch (error) {
        console.error("AI Assessment Error:", error);
        showToast("AI assessment failed. Please try again.", "error");
        DOMElements.register.nav.backToDetails.click();
    } finally {
        toggleLoading(false);
    }
}

function renderAIAssessment(assessment: TradeFinanceAssessment) {
    const resultEl = DOMElements.register.assessmentResult;
    const proceedBtn = DOMElements.register.nav.toReview;
    if (!resultEl || !proceedBtn) return;

    const riskLevelClass = assessment.riskLevel.toLowerCase();

    resultEl.innerHTML = `
        <div class="ai-assessment-container">
            <h3>Preliminary AI Assessment</h3>
            <div class="risk-meter-container">
                <div class="risk-meter-label">Risk Level: <span class="risk-level-${riskLevelClass}">${assessment.riskLevel}</span></div>
                <div class="risk-meter-bar">
                    <div class="risk-meter-fill risk-level-${riskLevelClass}"></div>
                </div>
            </div>
            <div class="assessment-section">
                <h4>Preliminary Offer</h4>
                <p>${assessment.preliminaryOffer}</p>
            </div>
            <div class="assessment-section">
                <h4>Next Steps: Required Documents</h4>
                <ul class="required-docs-list">
                    ${assessment.requiredDocuments.map(doc => `<li>${doc}</li>`).join('')}
                </ul>
            </div>
        </div>
    `;
    proceedBtn.classList.remove('hidden');
}


// --- STEP 4: REVIEW ---
function renderReviewStep() {
    const reviewEl = DOMElements.register.reviewDetails;
    const { tradeFinanceApplicationData: data, tradeFinanceAssessment: assessment } = State;
    if (!reviewEl || !data || !assessment) return;

    let detailsHtml = `
        <div class="review-item"><span>Service:</span><strong>${data.service.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</strong></div>
        <div class="review-item"><span>Company:</span><strong>${data.companyName}, ${data.country}</strong></div>
        <div class="review-item"><span>Amount:</span><strong>${State.currentCurrency.symbol}${data.amount}</strong></div>
        <div class="review-item"><span>Tenor:</span><strong>${data.tenor} Days</strong></div>
    `;
    if(data.invoiceValue) detailsHtml += `<div class="review-item"><span>Invoice Value:</span><strong>${State.currentCurrency.symbol}${data.invoiceValue}</strong></div>`;
    if(data.poValue) detailsHtml += `<div class="review-item"><span>PO Value:</span><strong>${State.currentCurrency.symbol}${data.poValue}</strong></div>`;
    
    reviewEl.innerHTML = `
        ${detailsHtml}
        <hr>
        <div class="review-item"><span>AI Risk Assessment:</span><strong>${assessment.riskLevel}</strong></div>
        <div class="review-item"><span>Preliminary Offer:</span><strong>${assessment.preliminaryOffer}</strong></div>
    `;
    goToTradeFinanceStep(4);
}

// --- STEP 5: CONFIRMATION & PDF ---
function handleConfirmation() {
    const appId = `TF-${Date.now().toString().slice(-7)}`;
    DOMElements.register.confirmationId.textContent = appId;
    goToTradeFinanceStep(5);
}

function generateApplicationPdf() {
    const { tradeFinanceApplicationData: data, tradeFinanceAssessment: assessment } = State;
    if (!data || !assessment) return;

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Trade Finance Application Summary', 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Application ID: ${DOMElements.register.confirmationId.textContent}`, 105, 27, { align: 'center' });

    autoTable(doc, {
        startY: 35,
        head: [['Application Details', '']],
        body: [
            ['Service', data.service.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())],
            ['Company', `${data.companyName}, ${data.country}`],
            ['Amount Required', `${State.currentCurrency.symbol}${data.amount}`],
            ['Tenor', `${data.tenor} Days`],
             ...(data.invoiceValue ? [['Invoice Value', `${State.currentCurrency.symbol}${data.invoiceValue}`]] : []),
             ...(data.poValue ? [['Purchase Order Value', `${State.currentCurrency.symbol}${data.poValue}`]] : []),
             ...(data.transactionDesc ? [['Description', data.transactionDesc]] : []),
        ],
    });

    autoTable(doc, {
        // @ts-ignore
        startY: doc.lastAutoTable.finalY + 10,
        head: [['AI Preliminary Assessment', '']],
        body: [
            ['Risk Level', assessment.riskLevel],
            ['Preliminary Offer', assessment.preliminaryOffer],
            ['Required Documents', assessment.requiredDocuments.join(', ')],
        ]
    });

    doc.save(`TradeFinance_Application_${DOMElements.register.confirmationId.textContent}.pdf`);
}

// --- INITIALIZATION ---
function attachRegisterEventListeners() {
    DOMElements.register.serviceSelector.addEventListener('click', handleServiceSelect);
    DOMElements.register.detailsForm.addEventListener('submit', handleDetailsSubmit);

    // Navigation
    DOMElements.register.nav.backToService.addEventListener('click', () => goToTradeFinanceStep(1));
    DOMElements.register.nav.backToDetails.addEventListener('click', () => goToTradeFinanceStep(2));
    DOMElements.register.nav.toReview.addEventListener('click', renderReviewStep);
    DOMElements.register.nav.backToAssessment.addEventListener('click', () => goToTradeFinanceStep(3));
    DOMElements.register.nav.toConfirmation.addEventListener('click', handleConfirmation);
    DOMElements.register.nav.newApplication.addEventListener('click', () => {
        resetTradeFinanceState();
        goToTradeFinanceStep(1);
    });
    DOMElements.register.nav.downloadPdf.addEventListener('click', generateApplicationPdf);
}

export const startRegister = () => {
    setState({ currentService: 'register' });
    renderRegisterPage();
    switchPage('register');
    resetTradeFinanceState();
    attachRegisterEventListeners();
    goToTradeFinanceStep(1);
};