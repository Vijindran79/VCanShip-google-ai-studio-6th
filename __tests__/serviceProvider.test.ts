/**
 * Example test file for service provider validation
 * Tests the Zod schema used for service provider registration
 */

import { serviceProviderSchema } from '../lib/validations/serviceProvider';

describe('Service Provider Validation', () => {
  describe('serviceProviderSchema', () => {
    const validData = {
      company_name: 'Test Company Ltd',
      website: 'https://example.com',
      email: 'test@example.com',
      phone: '1234567890',
      address_street: '123 Main Street',
      address_city: 'Test City',
      address_country: 'Test Country',
      services: ['shipping', 'logistics'],
      coverage_regions: ['North America', 'Europe']
    };

    it('should validate valid service provider data', () => {
      const result = serviceProviderSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid company name (too short)', () => {
      const invalidData = { ...validData, company_name: 'A' };
      const result = serviceProviderSchema.safeParse(invalidData);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Company name must be at least 2 characters.');
      }
    });

    it('should reject invalid website URL', () => {
      const invalidData = { ...validData, website: 'not-a-url' };
      const result = serviceProviderSchema.safeParse(invalidData);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Please enter a valid URL.');
      }
    });

    it('should reject invalid email address', () => {
      const invalidData = { ...validData, email: 'invalid-email' };
      const result = serviceProviderSchema.safeParse(invalidData);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Please enter a valid email address.');
      }
    });

    it('should reject short phone number', () => {
      const invalidData = { ...validData, phone: '123' };
      const result = serviceProviderSchema.safeParse(invalidData);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Phone number must be at least 10 characters.');
      }
    });

    it('should reject empty services array', () => {
      const invalidData = { ...validData, services: [] };
      const result = serviceProviderSchema.safeParse(invalidData);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('You must select at least one service.');
      }
    });

    it('should reject empty coverage regions array', () => {
      const invalidData = { ...validData, coverage_regions: [] };
      const result = serviceProviderSchema.safeParse(invalidData);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('You must select at least one coverage region.');
      }
    });

    it('should handle optional fields correctly', () => {
      const dataWithoutOptionals = { ...validData };
      // Remove optional fields - logo and business_document are optional
      const result = serviceProviderSchema.safeParse(dataWithoutOptionals);
      expect(result.success).toBe(true);
    });

    it('should validate required field presence', () => {
      const incompleteData = {
        company_name: 'Test Company',
        // Missing other required fields
      };
      const result = serviceProviderSchema.safeParse(incompleteData);
      expect(result.success).toBe(false);
    });
  });
});