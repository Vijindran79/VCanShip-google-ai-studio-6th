// ⚠️  READ-ONLY — DO NOT EDIT — SERVICE LOCKED ⚠️
import { showToast, switchPage, showAuthModal, toggleLoading } from './ui';
import { State, setState, type Service, Page } from './state';

// Static imports for all service modules
import { startParcel } from './parcel';
import { startBaggage } from './baggage';
import { startFcl } from './fcl';
import { startLcl } from './lcl';
import { startAirfreight } from './airfreight';
import { startVehicle } from './vehicle';
import { startRailway } from './railway';
import { startInland } from './inland';
import { startBulk } from './bulk';
import { startRiverTug } from './rivertug';
import { startWarehouse } from './warehouse';
import { startEcom } from './ecommerce';
import { startSchedules } from './schedules';
import { startRegister } from './register';
import { startServiceProviderRegister } from './service-provider-register';

// Static pages are handled directly by switchPage
const staticPageRoutes: Page[] = [
    'dashboard',
    'address-book',
    'settings',
    'api-hub',
    'help',
    'privacy',
    'terms',
];

/**
 * Retrieves the correct start function for a given service.
 * This approach is more robust than a static object map, as it defers the function resolution.
 * @param service The key of the service.
 * @returns The start function or null if not found.
 */
function getServiceModule(service: string): (() => void) | null {
    switch (service) {
        case 'parcel': return startParcel;
        case 'baggage': return startBaggage;
        case 'fcl': return startFcl;
        case 'lcl': return startLcl;
        case 'airfreight': return startAirfreight;
        case 'vehicle': return startVehicle;
        case 'railway': return startRailway;
        case 'inland': return startInland;
        case 'bulk': return startBulk;
        case 'rivertug': return startRiverTug;
        case 'warehouse': return startWarehouse;
        case 'ecommerce': return startEcom;
        case 'schedules': return startSchedules;
        case 'register': return startRegister;
        case 'service-provider-register': return startServiceProviderRegister;
        default: return null;
    }
}


/**
 * Mounts a service page based on the service key.
 * @param service The key of the service to mount.
 */
export const mountService = async (service: string) => {
    // Service provider registration is a public page and doesn't require login
    if (service === 'service-provider-register') {
        // Fall through to logic
    } else {
        // Services that require a user to be logged in.
        const servicesRequiringAuth = [
            'ecommerce',
            'dashboard',
            'address-book',
            'settings'
        ];

        if (servicesRequiringAuth.includes(service) && !State.isLoggedIn) {
            setState({ postLoginRedirectService: service as Service });
            showAuthModal();
            return;
        }
    }
    
    // Handle static/account pages
    if (staticPageRoutes.includes(service as Page)) {
        setState({ currentService: service as Service });
        switchPage(service as Page);
        return;
    }
    
    const startFunction = getServiceModule(service);

    if (startFunction) {
        toggleLoading(true, `Loading service...`);
        try {
            // Artificial delay to simulate loading and allow UI to update
            await new Promise(res => setTimeout(res, 50));
            setState({ currentService: service as Service });
            startFunction();
        } catch (error) {
            console.error(`Failed to load service module for '${service}':`, error);
            showToast(`Could not load the ${service} service. Please try again.`, 'error');
            // Ensure we return to a stable state
            if (State.currentPage !== 'landing') {
                switchPage('landing');
            }
        } finally {
            toggleLoading(false);
        }
    } else {
        showToast(`The '${service}' service is not available yet.`, 'info');
        console.warn(`Attempted to mount unknown service: ${service}`);
    }
};