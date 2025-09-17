// ⚠️  READ-ONLY — DO NOT EDIT — SERVICE LOCKED ⚠️
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import { DOMElements } from './dom';
import { State, setState, type EcomProduct, type ProductType } from './state';
// FIX: Added showToast to the import from ./ui
import { switchPage, updateProgressBar, showToast } from "./ui";

const COMMISSION_RATE = 0.15;

function renderEcomPage() {
    const page = document.getElementById('page-ecommerce');
    if (!page) return;

    page.innerHTML = `
        <div class="ecom-hub-layout">
            <aside class="ecom-hub-sidebar">
                <h3>E-commerce Hub</h3>
                <nav>
                    <button id="ecom-hub-btn" class="ecom-nav-btn active">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h12A2.25 2.25 0 0 0 20.25 14.25V3m-16.5 0h16.5m-16.5 0v11.25A2.25 2.25 0 0 0 6 16.5h12A2.25 2.25 0 0 0 20.25 14.25V3.75M16.5 6.75h.008v.008H16.5V6.75Zm-3.75 0h.008v.008H12.75V6.75Zm-3.75 0h.008v.008H9V6.75Z" /></svg>
                        <span>Hub Dashboard</span>
                    </button>
                    <button id="ecom-my-products-btn" class="ecom-nav-btn">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 9.75h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5M21 21V3m-1.5 0V21" /></svg>
                        <span>My Products</span>
                    </button>
                    <button id="ecom-add-product-btn" class="ecom-nav-btn">
                         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                        <span>Add New Product</span>
                    </button>
                </nav>
            </aside>
            <main class="ecom-hub-main-content">
                <!-- View 1: Hub Dashboard -->
                <div id="ecom-view-hub-dashboard" class="ecom-hub-view active">
                    <h2>Welcome to your Seller Hub, ${State.currentUser?.name}!</h2>
                    <p class="subtitle">Here's a summary of your e-commerce activity.</p>
                    <div class="ecom-stats-grid">
                        <div class="stat-card"><h4>Active Listings</h4><p>0</p></div>
                        <div class="stat-card"><h4>Sales (30d)</h4><p>$0.00</p></div>
                        <div class="stat-card"><h4>Pending Orders</h4><p>0</p></div>
                    </div>
                    <div class="ecom-hero-cta">
                        <h3>List your first product</h3>
                        <p>Start selling on Vcanship's global marketplace today.</p>
                        <button class="main-submit-btn" id="ecom-list-product-cta-hero">List a Product</button>
                    </div>
                </div>
                <!-- View 2: My Products -->
                <div id="ecom-view-my-products" class="ecom-hub-view hidden">
                    <h2>My Products</h2>
                    <div id="ecom-empty-state" class="hidden">Your product listings will appear here.</div>
                    <div id="ecom-product-grid" class="ecom-product-grid"></div>
                    <button id="ecom-add-new-from-empty-btn" class="main-submit-btn hidden">Add Your First Product</button>
                </div>
                <!-- View 3: Add Product -->
                <div id="ecom-view-add-product" class="ecom-hub-view hidden">
                    <form id="ecom-wizard-container">
                        <div id="progress-bar-ecommerce" data-steps="Details,Specs,Pricing,Review"></div>

                        <!-- Step 1: Details -->
                        <div id="ecom-step-1" class="wizard-step active">
                            <h3 id="ecom-wizard-step1-title">Step 1: Core Product Details</h3>
                            <div class="form-section">
                                <label class="checkbox-group-label">Product Type</label>
                                <div id="ecom-product-type-selector" class="service-type-selector">
                                    <button type="button" class="service-type-btn active" data-product-type="physical">
                                        <strong>Physical Product</strong>
                                        <span>Inventory-tracked item shipped by Vcanship.</span>
                                    </button>
                                    <button type="button" class="service-type-btn" data-product-type="external">
                                        <strong>External/Digital</strong>
                                        <span>Link to another site or a downloadable file.</span>
                                    </button>
                                </div>
                            </div>
                            <div class="form-section">
                                <div class="input-wrapper"><label for="ecom-product-name">Product Name</label><input type="text" id="ecom-product-name" required></div>
                                <div class="input-wrapper"><label for="ecom-product-description">Description</label><textarea id="ecom-product-description"></textarea></div>
                            </div>
                        </div>
                        <!-- Step 2: Specs -->
                        <div id="ecom-step-2" class="wizard-step">
                            <h3>Step 2: Category & Specifications</h3>
                            <div class="form-section two-column">
                                <div class="input-wrapper"><label for="ecom-product-category">Category</label><input type="text" id="ecom-product-category" placeholder="e.g., Electronics"></div>
                                <div class="input-wrapper"><label for="ecom-product-brand">Brand</label><input type="text" id="ecom-product-brand" placeholder="e.g., Apple"></div>
                            </div>
                            <div class="form-section">
                                <label>Specifications</label>
                                <ul id="ecom-specs-list"></ul>
                                <button type="button" id="add-spec-btn" class="secondary-btn">Add Specification</button>
                            </div>
                        </div>
                        <!-- Step 3: Pricing -->
                        <div id="ecom-step-3" class="wizard-step">
                            <h3>Step 3: Stock & Pricing</h3>
                            <div id="ecom-physical-product-fields" class="form-section">
                                <div class="input-wrapper"><label for="ecom-product-stock">Stock Quantity</label><input type="number" id="ecom-product-stock" min="0" required></div>
                            </div>
                            <div id="ecom-external-product-fields" class="form-section hidden">
                                <div class="input-wrapper"><label for="product-link">Product Link</label><input type="url" id="product-link" placeholder="https://example.com/product" required></div>
                            </div>
                            <div class="form-section">
                                <div class="input-wrapper"><label for="ecom-product-price">Price (${State.currentCurrency.code})</label><input type="number" id="ecom-product-price" min="0" step="0.01" required></div>
                                <div class="commission-calculator">
                                    <p>Our commission (15%): <span id="commission-display">$0.00</span></p>
                                    <p>Your earnings: <strong id="seller-earnings">$0.00</strong></p>
                                </div>
                            </div>
                        </div>
                        <!-- Step 4: Review -->
                        <div id="ecom-step-4" class="wizard-step">
                            <div id="ecom-review-pane">
                                <h3 id="ecom-wizard-step4-title">Step 4: Review & Publish</h3>
                                <p>Review your product details before publishing.</p>
                            </div>
                            <div id="ecom-publish-success" class="hidden">
                                <h3 id="ecom-success-title">Product Published!</h3>
                                <button type="button" id="ecom-download-pdf-btn">Download PDF Summary</button>
                                <button type="button" id="list-another-product-btn">List Another Product</button>
                            </div>
                        </div>

                        <div class="form-actions wizard-nav">
                            <button type="button" id="ecom-prev-btn" class="secondary-btn">Previous</button>
                            <button type="button" id="ecom-next-btn" class="main-submit-btn">Next</button>
                        </div>
                    </form>
                </div>
            </main>
        </div>

        <div id="seller-agreement-modal" class="modal-overlay">
            <div class="modal-content">
                <button class="close-btn" id="close-agreement-modal-btn">&times;</button>
                <h3>Seller Agreement</h3>
                <div id="agreement-text">... Agreement text here ...</div>
                <div class="agreement-actions">
                    <div class="checkbox-wrapper task-completion-checkbox"><input type="checkbox" id="agreement-checkbox"><label for="agreement-checkbox">I agree</label></div>
                    <div>
                        <button id="agreement-proceed-btn" class="main-submit-btn" disabled>Accept</button>
                        <button id="download-agreement-pdf-btn" class="secondary-btn">Download PDF</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}


/**
 * Handles switching between tabs in the E-commerce Hub.
 * This function correctly manages the visibility and active states of tabs and views.
 * @param tab The tab to switch to.
 */
const switchEcomTab = (tab: 'dashboard' | 'my-products' | 'add-product') => {
    const hubView = document.getElementById('ecom-view-hub-dashboard');
    const productsView = document.getElementById('ecom-view-my-products');
    const addProductView = document.getElementById('ecom-view-add-product');
    const hubBtn = document.getElementById('ecom-hub-btn');
    const productsBtn = document.getElementById('ecom-my-products-btn');
    const addProductBtn = document.getElementById('ecom-add-product-btn');

    if (!hubView || !productsView || !addProductView || !hubBtn || !productsBtn || !addProductBtn) return;
    
    // Hide all views
    hubView.classList.add('hidden');
    productsView.classList.add('hidden');
    addProductView.classList.add('hidden');
    
    // Deactivate all buttons
    hubBtn.classList.remove('active');
    productsBtn.classList.remove('active');
    addProductBtn.classList.remove('active');

    // Activate the correct view and button
    if (tab === 'dashboard') {
        hubView.classList.remove('hidden');
        hubBtn.classList.add('active');
    } else if (tab === 'my-products') {
        renderEcomDashboard();
        productsView.classList.remove('hidden');
        productsBtn.classList.add('active');
    } else { // add-product
        addProductView.classList.remove('hidden');
        addProductBtn.classList.add('active');
    }
};

const renderEcomDashboard = () => {
    const productGrid = document.getElementById('ecom-product-grid');
    const emptyState = document.getElementById('ecom-empty-state');
    if (!productGrid || !emptyState) return;

    if (State.ecomProducts.length === 0) {
        productGrid.classList.add('hidden');
        emptyState.classList.remove('hidden');
    } else {
        productGrid.classList.remove('hidden');
        emptyState.classList.add('hidden');
        productGrid.innerHTML = State.ecomProducts.map(p => {
            let stockStatus = 'live';
            let stockText = `${p.stock} units`;
            if (p.stock === 0) {
                stockStatus = 'out-of-stock';
                stockText = 'Out of Stock';
            } else if (p.stock > 0 && p.stock <= 10) {
                stockStatus = 'low-stock';
                stockText = `Low Stock (${p.stock} units)`;
            }
            
            const specsHtml = p.specifications && p.specifications.length > 0
                ? `<ul class="product-specs-list">
                        ${p.specifications.map(s => `<li><span>${s.key}:</span> ${s.value}</li>`).join('')}
                   </ul>`
                : '';

            return `
                <div class="ecom-product-card" data-id="${p.id}">
                    ${p.productType === 'external' ? '<span class="external-link-badge">External Link</span>' : ''}
                    <img src="${p.imageUrl}" alt="${p.name}" class="product-card-image">
                    <div class="product-card-details">
                        <div class="product-card-header">
                            <h4>${p.name}</h4>
                            ${p.productType === 'physical' ? `<span class="stock-level status-${stockStatus}">${stockText}</span>` : ''}
                        </div>
                        ${specsHtml}
                        <div class="product-card-footer">
                            <div class="product-card-price">$${p.price.toFixed(2)}</div>
                            <div class="product-card-actions">
                                <button class="secondary-btn edit-product-btn">Edit</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        document.querySelectorAll('.edit-product-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const card = (e.currentTarget as HTMLElement).closest<HTMLElement>('.ecom-product-card');
                const productId = Number(card?.dataset.id);
                if (productId) {
                    handleEditProduct(productId);
                }
            });
        });
    }
};

const handleEditProduct = (productId: number) => {
    const product = State.ecomProducts.find(p => p.id === productId);
    if (!product) return;
    
    setState({ ecomEditingProductId: productId });
    populateEcomForm(product);
    switchEcomTab('add-product');
};


const populateEcomForm = (product: EcomProduct) => {
    resetEcomWizard();
    setState({ ecomProductType: product.productType });

    // Update titles
    (document.getElementById('ecom-wizard-step1-title') as HTMLHeadingElement).textContent = 'Step 1: Edit Core Product Details';
    (document.getElementById('ecom-wizard-step4-title') as HTMLHeadingElement).textContent = 'Step 4: Review & Update';
    (document.getElementById('ecom-success-title') as HTMLHeadingElement).textContent = 'Product Updated!';

    // Step 1 - Product Type Button
    document.querySelectorAll('#ecom-product-type-selector .service-type-btn').forEach(b => b.classList.remove('active'));
    const activeButton = document.querySelector(`#ecom-product-type-selector .service-type-btn[data-product-type="${product.productType}"]`);
    activeButton?.classList.add('active');

    toggleProductTypeFields();
    (document.getElementById('ecom-product-name') as HTMLInputElement).value = product.name;
    (document.getElementById('ecom-product-description') as HTMLTextAreaElement).value = product.description || '';

    // Step 2
    (document.getElementById('ecom-product-category') as HTMLInputElement).value = product.category || '';
    (document.getElementById('ecom-product-brand') as HTMLInputElement).value = product.brand || '';
    (document.getElementById('ecom-specs-list') as HTMLUListElement).innerHTML = '';
    product.specifications?.forEach(spec => addSpecRow(spec.key, spec.value));
    
    // Step 3
    if(product.productType === 'physical') {
        (document.getElementById('ecom-product-stock') as HTMLInputElement).value = String(product.stock);
    } else {
        (document.getElementById('product-link') as HTMLInputElement).value = product.externalLink || '';
    }
    (document.getElementById('ecom-product-price') as HTMLInputElement).value = String(product.price);
    updateCommissionDisplay();

    // Go to first step
    goToEcomStep(1);
};


const handleListProductClick = () => {
    // Agreement check is now moved to the end of the flow
    resetEcomWizard();
    switchEcomTab('add-product');
};

const handleAgreementProceed = () => {
    localStorage.setItem('vcanship-seller-agreement-accepted', 'true');
    (document.getElementById('seller-agreement-modal') as HTMLDivElement).classList.remove('active');
    // Now that the user has agreed, proceed with publishing the product.
    handleSaveProduct();
};

const handleDownloadAgreement = () => {
    const doc = new jsPDF();
    const pageMargin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    const contentWidth = pageWidth - (pageMargin * 2);
    let cursorY = 20;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Vcanship Seller Agreement', pageWidth / 2, cursorY, { align: 'center' });
    cursorY += 15;

    const agreementContainer = (document.getElementById('agreement-text') as HTMLDivElement);
    const elements = Array.from(agreementContainer.children);

    elements.forEach(element => {
        const el = element as HTMLElement;
        if (cursorY > 270) { // Add new page if content overflows
            doc.addPage();
            cursorY = 20;
        }

        const isBold = el.tagName === 'P' && el.querySelector('strong');
        const textContent = (el.textContent || '').trim();
        
        doc.setFont('helvetica', isBold ? 'bold' : 'normal');
        doc.setFontSize(isBold ? 11 : 10);
        
        const splitText = doc.splitTextToSize(textContent, contentWidth);
        doc.text(splitText, pageMargin, cursorY);
        cursorY += (splitText.length * 5) + (isBold ? 6 : 5);
    });
    
    // Add signature section at the end
    cursorY += 20;
     if (cursorY > 260) {
        doc.addPage();
        cursorY = 20;
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text("By proceeding with product listing, the Seller acknowledges their acceptance of these terms.", pageMargin, cursorY);
    cursorY += 20;

    doc.text("Seller's Signature (Electronic Acceptance): ", pageMargin, cursorY);
    doc.line(pageMargin + 80, cursorY, pageWidth - pageMargin, cursorY);
    cursorY += 15;
    
    doc.text("Date: ", pageMargin, cursorY);
    doc.line(pageMargin + 15, cursorY, pageMargin + 70, cursorY);
    
    doc.save('Vcanship-Seller-Agreement.pdf');
};


const resetEcomWizard = () => {
    setState({ ecomEditingProductId: null });
    (document.getElementById('ecom-wizard-container') as HTMLFormElement).reset();
    (document.getElementById('ecom-specs-list') as HTMLUListElement).innerHTML = '';
    (document.getElementById('ecom-review-pane') as HTMLDivElement).classList.remove('hidden');
    (document.getElementById('ecom-publish-success') as HTMLDivElement).classList.add('hidden');
    (document.getElementById('commission-display') as HTMLSpanElement).textContent = '$0.00';
    (document.getElementById('seller-earnings') as HTMLSpanElement).textContent = '$0.00';
    (document.getElementById('ecom-wizard-step1-title') as HTMLHeadingElement).textContent = 'Step 1: Core Product Details';
    (document.getElementById('ecom-wizard-step4-title') as HTMLHeadingElement).textContent = 'Step 4: Review & Publish';
    (document.getElementById('ecom-success-title') as HTMLHeadingElement).textContent = 'Product Published!';
    setState({ ecomProductType: 'physical' });
    
    // Reset product type buttons
    document.querySelectorAll('#ecom-product-type-selector .service-type-btn').forEach(b => b.classList.remove('active'));
    const physicalBtn = document.querySelector('#ecom-product-type-selector .service-type-btn[data-product-type="physical"]');
    physicalBtn?.classList.add('active');

    toggleProductTypeFields();
    goToEcomStep(1);
};

const goToEcomStep = (step: number) => {
    setState({ ecomCurrentWizardStep: step });
    document.querySelectorAll('#ecom-wizard-container .wizard-step').forEach(s => s.classList.remove('active'));
    document.getElementById(`ecom-step-${step}`)?.classList.add('active');

    updateProgressBar('ecommerce', step - 1);

    (document.getElementById('ecom-prev-btn') as HTMLButtonElement).disabled = step === 1;
    (document.getElementById('ecom-next-btn') as HTMLButtonElement).textContent = step === 4 ? (State.ecomEditingProductId ? 'Update Product' : 'Publish Product') : 'Next';
};

/**
 * Checks if the user has accepted the seller agreement before publishing.
 * If not, it shows the agreement modal. Otherwise, it saves the product.
 */
const attemptToPublishProduct = () => {
    const hasAgreed = localStorage.getItem('vcanship-seller-agreement-accepted') === 'true';
    if (!hasAgreed && !State.ecomEditingProductId) { // Only show for new products
        (document.getElementById('seller-agreement-modal') as HTMLDivElement).classList.add('active');
    } else {
        handleSaveProduct();
    }
};

const handleEcomNav = (direction: 'next' | 'prev') => {
    const currentStep = State.ecomCurrentWizardStep;
    let nextStep = direction === 'next' ? currentStep + 1 : currentStep - 1;
    if (nextStep > 4) {
        // This is the final step, attempt to publish.
        attemptToPublishProduct();
        return;
    }
    if (nextStep < 1) nextStep = 1;
    goToEcomStep(nextStep);
};

const addSpecRow = (key = '', value = '') => {
    const specsList = document.getElementById('ecom-specs-list');
    if (!specsList) return;

    const li = document.createElement('li');
    li.className = 'spec-item';
    li.innerHTML = `
        <div class="input-wrapper">
            <label class="hidden">Attribute</label>
            <input type="text" class="spec-key" placeholder="Attribute (e.g., Color)" value="${key}" required>
        </div>
        <div class="input-wrapper">
            <label class="hidden">Value</label>
            <input type="text" class="spec-value" placeholder="Value (e.g., Blue)" value="${value}" required>
        </div>
        <button type="button" class="remove-spec-btn" aria-label="Remove specification">&times;</button>
    `;
    specsList.appendChild(li);
    li.querySelector('.remove-spec-btn')?.addEventListener('click', () => li.remove());
};

const updateCommissionDisplay = () => {
    const priceInput = document.getElementById('ecom-product-price') as HTMLInputElement;
    const commissionDisplay = document.getElementById('commission-display') as HTMLSpanElement;
    const sellerEarnings = document.getElementById('seller-earnings') as HTMLSpanElement;

    if (!priceInput || !commissionDisplay || !sellerEarnings) return;

    const price = parseFloat(priceInput.value) || 0;
    const commission = price * COMMISSION_RATE;
    const earnings = price - commission;
    commissionDisplay.textContent = `$${commission.toFixed(2)}`;
    sellerEarnings.textContent = `$${earnings.toFixed(2)}`;
};

const handleSaveProduct = () => {
    // --- Form validation should go here ---

    const newProduct: EcomProduct = {
        id: State.ecomEditingProductId || Date.now(),
        name: (document.getElementById('ecom-product-name') as HTMLInputElement).value,
        description: (document.getElementById('ecom-product-description') as HTMLTextAreaElement).value,
        category: (document.getElementById('ecom-product-category') as HTMLInputElement).value,
        brand: (document.getElementById('ecom-product-brand') as HTMLInputElement).value,
        specifications: Array.from(document.querySelectorAll('#ecom-specs-list .spec-item')).map(item => {
            const el = item as HTMLElement;
            return {
                key: (el.querySelector('.spec-key') as HTMLInputElement).value,
                value: (el.querySelector('.spec-value') as HTMLInputElement).value
            };
        }),
        price: parseFloat((document.getElementById('ecom-product-price') as HTMLInputElement).value),
        stock: State.ecomProductType === 'physical' ? parseInt((document.getElementById('ecom-product-stock') as HTMLInputElement).value) : 999,
        imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100', // Placeholder
        productType: State.ecomProductType,
        externalLink: State.ecomProductType === 'external' ? (document.getElementById('product-link') as HTMLInputElement).value : undefined,
        status: 'Live' // Default
    };

    // Determine stock status
    if (newProduct.productType === 'physical') {
        if (newProduct.stock === 0) newProduct.status = 'Out of Stock';
        else if (newProduct.stock <= 10) newProduct.status = 'Low Stock';
        else newProduct.status = 'Live';
    }


    if (State.ecomEditingProductId) {
        const index = State.ecomProducts.findIndex(p => p.id === State.ecomEditingProductId);
        State.ecomProducts[index] = newProduct;
    } else {
        State.ecomProducts.push(newProduct);
    }

    (document.getElementById('ecom-review-pane') as HTMLDivElement).classList.add('hidden');
    (document.getElementById('ecom-publish-success') as HTMLDivElement).classList.remove('hidden');
};

const handleDownloadProductPDF = () => {
    const productId = State.ecomEditingProductId || State.ecomProducts[State.ecomProducts.length - 1]?.id;
    const product = State.ecomProducts.find(p => p.id === productId);
    if (!product) return;
    
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
    doc.text('Product Listing Summary', 105, 45, { align: 'center' });
    
    doc.setFontSize(14);
    doc.text(product.name, 15, 60);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Type: ${product.productType === 'physical' ? 'Physical Product' : 'External/Digital'}`, 15, 68);

    autoTable(doc, {
        startY: 75,
        head: [['Field', 'Value']],
        body: [
            ['Price', `$${product.price.toFixed(2)}`],
            ['Stock', product.productType === 'physical' ? `${product.stock} units` : 'N/A'],
            ['Category', product.category || 'N/A'],
            ['Brand', product.brand || 'N/A'],
            ['Description', product.description || 'N/A'],
            ...(product.productType === 'external' ? [['Link', product.externalLink || 'N/A']] : [])
        ],
        styles: {
            cellPadding: 2,
            fontSize: 10,
        },
        headStyles: {
            fillColor: [41, 128, 185], // A shade of blue
            textColor: 255,
            fontStyle: 'bold',
        },
        alternateRowStyles: {
            fillColor: [245, 245, 245],
        },
    });

    if (product.specifications && product.specifications.length > 0) {
        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 10,
            head: [['Specification', 'Value']],
            body: product.specifications.map(spec => [spec.key, spec.value]),
             styles: {
                cellPadding: 2,
                fontSize: 10,
            },
            headStyles: {
                fillColor: [41, 128, 185],
                textColor: 255,
                fontStyle: 'bold',
            },
        });
    }

    doc.save(`${product.name.replace(/\s/g, '_')}_Summary.pdf`);
};

const toggleProductTypeFields = () => {
    const isPhysical = State.ecomProductType === 'physical';
    (document.getElementById('ecom-physical-product-fields') as HTMLDivElement).classList.toggle('hidden', !isPhysical);
    (document.getElementById('ecom-external-product-fields') as HTMLDivElement).classList.toggle('hidden', isPhysical);
    
    // Update required fields
    (document.getElementById('ecom-product-stock') as HTMLInputElement).required = isPhysical;
    (document.getElementById('product-link') as HTMLInputElement).required = !isPhysical;
};

export const startEcom = () => {
    try {
        setState({ currentService: 'ecommerce' });
        renderEcomPage();
        switchPage('ecommerce');
        resetEcomWizard();

        // Re-query and attach event listeners every time the service starts
        const ecomHubBtn = document.getElementById('ecom-hub-btn');
        const ecomMyProductsBtn = document.getElementById('ecom-my-products-btn');
        const ecomAddProductBtn = document.getElementById('ecom-add-product-btn');
        const ecomListProductCtaHero = document.getElementById('ecom-list-product-cta-hero');
        const ecomAddNewFromEmptyBtn = document.getElementById('ecom-add-new-from-empty-btn');
        const ecomPrevBtn = document.getElementById('ecom-prev-btn');
        const ecomNextBtn = document.getElementById('ecom-next-btn');
        const addSpecBtn = document.getElementById('add-spec-btn');
        const ecomProductPrice = document.getElementById('ecom-product-price');
        const sellerAgreementModal = document.getElementById('seller-agreement-modal');
        const closeAgreementModalBtn = document.getElementById('close-agreement-modal-btn');
        const agreementCheckbox = document.getElementById('agreement-checkbox') as HTMLInputElement;
        const agreementProceedBtn = document.getElementById('agreement-proceed-btn') as HTMLButtonElement;
        const downloadAgreementPdfBtn = document.getElementById('download-agreement-pdf-btn');
        const listAnotherProductBtn = document.getElementById('list-another-product-btn');
        const ecomDownloadPdfBtn = document.getElementById('ecom-download-pdf-btn');
        const ecomProductTypeSelector = document.getElementById('ecom-product-type-selector');

        ecomHubBtn?.addEventListener('click', () => switchEcomTab('dashboard'));
        ecomMyProductsBtn?.addEventListener('click', () => switchEcomTab('my-products'));
        ecomAddProductBtn?.addEventListener('click', () => switchEcomTab('add-product'));
        ecomListProductCtaHero?.addEventListener('click', handleListProductClick);
        ecomAddNewFromEmptyBtn?.addEventListener('click', handleListProductClick);

        ecomPrevBtn?.addEventListener('click', () => handleEcomNav('prev'));
        ecomNextBtn?.addEventListener('click', () => handleEcomNav('next'));

        addSpecBtn?.addEventListener('click', () => addSpecRow());
        ecomProductPrice?.addEventListener('input', updateCommissionDisplay);

        closeAgreementModalBtn?.addEventListener('click', () => sellerAgreementModal?.classList.remove('active'));
        agreementCheckbox?.addEventListener('change', () => { agreementProceedBtn.disabled = !agreementCheckbox.checked; });
        agreementProceedBtn?.addEventListener('click', handleAgreementProceed);
        downloadAgreementPdfBtn?.addEventListener('click', handleDownloadAgreement);

        listAnotherProductBtn?.addEventListener('click', resetEcomWizard);
        ecomDownloadPdfBtn?.addEventListener('click', handleDownloadProductPDF);

        ecomProductTypeSelector?.querySelectorAll('.service-type-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const productType = (btn as HTMLElement).dataset.productType as ProductType;
                setState({ ecomProductType: productType });
                ecomProductTypeSelector.querySelectorAll('.service-type-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                toggleProductTypeFields();
            });
        });
    } catch (error) {
        console.error("Failed to initialize E-commerce service:", error);
        showToast("Could not load the E-commerce service.", "error");
        switchPage('landing');
    }
};
