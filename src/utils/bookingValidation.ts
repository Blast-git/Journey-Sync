// ===========================================
// src/utils/bookingValidation.ts
// Fixed client-side booking validation
// ===========================================

import type { PassengerDetail } from '@/services/bookingService';
import type { CityZone } from '@/types/mapTypes';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  fieldErrors: Record<string, string[]>;
}

export interface BookingValidationParams {
  rideId?: string;
  passengerId?: string;
  seatIds?: string[];
  pickupZone?: CityZone;
  dropoffZone?: CityZone;
  passengerDetails?: PassengerDetail[];
  totalPrice?: number;
}

/**
 * Comprehensive booking validation with detailed error reporting
 */
export const validateBookingData = (params: BookingValidationParams): ValidationResult => {
  const errors: string[] = [];
  const fieldErrors: Record<string, string[]> = {};

  try {
    // Basic required fields
    if (!params.rideId?.trim()) {
      errors.push('Ride ID is required');
      fieldErrors.rideId = ['Required'];
    }

    if (!params.passengerId?.trim()) {
      errors.push('Passenger authentication required');
      fieldErrors.passengerId = ['Authentication required'];
    }

    // Seat validation
    if (!Array.isArray(params.seatIds) || params.seatIds.length === 0) {
      errors.push('At least one seat must be selected');
      fieldErrors.seats = ['Select at least one seat'];
    } else {
      // Check seat ID format
      const invalidSeats = params.seatIds.filter(id => !id?.trim());
      if (invalidSeats.length > 0) {
        errors.push('Invalid seat selection detected');
        fieldErrors.seats = ['Invalid seat IDs'];
      }

      // Check maximum seats
      if (params.seatIds.length > 4) {
        errors.push('Maximum 4 seats can be booked per transaction');
        fieldErrors.seats = ['Maximum 4 seats allowed'];
      }
    }

    // Zone validation
    if (!params.pickupZone?.id) {
      errors.push('Pickup zone must be selected');
      fieldErrors.pickupZone = ['Required'];
    }

    if (!params.dropoffZone?.id) {
      errors.push('Dropoff zone must be selected');
      fieldErrors.dropoffZone = ['Required'];
    }

    // Intercity validation - zones should be in different cities
    if (params.pickupZone?.id && params.dropoffZone?.id) {
      if (params.pickupZone.city_name === params.dropoffZone.city_name) {
        errors.push('Pickup and drop zones must be in different cities for intercity travel');
        fieldErrors.zones = ['Different cities required'];
      }
    }

    // Price validation
    if (params.totalPrice !== undefined) {
      if (typeof params.totalPrice !== 'number' || params.totalPrice <= 0) {
        errors.push('Invalid booking price');
        fieldErrors.price = ['Invalid price'];
      }
    }

    // Passenger details validation
    if (Array.isArray(params.passengerDetails) && params.passengerDetails.length > 0) {
      const passengerValidation = validatePassengerDetails(params.passengerDetails);
      if (!passengerValidation.valid) {
        errors.push(...passengerValidation.errors);
        Object.assign(fieldErrors, passengerValidation.fieldErrors);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      fieldErrors
    };

  } catch (error) {
    console.error('Validation error:', error);
    return {
      valid: false,
      errors: ['Validation system error'],
      fieldErrors: { system: ['Validation failed'] }
    };
  }
};

/**
 * Validate passenger details with detailed field-level errors
 */
export const validatePassengerDetails = (passengers: PassengerDetail[]): ValidationResult => {
  const errors: string[] = [];
  const fieldErrors: Record<string, string[]> = {};

  try {
    if (!Array.isArray(passengers) || passengers.length === 0) {
      return {
        valid: false,
        errors: ['Passenger details are required'],
        fieldErrors: { passengers: ['Required'] }
      };
    }

    passengers.forEach((passenger, index) => {
      const passengerPrefix = `passenger_${index}`;

      // Name validation
      if (!passenger.name?.trim()) {
        errors.push(`Passenger ${index + 1}: Name is required`);
        fieldErrors[`${passengerPrefix}_name`] = ['Name is required'];
      } else {
        if (passenger.name.trim().length < 2) {
          errors.push(`Passenger ${index + 1}: Name must be at least 2 characters`);
          fieldErrors[`${passengerPrefix}_name`] = ['Name too short'];
        }
        if (passenger.name.trim().length > 50) {
          errors.push(`Passenger ${index + 1}: Name must be less than 50 characters`);
          fieldErrors[`${passengerPrefix}_name`] = ['Name too long'];
        }
      }

      // Phone validation
      if (!passenger.phone?.trim()) {
        errors.push(`Passenger ${index + 1}: Phone number is required`);
        fieldErrors[`${passengerPrefix}_phone`] = ['Phone number is required'];
      } else {
        // Indian phone number validation (basic)
        const phoneRegex = /^(\+91|91)?[6-9]\d{9}$/;
        const cleanPhone = passenger.phone.replace(/[\s\-\(\)]/g, '');
        
        if (!phoneRegex.test(cleanPhone)) {
          errors.push(`Passenger ${index + 1}: Invalid phone number format`);
          fieldErrors[`${passengerPrefix}_phone`] = ['Invalid phone format'];
        }
      }

      // Email validation (if provided)
      if (passenger.email?.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(passenger.email.trim())) {
          errors.push(`Passenger ${index + 1}: Invalid email format`);
          fieldErrors[`${passengerPrefix}_email`] = ['Invalid email format'];
        }
      }

      // Age validation
      if (!passenger.age || typeof passenger.age !== 'number') {
        errors.push(`Passenger ${index + 1}: Age is required`);
        fieldErrors[`${passengerPrefix}_age`] = ['Age is required'];
      } else {
        if (passenger.age < 18) {
          errors.push(`Passenger ${index + 1}: Must be at least 18 years old`);
          fieldErrors[`${passengerPrefix}_age`] = ['Must be 18 or older'];
        }
        if (passenger.age > 100) {
          errors.push(`Passenger ${index + 1}: Invalid age`);
          fieldErrors[`${passengerPrefix}_age`] = ['Invalid age'];
        }
      }

      // Gender validation
      if (!passenger.gender?.trim()) {
        errors.push(`Passenger ${index + 1}: Gender is required`);
        fieldErrors[`${passengerPrefix}_gender`] = ['Gender is required'];
      } else {
        const validGenders = ['male', 'female', 'other', 'prefer_not_to_say'];
        if (!validGenders.includes(passenger.gender.toLowerCase())) {
          errors.push(`Passenger ${index + 1}: Invalid gender selection`);
          fieldErrors[`${passengerPrefix}_gender`] = ['Invalid gender'];
        }
      }

      // Emergency contact validation (if provided)
      if (passenger.emergency_contact_phone?.trim()) {
        const phoneRegex = /^(\+91|91)?[6-9]\d{9}$/;
        const cleanPhone = passenger.emergency_contact_phone.replace(/[\s\-\(\)]/g, '');
        
        if (!phoneRegex.test(cleanPhone)) {
          errors.push(`Passenger ${index + 1}: Invalid emergency contact phone`);
          fieldErrors[`${passengerPrefix}_emergency_phone`] = ['Invalid phone format'];
        }
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      fieldErrors
    };

  } catch (error) {
    console.error('Passenger validation error:', error);
    return {
      valid: false,
      errors: ['Passenger validation system error'],
      fieldErrors: { system: ['Validation failed'] }
    };
  }
};

/**
 * Quick validation for individual fields
 */
export const validateField = (fieldName: string, value: any, passengerIndex?: number): { valid: boolean; error?: string } => {
  try {
    switch (fieldName) {
      case 'name':
        if (!value?.trim()) return { valid: false, error: 'Name is required' };
        if (value.trim().length < 2) return { valid: false, error: 'Name too short' };
        if (value.trim().length > 50) return { valid: false, error: 'Name too long' };
        return { valid: true };

      case 'phone':
        if (!value?.trim()) return { valid: false, error: 'Phone number is required' };
        const phoneRegex = /^(\+91|91)?[6-9]\d{9}$/;
        const cleanPhone = value.replace(/[\s\-\(\)]/g, '');
        if (!phoneRegex.test(cleanPhone)) return { valid: false, error: 'Invalid phone format' };
        return { valid: true };

      case 'email':
        if (!value?.trim()) return { valid: true }; // Email is optional
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value.trim())) return { valid: false, error: 'Invalid email format' };
        return { valid: true };

      case 'age':
        if (!value || typeof value !== 'number') return { valid: false, error: 'Age is required' };
        if (value < 18) return { valid: false, error: 'Must be 18 or older' };
        if (value > 100) return { valid: false, error: 'Invalid age' };
        return { valid: true };

      case 'gender':
        if (!value?.trim()) return { valid: false, error: 'Gender is required' };
        const validGenders = ['male', 'female', 'other', 'prefer_not_to_say'];
        if (!validGenders.includes(value.toLowerCase())) return { valid: false, error: 'Invalid gender' };
        return { valid: true };

      default:
        return { valid: true };
    }
  } catch (error) {
    console.error('Field validation error:', error);
    return { valid: false, error: 'Validation error' };
  }
};

/**
 * Sanitize passenger data before sending to backend
 */
export const sanitizePassengerData = (passengers: PassengerDetail[]): PassengerDetail[] => {
  return passengers.map(passenger => ({
    name: passenger.name?.trim() || '',
    phone: passenger.phone?.replace(/[\s\-\(\)]/g, '') || '',
    email: passenger.email?.trim() || '',
    age: Number(passenger.age) || 18,
    gender: passenger.gender?.toLowerCase() || '',
    emergency_contact_name: passenger.emergency_contact_name?.trim() || '',
    emergency_contact_phone: passenger.emergency_contact_phone?.replace(/[\s\-\(\)]/g, '') || '',
    notes: passenger.notes?.trim() || ''
  }));
};