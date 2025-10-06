// ===========================================
// src/services/bookingService.ts
// Enhanced booking service for Phase 5 - Foundation Component
// ===========================================

import { supabase } from '@/integrations/supabase/client';
import type { CityZone } from '@/types/mapTypes';

export interface PassengerDetail {
  name: string;
  phone: string;
  email?: string;
  age: number;
  gender: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  notes?: string;
}

export interface BookingData {
  booking_id: string;
  ride_id: string;
  selected_seats: string[];
  total_price: number;
  pickup_zone: CityZone;
  dropoff_zone: CityZone;
  passenger_details: PassengerDetail[];
  ride_details: any;
  status: 'confirmed' | 'pending' | 'cancelled';
}

export interface SeatAvailabilityResponse {
  success: boolean;
  ride_id?: string;
  total_seats?: number;
  seats_booked?: number;
  available_seats?: number;
  booked_seat_ids?: string[];
  seat_layout?: any;
  seat_pricing?: any;
  error?: string;
}

export interface BookingResponse {
  success: boolean;
  booking_id?: string;
  ride_id?: string;
  seats_booked?: string[];
  total_price?: number;
  pickup_zone_id?: string;
  dropoff_zone_id?: string;
  error?: string;
}

export interface ValidationResponse {
  valid: boolean;
  errors?: string[];
}

export interface BookingDetailsResponse {
  success: boolean;
  booking?: any;
  ride?: any;
  pickup_zone?: any;
  dropoff_zone?: any;
  passenger?: any;
  error?: string;
}

/**
 * Enhanced booking service class with comprehensive error handling
 * and cross-platform compatibility
 */
export class BookingService {
  /**
   * Get seat availability for a ride with enhanced error handling
   */
  static async getSeatAvailability(rideId: string): Promise<SeatAvailabilityResponse> {
    try {
      if (!rideId?.trim()) {
        return { success: false, error: 'Invalid ride ID provided' };
      }

      console.log('Fetching seat availability for ride:', rideId);
      
      const { data, error } = await supabase.rpc('get_seat_availability', {
        ride_uuid: rideId
      });

      if (error) {
        console.error('Seat availability RPC error:', error);
        return { 
          success: false, 
          error: `Failed to get seat availability: ${error.message}` 
        };
      }

      if (!data) {
        return { success: false, error: 'No seat availability data returned' };
      }

      // If the RPC function returns an error response
      if (!data.success) {
        console.error('Seat availability function error:', data.error);
        return { success: false, error: data.error };
      }

      console.log('Seat availability loaded successfully:', {
        total: data.total_seats,
        available: data.available_seats,
        booked: data.seats_booked
      });

      return data;
    } catch (error) {
      console.error('Exception in getSeatAvailability:', error);
      return { 
        success: false, 
        error: 'System error while loading seat availability' 
      };
    }
  }

  /**
   * Validate seat booking before processing
   */
  static async validateSeatBooking(
    rideId: string,
    passengerId: string,
    seatIds: string[]
  ): Promise<ValidationResponse> {
    try {
      if (!rideId?.trim() || !passengerId?.trim() || !Array.isArray(seatIds) || seatIds.length === 0) {
        return { 
          valid: false, 
          errors: ['Invalid booking parameters provided'] 
        };
      }

      console.log('Validating seat booking:', { rideId, passengerId, seatIds });

      const { data, error } = await supabase.rpc('validate_seat_booking', {
        ride_uuid: rideId,
        passenger_uuid: passengerId,
        seat_ids: seatIds
      });

      if (error) {
        console.error('Validation RPC error:', error);
        return { 
          valid: false, 
          errors: [`Validation failed: ${error.message}`] 
        };
      }

      if (!data) {
        return { valid: false, errors: ['No validation response received'] };
      }

      console.log('Validation result:', data);
      return data;
    } catch (error) {
      console.error('Exception in validateSeatBooking:', error);
      return { 
        valid: false, 
        errors: ['System error during validation'] 
      };
    }
  }

  /**
   * Book seats with zone selection - Main booking function
   */
  static async bookSeatsWithZones(
    rideId: string,
    passengerId: string,
    seatIds: string[],
    pickupZone: CityZone,
    dropoffZone: CityZone,
    passengerDetails: PassengerDetail[],
    totalPrice: number
  ): Promise<BookingResponse> {
    try {
      // Input validation
      if (!rideId?.trim() || !passengerId?.trim()) {
        return { success: false, error: 'Invalid ride or passenger ID' };
      }

      if (!Array.isArray(seatIds) || seatIds.length === 0) {
        return { success: false, error: 'No seats selected' };
      }

      if (!pickupZone?.id || !dropoffZone?.id) {
        return { success: false, error: 'Invalid pickup or dropoff zone' };
      }

      if (!Array.isArray(passengerDetails) || passengerDetails.length === 0) {
        return { success: false, error: 'Passenger details required' };
      }

      if (!totalPrice || totalPrice <= 0) {
        return { success: false, error: 'Invalid total price' };
      }

      // Validate passenger details
      const invalidPassenger = passengerDetails.findIndex(p => 
        !p.name?.trim() || !p.phone?.trim() || !p.gender?.trim() || !p.age || p.age < 18
      );

      if (invalidPassenger !== -1) {
        return { 
          success: false, 
          error: `Invalid details for passenger ${invalidPassenger + 1}` 
        };
      }

      console.log('Booking seats with zones:', {
        rideId,
        passengerId,
        seatCount: seatIds.length,
        totalPrice,
        pickupZone: pickupZone.zone_name,
        dropoffZone: dropoffZone.zone_name
      });

      // First validate at the database level too
      const dbValidation = await this.validateSeatBooking(rideId, passengerId, seatIds);
      if (!dbValidation.valid) {
        return {
          success: false,
          error: dbValidation.errors?.join(', ') || 'Database validation failed'
        };
      }

      // Call the database function with sanitized data
      const { data, error } = await supabase.rpc('book_seats_with_zones', {
        ride_uuid: rideId,
        passenger_uuid: passengerId,
        seat_ids: seatIds,
        pickup_zone_uuid: pickupZone.id,
        dropoff_zone_uuid: dropoffZone.id,
        passenger_details_json: sanitizedPassengerDetails,
        total_price: totalPrice
      });

      if (error) {
        console.error('Booking RPC error:', error);
        return { success: false, error: `Booking failed: ${error.message}` };
      }

      if (!data) {
        return { success: false, error: 'No booking response received' };
      }

      if (!data.success) {
        console.error('Booking function error:', data.error);
        return { success: false, error: data.error };
      }

      console.log('Booking created successfully:', data.booking_id);
      return data;
    } catch (error) {
      console.error('Exception in bookSeatsWithZones:', error);
      return { 
        success: false, 
        error: 'System error during booking process' 
      };
    }
  }

  /**
   * Get booking details for ticket generation
   */
  static async getBookingDetails(bookingId: string): Promise<BookingDetailsResponse> {
    try {
      if (!bookingId?.trim()) {
        return { success: false, error: 'Invalid booking ID' };
      }

      console.log('Fetching booking details for:', bookingId);

      const { data, error } = await supabase.rpc('get_booking_details', {
        booking_uuid: bookingId
      });

      if (error) {
        console.error('Get booking details RPC error:', error);
        return { success: false, error: `Failed to get booking: ${error.message}` };
      }

      if (!data) {
        return { success: false, error: 'No booking data received' };
      }

      if (!data.success) {
        console.error('Get booking details function error:', data.error);
        return { success: false, error: data.error };
      }

      console.log('Booking details loaded successfully');
      return data;
    } catch (error) {
      console.error('Exception in getBookingDetails:', error);
      return { 
        success: false, 
        error: 'System error while loading booking details' 
      };
    }
  }

  /**
   * Cancel a booking
   */
  static async cancelBooking(bookingId: string, passengerId: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!bookingId?.trim() || !passengerId?.trim()) {
        return { success: false, error: 'Invalid booking or passenger ID' };
      }

      console.log('Cancelling booking:', bookingId);

      const { error } = await supabase
        .from('bookings')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId)
        .eq('passenger_id', passengerId);

      if (error) {
        console.error('Booking cancellation error:', error);
        return { success: false, error: `Cancellation failed: ${error.message}` };
      }

      console.log('Booking cancelled successfully');
      return { success: true };
    } catch (error) {
      console.error('Exception in cancelBooking:', error);
      return { 
        success: false, 
        error: 'System error during cancellation' 
      };
    }
  }

  /**
   * Get user's active bookings
   */
  static async getUserBookings(userId: string): Promise<{ success: boolean; bookings?: any[]; error?: string }> {
    try {
      if (!userId?.trim()) {
        return { success: false, error: 'Invalid user ID' };
      }

      console.log('Fetching user bookings for:', userId);

      const { data, error } = await supabase
        .from('enhanced_seat_bookings_detail')
        .select('*')
        .eq('passenger_id', userId)
        .in('status', ['confirmed', 'pending'])
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Get user bookings error:', error);
        return { success: false, error: `Failed to get bookings: ${error.message}` };
      }

      console.log('User bookings loaded:', data?.length || 0);
      return { success: true, bookings: data || [] };
    } catch (error) {
      console.error('Exception in getUserBookings:', error);
      return { 
        success: false, 
        error: 'System error while loading bookings' 
      };
    }
  }

  /**
   * Utility function to format booking data for ticket generation
   */
  static formatBookingDataForTicket(
    bookingDetails: any,
    pickupZone: CityZone,
    dropoffZone: CityZone,
    passengerDetails: PassengerDetail[]
  ): BookingData | null {
    try {
      if (!bookingDetails?.booking || !pickupZone || !dropoffZone) {
        return null;
      }

      const booking = bookingDetails.booking;
      const ride = bookingDetails.ride;

      return {
        booking_id: booking.id,
        ride_id: booking.ride_id,
        selected_seats: booking.selected_seats || [],
        total_price: booking.total_price || 0,
        pickup_zone: pickupZone,
        dropoff_zone: dropoffZone,
        passenger_details: passengerDetails,
        ride_details: {
          from_city: ride?.from_city || '',
          to_city: ride?.to_city || '',
          departure_date: ride?.departure_date || '',
          departure_time: ride?.departure_time || '',
          driver: bookingDetails.driver || {},
          vehicle: bookingDetails.vehicle || {}
        },
        status: booking.status || 'confirmed'
      };
    } catch (error) {
      console.error('Error formatting booking data:', error);
      return null;
    }
  }

  /**
   * Check if user already has a booking for this ride
   */
  static async checkExistingBooking(rideId: string, passengerId: string): Promise<{ hasBooking: boolean; bookingId?: string }> {
    try {
      if (!rideId?.trim() || !passengerId?.trim()) {
        return { hasBooking: false };
      }

      const { data, error } = await supabase
        .from('bookings')
        .select('id')
        .eq('ride_id', rideId)
        .eq('passenger_id', passengerId)
        .in('status', ['confirmed', 'pending'])
        .limit(1);

      if (error) {
        console.error('Check existing booking error:', error);
        return { hasBooking: false };
      }

      if (data && data.length > 0) {
        return { hasBooking: true, bookingId: data[0].id };
      }

      return { hasBooking: false };
    } catch (error) {
      console.error('Exception in checkExistingBooking:', error);
      return { hasBooking: false };
    }
  }
}