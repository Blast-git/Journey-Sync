// ===========================================
// src/services/ticketService.ts
// Secure ticket generation and QR code management for Phase 5
// ===========================================

import QRCode from 'qrcode';
import { supabase } from '@/integrations/supabase/client';
import { BookingService, type BookingData, type PassengerDetail } from './bookingService';
import type { CityZone } from '@/types/mapTypes';

export interface QRCodeData {
  booking_id: string;
  ride_id: string;
  seats: string[];
  passenger_count: number;
  pickup_zone: string;
  dropoff_zone: string;
  verification_hash: string;
  timestamp: number;
  expires_at: number;
}

export interface TicketData {
  booking_id: string;
  ride_id: string;
  selected_seats: string[];
  total_price: number;
  pickup_zone: {
    id: string;
    zone_name: string;
    city_name: string;
    landmarks: string[];
  };
  dropoff_zone: {
    id: string;
    zone_name: string;
    city_name: string;
    landmarks: string[];
  };
  passenger_details: Array<{
    name: string;
    phone: string;
    gender: string;
    age: string;
  }>;
  ride_details: {
    from_city: string;
    to_city: string;
    departure_date: string;
    departure_time: string;
    driver: {
      full_name: string;
      phone: string;
      average_rating: number;
    };
    vehicle: {
      car_model: string;
      car_type: string;
      license_plate: string;
      color: string;
    };
  };
}

export interface TicketGenerationResult {
  success: boolean;
  ticketData?: TicketData;
  qrCodeUrl?: string;
  error?: string;
}

export interface QRVerificationResult {
  valid: boolean;
  booking_id?: string;
  passenger_count?: number;
  seats?: string[];
  passenger_name?: string;
  total_price?: number;
  route?: string;
  error?: string;
}

/**
 * Ticket service for secure QR code generation and verification
 */
export class TicketService {
  private static readonly QR_EXPIRY_HOURS = 48; // QR codes expire 48 hours after generation
  private static readonly SECRET_KEY = 'your-secret-key-here'; // Should be from environment

  /**
   * Generate a secure verification hash for QR code
   */
  private static generateVerificationHash(
    bookingId: string,
    rideId: string,
    seats: string[],
    timestamp: number
  ): string {
    try {
      // Create a simple hash using available browser APIs
      const data = `${bookingId}-${rideId}-${seats.join(',')}-${timestamp}-${this.SECRET_KEY}`;
      
      // Use a simple hash function (in production, use a proper crypto library)
      let hash = 0;
      for (let i = 0; i < data.length; i++) {
        const char = data.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      
      // Convert to base64-like string
      return btoa(Math.abs(hash).toString(36));
    } catch (error) {
      console.error('Hash generation error:', error);
      // Fallback hash
      return btoa(`${bookingId}-${rideId}-${timestamp}`);
    }
  }

  /**
   * Verify QR code data integrity
   */
  private static verifyQRCodeData(qrData: QRCodeData): boolean {
    try {
      // Check if QR code has expired
      if (Date.now() > qrData.expires_at) {
        console.warn('QR code has expired');
        return false;
      }

      // Verify hash
      const expectedHash = this.generateVerificationHash(
        qrData.booking_id,
        qrData.ride_id,
        qrData.seats,
        qrData.timestamp
      );

      if (qrData.verification_hash !== expectedHash) {
        console.warn('QR code verification hash mismatch');
        return false;
      }

      return true;
    } catch (error) {
      console.error('QR verification error:', error);
      return false;
    }
  }

  /**
   * Generate QR code data with security features
   */
  private static generateQRCodeData(
    bookingId: string,
    rideId: string,
    seats: string[],
    pickupZone: string,
    dropoffZone: string,
    passengerCount: number
  ): QRCodeData {
    const timestamp = Date.now();
    const expiresAt = timestamp + (this.QR_EXPIRY_HOURS * 60 * 60 * 1000);

    const verificationHash = this.generateVerificationHash(
      bookingId,
      rideId,
      seats,
      timestamp
    );

    return {
      booking_id: bookingId,
      ride_id: rideId,
      seats,
      passenger_count: passengerCount,
      pickup_zone: pickupZone,
      dropoff_zone: dropoffZone,
      verification_hash: verificationHash,
      timestamp,
      expires_at: expiresAt
    };
  }

  /**
   * Generate complete ticket with QR code
   */
  static async generateTicket(
    bookingId: string,
    includeDriverDetails: boolean = true
  ): Promise<TicketGenerationResult> {
    try {
      console.log('Generating ticket for booking:', bookingId);

      // Get booking details from database
      const bookingDetails = await BookingService.getBookingDetails(bookingId);
      
      if (!bookingDetails.success || !bookingDetails.booking) {
        return {
          success: false,
          error: bookingDetails.error || 'Booking not found'
        };
      }

      const booking = bookingDetails.booking;
      const ride = bookingDetails.ride;
      const pickupZone = bookingDetails.pickup_zone;
      const dropoffZone = bookingDetails.dropoff_zone;

      if (!pickupZone || !dropoffZone) {
        return {
          success: false,
          error: 'Zone information not found'
        };
      }

      // Get additional driver and vehicle details if requested
      let driverDetails = {};
      let vehicleDetails = {};

      if (includeDriverDetails && ride?.driver_id) {
        try {
          const [driverResult, vehicleResult] = await Promise.all([
            supabase
              .from('profiles')
              .select('full_name, phone, average_rating')
              .eq('id', ride.driver_id)
              .single(),
            ride.vehicle_id ? supabase
              .from('vehicles')
              .select('car_model, car_type, license_plate, color')
              .eq('id', ride.vehicle_id)
              .single() : null
          ]);

          if (driverResult.data) {
            driverDetails = driverResult.data;
          }

          if (vehicleResult && vehicleResult.data) {
            vehicleDetails = vehicleResult.data;
          }
        } catch (error) {
          console.warn('Failed to load driver/vehicle details:', error);
          // Continue without these details
        }
      }

      // Prepare passenger details (mock for now - extend based on your passenger storage)
      const passengerDetails = (booking.selected_seats || []).map((seatId: string, index: number) => ({
        name: `Passenger ${index + 1}`, // Replace with actual passenger data
        phone: '', // Replace with actual passenger data
        gender: '', // Replace with actual passenger data
        age: '18' // Replace with actual passenger data
      }));

      // Generate QR code data
      const qrCodeData = this.generateQRCodeData(
        booking.id,
        booking.ride_id,
        booking.selected_seats || [],
        pickupZone.zone_name,
        dropoffZone.zone_name,
        booking.seats_booked || 0
      );

      // Generate QR code image
      const qrCodeUrl = await QRCode.toDataURL(JSON.stringify(qrCodeData), {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
        errorCorrectionLevel: 'M'
      });

      // Prepare ticket data
      const ticketData: TicketData = {
        booking_id: booking.id,
        ride_id: booking.ride_id,
        selected_seats: booking.selected_seats || [],
        total_price: booking.total_price || 0,
        pickup_zone: {
          id: pickupZone.id,
          zone_name: pickupZone.zone_name,
          city_name: pickupZone.city_name,
          landmarks: pickupZone.landmarks || []
        },
        dropoff_zone: {
          id: dropoffZone.id,
          zone_name: dropoffZone.zone_name,
          city_name: dropoffZone.city_name,
          landmarks: dropoffZone.landmarks || []
        },
        passenger_details: passengerDetails,
        ride_details: {
          from_city: ride?.from_city || '',
          to_city: ride?.to_city || '',
          departure_date: ride?.departure_date || '',
          departure_time: ride?.departure_time || '',
          driver: {
            full_name: (driverDetails as any)?.full_name || 'Driver',
            phone: (driverDetails as any)?.phone || '',
            average_rating: (driverDetails as any)?.average_rating || 0
          },
          vehicle: {
            car_model: (vehicleDetails as any)?.car_model || '',
            car_type: (vehicleDetails as any)?.car_type || '',
            license_plate: (vehicleDetails as any)?.license_plate || '',
            color: (vehicleDetails as any)?.color || ''
          }
        }
      };

      console.log('Ticket generated successfully');

      return {
        success: true,
        ticketData,
        qrCodeUrl
      };

    } catch (error) {
      console.error('Ticket generation error:', error);
      return {
        success: false,
        error: 'Failed to generate ticket'
      };
    }
  }

  /**
   * Generate QR code only (for quick access)
   */
  static async generateQRCode(
    bookingId: string,
    rideId: string,
    seats: string[],
    pickupZone: string,
    dropoffZone: string,
    passengerCount: number
  ): Promise<{ success: boolean; qrCodeUrl?: string; error?: string }> {
    try {
      const qrCodeData = this.generateQRCodeData(
        bookingId,
        rideId,
        seats,
        pickupZone,
        dropoffZone,
        passengerCount
      );

      const qrCodeUrl = await QRCode.toDataURL(JSON.stringify(qrCodeData), {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
        errorCorrectionLevel: 'M'
      });

      return { success: true, qrCodeUrl };
    } catch (error) {
      console.error('QR code generation error:', error);
      return { success: false, error: 'Failed to generate QR code' };
    }
  }

  /**
   * Verify QR code by scanning (for driver side)
   */
  static async verifyQRCode(qrCodeContent: string): Promise<QRVerificationResult> {
    try {
      // Parse QR code data
      let qrData: QRCodeData;
      try {
        qrData = JSON.parse(qrCodeContent);
      } catch (error) {
        return { valid: false, error: 'Invalid QR code format' };
      }

      // Verify QR code integrity
      if (!this.verifyQRCodeData(qrData)) {
        return { valid: false, error: 'QR code verification failed' };
      }

      // Verify with database
      const { data, error } = await supabase.rpc('verify_booking_qr', {
        booking_uuid: qrData.booking_id,
        verification_data: {
          seats: qrData.seats,
          passenger_count: qrData.passenger_count,
          timestamp: qrData.timestamp
        }
      });

      if (error) {
        console.error('QR verification RPC error:', error);
        return { valid: false, error: 'Database verification failed' };
      }

      if (!data || !data.valid) {
        return { valid: false, error: data?.error || 'Booking verification failed' };
      }

      return {
        valid: true,
        booking_id: data.booking_id,
        passenger_count: data.passenger_count,
        seats: data.seats,
        passenger_name: data.passenger_name,
        total_price: data.total_price,
        route: data.route
      };

    } catch (error) {
      console.error('QR verification error:', error);
      return { valid: false, error: 'QR code verification failed' };
    }
  }

  /**
   * Check if QR code is expired
   */
  static isQRCodeExpired(qrCodeContent: string): boolean {
    try {
      const qrData: QRCodeData = JSON.parse(qrCodeContent);
      return Date.now() > qrData.expires_at;
    } catch (error) {
      return true; // Consider invalid QR codes as expired
    }
  }

  /**
   * Get QR code expiry information
   */
  static getQRCodeExpiry(qrCodeContent: string): { 
    isExpired: boolean; 
    expiresAt?: Date; 
    hoursRemaining?: number; 
  } {
    try {
      const qrData: QRCodeData = JSON.parse(qrCodeContent);
      const expiresAt = new Date(qrData.expires_at);
      const now = Date.now();
      const isExpired = now > qrData.expires_at;
      const hoursRemaining = isExpired ? 0 : Math.ceil((qrData.expires_at - now) / (1000 * 60 * 60));

      return {
        isExpired,
        expiresAt,
        hoursRemaining
      };
    } catch (error) {
      return { isExpired: true };
    }
  }

  /**
   * Regenerate QR code for existing booking (if expired or lost)
   */
  static async regenerateQRCode(bookingId: string): Promise<{
    success: boolean;
    qrCodeUrl?: string;
    error?: string;
  }> {
    try {
      console.log('Regenerating QR code for booking:', bookingId);

      const bookingDetails = await BookingService.getBookingDetails(bookingId);
      
      if (!bookingDetails.success || !bookingDetails.booking) {
        return {
          success: false,
          error: bookingDetails.error || 'Booking not found'
        };
      }

      const booking = bookingDetails.booking;
      const pickupZone = bookingDetails.pickup_zone;
      const dropoffZone = bookingDetails.dropoff_zone;

      if (!pickupZone || !dropoffZone) {
        return {
          success: false,
          error: 'Zone information not found'
        };
      }

      const result = await this.generateQRCode(
        booking.id,
        booking.ride_id,
        booking.selected_seats || [],
        pickupZone.zone_name,
        dropoffZone.zone_name,
        booking.seats_booked || 0
      );

      console.log('QR code regenerated successfully');
      return result;

    } catch (error) {
      console.error('QR code regeneration error:', error);
      return {
        success: false,
        error: 'Failed to regenerate QR code'
      };
    }
  }

  /**
   * Format ticket data for display components
   */
  static formatTicketForDisplay(ticketData: TicketData): any {
    return {
      booking_id: ticketData.booking_id,
      ride_id: ticketData.ride_id,
      selected_seats: ticketData.selected_seats,
      total_price: ticketData.total_price,
      pickup_zone: ticketData.pickup_zone,
      dropoff_zone: ticketData.dropoff_zone,
      passenger_details: ticketData.passenger_details,
      ride_details: ticketData.ride_details
    };
  }
}