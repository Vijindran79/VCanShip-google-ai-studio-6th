
// ⚠️  READ-ONLY — DO NOT EDIT — SERVICE LOCKED ⚠️
// --- INTERFACES & TYPES ---
import { showToast } from './ui';

interface Locale {
  countryCode: string;
  countryName: string;
  currency: {
    code: string;
    symbol: string;
  };
}

interface Language {
    code: string;
    name: string;
}

// --- MODULE STATE ---
let locales: Locale[] = [];
let languages: Language[] = [];
let filteredLocales: Locale[] = [];

// Main state for the app
let selectedCountry: Locale | null = null;
let selectedLanguage: string | null = null;

// Temporary state for selections within the modal
let modalSelectedCountry: Locale | null = null;
let modalSelectedLanguage: string | null = null;

let isModalOpen = false;

// --- DOM ELEMENT REFERENCES ---
const elements = {
    container: null as HTMLElement | null,
    // Modal elements
    modal: null as HTMLElement | null,
    closeBtn: null as HTMLButtonElement | null,
    cancelBtn: null as HTMLButtonElement | null,
    confirmBtn: null as HTMLButtonElement | null,
    searchInput: null as HTMLInputElement | null,
    countryList: null as HTMLUListElement | null,
    previewPanel: null as HTMLElement | null,
};

// --- UTILITIES ---

function countryCodeToFlag(isoCode: string): string {
  if (!isoCode || isoCode.length !== 2 || !/^[A-Z]{2}$/.test(isoCode.toUpperCase())) {
    return '🏳️';
  }
  const base = 127397;
  return String.fromCodePoint(
    ...isoCode.toUpperCase().split('').map(char => base + char.charCodeAt(0))
  );
}

const debounce = <T extends (...args: any[]) => void>(func: T, wait: number): ((...args: Parameters<T>) => void) => {
    let timeout: number | undefined;
    return function(this: ThisParameterType<T>, ...args: Parameters<T>) {
        clearTimeout(timeout);
        timeout = window.setTimeout(() => func.apply(this, args), wait);
    };
};

// --- CORE LOGIC & EVENT DISPATCHING ---

function dispatchLocaleChangeEvent() {
  if (!selectedCountry || !selectedLanguage) return;
  const event = new CustomEvent('locale-change', {
    detail: {
      country: selectedCountry.countryCode,
      language: selectedLanguage,
      currency: selectedCountry.currency,
    },
  });
  window.dispatchEvent(event);
}

export function setLocaleByCountryName(countryName: string) {
    if (!locales.length) return;
    let searchTerm = countryName.toLowerCase().trim();
    const abbreviations: { [key: string]: string } = { 'uk': 'united kingdom', 'usa': 'united states', 'uae': 'united arab emirates', 'us': 'united states', 'gb': 'united kingdom' };
    if (abbreviations[searchTerm]) searchTerm = abbreviations[searchTerm];
    
    const country = locales.find(l => l.countryName.toLowerCase() === searchTerm || l.countryCode.toLowerCase() === searchTerm);

    if (country && country.countryCode !== selectedCountry?.countryCode) {
        selectedCountry = country;
        // Do not change the user's selected language automatically.
        // Only set a default if one has never been chosen.
        if (!selectedLanguage) {
            selectedLanguage = 'en';
            localStorage.setItem('vcanship_language', selectedLanguage);
        }
        localStorage.setItem('vcanship_country', selectedCountry.countryCode);
        renderHeaderButton();
        dispatchLocaleChangeEvent();
        showToast(`Currency auto-switched to ${country.currency.code}.`, 'info', 2000);
    }
}

// --- UI RENDERING & UPDATES ---

function renderHeaderButton() {
    if (!elements.container || !selectedCountry) return;
    elements.container.innerHTML = `
        <button class="locale-header-btn" aria-label="Change region and language">
            <span class="locale-flag">${countryCodeToFlag(selectedCountry.countryCode)}</span>
            <span>${selectedCountry.currency.code} (${selectedCountry.currency.symbol})</span>
        </button>
    `;
    elements.container.querySelector('.locale-header-btn')?.addEventListener('click', openLocaleModal);
}

function renderCountryList() {
    if (!elements.countryList) return;
    if (filteredLocales.length === 0) {
        elements.countryList.innerHTML = `<li class="helper-text" style="padding: 1rem; text-align: center;">No countries found.</li>`;
        return;
    }
    elements.countryList.innerHTML = filteredLocales.map(country => `
        <li class="locale-modal-list-item" role="option" id="country-${country.countryCode}" data-country-code="${country.countryCode}">
            <span class="locale-flag">${countryCodeToFlag(country.countryCode)}</span>
            <span class="locale-country-name">${country.countryName}</span>
            <span class="locale-currency-code">${country.currency.code}</span>
        </li>
    `).join('');

    // Highlight the currently selected country in the modal
    if(modalSelectedCountry) {
        const selectedItem = elements.countryList.querySelector(`[data-country-code="${modalSelectedCountry.countryCode}"]`);
        selectedItem?.classList.add('selected');
    }
}

function renderPreviewPanel() {
    if (!elements.previewPanel) return;
    if (!modalSelectedCountry) {
        elements.previewPanel.innerHTML = `<p class="helper-text">Select a country from the list to see options.</p>`;
        return;
    }
    
    // The language dropdown is now populated from the global list
    elements.previewPanel.innerHTML = `
        <div class="locale-preview-flag">${countryCodeToFlag(modalSelectedCountry.countryCode)}</div>
        <h4 class="locale-preview-name">${modalSelectedCountry.countryName}</h4>
        <div class="locale-preview-details" style="width: 100%;">
            <div class="input-wrapper" style="margin-bottom: 1rem;">
                <label>Language</label>
                <select id="modal-language-select" class="input-wrapper">
                    ${languages.map(lang => `<option value="${lang.code}">${lang.name}</option>`).join('')}
                </select>
            </div>
            <div class="input-wrapper">
                 <label>Currency</label>
                 <p style="font-weight: bold;">${modalSelectedCountry.currency.code} (${modalSelectedCountry.currency.symbol})</p>
            </div>
        </div>
    `;

    const langSelect = document.getElementById('modal-language-select') as HTMLSelectElement;
    langSelect.value = modalSelectedLanguage || 'en'; // Default to English
    langSelect.addEventListener('change', () => {
        modalSelectedLanguage = langSelect.value;
    });
}

// --- MODAL MANAGEMENT ---

function openLocaleModal() {
    if (!elements.modal) return;
    // Set modal state to match current app state
    modalSelectedCountry = selectedCountry;
    modalSelectedLanguage = selectedLanguage;

    elements.modal.classList.add('active');
    isModalOpen = true;
    
    renderCountryList();
    renderPreviewPanel();
    
    if (elements.confirmBtn) elements.confirmBtn.disabled = true;
    elements.searchInput?.focus();
}

function closeLocaleModal() {
    if (!elements.modal) return;
    elements.modal.classList.remove('active');
    isModalOpen = false;
}

// --- EVENT HANDLERS ---

const handleSearch = debounce(() => {
    if (!elements.searchInput) return;
    const term = elements.searchInput.value.toLowerCase();
    filteredLocales = locales.filter(l =>
        l.countryName.toLowerCase().includes(term) ||
        l.countryCode.toLowerCase().includes(term)
    );
    renderCountryList();
}, 200);

function handleCountryPreview(e: Event) {
    const target = e.target as HTMLElement;
    const item = target.closest<HTMLElement>('.locale-modal-list-item');
    if (item?.dataset.countryCode) {
        const country = locales.find(l => l.countryCode === item.dataset.countryCode);
        if (country) {
            modalSelectedCountry = country;
            // When a new country is selected, we don't change the language automatically.
            // The currently selected language in the modal remains.
            renderCountryList(); // Re-render to show selection highlight
            renderPreviewPanel();
            if (elements.confirmBtn) elements.confirmBtn.disabled = false;
        }
    }
}

function handleConfirmSelection() {
    if (!modalSelectedCountry || !modalSelectedLanguage) return;
    
    selectedCountry = modalSelectedCountry;
    selectedLanguage = modalSelectedLanguage;
    
    localStorage.setItem('vcanship_country', selectedCountry.countryCode);
    localStorage.setItem('vcanship_language', selectedLanguage);

    renderHeaderButton();
    dispatchLocaleChangeEvent();
    closeLocaleModal();
}

function attachEventListeners() {
    elements.searchInput?.addEventListener('input', handleSearch);
    elements.countryList?.addEventListener('click', handleCountryPreview);
    elements.confirmBtn?.addEventListener('click', handleConfirmSelection);
    elements.closeBtn?.addEventListener('click', closeLocaleModal);
    elements.cancelBtn?.addEventListener('click', closeLocaleModal);
    
    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isModalOpen) {
            closeLocaleModal();
        }
    });
}

// --- INITIALIZATION ---

export async function initializeLocaleSwitcher() {
    elements.container = document.getElementById('locale-switcher-container');
    if (!elements.container) return;

    // Cache modal elements once
    elements.modal = document.getElementById('locale-modal');
    elements.closeBtn = document.getElementById('close-locale-modal-btn') as HTMLButtonElement;
    elements.cancelBtn = document.getElementById('cancel-locale-modal-btn') as HTMLButtonElement;
    elements.confirmBtn = document.getElementById('confirm-locale-btn') as HTMLButtonElement;
    elements.searchInput = document.getElementById('locale-search-input') as HTMLInputElement;
    elements.countryList = document.getElementById('locale-modal-list') as HTMLUListElement;
    elements.previewPanel = document.getElementById('locale-selection-preview');

    try {
        const [localesResponse, languagesResponse] = await Promise.all([
            fetch('./locales.json'),
            fetch('./languages.json')
        ]);
        if (!localesResponse.ok) throw new Error(`HTTP error! status: ${localesResponse.status}`);
        if (!languagesResponse.ok) throw new Error(`HTTP error! status: ${languagesResponse.status}`);
        
        locales = await localesResponse.json();
        languages = await languagesResponse.json();
        filteredLocales = [...locales];

        attachEventListeners();

        let initialCountryCode = localStorage.getItem('vcanship_country');
        if (!initialCountryCode) {
            try {
                const geoResponse = await fetch('https://ipapi.co/json/');
                if (geoResponse.ok) {
                    const geoData = await geoResponse.json();
                    if (locales.some(l => l.countryCode === geoData.country_code)) {
                        initialCountryCode = geoData.country_code;
                    }
                }
            } catch (geoError) {
                console.warn('Could not detect user country.', geoError);
            }
        }

        if (!initialCountryCode) initialCountryCode = 'US'; 

        const savedLanguage = localStorage.getItem('vcanship_language');
        const initialCountry = locales.find(l => l.countryCode === initialCountryCode) || locales[0];

        selectedCountry = initialCountry;
        // Check if saved language is valid in our new global list, otherwise default to English.
        selectedLanguage = (savedLanguage && languages.some(l => l.code === savedLanguage))
            ? savedLanguage
            : 'en';
        
        localStorage.setItem('vcanship_country', selectedCountry.countryCode);
        localStorage.setItem('vcanship_language', selectedLanguage);

        renderHeaderButton();
        dispatchLocaleChangeEvent();

    } catch (error) {
        console.error('Failed to initialize Locale Switcher:', error);
        if (elements.container) elements.container.innerHTML = '<p>Error</p>';
    }
}
