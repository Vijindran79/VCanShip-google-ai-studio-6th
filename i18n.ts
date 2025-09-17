// ⚠️  READ-ONLY — DO NOT EDIT — SERVICE LOCKED ⚠️
import { State } from './state';
import { DOMElements } from './dom';
// FIX: Import 'switchPage' from './ui' to resolve compilation errors where the function was used but not defined in the current scope.
import { switchPage } from './ui';

interface Translations {
  [key: string]: string | Translations;
}

let translations: Translations = {};
let currentLanguage = 'en';

/**
 * A simple key-based translation function (shortened to 't' for convenience).
 * It supports nested keys like 'home.title'.
 * @param key The key for the translation string (e.g., 'parcel.title').
 * @returns The translated string or the key itself if not found.
 */
export function t(key: string): string {
  const keys = key.split('.');
  let result: any = translations;
  for (const k of keys) {
    result = result?.[k];
    if (result === undefined) {
      console.warn(`Translation key not found: ${key}`);
      return key;
    }
  }
  return result as string;
}

/**
 * Fetches and loads the translation file for the given language.
 * @param lang The language code (e.g., 'en', 'es').
 */
async function loadTranslations(lang: string): Promise<void> {
  try {
    const response = await fetch(`./locales/${lang}.json`);
    if (!response.ok) {
      throw new Error(`Could not load translation file for ${lang}`);
    }
    translations = await response.json();
    currentLanguage = lang;
    document.documentElement.lang = lang;
  } catch (error) {
    console.error(error);
    // Fallback to English if the selected language fails to load
    if (lang !== 'en') {
        await loadTranslations('en');
    }
  }
}

/**
 * Updates static text elements in the main HTML that are not part of dynamic templates.
 */
export function updateStaticUIText() {
    // Header
    (document.querySelector('#home-logo-link h1') as HTMLElement).textContent = t('header.title');
    (DOMElements.trackBtn as HTMLButtonElement).textContent = t('header.track');
    (document.querySelector('.nav-link[data-page="landing"]') as HTMLElement).textContent = t('header.nav.services');
    (document.getElementById('header-dashboard-link') as HTMLElement).textContent = t('header.nav.dashboard');
    (document.querySelector('.nav-link[data-page="api-hub"]') as HTMLElement).textContent = t('header.nav.apiHub');
    (document.querySelector('.nav-link[data-page="help"]') as HTMLElement).textContent = t('header.nav.helpCenter');
    (DOMElements.loginBtn as HTMLButtonElement).textContent = t('header.login');
    (DOMElements.myAccountBtn as HTMLButtonElement).textContent = t('header.myAccount');

    // Footer
    (document.querySelector('.footer-links a[data-page="help"]') as HTMLElement).textContent = t('footer.helpCenter');
    (document.querySelector('.footer-links a[data-page="privacy"]') as HTMLElement).textContent = t('footer.privacyPolicy');
    (document.querySelector('.footer-links a[data-page="terms"]') as HTMLElement).textContent = t('footer.termsOfService');
    (DOMElements.complianceBtn as HTMLElement).textContent = t('footer.inspectorPortal');
    (document.querySelector('.footer-content p:last-child') as HTMLElement).textContent = t('footer.copyright');
    
    // Modals that might be visible
    const trackModalTitle = document.querySelector('#tracking-modal h3');
    if (trackModalTitle) trackModalTitle.textContent = t('modals.track.title');
}

/**
 * Initializes the i18n system.
 * It loads the initial language translations and sets up a listener for locale changes.
 */
export async function initializeI18n() {
  const savedLanguage = localStorage.getItem('vcanship_language') || 'en';
  await loadTranslations(savedLanguage);
  updateStaticUIText();

  window.addEventListener('locale-change', async (e) => {
    const detail = (e as CustomEvent).detail;
    if (detail.language && detail.language !== currentLanguage) {
      await loadTranslations(detail.language);
      // Re-render the current page to apply translations
      // This is a simple way to force a re-render. More complex apps might have better state management.
      const currentPage = State.currentPage;
      // A trick to force re-render of static pages
      if (document.getElementById(`page-${currentPage}`)?.innerHTML.includes('static-page-container')) {
          document.getElementById(`page-${currentPage}`)!.innerHTML = '';
      }
      switchPage('landing');
      setTimeout(() => switchPage(currentPage), 0);
      updateStaticUIText();
    }
  });
}