/**
 * Example test file for state types and interfaces
 * Tests the type definitions and basic utility functions
 */

import type { Service, Page, Address, Quote, CostBreakdown, ComplianceRequirement } from '../state';

describe('State Types and Interfaces', () => {
  describe('Service type', () => {
    it('should include all expected service types', () => {
      const validServices: Service[] = [
        'parcel', 'baggage', 'fcl', 'lcl', 'railway', 'bulk', 
        'warehouse', 'ecommerce', 'schedules', 'vehicle', 
        'inland', 'airfreight', 'register', 'rivertug', 'service-provider-register'
      ];
      
      // This test ensures all expected services are valid
      validServices.forEach(service => {
        expect(typeof service).toBe('string');
        expect(service.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Address interface', () => {
    it('should create a valid address object', () => {
      const address: Address = {
        id: 1,
        label: 'Home',
        name: 'John Doe',
        company: 'Test Company',
        street: '123 Main St',
        city: 'Test City',
        postcode: '12345',
        country: 'Test Country',
        email: 'john@example.com',
        phone: '+1234567890',
        isDefault: true
      };

      expect(address.id).toBe(1);
      expect(address.name).toBe('John Doe');
      expect(address.isDefault).toBe(true);
    });

    it('should work with minimal address data', () => {
      const minimalAddress: Address = {
        street: '123 Main St',
        city: 'Test City'
      };

      expect(minimalAddress.street).toBe('123 Main St');
      expect(minimalAddress.city).toBe('Test City');
      expect(minimalAddress.id).toBeUndefined();
    });
  });

  describe('CostBreakdown interface', () => {
    it('should create a valid cost breakdown', () => {
      const costBreakdown: CostBreakdown = {
        baseShippingCost: 100.00,
        fuelSurcharge: 15.50,
        estimatedCustomsAndTaxes: 25.00,
        optionalInsuranceCost: 10.00,
        ourServiceFee: 5.00
      };

      expect(costBreakdown.baseShippingCost).toBe(100.00);
      expect(costBreakdown.fuelSurcharge).toBe(15.50);
      expect(typeof costBreakdown.baseShippingCost).toBe('number');
    });

    it('should calculate total cost correctly', () => {
      const costBreakdown: CostBreakdown = {
        baseShippingCost: 100.00,
        fuelSurcharge: 15.50,
        estimatedCustomsAndTaxes: 25.00,
        optionalInsuranceCost: 10.00,
        ourServiceFee: 5.00
      };

      const totalCost = Object.values(costBreakdown).reduce((sum, cost) => sum + cost, 0);
      expect(totalCost).toBe(155.50);
    });
  });

  describe('Quote interface', () => {
    it('should create a valid quote object', () => {
      const quote: Quote = {
        carrierName: 'Test Carrier',
        carrierType: 'Express',
        estimatedTransitTime: '2-3 business days',
        chargeableWeight: 5.5,
        chargeableWeightUnit: 'kg',
        weightBasis: 'Actual',
        totalCost: 125.50,
        notes: 'Standard delivery',
        isSpecialOffer: false,
        costBreakdown: {
          baseShippingCost: 100.00,
          fuelSurcharge: 15.50,
          estimatedCustomsAndTaxes: 0,
          optionalInsuranceCost: 10.00,
          ourServiceFee: 0
        }
      };

      expect(quote.carrierName).toBe('Test Carrier');
      expect(quote.weightBasis).toBe('Actual');
      expect(quote.isSpecialOffer).toBe(false);
      expect(quote.totalCost).toBe(125.50);
    });
  });

  describe('ComplianceRequirement interface', () => {
    it('should create valid compliance requirements', () => {
      const requirements: ComplianceRequirement[] = [
        {
          type: 'License',
          title: 'Export License Required',
          details: 'This shipment requires an export license.'
        },
        {
          type: 'Certificate',
          title: 'Certificate of Origin',
          details: 'Certificate of origin must be provided.'
        }
      ];

      expect(requirements).toHaveLength(2);
      expect(requirements[0].type).toBe('License');
      expect(requirements[1].type).toBe('Certificate');
    });

    it('should support all compliance requirement types', () => {
      const types: ComplianceRequirement['type'][] = [
        'License', 'Certificate', 'Restriction', 'Tax', 'Information'
      ];

      types.forEach(type => {
        const requirement: ComplianceRequirement = {
          type,
          title: `Test ${type}`,
          details: `Details for ${type}`
        };
        expect(requirement.type).toBe(type);
      });
    });
  });
});