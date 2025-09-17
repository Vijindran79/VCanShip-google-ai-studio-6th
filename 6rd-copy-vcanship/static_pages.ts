// ⚠️  READ-ONLY — DO NOT EDIT — SERVICE LOCKED ⚠️
import { DOMElements } from './dom';
import { t } from './i18n';

function renderLandingPage() {
    const page = DOMElements.pageLanding;
    if (!page) return;

    page.innerHTML = `
        <div class="landing-grid">
            <!-- Parcel Hero -->
            <div class="landing-card landing-hero-card" data-service="parcel">
                <h2>${t('landing.parcel_title')}</h2>
                <p>${t('landing.parcel_subtitle')}</p>
                <button class="cta-btn">${t('landing.parcel_cta')}</button>
            </div>

            <!-- Core Freight Services -->
            <div class="landing-card landing-service-card" data-service="airfreight">
                <h3>${t('landing.air_freight_title')}</h3>
                <button class="secondary-btn cta-btn">${t('landing.air_freight_cta')}</button>
            </div>
            <div class="landing-card landing-service-card" data-service="fcl">
                <h3>${t('landing.fcl_title')}</h3>
                <button class="secondary-btn cta-btn">${t('landing.fcl_cta')}</button>
            </div>
            <div class="landing-card landing-service-card" data-service="lcl">
                <h3>${t('landing.lcl_title')}</h3>
                <button class="secondary-btn cta-btn">${t('landing.lcl_cta')}</button>
            </div>

            <!-- E-commerce Promo -->
            <div class="landing-card landing-promo-card" data-service="ecommerce">
                <h3>${t('landing.ecommerce_title')}</h3>
                <p>${t('landing.ecommerce_subtitle')}</p>
                <button class="cta-btn">${t('landing.ecommerce_cta')}</button>
            </div>

            <!-- Partner Promo -->
            <div class="landing-card landing-promo-card" data-service="service-provider-register">
                <h3>${t('landing.partner_title')}</h3>
                <p>${t('landing.partner_subtitle')}</p>
                <button class="cta-btn">${t('landing.partner_cta')}</button>
            </div>
        </div>
    `;
}


function renderHelpPage() {
    const page = DOMElements.pageHelp;
    if (!page) return;

    page.innerHTML = `
         <div class="static-page-container">
            <h2>Help Center</h2>
            <p>Welcome to the Vcanship Help Center. Find answers to common questions below or contact our support team.</p>
            
            <h3>Frequently Asked Questions</h3>
            <div class="faq-list">
                <div class="faq-item">
                    <div class="faq-question">How do I track my shipment?</div>
                    <div class="faq-answer"><p>You can track any shipment using the "Track" button in the header. Simply enter your tracking ID (e.g., FCL-12345) to see the latest updates on your shipment's location and status.</p></div>
                </div>
                 <div class="faq-item">
                    <div class="faq-question">What is a HS Code?</div>
                    <div class="faq-answer"><p>A Harmonized System (HS) Code is a standardized international system to classify globally traded products. It's crucial for customs declarations. Our AI-powered "Suggest HS Code" feature can help you find the right one based on your item description.</p></div>
                </div>
                 <div class="faq-item">
                    <div class="faq-question">What payment methods do you accept?</div>
                    <div class="faq-answer"><p>We accept all major credit and debit cards, including Visa, Mastercard, and American Express, processed securely through our payment provider.</p></div>
                </div>
            </div>

             <h3>Contact Support</h3>
             <p>If you can't find the answer you're looking for, please email us at <a href="mailto:support@vcanresources.com">support@vcanresources.com</a>.</p>
        </div>
    `;
    
    page.querySelectorAll('.faq-question').forEach(q => {
        q.addEventListener('click', () => {
            q.parentElement?.classList.toggle('active');
        });
    });
}

function renderApiHubPage() {
     const page = DOMElements.pageApiHub;
     if (!page) return;

     page.innerHTML = `
        <div class="static-page-container">
            <h2>Vcanship API Hub</h2>
            <p>Integrate our powerful logistics network directly into your applications. Get instant quotes, book shipments, and track packages programmatically.</p>
            
            <h3>Get an Instant Quote</h3>
            <p>Here's an example of how to get a shipping quote using our REST API:</p>
            <pre><code>
fetch('https://api.vcanship.com/v1/quotes', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    origin: { country: 'US', postcode: '90210' },
    destination: { country: 'GB', postcode: 'SW1A 0AA' },
    package: { weight_kg: 5, length_cm: 30, width_cm: 20, height_cm: 15 }
  })
})
.then(res => res.json())
.then(data => console.log(data.quotes));
            </code></pre>

            <h3>Get Started</h3>
            <p>To get your API key and access our full documentation, please contact our sales team at <a href="mailto:sales@vcanresources.com">sales@vcanresources.com</a>.</p>
        </div>
     `;
}

function renderPrivacyPage() {
    const page = DOMElements.pagePrivacy;
    if (!page) return;
    page.innerHTML = `<div class="static-page-container"><h2>Privacy Policy</h2><p>Your privacy is important to us. At Vcanship, we are committed to protecting your personal data and respecting your privacy rights. This policy outlines how we collect, use, and safeguard your information when you use our services.</p><h3>Information We Collect</h3><p>We collect information you provide directly to us, such as when you create an account, request a quote, or contact customer support. This may include your name, email, phone number, and address details for shipment purposes.</p><h3>How We Use Your Information</h3><p>We use your information to provide and improve our services, process transactions, communicate with you, and for security purposes. We do not sell your personal data to third parties.</p></div>`;
}

function renderTermsPage() {
    const page = DOMElements.pageTerms;
    if (!page) return;
    page.innerHTML = `<div class="static-page-container"><h2>Terms of Service</h2><p>By using the Vcanship platform, you agree to these Terms of Service. Please read them carefully.</p><h3>User Responsibilities</h3><p>You are responsible for providing accurate and complete information for all shipments. You must ensure that your shipments do not contain any prohibited items according to international and local regulations.</p><h3>Limitation of Liability</h3><p>Vcanship's liability for any loss or damage to a shipment is limited. We strongly recommend purchasing additional insurance for high-value items.</p></div>`;
}


export function initializeStaticPages() {
    // Initial render of landing page content
    renderLandingPage();

    // Use MutationObservers to render content when a static page becomes active
    const pageObservers = [
        { el: DOMElements.pageLanding, renderFn: renderLandingPage },
        { el: DOMElements.pageHelp, renderFn: renderHelpPage },
        { el: DOMElements.pageApiHub, renderFn: renderApiHubPage },
        { el: DOMElements.pagePrivacy, renderFn: renderPrivacyPage },
        { el: DOMElements.pageTerms, renderFn: renderTermsPage },
    ];
    
    pageObservers.forEach(({ el, renderFn }) => {
        if (el) {
            const observer = new MutationObserver((mutations) => {
                if (mutations.some(m => m.attributeName === 'class' && (m.target as HTMLElement).classList.contains('active'))) {
                   renderFn();
                }
            });
            observer.observe(el, { attributes: true });
        }
    });
}