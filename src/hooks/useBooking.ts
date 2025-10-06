// ===========================================
// src/hooks/useBooking.ts
// Complete booking flow state management for Phase 5
// ===========================================

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { BookingService, type PassengerDetail, type BookingResponse, type SeatAvailabilityResponse } from '@/services/bookingService';
import type { CityZone } from '@/types/mapTypes';

export type BookingStep = 'zones' | 'seats' | 'details' | 'review' | 'complete';

export interface BookingState {
  // Current step
  currentStep: BookingStep;
  
  // Ride information
  rideId: string | null;
  rideDetails: any | null;
  
  // Zone selection
  pickupZone: CityZone | null;
  dropoffZone: CityZone | null;
  
  // Seat selection
  selectedSeats: string[];
  seatAvailability: SeatAvailabilityResponse | null;
  
  // Passenger details
  passengerDetails: PassengerDetail[];
  
  // Pricing
  totalPrice: number;
  seatPricing: Record<string, number>;
  
  // Status
  isLoading: boolean;
  error: string | null;
  
  // Booking result
  bookingResult: BookingResponse | null;
}

export interface BookingActions {
  // Step navigation
  setCurrentStep: (step: BookingStep) => void;
  nextStep: () => void;
  previousStep: () => void;
  
  // Ride management
  initializeBooking: (rideId: string, rideDetails?: any) => Promise<void>;
  
  // Zone selection
  setPickupZone: (zone: CityZone) => void;
  setDropoffZone: (zone: CityZone) => void;
  validateZoneSelection: () => boolean;
  
  // Seat selection
  toggleSeat: (seatId: string) => void;
  setSeatSelection: (seatIds: string[]) => void;
  validateSeatSelection: () => boolean;
  
  // Passenger details
  updatePassengerDetails: (index: number, details: Partial<PassengerDetail>) => void;
  setPassengerDetails: (details: PassengerDetail[]) => void;
  validatePassengerDetails: () => { valid: boolean; errors: string[] };
  
  // Booking process
  calculateTotalPrice: () => number;
  submitBooking: () => Promise<BookingResponse>;
  
  // Reset and utilities
  resetBooking: () => void;
  clearError: () => void;
}

const initialState: BookingState = {
  currentStep: 'zones',
  rideId: null,
  rideDetails: null,
  pickupZone: null,
  dropoffZone: null,
  selectedSeats: [],
  seatAvailability: null,
  passengerDetails: [],
  totalPrice: 0,
  seatPricing: {},
  isLoading: false,
  error: null,
  bookingResult: null,
};

const stepOrder: BookingStep[] = ['zones', 'seats', 'details', 'review', 'complete'];

export const useBooking = (): BookingState & BookingActions => {
  const [state, setState] = useState<BookingState>(initialState);
  const { profile } = useAuth();

  // Helper to update state safely
  const updateState = useCallback((updates: Partial<BookingState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Step navigation
  const setCurrentStep = useCallback((step: BookingStep) => {
    updateState({ currentStep: step });
  }, [updateState]);

  const nextStep = useCallback(() => {
    const currentIndex = stepOrder.indexOf(state.currentStep);
    if (currentIndex < stepOrder.length - 1) {
      setCurrentStep(stepOrder[currentIndex + 1]);
    }
  }, [state.currentStep, setCurrentStep]);

  const previousStep = useCallback(() => {
    const currentIndex = stepOrder.indexOf(state.currentStep);
    if (currentIndex > 0) {
      setCurrentStep(stepOrder[currentIndex - 1]);
    }
  }, [state.currentStep, setCurrentStep]);

  // Initialize booking with ride data
  const initializeBooking = useCallback(async (rideId: string, rideDetails?: any) => {
    updateState({ isLoading: true, error: null });
    
    try {
      console.log('Initializing booking for ride:', rideId);
      
      // Check if user already has a booking for this ride
      if (profile?.id) {
        const existingBooking = await BookingService.checkExistingBooking(rideId, profile.id);
        if (existingBooking.hasBooking) {
          updateState({
            error: 'You already have a booking for this ride',
            isLoading: false
          });
          return;
        }
      }

      // Get seat availability
      const seatAvailability = await BookingService.getSeatAvailability(rideId);
      
      if (!seatAvailability.success) {
        updateState({
          error: seatAvailability.error || 'Failed to load seat availability',
          isLoading: false
        });
        return;
      }

      // Initialize state
      updateState({
        rideId,
        rideDetails,
        seatAvailability,
        seatPricing: seatAvailability.seat_pricing || {},
        currentStep: 'zones',
        isLoading: false,
        error: null
      });

      console.log('Booking initialized successfully');
    } catch (error) {
      console.error('Failed to initialize booking:', error);
      updateState({
        error: 'Failed to initialize booking',
        isLoading: false
      });
    }
  }, [updateState, profile?.id]);

  // Zone selection
  const setPickupZone = useCallback((zone: CityZone) => {
    console.log('Setting pickup zone:', zone.zone_name);
    updateState({ pickupZone: zone });
  }, [updateState]);

  const setDropoffZone = useCallback((zone: CityZone) => {
    console.log('Setting dropoff zone:', zone.zone_name);
    updateState({ dropoffZone: zone });
  }, [updateState]);

  const validateZoneSelection = useCallback(() => {
    return !!(state.pickupZone && state.dropoffZone);
  }, [state.pickupZone, state.dropoffZone]);

  // Seat selection
  const toggleSeat = useCallback((seatId: string) => {
    const isSelected = state.selectedSeats.includes(seatId);
    const bookedSeats = state.seatAvailability?.booked_seat_ids || [];
    
    // Prevent selecting booked seats
    if (bookedSeats.includes(seatId)) {
      updateState({ error: 'This seat is already booked' });
      return;
    }

    let newSelection: string[];
    
    if (isSelected) {
      // Remove seat
      newSelection = state.selectedSeats.filter(id => id !== seatId);
    } else {
      // Add seat (max 4 seats per booking)
      if (state.selectedSeats.length >= 4) {
        updateState({ error: 'Maximum 4 seats can be selected' });
        return;
      }
      newSelection = [...state.selectedSeats, seatId];
    }

    // Generate passenger details array based on seat count
    const newPassengerDetails: PassengerDetail[] = newSelection.map((_, index) => {
      // Keep existing details if available, otherwise create new with profile data for first passenger
      const existing = state.passengerDetails[index];
      if (existing) return existing;
      
      if (index === 0 && profile) {
        return {
          name: profile.full_name || '',
          phone: profile.phone || '',
          email: profile.email || '',
          age: profile.age || 18,
          gender: profile.gender || '',
          emergency_contact_name: '',
          emergency_contact_phone: '',
          notes: ''
        };
      }

      return {
        name: '',
        phone: '',
        email: '',
        age: 18,
        gender: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        notes: ''
      };
    });

    updateState({ 
      selectedSeats: newSelection, 
      passengerDetails: newPassengerDetails,
      error: null 
    });

    console.log('Seat selection updated:', newSelection);
  }, [state.selectedSeats, state.seatAvailability, state.passengerDetails, updateState, profile]);

  const setSeatSelection = useCallback((seatIds: string[]) => {
    const bookedSeats = state.seatAvailability?.booked_seat_ids || [];
    const validSeats = seatIds.filter(id => !bookedSeats.includes(id));
    
    if (validSeats.length !== seatIds.length) {
      updateState({ error: 'Some selected seats are already booked' });
      return;
    }

    if (validSeats.length > 4) {
      updateState({ error: 'Maximum 4 seats can be selected' });
      return;
    }

    // Update passenger details array
    const newPassengerDetails: PassengerDetail[] = validSeats.map((_, index) => {
      const existing = state.passengerDetails[index];
      if (existing) return existing;
      
      if (index === 0 && profile) {
        return {
          name: profile.full_name || '',
          phone: profile.phone || '',
          email: profile.email || '',
          age: profile.age || 18,
          gender: profile.gender || '',
          emergency_contact_name: '',
          emergency_contact_phone: '',
          notes: ''
        };
      }

      return {
        name: '',
        phone: '',
        email: '',
        age: 18,
        gender: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        notes: ''
      };
    });

    updateState({ 
      selectedSeats: validSeats, 
      passengerDetails: newPassengerDetails,
      error: null 
    });
  }, [state.seatAvailability, state.passengerDetails, updateState, profile]);

  const validateSeatSelection = useCallback(() => {
    return state.selectedSeats.length > 0;
  }, [state.selectedSeats.length]);

  // Passenger details management
  const updatePassengerDetails = useCallback((index: number, details: Partial<PassengerDetail>) => {
    const newPassengerDetails = [...state.passengerDetails];
    if (newPassengerDetails[index]) {
      newPassengerDetails[index] = { ...newPassengerDetails[index], ...details };
      updateState({ passengerDetails: newPassengerDetails });
    }
  }, [state.passengerDetails, updateState]);

  const setPassengerDetails = useCallback((details: PassengerDetail[]) => {
    updateState({ passengerDetails: details });
  }, [updateState]);

  const validatePassengerDetails = useCallback(() => {
    const errors: string[] = [];
    
    state.passengerDetails.forEach((passenger, index) => {
      if (!passenger.name?.trim()) {
        errors.push(`Passenger ${index + 1}: Name is required`);
      }
      if (!passenger.phone?.trim()) {
        errors.push(`Passenger ${index + 1}: Phone number is required`);
      }
      if (!passenger.gender?.trim()) {
        errors.push(`Passenger ${index + 1}: Gender is required`);
      }
      if (!passenger.age || passenger.age < 18) {
        errors.push(`Passenger ${index + 1}: Valid age (18+) is required`);
      }
      // Basic phone validation
      if (passenger.phone && !/^\+?[\d\s\-\(\)]{10,}$/.test(passenger.phone.trim())) {
        errors.push(`Passenger ${index + 1}: Invalid phone number format`);
      }
    });

    return { valid: errors.length === 0, errors };
  }, [state.passengerDetails]);

  // Pricing calculation
  const calculateTotalPrice = useCallback(() => {
    const total = state.selectedSeats.reduce((sum, seatId) => {
      return sum + (state.seatPricing[seatId] || 0);
    }, 0);
    
    updateState({ totalPrice: total });
    return total;
  }, [state.selectedSeats, state.seatPricing, updateState]);

  // Submit booking
  const submitBooking = useCallback(async (): Promise<BookingResponse> => {
    if (!state.rideId || !profile?.id) {
      const error = 'Missing ride ID or user authentication';
      updateState({ error });
      return { success: false, error };
    }

    if (!validateZoneSelection()) {
      const error = 'Please select pickup and dropoff zones';
      updateState({ error });
      return { success: false, error };
    }

    if (!validateSeatSelection()) {
      const error = 'Please select at least one seat';
      updateState({ error });
      return { success: false, error };
    }

    const detailsValidation = validatePassengerDetails();
    if (!detailsValidation.valid) {
      const error = detailsValidation.errors.join(', ');
      updateState({ error });
      return { success: false, error };
    }

    updateState({ isLoading: true, error: null });

    try {
      const totalPrice = calculateTotalPrice();
      
      console.log('Submitting booking with data:', {
        rideId: state.rideId,
        seatCount: state.selectedSeats.length,
        totalPrice,
        pickup: state.pickupZone?.zone_name,
        dropoff: state.dropoffZone?.zone_name
      });

      const result = await BookingService.bookSeatsWithZones(
        state.rideId,
        profile.id,
        state.selectedSeats,
        state.pickupZone!,
        state.dropoffZone!,
        state.passengerDetails,
        totalPrice
      );

      updateState({ 
        bookingResult: result,
        isLoading: false,
        currentStep: result.success ? 'complete' : state.currentStep,
        error: result.success ? null : result.error || 'Booking failed'
      });

      return result;
    } catch (error) {
      console.error('Booking submission error:', error);
      const errorMessage = 'Failed to submit booking';
      updateState({ 
        error: errorMessage,
        isLoading: false 
      });
      return { success: false, error: errorMessage };
    }
  }, [
    state.rideId,
    state.pickupZone,
    state.dropoffZone,
    state.selectedSeats,
    state.passengerDetails,
    state.currentStep,
    profile?.id,
    updateState,
    validateZoneSelection,
    validateSeatSelection,
    validatePassengerDetails,
    calculateTotalPrice
  ]);

  // Reset booking state
  const resetBooking = useCallback(() => {
    setState(initialState);
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    updateState({ error: null });
  }, [updateState]);

  // Auto-calculate price when seats change
  useEffect(() => {
    if (state.selectedSeats.length > 0) {
      calculateTotalPrice();
    }
  }, [state.selectedSeats, calculateTotalPrice]);

      return {
    // State
    ...state,
    
    // Actions
    setCurrentStep,
    nextStep,
    previousStep,
    initializeBooking,
    setPickupZone,
    setDropoffZone,
    validateZoneSelection,
    toggleSeat,
    setSeatSelection,
    validateSeatSelection,
    updatePassengerDetails,
    setPassengerDetails,
    validatePassengerDetails,
    calculateTotalPrice,
    submitBooking,
    resetBooking,
    clearError,
  };
};