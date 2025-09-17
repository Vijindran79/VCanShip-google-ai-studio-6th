// ⚠️  READ-ONLY — DO NOT EDIT — SERVICE LOCKED ⚠️
// FIX: Changed type-only import to regular import
import { GoogleGenAI } from "@google/genai";

// --- Type Definitions ---
export type Service = 'parcel' | 'baggage' | 'fcl' | 'lcl' | 'railway' | 'bulk' | 'warehouse' | 'ecommerce' | 'schedules' | 'vehicle' | 'inland' | 'airfreight' | 'register' | 'rivertug' | 'service-provider-register';
export type Page = 'landing' | Service | 'results' | 'payment' | 'confirmation' | 'dashboard' | 'address-book' | 'settings' | 'api-hub' | 'help' | 'privacy' | 'terms';

export interface Address {
    id?: number;
    label?: string;
    name?: string;
    company?: string;
    street?: string;
    city?: string;
    postcode?: string;
    country?: string;
    email?: string;
    phone?: string;
    isDefault?: boolean;
}

export interface CostBreakdown {
    baseShippingCost: number;
    fuelSurcharge: number;
    estimatedCustomsAndTaxes: number;
    optionalInsuranceCost: number;
    ourServiceFee: number;
}

export interface Quote {
    carrierName: string;
    carrierType: string;
    estimatedTransitTime: string;
    chargeableWeight: number;
    chargeableWeightUnit: string;
    weightBasis: 'Actual' | 'Dimensional';
    totalCost: number;
    notes: string;
    isSpecialOffer: boolean;
    costBreakdown: CostBreakdown;
}


export interface ComplianceRequirement {
    type: 'License' | 'Certificate' | 'Restriction' | 'Tax' | 'Information';
    title: string;
    details: string;
}

export interface ComplianceReport {
    status: 'OK' | 'Requires Action' | 'Prohibited';
    summary: string;
    requirements: ComplianceRequirement[];
}

export interface DropOffLocation {
    name: string;
    address: string;
    hours: string;
    offersLabelPrinting: boolean;
    distance: string;
}

export interface CostSavingOpportunity {
    title: string;
    description: string;
}

export interface ApiResponse {
    itemWarning: string | null;
    suggestedHsCode: string | null;
    complianceReport: ComplianceReport;
    quotes: Quote[];
    dropOffLocations: DropOffLocation[];
    nextSteps: string;
    costSavingOpportunities: CostSavingOpportunity[] | null;
}


export interface PaymentContext {
    service: Service;
    quote: Quote;
    shipmentId: string;
    origin: string;
    destination: string;
}

export interface User {
    name: string;
    email: string;
}

export interface Shipment {
    id: string;
    service: Service;
    origin: string;
    destination: string;
    date: string; // YYYY-MM-DD
    cost: number;
    status: 'Delivered' | 'In Transit' | 'Booked' | 'Cancelled';
    carrier: string;
    isOnTime: boolean;
}


// --- Service-Specific Type Definitions ---

// E-commerce
export type ProductType = 'physical' | 'external' | 'digital';
export interface EcomProduct {
    id: number; name: string; description?: string; category?: string; brand?: string; specifications?: { key: string; value: string }[]; price: number; stock: number; imageUrl: string; productType: ProductType; externalLink?: string; status: 'Live' | 'Out of Stock' | 'Low Stock' | 'Draft';
}

// Baggage
export type BaggageServiceType = 'door-to-door' | 'door-to-airport' | 'airport-to-door' | 'airport-to-airport';
export interface BaggageDetails {
    serviceType: BaggageServiceType; pickupType: 'address' | 'location'; deliveryType: 'address' | 'location'; weight: number; serviceLevel: string; extraInsurance: boolean; insuredValue: number; purchasedTracker: boolean; shipmentId: string; pickupAddress: Address | null; pickupLocation: string | null; deliveryAddress: Address | null; deliveryLocation: string | null;
}

// Generic
export interface ComplianceDoc { id: string; title: string; description: string; status: 'pending' | 'uploaded' | 'rejected' | 'approved'; file: File | null; required: boolean; }

// FCL
export type FclServiceType = 'port-to-port' | 'port-to-door' | 'door-to-port' | 'door-to-door';
export interface FclContainer { type: string; quantity: number; weight: number; weightUnit: string; }
export interface FclDetails {
    serviceType: FclServiceType; pickupType: 'address' | 'location'; deliveryType: 'address' | 'location';
    pickupAddress: { name: string; country: string } | null; deliveryAddress: { name: string; country: string } | null;
    pickupPort: string | null; deliveryPort: string | null;
    cargoDescription: string; hsCode: string; containers: FclContainer[];
}
export interface FclFlashSlot { id: string; route: string; container: string; etd: string; slotsTotal: number; slotsSold: number; price: number; }

// Vehicle
export type ShippingMethod = 'roro' | 'container' | 'lolo' | 'heavylift';
export interface VehicleDetails {
    originPort: string; destPort: string; make: string; model: string; year: number; condition: 'new' | 'used';
    canRollOnDeck: boolean; length: number; width: number; height: number; weight: number;
}

// LCL
export interface LclCargoItem { id: number; pieces: number; length: number; width: number; height: number; weight: number; }
export type LclServiceLevel = 'standard' | 'priority' | 'express';
export interface LclDetails {
    originAddress: string;
    destAddress: string;
    cargoDescription: string;
    hsCode: string;
    useInlandTrucking: boolean;
    cargoItems: LclCargoItem[];
    isStackable: boolean;
    isHazardous: boolean;
    imdgClass: string | null;
    serviceLevel: LclServiceLevel;
    forwardingChoice?: 'vcanship' | 'booking_only';
    totalCbm?: number;
    chargeableWeight?: number;
}
export interface LclCubeSlot { id: string; route: string; etd: string; totalM3: number; soldM3: number; price: number; }

// Railway
export type RailwayCargoType = 'standard-container' | 'bulk-wagon' | 'special-cargo';
export type RailwayServiceLevel = 'standard' | 'express-block-train';
export interface RailwayDetails {
    originTerminal: string; destTerminal: string; cargoDescription: string; cargoType: RailwayCargoType; serviceLevel: RailwayServiceLevel;
}

// Bulk
export interface MasterCargoItem { name: string; category: string; vesselType: string; stowageFactor: number; isHazardous: boolean; hazardClass?: string; requiredDocs: {id: string; title: string; description: string}[]; }
export interface BrokerBid { id: string; brokerName: string; vesselName: string; rate: number; rateType: 'per_ton' | 'lumpsum'; totalCost: number; }
export type CharterType = 'voyage' | 'time';
export interface BulkDetails {
    selectedCargo: MasterCargoItem; vesselType: 'tanker' | 'barge' | 'break-bulk' | 'heavy-lift'; cargoVolume: number; stowageFactor: number; isHazardous: boolean;
    originPort: string; destPort: string; laycanFrom: string; laycanTo: string; charterType: CharterType;
    bids: BrokerBid[]; acceptedBid?: BrokerBid; signatureDataUrl?: string; bookingId?: string;
}

// Warehouse
export interface Facility { id: string; name: string; country: string; types: string[]; lat: number; lon: number; availability: number; price: number; }
export type WarehouseServiceLevel = 'standard' | 'value-added';
export interface WarehouseDetails {
    selectedFacility: Facility; cargoDescription: string; palletCount: number; requiresTempControl: boolean; tempMin?: number;
    isHazardous: boolean; unNumber: string | null; serviceLevel: WarehouseServiceLevel;
}

// Airfreight
export interface AirfreightCargoPiece { id: number; pieces: number; length: number; width: number; height: number; weight: number; }
export type AirfreightServiceLevel = 'standard' | 'priority' | 'charter';
export interface AirfreightDetails {
    cargoCategory: string; cargoDescription: string; hsCode: string; originAirport: string; destAirport: string;
    cargoPieces: AirfreightCargoPiece[]; chargeableWeight: number; serviceLevel: AirfreightServiceLevel;
}

// Inland
export type InlandVehicleType = 'curtainsider' | 'box' | 'flatbed' | 'tanker' | 'low-loader';
export interface Truck { id: string; driverName: string; driverRating: number; etaPickupMin: number; price: number; vehicleType: InlandVehicleType; gps_lat: number; gps_lon: number; }
export interface InlandDetails {
    originAddress: string; destAddress: string; originCoords: { lat: number, lng: number }; destCoords: { lat: number, lng: number };
    loadType: 'FTL' | 'LTL'; cargoDescription: string; weight: number; selectedTruck?: Truck; bookingId?: string;
}

// River Tug
export type BargeType = 'deck' | 'hopper' | 'tank' | 'spud';
export interface RiverTugDetails {
    originPort: string; destPort: string; cargoDescription: string; cargoVolume: number; bargeType: BargeType; isHazardous: boolean;
}

// Trade Finance
export interface TradeFinanceAssessment { riskLevel: 'Low' | 'Medium' | 'High'; preliminaryOffer: string; requiredDocuments: string[]; }


// --- Mock Data for Dashboard ---
export const shipmentHistory: Shipment[] = [
    { id: 'FCL-58D1A9', service: 'fcl', origin: 'Shanghai', destination: 'Rotterdam', date: '2024-07-10', cost: 4500, status: 'In Transit', carrier: 'Maersk', isOnTime: true },
    { id: 'PAR-9B3C44', service: 'parcel', origin: 'New York', destination: 'London', date: '2024-07-22', cost: 125, status: 'Delivered', carrier: 'DHL', isOnTime: true },
    { id: 'BGG-E27F81', service: 'baggage', origin: 'Los Angeles', destination: 'Tokyo', date: '2024-07-18', cost: 350, status: 'Delivered', carrier: 'FedEx', isOnTime: false },
    { id: 'LCL-A1B2C3', service: 'lcl', origin: 'Hamburg', destination: 'New York', date: '2024-06-30', cost: 850, status: 'Delivered', carrier: 'Kuehne+Nagel', isOnTime: true },
    { id: 'VEH-X7Y8Z9', service: 'vehicle', origin: 'Yokohama', destination: 'Long Beach', date: '2024-07-05', cost: 2200, status: 'In Transit', carrier: 'NYK Line', isOnTime: true },
    { id: 'AIR-L9K8J7', service: 'airfreight', origin: 'Hong Kong', destination: 'Frankfurt', date: '2024-07-24', cost: 3100, status: 'Booked', carrier: 'Lufthansa Cargo', isOnTime: true },
    { id: 'PAR-D5E6F7', service: 'parcel', origin: 'Paris', destination: 'Sydney', date: '2024-07-15', cost: 180, status: 'Delivered', carrier: 'UPS', isOnTime: true },
    { id: 'FCL-G8H9I0', service: 'fcl', origin: 'Singapore', destination: 'Los Angeles', date: '2024-07-01', cost: 3800, status: 'Delivered', carrier: 'CMA CGM', isOnTime: true },
];

// --- App State Interface ---
export interface AppState {
    api: GoogleGenAI | null;
    currentPage: Page;
    currentService: Service | null;
    lastQuote: ApiResponse | null;
    lastServiceQuotes: Quote[];
    paymentContext: PaymentContext | null;
    currentCurrency: { code: string; symbol: string; };

    // New World-Class Features State
    isLoggedIn: boolean;
    currentUser: User | null;
    addressBook: Address[];
    postLoginRedirectService: Service | null;

    // Service-specific states
    parcelOrigin: Partial<Address> | null;
    parcelDestination: Partial<Address> | null;
    parcelSelectedQuote: Quote | null;
    parcelPickupType: 'pickup' | 'dropoff';
    parcelSelectedDropoffLocation: { id: string; name: string; address: string; postcode: string; country: string; hasPrinting: boolean; } | null;
    parcelUserCoordinates: { lat: number; lng: number } | null;
    parcelInsuranceAdded: boolean;
    parcelDeclaredValue: number;
    parcelInsuranceCost: number;
    parcelPremiumTrackingAdded: boolean;
    parcelPremiumTrackingCost: number;


    // E-commerce State
    ecomProducts: EcomProduct[];
    ecomEditingProductId: number | null;
    ecomProductType: ProductType;
    ecomCurrentWizardStep: number;

    // Baggage State
    currentBaggageStep: 'details' | 'quote' | 'payment' | 'confirmation';
    baggageDetails: BaggageDetails | null;
    baggageQuote: number | null;
    baggageInsuranceCost: number;
    baggageTrackerCost: number;

    // FCL State
    currentFclStep: number;
    fclFlashSlots: FclFlashSlot[];
    fclDetails: FclDetails | null;
    fclQuote: Quote | null;
    fclComplianceDocs: ComplianceDoc[];
    fclSignatureDataUrl: string | null;
    fclBookingId: string | null;
    // FIX: Add properties for FCL insurance feature
    fclInsuranceAdded: boolean;
    fclDeclaredValue: number;
    fclInsuranceCost: number;
    // FIX: Add fclSlotIntervalId to AppState to fix type error in fcl.ts
    fclSlotIntervalId: number | null;

    // Vehicle State
    currentVehicleStep: number;
    vehicleDetails: VehicleDetails | null;
    vehicleShippingMethod: ShippingMethod | null;
    vehicleQuote: Quote | null;
    vehicleBookingId: string | null;

    // LCL State
    currentLclStep: number;
    lclCubeSlots: LclCubeSlot[];
    lclDetails: LclDetails | null;
    lclQuote: Quote | null;
    lclBookingId: string | null;
    lclComplianceDocs: ComplianceDoc[];

    // Railway State
    currentRailwayStep: number;
    railwayDetails: RailwayDetails | null;
    railwayComplianceDocs: ComplianceDoc[];
    railwayQuote: Quote | null;
    railwayBookingId: string | null;

    // Bulk State
    currentBulkStep: number;
    bulkDetails: BulkDetails | null;
    bulkComplianceDocs: ComplianceDoc[];

    // Warehouse State
    currentWarehouseStep: number;
    warehouseDetails: WarehouseDetails | null;
    warehouseComplianceDocs: ComplianceDoc[];
    warehouseBookingId: string | null;

    // Airfreight State
    currentAirfreightStep: number;
    airfreightDetails: AirfreightDetails | null;
    airfreightComplianceDocs: ComplianceDoc[];
    airfreightQuote: Quote | null;
    airfreightBookingId: string | null;
    
    // Inland State
    currentInlandStep: number;
    inlandDetails: InlandDetails | null;
    availableTrucks: Truck[];

    // River Tug State
    currentRiverTugStep: number;
    riverTugDetails: RiverTugDetails | null;
    riverTugComplianceDocs: ComplianceDoc[];
    riverTugQuote: Quote | null;
    riverTugBookingId: string | null;

    // Trade Finance State
    currentTradeFinanceStep: number;
    tradeFinanceService: string | null;
    tradeFinanceApplicationData: any | null;
    tradeFinanceAssessment: TradeFinanceAssessment | null;
}

// --- Initial State ---
const initialState: AppState = {
    api: null,
    currentPage: 'landing',
    currentService: null,
    lastQuote: null,
    lastServiceQuotes: [],
    paymentContext: null,
    currentCurrency: { code: 'USD', symbol: '$' },
    
    // New Features
    isLoggedIn: false,
    currentUser: null,
    addressBook: [],
    postLoginRedirectService: null,

    // Service States
    parcelOrigin: null,
    parcelDestination: null,
    parcelSelectedQuote: null,
    parcelPickupType: 'pickup',
    parcelSelectedDropoffLocation: null,
    parcelUserCoordinates: null,
    parcelInsuranceAdded: false,
    parcelDeclaredValue: 0,
    parcelInsuranceCost: 0,
    parcelPremiumTrackingAdded: false,
    parcelPremiumTrackingCost: 9.99,

    // E-commerce
    ecomProducts: [],
    ecomEditingProductId: null,
    ecomProductType: 'physical',
    ecomCurrentWizardStep: 1,

    // Baggage
    currentBaggageStep: 'details',
    baggageDetails: null,
    baggageQuote: null,
    baggageInsuranceCost: 0,
    baggageTrackerCost: 0,

    // FCL
    currentFclStep: 1,
    fclFlashSlots: [
        { id: 'fcl1', route: 'Shanghai → LA', container: '40\' HC', etd: '2024-08-01', slotsTotal: 10, slotsSold: 8, price: 4500 },
        { id: 'fcl2', route: 'Rotterdam → NYC', container: '20\' STD', etd: '2024-08-03', slotsTotal: 20, slotsSold: 19, price: 2800 },
    ],
    fclDetails: null,
    fclQuote: null,
    fclComplianceDocs: [],
    fclSignatureDataUrl: null,
    fclBookingId: null,
    // FIX: Initialize properties for FCL insurance feature
    fclInsuranceAdded: false,
    fclDeclaredValue: 0,
    fclInsuranceCost: 0,
    // FIX: Initialize fclSlotIntervalId in initialState
    fclSlotIntervalId: null,

    // Vehicle
    currentVehicleStep: 1,
    vehicleDetails: null,
    vehicleShippingMethod: null,
    vehicleQuote: null,
    vehicleBookingId: null,

    // LCL
    currentLclStep: 1,
    lclCubeSlots: [
         { id: 'lcl1', route: 'Singapore → Hamburg', etd: '2024-07-30', totalM3: 20, soldM3: 18.5, price: 120 },
         { id: 'lcl2', route: 'Qingdao → Felixstowe', etd: '2024-08-02', totalM3: 15, soldM3: 11, price: 95 },
    ],
    lclDetails: null,
    lclQuote: null,
    lclBookingId: null,
    lclComplianceDocs: [],

    // Railway
    currentRailwayStep: 1,
    railwayDetails: null,
    railwayComplianceDocs: [],
    railwayQuote: null,
    railwayBookingId: null,

    // Bulk
    currentBulkStep: 1,
    bulkDetails: null,
    bulkComplianceDocs: [],

    // Warehouse
    currentWarehouseStep: 1,
    warehouseDetails: null,
    warehouseComplianceDocs: [],
    warehouseBookingId: null,

    // Airfreight
    currentAirfreightStep: 1,
    airfreightDetails: null,
    airfreightComplianceDocs: [],
    airfreightQuote: null,
    airfreightBookingId: null,

    // Inland
    currentInlandStep: 1,
    inlandDetails: null,
    availableTrucks: [],

    // River Tug
    currentRiverTugStep: 1,
    riverTugDetails: null,
    riverTugComplianceDocs: [],
    riverTugQuote: null,
    riverTugBookingId: null,

    // Trade Finance
    currentTradeFinanceStep: 1,
    tradeFinanceService: null,
    tradeFinanceApplicationData: null,
    tradeFinanceAssessment: null,
};

// --- Global State ---
export let State: AppState = { ...initialState };

// --- State Management ---
export const setState = (newState: Partial<AppState>) => {
    State = { ...State, ...newState };
};

// --- State Reset Functions ---
export const resetBaggageState = () => {
    setState({
        currentBaggageStep: 'details',
        baggageDetails: null,
        baggageQuote: null,
        baggageInsuranceCost: 0,
        baggageTrackerCost: 0,
    });
};

export const resetFclState = () => {
    setState({
        currentFclStep: 1,
        fclDetails: null,
        fclQuote: null,
        fclComplianceDocs: [],
        fclSignatureDataUrl: null,
        fclBookingId: null,
        // FIX: Reset properties for FCL insurance feature
        fclInsuranceAdded: false,
        fclDeclaredValue: 0,
        fclInsuranceCost: 0,
    });
};

export const resetVehicleState = () => {
    setState({
        currentVehicleStep: 1,
        vehicleDetails: null,
        vehicleShippingMethod: null,
        vehicleQuote: null,
        vehicleBookingId: null,
    });
};

export const resetLclState = () => {
    setState({
        currentLclStep: 1,
        lclDetails: null,
        lclQuote: null,
        lclBookingId: null,
        lclComplianceDocs: [],
    });
};

export const resetRailwayState = () => {
     setState({
        currentRailwayStep: 1,
        railwayDetails: null,
        railwayComplianceDocs: [],
        railwayQuote: null,
        railwayBookingId: null,
    });
};

export const resetBulkState = () => {
    setState({
        currentBulkStep: 1,
        bulkDetails: null,
        bulkComplianceDocs: [],
    });
};

export const resetWarehouseState = () => {
    setState({
        currentWarehouseStep: 1,
        warehouseDetails: null,
        warehouseComplianceDocs: [],
        warehouseBookingId: null,
    });
};

export const resetAirfreightState = () => {
    setState({
        currentAirfreightStep: 1,
        airfreightDetails: null,
        airfreightComplianceDocs: [],
        airfreightQuote: null,
        airfreightBookingId: null,
    });
};

export const resetInlandState = () => {
    setState({
        currentInlandStep: 1,
        inlandDetails: null,
        availableTrucks: [],
    });
};

export const resetRiverTugState = () => {
    setState({
        currentRiverTugStep: 1,
        riverTugDetails: null,
        riverTugComplianceDocs: [],
        riverTugQuote: null,
        riverTugBookingId: null,
    });
};

export const resetParcelState = () => {
    setState({
        parcelOrigin: null,
        parcelDestination: null,
        parcelSelectedQuote: null,
        parcelPickupType: 'pickup',
        parcelSelectedDropoffLocation: null,
        parcelUserCoordinates: null,
        parcelInsuranceAdded: false,
        parcelDeclaredValue: 0,
        parcelInsuranceCost: 0,
        parcelPremiumTrackingAdded: false,
    });
};

export const resetTradeFinanceState = () => {
    setState({
        currentTradeFinanceStep: 1,
        tradeFinanceService: null,
        tradeFinanceApplicationData: null,
        tradeFinanceAssessment: null,
    });
};