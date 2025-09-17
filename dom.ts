// ⚠️  READ-ONLY — DO NOT EDIT — SERVICE LOCKED ⚠️
// --- DOM Elements ---
// This helper object uses getters to query DOM elements on-demand,
// ensuring they are always fresh and not cached as null.
export const DOMElements = {
    // General
    get loadingOverlay() { return document.getElementById('loading-overlay') as HTMLDivElement; },
    get toastContainer() { return document.getElementById('toast-container') as HTMLDivElement; },
    get pageContainer() { return document.getElementById('page-container') as HTMLElement; },
    get themeToggle() { return document.getElementById('theme-toggle') as HTMLInputElement; },
    get serviceCards() { return document.querySelectorAll('.service-card') as NodeListOf<HTMLDivElement>; },
    get logoutBtn() { return document.getElementById('logout-btn') as HTMLAnchorElement; },

    // Pages
    get pageLanding() { return document.getElementById('page-landing') as HTMLDivElement; },
    get pageDashboard() { return document.getElementById('page-dashboard') as HTMLDivElement; },
    get pageAddressBook() { return document.getElementById('page-address-book') as HTMLDivElement; },
    get pageSettings() { return document.getElementById('page-settings') as HTMLDivElement; },
    get pageHelp() { return document.getElementById('page-help') as HTMLDivElement; },
    get pageApiHub() { return document.getElementById('page-api-hub') as HTMLDivElement; },
    get pagePrivacy() { return document.getElementById('page-privacy') as HTMLDivElement; },
    get pageTerms() { return document.getElementById('page-terms') as HTMLDivElement; },
    
    // Authentication
    get authModal() { return document.getElementById('auth-modal') as HTMLDivElement; },
    get closeAuthModalBtn() { return document.getElementById('close-auth-modal-btn') as HTMLButtonElement; },
    get loginBtn() { return document.getElementById('login-btn') as HTMLButtonElement; },
    get myAccountDropdown() { return document.getElementById('my-account-dropdown') as HTMLDivElement; },
    get myAccountBtn() { return document.getElementById('my-account-btn') as HTMLButtonElement; },
    get loginView() { return document.getElementById('login-view') as HTMLDivElement; },
    get signupView() { return document.getElementById('signup-view') as HTMLDivElement; },
    get loginForm() { return document.getElementById('login-form') as HTMLFormElement; },
    get signupForm() { return document.getElementById('signup-form') as HTMLFormElement; },
    get loginEmail() { return document.getElementById('login-email') as HTMLInputElement; },
    get signupName() { return document.getElementById('signup-name') as HTMLInputElement; },
    get signupEmail() { return document.getElementById('signup-email') as HTMLInputElement; },
    get showSignupBtn() { return document.getElementById('show-signup-btn') as HTMLButtonElement; },
    get showLoginBtn() { return document.getElementById('show-login-btn') as HTMLButtonElement; },
    get loginToggleText() { return document.getElementById('login-toggle-text') as HTMLSpanElement; },
    get signupToggleText() { return document.getElementById('signup-toggle-text') as HTMLSpanElement; },
    get googleLoginBtn() { return document.querySelector('.google-btn') as HTMLButtonElement; },
    get appleLoginBtn() { return document.querySelector('.apple-btn') as HTMLButtonElement; },

    // Tracking
    get trackBtn() { return document.getElementById('track-btn') as HTMLButtonElement; },
    get trackingModal() { return document.getElementById('tracking-modal') as HTMLDivElement; },
    get closeTrackingModalBtn() { return document.getElementById('close-tracking-modal-btn') as HTMLButtonElement; },
    get trackingForm() { return document.getElementById('tracking-form') as HTMLFormElement; },
    get trackingIdInput() { return document.getElementById('tracking-id-input') as HTMLInputElement; },
    get trackingResultsContainer() { return document.getElementById('tracking-results-container') as HTMLDivElement; },

    // Inspector
    get complianceBtn() { return document.getElementById('compliance-btn') as HTMLButtonElement; },
    get inspectorModal() { return document.getElementById('inspector-modal') as HTMLDivElement; },
    get closeInspectorModalBtn() { return document.getElementById('close-inspector-modal-btn') as HTMLButtonElement; },

    // Generic Payment & Confirmation
    get paymentPage() {
        return {
            get form() { return document.getElementById('payment-page-form') as HTMLFormElement; },
            get overview() { return document.getElementById('payment-page-overview') as HTMLDivElement; },
            get cardholderName() { return document.getElementById('payment-page-cardholder-name') as HTMLInputElement; },
            get backBtn() { return document.getElementById('payment-back-btn') as HTMLButtonElement; },
        };
    },
    get confirmationPage() {
        return {
            get title() { return document.getElementById('confirmation-page-title') as HTMLHeadingElement; },
            get message() { return document.getElementById('confirmation-page-message') as HTMLParagraphElement; },
            get pdfBtn() { return document.getElementById('confirmation-page-pdf-btn') as HTMLButtonElement; },
            get newShipmentBtn() { return document.getElementById('confirmation-page-new-shipment-btn') as HTMLButtonElement; },
        };
    },
    
    // --- Service Specific Elements ---
    // Parcel
    get itemDescription() { return document.getElementById('item-description') as HTMLTextAreaElement; },
    get hsCodeWrapper() { return document.getElementById('hs-code-wrapper') as HTMLDivElement; },
    get hsCodeInput() { return document.getElementById('hs-code') as HTMLInputElement; },
    get suggestHsCodeBtn() { return document.getElementById('suggest-hs-code-btn') as HTMLButtonElement; },
    get quotesContainer() { return document.getElementById('quotes-container') as HTMLDivElement; },
    get resultsTitle() { return document.getElementById('results-title') as HTMLHeadingElement; },
    get quotesSkeleton() { return document.getElementById('quotes-skeleton') as HTMLDivElement; },
    get dropoffMapModal() { return document.getElementById('dropoff-map-modal') as HTMLDivElement; },
    get dropoffMapListContainer() { return document.getElementById('dropoff-map-list-container') as HTMLDivElement; },
    get closeDropoffMapBtn() { return document.getElementById('close-dropoff-map-btn') as HTMLButtonElement; },
    get parcel() {
        return {
            get warningsContainer() { return document.getElementById('parcel-warnings-container') as HTMLDivElement; },
            get quotesContainer() { return document.getElementById('parcel-quotes-container') as HTMLDivElement; },
        }
    },


    // Baggage
    get shippingAgreementModal() { return document.getElementById('shipping-agreement-modal') as HTMLDivElement; },
    get closeShippingAgreementModalBtn() { return document.getElementById('close-shipping-agreement-modal-btn') as HTMLButtonElement; },
    get shippingAgreementCheckbox() { return document.getElementById('shipping-agreement-checkbox') as HTMLInputElement; },
    get shippingAgreementProceedBtn() { return document.getElementById('shipping-agreement-proceed-btn') as HTMLButtonElement; },
    get downloadShippingAgreementPdfBtn() { return document.getElementById('download-shipping-agreement-pdf-btn') as HTMLButtonElement; },
    get trackingDeviceModal() { return document.getElementById('tracking-device-modal') as HTMLDivElement; },
    get closeTrackingDeviceModalBtn() { return document.getElementById('close-tracking-device-modal-btn') as HTMLButtonElement; },
    
    // Airfreight
    get airfreightDetailsForm() { return document.getElementById('airfreight-details-form') as HTMLFormElement; },
    get airfreightCargoType() { return document.getElementById('airfreight-cargo-type') as HTMLSelectElement; },
    get airfreightCargoDescription() { return document.getElementById('airfreight-cargo-description') as HTMLTextAreaElement; },
    get airfreightHsCode() { return document.getElementById('airfreight-hs-code') as HTMLInputElement; },
    get airfreightOriginAirport() { return document.getElementById('airfreight-origin-airport') as HTMLInputElement; },
    get airfreightDestAirport() { return document.getElementById('airfreight-dest-airport') as HTMLInputElement; },
    get airfreightCargoList() { return document.getElementById('airfreight-cargo-list') as HTMLDivElement; },
    get airfreightAddPieceBtn() { return document.getElementById('airfreight-add-piece-btn') as HTMLButtonElement; },
    get airfreightChargeableWeightSummary() { return document.getElementById('airfreight-chargeable-weight-summary') as HTMLDivElement; },
    get airfreightServiceLevelSelector() { return document.getElementById('airfreight-service-level-selector') as HTMLDivElement; },
    get airfreightComplianceChecklist() { return document.getElementById('airfreight-compliance-checklist') as HTMLDivElement; },
    get airfreightRatesContainer() { return document.getElementById('airfreight-rates-container') as HTMLDivElement; },
    get airfreightConfirmationTitle() { return document.getElementById('airfreight-confirmation-title') as HTMLHeadingElement; },
    get airfreightConfirmationMessage() { return document.getElementById('airfreight-confirmation-message') as HTMLParagraphElement; },
    get airfreightConfirmationAWB() { return document.getElementById('airfreight-confirmation-awb') as HTMLDivElement; },
    get airfreightSteps() {
        return {
            get details() { return document.getElementById('airfreight-step-details') as HTMLDivElement; },
            get dims() { return document.getElementById('airfreight-step-dims') as HTMLDivElement; },
            get service() { return document.getElementById('airfreight-step-service') as HTMLDivElement; },
            get docs() { return document.getElementById('airfreight-step-docs') as HTMLDivElement; },
            get rates() { return document.getElementById('airfreight-step-rates') as HTMLDivElement; },
            get confirmation() { return document.getElementById('airfreight-step-confirmation') as HTMLDivElement; },
        };
    },
    get airfreightNav() {
        return {
            get backToDetails() { return document.getElementById('airfreight-back-to-details-btn') as HTMLButtonElement; },
            get toService() { return document.getElementById('airfreight-to-service-btn') as HTMLButtonElement; },
            get backToDims() { return document.getElementById('airfreight-back-to-dims-btn') as HTMLButtonElement; },
            get toDocs() { return document.getElementById('airfreight-to-docs-btn') as HTMLButtonElement; },
            get backToService() { return document.getElementById('airfreight-back-to-service-btn') as HTMLButtonElement; },
            get toRates() { return document.getElementById('airfreight-to-rates-btn') as HTMLButtonElement; },
            get backToDocs() { return document.getElementById('airfreight-back-to-docs-btn') as HTMLButtonElement; },
            get toConfirmation() { return document.getElementById('airfreight-to-confirmation-btn') as HTMLButtonElement; },
            get newShipment() { return document.getElementById('airfreight-new-shipment-btn') as HTMLButtonElement; },
            get downloadPDF() { return document.getElementById('airfreight-download-pdf-btn') as HTMLButtonElement; },
        };
    },

    // Bulk
    get bulkDetailsForm() { return document.getElementById('bulk-details-form') as HTMLFormElement; },
    get bulkCargoSearch() { return document.getElementById('bulk-cargo-search') as HTMLInputElement; },
    get bulkCargoSearchResults() { return document.getElementById('bulk-cargo-search-results') as HTMLDivElement; },
    get bulkVesselType() { return document.getElementById('bulk-vessel-type') as HTMLSelectElement; },
    get bulkStowageFactor() { return document.getElementById('bulk-stowage-factor') as HTMLInputElement; },
    get bulkIsHazardous() { return document.getElementById('bulk-is-hazardous') as HTMLInputElement; },
    get bulkCargoVolume() { return document.getElementById('bulk-cargo-volume') as HTMLInputElement; },
    get bulkOriginPort() { return document.getElementById('bulk-origin-port') as HTMLInputElement; },
    get bulkDestPort() { return document.getElementById('bulk-dest-port') as HTMLInputElement; },
    get bulkLaycanFrom() { return document.getElementById('bulk-laycan-from') as HTMLInputElement; },
    get bulkLaycanTo() { return document.getElementById('bulk-laycan-to') as HTMLInputElement; },
    get bulkRequestQuotesBtn() { return document.getElementById('bulk-request-quotes-btn') as HTMLButtonElement; },
    get bulkComplianceChecklist() { return document.getElementById('bulk-compliance-checklist') as HTMLDivElement; },
    get bulkBidsTableContainer() { return document.getElementById('bulk-bids-table-container') as HTMLDivElement; },
    get bulkCharterPartySection() { return document.getElementById('bulk-charter-party-section') as HTMLDivElement; },
    get bulkSignatureCanvas() { return document.getElementById('bulk-signature-canvas') as HTMLCanvasElement; },
    get bulkSignatureClearBtn() { return document.getElementById('bulk-signature-clear-btn') as HTMLButtonElement; },
    get bulkPaymentForm() { return document.getElementById('bulk-payment-form') as HTMLFormElement; },
    get bulkPaymentOverview() { return document.getElementById('bulk-payment-overview') as HTMLDivElement; },
    get bulkConfirmationTitle() { return document.getElementById('bulk-confirmation-title') as HTMLHeadingElement; },
    get bulkConfirmationMessage() { return document.getElementById('bulk-confirmation-message') as HTMLParagraphElement; },
    get bulkSteps() {
        return {
            get cargo() { return document.getElementById('bulk-step-cargo') as HTMLDivElement; },
            get route() { return document.getElementById('bulk-step-route') as HTMLDivElement; },
            get market() { return document.getElementById('bulk-step-market') as HTMLDivElement; },
            get docs() { return document.getElementById('bulk-step-docs') as HTMLDivElement; },
            get bids() { return document.getElementById('bulk-step-bids') as HTMLDivElement; },
            get payment() { return document.getElementById('bulk-step-payment') as HTMLDivElement; },
            get confirmation() { return document.getElementById('bulk-step-confirmation') as HTMLDivElement; },
        };
    },
    get bulkNav() {
        return {
            get backToDetails() { return document.getElementById('bulk-back-to-details-btn') as HTMLButtonElement; },
            get toMarket() { return document.getElementById('bulk-to-market-btn') as HTMLButtonElement; },
            get backToRoute() { return document.getElementById('bulk-back-to-route-btn') as HTMLButtonElement; },
            get backToMarket() { return document.getElementById('bulk-back-to-market-btn') as HTMLButtonElement; },
            get toBids() { return document.getElementById('bulk-to-bids-btn') as HTMLButtonElement; },
            get backToDocs() { return document.getElementById('bulk-back-to-docs-btn') as HTMLButtonElement; },
            get toPayment() { return document.getElementById('bulk-to-payment-btn') as HTMLButtonElement; },
            get backToCharter() { return document.getElementById('bulk-back-to-charter-btn') as HTMLButtonElement; },
            get newShipment() { return document.getElementById('bulk-new-shipment-btn') as HTMLButtonElement; },
            get downloadBundle() { return document.getElementById('bulk-download-bundle-btn') as HTMLButtonElement; },
        };
    },

    // E-commerce
    get ecomViewHubDashboard() { return document.getElementById('ecom-view-hub-dashboard') as HTMLDivElement; },
    get ecomViewMyProducts() { return document.getElementById('ecom-view-my-products') as HTMLDivElement; },
    get ecomViewAddProduct() { return document.getElementById('ecom-view-add-product') as HTMLDivElement; },
    get ecomHubBtn() { return document.getElementById('ecom-hub-btn') as HTMLButtonElement; },
    get ecomMyProductsBtn() { return document.getElementById('ecom-my-products-btn') as HTMLButtonElement; },
    get ecomAddProductBtn() { return document.getElementById('ecom-add-product-btn') as HTMLButtonElement; },
    get ecomProductGrid() { return document.getElementById('ecom-product-grid') as HTMLDivElement; },
    get ecomEmptyState() { return document.getElementById('ecom-empty-state') as HTMLDivElement; },
    get ecomWizardStep1Title() { return document.getElementById('ecom-wizard-step1-title') as HTMLHeadingElement; },
    get ecomWizardStep4Title() { return document.getElementById('ecom-wizard-step4-title') as HTMLHeadingElement; },
    get ecomSuccessTitle() { return document.getElementById('ecom-success-title') as HTMLHeadingElement; },
    get ecomProductName() { return document.getElementById('ecom-product-name') as HTMLInputElement; },
    get ecomProductDescription() { return document.getElementById('ecom-product-description') as HTMLTextAreaElement; },
    get ecomProductCategory() { return document.getElementById('ecom-product-category') as HTMLInputElement; },
    get ecomProductBrand() { return document.getElementById('ecom-product-brand') as HTMLInputElement; },
    get ecomSpecsList() { return document.getElementById('ecom-specs-list') as HTMLUListElement; },
    get ecomProductStock() { return document.getElementById('ecom-product-stock') as HTMLInputElement; },
    get productLink() { return document.getElementById('product-link') as HTMLInputElement; },
    get ecomProductPrice() { return document.getElementById('ecom-product-price') as HTMLInputElement; },
    get sellerAgreementModal() { return document.getElementById('seller-agreement-modal') as HTMLDivElement; },
    get agreementText() { return document.getElementById('agreement-text') as HTMLDivElement; },
    get ecomWizardContainer() { return document.getElementById('ecom-wizard-container') as HTMLFormElement; },
    get ecomReviewPane() { return document.getElementById('ecom-review-pane') as HTMLDivElement; },
    get ecomPublishSuccess() { return document.getElementById('ecom-publish-success') as HTMLDivElement; },
    get commissionDisplay() { return document.getElementById('commission-display') as HTMLSpanElement; },
    get sellerEarnings() { return document.getElementById('seller-earnings') as HTMLSpanElement; },
    get progressBars() {
        return {
            get ecommerce() { return document.getElementById('progress-bar-ecommerce') as HTMLDivElement; },
        };
    },
    get ecomPrevBtn() { return document.getElementById('ecom-prev-btn') as HTMLButtonElement; },
    get ecomNextBtn() { return document.getElementById('ecom-next-btn') as HTMLButtonElement; },
    get addSpecBtn() { return document.getElementById('add-spec-btn') as HTMLButtonElement; },
    get ecomPhysicalProductFields() { return document.getElementById('ecom-physical-product-fields') as HTMLDivElement; },
    get ecomExternalProductFields() { return document.getElementById('ecom-external-product-fields') as HTMLDivElement; },
    get ecomAddNewFromEmptyBtn() { return document.getElementById('ecom-add-new-from-empty-btn') as HTMLButtonElement; },
    get ecomListProductCtaHero() { return document.getElementById('ecom-list-product-cta-hero') as HTMLButtonElement; },
    get closeAgreementModalBtn() { return document.getElementById('close-agreement-modal-btn') as HTMLButtonElement; },
    get agreementCheckbox() { return document.getElementById('agreement-checkbox') as HTMLInputElement; },
    get agreementProceedBtn() { return document.getElementById('agreement-proceed-btn') as HTMLButtonElement; },
    get downloadAgreementPdfBtn() { return document.getElementById('download-agreement-pdf-btn') as HTMLButtonElement; },
    get listAnotherProductBtn() { return document.getElementById('list-another-product-btn') as HTMLButtonElement; },
    get ecomDownloadPdfBtn() { return document.getElementById('ecom-download-pdf-btn') as HTMLButtonElement; },
    get ecomProductTypeSelector() { return document.getElementById('ecom-product-type-selector') as HTMLDivElement; },

    // FCL
    get fclCargoDescription() { return document.getElementById('fcl-cargo-description') as HTMLTextAreaElement; },
    get fclHsCodeInput() { return document.getElementById('fcl-hs-code') as HTMLInputElement; },
    get fclQuoteForm() { return document.getElementById('fcl-quote-form') as HTMLFormElement; },
    get fclContainerList() { return document.getElementById('fcl-container-list') as HTMLDivElement; },
    get fclFlashGridContainer() { return document.getElementById('fcl-flash-grid-container') as HTMLDivElement; },
    get fclServiceTypeBtns() { return document.querySelectorAll('#fcl-service-type-selector .service-type-btn') as NodeListOf<HTMLButtonElement>; },
    get fclPickupAddressFields() { return document.getElementById('fcl-pickup-address-fields') as HTMLDivElement; },
    get fclPickupLocationFields() { return document.getElementById('fcl-pickup-location-fields') as HTMLDivElement; },
    get fclDeliveryAddressFields() { return document.getElementById('fcl-delivery-address-fields') as HTMLDivElement; },
    get fclDeliveryLocationFields() { return document.getElementById('fcl-delivery-location-fields') as HTMLDivElement; },
    get fclPickupName() { return document.getElementById('fcl-pickup-name') as HTMLInputElement; },
    get fclPickupCountry() { return document.getElementById('fcl-pickup-country') as HTMLInputElement; },
    get fclDeliveryName() { return document.getElementById('fcl-delivery-name') as HTMLInputElement; },
    get fclDeliveryCountry() { return document.getElementById('fcl-delivery-country') as HTMLInputElement; },
    get fclPickupPortInput() { return document.getElementById('fcl-pickup-port') as HTMLInputElement; },
    get fclDeliveryPortInput() { return document.getElementById('fcl-delivery-port') as HTMLInputElement; },
    get fclComplianceChecklist() { return document.getElementById('fcl-compliance-checklist') as HTMLDivElement; },
    get fclQuoteSummary() { return document.getElementById('fcl-quote-summary') as HTMLDivElement; },
    get fclSignatureCanvas() { return document.getElementById('fcl-signature-canvas') as HTMLCanvasElement; },
    get fclConfirmationTitle() { return document.getElementById('fcl-confirmation-title') as HTMLHeadingElement; },
    get fclConfirmationMessage() { return document.getElementById('fcl-confirmation-message') as HTMLParagraphElement; },
    get addContainerBtn() { return document.getElementById('add-container-btn') as HTMLButtonElement; },
    get fclSuggestHsCodeBtn() { return document.getElementById('fcl-suggest-hs-code-btn') as HTMLButtonElement; },
    get fclSignatureClearBtn() { return document.getElementById('fcl-signature-clear-btn') as HTMLButtonElement; },
    get fclSteps() {
        return {
            get details() { return document.getElementById('fcl-step-details') as HTMLDivElement; },
            get compliance() { return document.getElementById('fcl-step-compliance') as HTMLDivElement; },
            get quote() { return document.getElementById('fcl-step-quote') as HTMLDivElement; },
            get agreement() { return document.getElementById('fcl-step-agreement') as HTMLDivElement; },
            get confirmation() { return document.getElementById('fcl-step-confirmation') as HTMLDivElement; },
        };
    },
    get fclNav() {
        return {
            get backToDetails() { return document.getElementById('fcl-back-to-details-btn') as HTMLButtonElement; },
            get toQuote() { return document.getElementById('fcl-to-quote-btn') as HTMLButtonElement; },
            get backToCompliance() { return document.getElementById('fcl-back-to-compliance-btn') as HTMLButtonElement; },
            get toAgreement() { return document.getElementById('fcl-to-agreement-btn') as HTMLButtonElement; },
            get backToQuote() { return document.getElementById('fcl-back-to-quote-btn') as HTMLButtonElement; },
            get toPayment() { return document.getElementById('fcl-to-payment-btn') as HTMLButtonElement; },
            get backToAgreement() { return document.getElementById('fcl-back-to-agreement-btn') as HTMLButtonElement; },
            get newShipment() { return document.getElementById('fcl-new-shipment-btn') as HTMLButtonElement; },
            get downloadDocs() { return document.getElementById('fcl-download-docs-btn') as HTMLButtonElement; },
        };
    },

    // Inland
    get inlandMapForm() { return document.getElementById('inland-map-form') as HTMLFormElement; },
    get inlandOriginSearch() { return document.getElementById('inland-origin-search') as HTMLInputElement; },
    get inlandDestSearch() { return document.getElementById('inland-dest-search') as HTMLInputElement; },
    get inlandFtlToggle() { return document.getElementById('inland-ftl-toggle') as HTMLInputElement; },
    get inlandTruckBoardList() { return document.getElementById('inland-truck-board-list') as HTMLDivElement; },
    get inlandPaymentView() { return document.getElementById('inland-payment-view') as HTMLDivElement; },
    get inlandTrackingView() { return document.getElementById('inland-tracking-view') as HTMLDivElement; },
    get inlandTrackingTitle() { return document.getElementById('inland-tracking-title') as HTMLHeadingElement; },
    get inlandPaymentOverview() { return document.getElementById('inland-payment-overview') as HTMLDivElement; },
    get inlandPaymentForm() { return document.getElementById('inland-payment-form') as HTMLFormElement; },
    get inlandSteps() {
        return {
            get map() { return document.getElementById('inland-step-map') as HTMLDivElement; },
            get cargo() { return document.getElementById('inland-step-cargo') as HTMLDivElement; },
            get board() { return document.getElementById('inland-step-board') as HTMLDivElement; },
            get docs() { return document.getElementById('inland-step-docs') as HTMLDivElement; },
            get payment() { return document.getElementById('inland-step-payment') as HTMLDivElement; },
        };
    },
    get inlandNav() {
        return {
            get backToMap() { return document.getElementById('inland-back-to-map-btn') as HTMLButtonElement; },
            get toBoard() { return document.getElementById('inland-to-board-btn') as HTMLButtonElement; },
            get backToCargo() { return document.getElementById('inland-back-to-cargo-btn') as HTMLButtonElement; },
            get backToBoard() { return document.getElementById('inland-back-to-board-btn') as HTMLButtonElement; },
            get toPayment() { return document.getElementById('inland-to-payment-btn') as HTMLButtonElement; },
            get newBooking() { return document.getElementById('inland-new-booking-btn') as HTMLButtonElement; },
            get downloadDocs() { return document.getElementById('inland-download-docs-btn') as HTMLButtonElement; },
        };
    },

    // LCL
    get lclDetailsForm() { return document.getElementById('lcl-details-form') as HTMLFormElement; },
    get lclCargoList() { return document.getElementById('lcl-cargo-list') as HTMLDivElement; },
    get lclInlandLegSection() { return document.getElementById('lcl-inland-leg-section') as HTMLDivElement; },
    get lclFclSuggestion() { return document.getElementById('lcl-fcl-suggestion') as HTMLDivElement; },
    get lclCubeShareContainer() { return document.getElementById('lcl-cube-share-container') as HTMLDivElement; },
    get lclCargoDescription() { return document.getElementById('lcl-cargo-description') as HTMLTextAreaElement; },
    get lclHsCodeInput() { return document.getElementById('lcl-hs-code') as HTMLInputElement; },
    get lclInlandTruckingToggle() { return document.getElementById('lcl-inland-trucking-toggle') as HTMLInputElement; },
    get lclTotalCbm() { return document.getElementById('lcl-total-cbm') as HTMLSpanElement; },
    get lclChargeableWeight() { return document.getElementById('lcl-chargeable-weight') as HTMLSpanElement; },
    get lclIsStackable() { return document.getElementById('lcl-is-stackable') as HTMLInputElement; },
    get lclIsHazardous() { return document.getElementById('lcl-is-hazardous') as HTMLInputElement; },
    get lclSuggestHsCodeBtn() { return document.getElementById('lcl-suggest-hs-code-btn') as HTMLButtonElement; },
    get lclAddCargoBtn() { return document.getElementById('lcl-add-cargo-btn') as HTMLButtonElement; },
    get lclImdgClassContainer() { return document.getElementById('lcl-imdg-class-container') as HTMLDivElement; },
    get lclServiceLevelSelector() { return document.getElementById('lcl-service-level-selector') as HTMLDivElement; },
    get lclPaymentForm() { return document.getElementById('lcl-payment-form') as HTMLFormElement; },
    get lclConfirmationMessage() { return document.getElementById('lcl-confirmation-message') as HTMLParagraphElement; },
    get lclSteps() {
        return {
            get details() { return document.getElementById('lcl-step-details') as HTMLDivElement; },
            get cargo() { return document.getElementById('lcl-step-cargo') as HTMLDivElement; },
            get service() { return document.getElementById('lcl-step-service') as HTMLDivElement; },
            get docs() { return document.getElementById('lcl-step-docs') as HTMLDivElement; },
            get quote() { return document.getElementById('lcl-step-quote') as HTMLDivElement; },
            get payment() { return document.getElementById('lcl-step-payment') as HTMLDivElement; },
            get confirmation() { return document.getElementById('lcl-step-confirmation') as HTMLDivElement; },
        };
    },
    get lclNav() {
        return {
            get backToDetails() { return document.getElementById('lcl-back-to-details-btn') as HTMLButtonElement; },
            get toService() { return document.getElementById('lcl-to-service-btn') as HTMLButtonElement; },
            get backToCargo() { return document.getElementById('lcl-back-to-cargo-btn') as HTMLButtonElement; },
            get toDocs() { return document.getElementById('lcl-to-docs-btn') as HTMLButtonElement; },
            get backToService() { return document.getElementById('lcl-back-to-service-btn') as HTMLButtonElement; },
            get toQuote() { return document.getElementById('lcl-to-quote-btn') as HTMLButtonElement; },
            get backToDocs() { return document.getElementById('lcl-back-to-docs-btn') as HTMLButtonElement; },
            get toPayment() { return document.getElementById('lcl-to-payment-btn') as HTMLButtonElement; },
            get backToQuote() { return document.getElementById('lcl-back-to-quote-btn') as HTMLButtonElement; },
            get newShipment() { return document.getElementById('lcl-new-shipment-btn') as HTMLButtonElement; },
            get downloadLabels() { return document.getElementById('lcl-download-labels-btn') as HTMLButtonElement; },
        };
    },
    
    // Railway
    get railway() {
        return {
            get detailsForm() { return document.getElementById('railway-details-form') as HTMLFormElement; },
            get originTerminalSelect() { return document.getElementById('railway-origin-terminal') as HTMLSelectElement; },
            get destTerminalSelect() { return document.getElementById('railway-dest-terminal') as HTMLSelectElement; },
            get cargoDescription() { return document.getElementById('railway-cargo-description') as HTMLTextAreaElement; },
            get complianceChecklist() { return document.getElementById('railway-compliance-checklist') as HTMLDivElement; },
            get quoteSummary() { return document.getElementById('railway-quote-summary') as HTMLDivElement; },
            get confirmationTitle() { return document.getElementById('railway-confirmation-title') as HTMLHeadingElement; },
            get confirmationMessage() { return document.getElementById('railway-confirmation-message') as HTMLParagraphElement; },
            get steps() {
                return {
                    get details() { return document.getElementById('railway-step-details') as HTMLDivElement; },
                    get docs() { return document.getElementById('railway-step-docs') as HTMLDivElement; },
                    get quote() { return document.getElementById('railway-step-quote') as HTMLDivElement; },
                    get confirmation() { return document.getElementById('railway-step-confirmation') as HTMLDivElement; },
                };
            },
            get nav() {
                return {
                    get toDocs() { return document.getElementById('railway-to-docs-btn') as HTMLButtonElement; },
                    get backToDetails() { return document.getElementById('railway-back-to-details-btn') as HTMLButtonElement; },
                    get toQuote() { return document.getElementById('railway-to-quote-btn') as HTMLButtonElement; },
                    get backToDocs() { return document.getElementById('railway-back-to-docs-btn') as HTMLButtonElement; },
                    get toConfirmation() { return document.getElementById('railway-to-confirmation-btn') as HTMLButtonElement; },
                    get newShipment() { return document.getElementById('railway-new-shipment-btn') as HTMLButtonElement; },
                };
            },
        };
    },

    // Schedules
    get schedules() {
        return {
            get tableBody() { return document.querySelector('#schedules-table tbody') as HTMLTableSectionElement; },
            get originInput() { return document.getElementById('schedules-origin-input') as HTMLInputElement; },
            get destInput() { return document.getElementById('schedules-dest-input') as HTMLInputElement; },
            get modeSelect() { return document.getElementById('schedules-mode-select') as HTMLSelectElement; },
            get carrierSelect() { return document.getElementById('schedules-carrier-select') as HTMLSelectElement; },
            get refreshBtn() { return document.getElementById('schedules-refresh-btn') as HTMLButtonElement; },
        };
    },

    // Vehicle
    get vehicleDetailsForm() { return document.getElementById('vehicle-details-form') as HTMLFormElement; },
    get vehiclePhotoStatus() { return document.getElementById('vehicle-photo-status') as HTMLDivElement; },
    get vehicleShippingOptions() { return document.getElementById('vehicle-shipping-options') as HTMLDivElement; },
    get vehicleOriginPort() { return document.getElementById('vehicle-origin-port') as HTMLInputElement; },
    get vehicleDestPort() { return document.getElementById('vehicle-dest-port') as HTMLInputElement; },
    get vehicleMake() { return document.getElementById('vehicle-make') as HTMLInputElement; },
    get vehicleModel() { return document.getElementById('vehicle-model') as HTMLInputElement; },
    get vehicleYear() { return document.getElementById('vehicle-year') as HTMLInputElement; },
    get vehicleCondition() { return document.getElementById('vehicle-condition') as HTMLSelectElement; },
    get vehicleCanRoll() { return document.getElementById('vehicle-can-roll') as HTMLInputElement; },
    get vehicleLength() { return document.getElementById('vehicle-length') as HTMLInputElement; },
    get vehicleWidth() { return document.getElementById('vehicle-width') as HTMLInputElement; },
    get vehicleHeight() { return document.getElementById('vehicle-height') as HTMLInputElement; },
    get vehicleWeight() { return document.getElementById('vehicle-weight') as HTMLInputElement; },
    get vehicleQuoteSummary() { return document.getElementById('vehicle-quote-summary') as HTMLDivElement; },
    get vehicleComplianceSummary() { return document.getElementById('vehicle-compliance-summary') as HTMLDivElement; },
    get vehiclePaymentOverview() { return document.getElementById('vehicle-payment-overview') as HTMLDivElement; },
    get vehicleConfirmationTitle() { return document.getElementById('vehicle-confirmation-title') as HTMLHeadingElement; },
    get vehicleConfirmationMessage() { return document.getElementById('vehicle-confirmation-message') as HTMLParagraphElement; },
    get vehiclePhotoDropArea() { return document.getElementById('vehicle-photo-drop-area') as HTMLDivElement; },
    get vehiclePhotoInput() { return document.getElementById('vehicle-photo-input') as HTMLInputElement; },
    get vehiclePaymentForm() { return document.getElementById('vehicle-payment-form') as HTMLFormElement; },
    get vehicleSteps() {
        return {
            get details() { return document.getElementById('vehicle-step-details') as HTMLDivElement; },
            get dimensions() { return document.getElementById('vehicle-step-dimensions') as HTMLDivElement; },
            get method() { return document.getElementById('vehicle-step-method') as HTMLDivElement; },
            get quote() { return document.getElementById('vehicle-step-quote') as HTMLDivElement; },
            get payment() { return document.getElementById('vehicle-step-payment') as HTMLDivElement; },
            get confirmation() { return document.getElementById('vehicle-step-confirmation') as HTMLDivElement; },
        };
    },
    get vehicleNav() {
        return {
            get backToDetails() { return document.getElementById('vehicle-back-to-details-btn') as HTMLButtonElement; },
            get toMethod() { return document.getElementById('vehicle-to-method-btn') as HTMLButtonElement; },
            get backToDims() { return document.getElementById('vehicle-back-to-dims-btn') as HTMLButtonElement; },
            get toQuote() { return document.getElementById('vehicle-to-quote-btn') as HTMLButtonElement; },
            get backToMethod() { return document.getElementById('vehicle-back-to-method-btn') as HTMLButtonElement; },
            get toPayment() { return document.getElementById('vehicle-to-payment-btn') as HTMLButtonElement; },
            get backToQuote() { return document.getElementById('vehicle-back-to-quote-btn') as HTMLButtonElement; },
            get newShipment() { return document.getElementById('vehicle-new-shipment-btn') as HTMLButtonElement; },
            get downloadDocs() { return document.getElementById('vehicle-download-docs-btn') as HTMLButtonElement; },
        };
    },
    
    // Warehouse
    get warehouseCargoForm() { return document.getElementById('warehouse-cargo-form') as HTMLFormElement; },
    get warehouseFacilityList() { return document.getElementById('warehouse-facility-list') as HTMLDivElement; },
    get warehouseLocationSearch() { return document.getElementById('warehouse-location-search') as HTMLInputElement; },
    get warehouseFilterCheckboxes() { return document.querySelectorAll('#warehouse-filters input[type="checkbox"]') as NodeListOf<HTMLInputElement>; },
    get warehouseApplyFiltersBtn() { return document.getElementById('warehouse-apply-filters-btn') as HTMLButtonElement; },
    get warehouseTempControl() { return document.getElementById('warehouse-requires-temp-control') as HTMLInputElement; },
    get warehouseTempContainer() { return document.getElementById('warehouse-temp-container') as HTMLDivElement; },
    get warehouseTempRange() { return document.getElementById('warehouse-temp-min') as HTMLInputElement; },
    get warehouseTempDisplay() { return document.getElementById('warehouse-temp-display') as HTMLSpanElement; },
    get warehouseIsHazardous() { return document.getElementById('warehouse-is-hazardous') as HTMLInputElement; },
    get warehouseHazmatContainer() { return document.getElementById('warehouse-hazmat-container') as HTMLDivElement; },
    get warehouseServiceLevelSelector() { return document.getElementById('warehouse-service-level-selector') as HTMLDivElement; },
    get warehouseComplianceChecklist() { return document.getElementById('warehouse-compliance-checklist') as HTMLDivElement; },
    get warehouseSteps() {
        return {
            get location() { return document.getElementById('warehouse-step-location') as HTMLDivElement; },
            get cargo() { return document.getElementById('warehouse-step-cargo') as HTMLDivElement; },
            get service() { return document.getElementById('warehouse-step-service') as HTMLDivElement; },
            get docs() { return document.getElementById('warehouse-step-docs') as HTMLDivElement; },
            get quote() { return document.getElementById('warehouse-step-quote') as HTMLDivElement; },
            get payment() { return document.getElementById('warehouse-step-payment') as HTMLDivElement; },
            get confirmation() { return document.getElementById('warehouse-step-confirmation') as HTMLDivElement; },
        };
    },
    get warehouseNav() {
        return {
            get backToLocation() { return document.getElementById('warehouse-back-to-location-btn') as HTMLButtonElement; },
            get toDocs() { return document.getElementById('warehouse-to-docs-btn') as HTMLButtonElement; },
        };
    },

    // River Tug
    get riverTug() {
        return {
            get detailsForm() { return document.getElementById('rivertug-details-form') as HTMLFormElement; },
            get bargeTypeSelector() { return document.getElementById('rivertug-barge-type-selector') as HTMLDivElement; },
            get originPort() { return document.getElementById('rivertug-origin-port') as HTMLInputElement; },
            get destPort() { return document.getElementById('rivertug-dest-port') as HTMLInputElement; },
            get cargoDescription() { return document.getElementById('rivertug-cargo-description') as HTMLTextAreaElement; },
            get cargoVolume() { return document.getElementById('rivertug-cargo-volume') as HTMLInputElement; },
            get isHazardous() { return document.getElementById('rivertug-is-hazardous') as HTMLInputElement; },
            get complianceChecklist() { return document.getElementById('rivertug-compliance-checklist') as HTMLDivElement; },
            get quoteSummary() { return document.getElementById('rivertug-quote-summary') as HTMLDivElement; },
            get confirmationTitle() { return document.getElementById('rivertug-confirmation-title') as HTMLHeadingElement; },
            get confirmationMessage() { return document.getElementById('rivertug-confirmation-message') as HTMLParagraphElement; },
            get steps() {
                return {
                    get details() { return document.getElementById('rivertug-step-details') as HTMLDivElement; },
                    get docs() { return document.getElementById('rivertug-step-docs') as HTMLDivElement; },
                    get quote() { return document.getElementById('rivertug-step-quote') as HTMLDivElement; },
                    get confirmation() { return document.getElementById('rivertug-step-confirmation') as HTMLDivElement; },
                };
            },
            get nav() {
                return {
                    get backToDetails() { return document.getElementById('rivertug-back-to-details-btn') as HTMLButtonElement; },
                    get toQuote() { return document.getElementById('rivertug-to-quote-btn') as HTMLButtonElement; },
                    get backToDocs() { return document.getElementById('rivertug-back-to-docs-btn') as HTMLButtonElement; },
                    get toConfirmation() { return document.getElementById('rivertug-to-confirmation-btn') as HTMLButtonElement; },
                    get newShipment() { return document.getElementById('rivertug-new-shipment-btn') as HTMLButtonElement; },
                    get downloadBundle() { return document.getElementById('rivertug-download-bundle-btn') as HTMLButtonElement; },
                };
            },
        };
    },

    // Trade Finance (Register)
    get register() {
        return {
            get page() { return document.getElementById('page-register') as HTMLDivElement; },
            get steps() {
                return {
                    get service() { return document.getElementById('tf-step-service') as HTMLDivElement; },
                    get details() { return document.getElementById('tf-step-details') as HTMLDivElement; },
                    get assessment() { return document.getElementById('tf-step-assessment') as HTMLDivElement; },
                    get review() { return document.getElementById('tf-step-review') as HTMLDivElement; },
                    get confirmation() { return document.getElementById('tf-step-confirmation') as HTMLDivElement; },
                };
            },
            get nav() {
                return {
                    get backToService() { return document.getElementById('tf-back-to-service-btn') as HTMLButtonElement; },
                    get toAssessment() { return document.getElementById('tf-to-assessment-btn') as HTMLButtonElement; },
                    get backToDetails() { return document.getElementById('tf-back-to-details-btn') as HTMLButtonElement; },
                    get toReview() { return document.getElementById('tf-to-review-btn') as HTMLButtonElement; },
                    get backToAssessment() { return document.getElementById('tf-back-to-assessment-btn') as HTMLButtonElement; },
                    get toConfirmation() { return document.getElementById('tf-to-confirmation-btn') as HTMLButtonElement; },
                    get downloadPdf() { return document.getElementById('tf-download-pdf-btn') as HTMLButtonElement; },
                    get newApplication() { return document.getElementById('tf-new-application-btn') as HTMLButtonElement; },
                };
            },
            get serviceSelector() { return document.getElementById('tf-service-selector') as HTMLDivElement; },
            get detailsForm() { return document.getElementById('tf-details-form') as HTMLFormElement; },
            get assessmentResult() { return document.getElementById('tf-assessment-result') as HTMLDivElement; },
            get reviewDetails() { return document.getElementById('tf-review-details') as HTMLDivElement; },
            get confirmationId() { return document.getElementById('tf-confirmation-id') as HTMLDivElement; },
        };
    },
};