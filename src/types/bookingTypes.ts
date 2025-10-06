// ===========================================
// src/types/bookingTypes.ts
// Complete booking type definitions for Phase 5
// ===========================================

import type { CityZone } from './mapTypes';

// ===== CORE BOOKING TYPES =====

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
export type BookingStep = 'zones' | 'seats' | 'details' | 'review' | 'complete';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

// ===== PASSENGER TYPES =====

export interface PassengerDetail {
  name: string;
  phone: string;
  email?: string;
  age: number;
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  special_requirements?: string;
  medical_conditions?: string;
  notes?: string;
}

export interface PassengerValidation {
  isValid: boolean;
  errors: Record<keyof PassengerDetail, string[]>;
}

// ===== SEAT TYPES =====

export interface SeatInfo {
  id: string;
  row: number;
  position: 'window' | 'aisle' | 'middle' | 'driver';
  type: 'standard' | 'premium' | 'front' | 'driver';
  price: number;
  isAvailable: boolean;
  isSelected: boolean;
  passengerIndex?: number;
}

export interface SeatLayout {
  id: string;
  vehicleType: string;
  totalSeats: number;
  rows: SeatRow[];
  configuration: string; // e.g., "2+2", "2+1", etc.
}

export interface SeatRow {
  index: number;
  type: 'front' | 'middle' | 'back';
  seats: SeatInfo[];
  hasAisle: boolean;
}

export interface SeatPricing {
  [seatId: string]: number;
}

// ===== BOOKING DATA TYPES =====

export interface BookingRequest {
  ride_id: string;
  passenger_id: string;
  seat_ids: string[];
  pickup_zone_id: string;
  dropoff_zone_id: string;
  passenger_details: PassengerDetail[];
  total_price: number;
  payment_method?: string;
  special_requests?: string;
}

export interface BookingResponse {
  success: boolean;
  booking_id?: string;
  ride_id?: string;
  seats_booked?: string[];
  total_price?: number;
  pickup_zone_id?: string;
  dropoff_zone_id?: string;
  payment_required?: boolean;
  error?: string;
  validation_errors?: Record<string, string[]>;
}

export interface BookingData {
  id: string;
  ride_id: string;
  passenger_id: string;
  seats_booked: number;
  selected_seats: string[];
  total_price: number;
  status: BookingStatus;
  pickup_zone_id: string;
  dropoff_zone_id: string;
  passenger_details?: PassengerDetail[];
  booking_date: string;
  created_at: string;
  updated_at: string;
  
  // Relations
  ride?: RideInfo;
  pickup_zone?: CityZone;
  dropoff_zone?: CityZone;
  passenger?: PassengerInfo;
  payment?: PaymentInfo;
}

// ===== RIDE INFORMATION =====

export interface RideInfo {
  id: string;
  driver_id: string;
  vehicle_id: string;
  from_city: string;
  to_city: string;
  departure_date: string;
  departure_time: string;
  available_seats: number;
  total_seats: number;
  price_per_seat: number;
  base_price: number;
  status: 'active' | 'cancelled' | 'completed' | 'full';
  notes?: string;
  
  // Route information
  route_polyline?: string;
  route_distance_km?: number;
  route_duration_minutes?: number;
  
  // Seat configuration
  seat_layout?: SeatLayout;
  seat_pricing?: SeatPricing;
  
  // Relations
  driver?: DriverInfo;
  vehicle?: VehicleInfo;
  pickup_zones?: CityZone[];
  dropoff_zones?: CityZone[];
}

export interface DriverInfo {
  id: string;
  full_name: string;
  phone?: string;
  email?: string;
  avatar_url?: string;
  average_rating: number;
  total_ratings: number;
  gender?: string;
  age?: number;
  kyc_status?: 'pending' | 'approved' | 'rejected';
  
  // Driver-specific info
  license_number?: string;
  license_expiry?: string;
  driving_experience_years?: number;
  total_rides_completed?: number;
}

export interface VehicleInfo {
  id: string;
  driver_id: string;
  car_model: string;
  car_type: string;
  license_plate: string;
  color: string;
  seat_capacity: number;
  brand?: string;
  segment?: string;
  is_verified: boolean;
  is_primary: boolean;
}

export interface PassengerInfo {
  id: string;
  full_name: string;
  phone?: string;
  email?: string;
  gender?: string;
  age?: number;
  average_rating?: number;
  total_rides?: number;
}

// ===== PAYMENT TYPES =====

export interface PaymentInfo {
  id: string;
  booking_id: string;
  amount: number;
  currency: string;
  payment_method: 'cash' | 'upi' | 'card' | 'wallet';
  status: PaymentStatus;
  transaction_id?: string;
  payment_gateway?: string;
  created_at: string;
  processed_at?: string;
}

// ===== TICKET TYPES =====

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
    center_latitude?: number;
    center_longitude?: number;
  };
  
  dropoff_zone: {
    id: string;
    zone_name: string;
    city_name: string;
    landmarks: string[];
    center_latitude?: number;
    center_longitude?: number;
  };
  
  passenger_details: Array<{
    name: string;
    phone: string;
    gender: string;
    age: string;
    seat_number?: string;
  }>;
  
  ride_details: {
    from_city: string;
    to_city: string;
    departure_date: string;
    departure_time: string;
    route_distance_km?: number;
    route_duration_minutes?: number;
    
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
  
  // Metadata
  status: BookingStatus;
  created_at: string;
  qr_code_url?: string;
}

// ===== QR CODE TYPES =====

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
  version: string; // QR code format version
}

export interface QRVerificationResult {
  valid: boolean;
  booking_id?: string;
  passenger_count?: number;
  seats?: string[];
  passenger_name?: string;
  total_price?: number;
  route?: string;
  expires_at?: number;
  error?: string;
}

// ===== BOOKING FLOW TYPES =====

export interface BookingFlowState {
  currentStep: BookingStep;
  rideId: string | null;
  rideInfo: RideInfo | null;
  
  // Zone selection
  pickupZone: CityZone | null;
  dropoffZone: CityZone | null;
  availablePickupZones: CityZone[];
  availableDropoffZones: CityZone[];
  
  // Seat selection
  selectedSeats: string[];
  seatLayout: SeatLayout | null;
  seatPricing: SeatPricing;
  totalPrice: number;
  
  // Passenger details
  passengerDetails: PassengerDetail[];
  
  // Status
  isLoading: boolean;
  isValidating: boolean;
  error: string | null;
  validationErrors: Record<string, string[]>;
  
  // Booking result
  bookingResult: BookingResponse | null;
  ticketData: TicketData | null;
}

export interface BookingFlowActions {
  // Step management
  setCurrentStep: (step: BookingStep) => void;
  nextStep: () => void;
  previousStep: () => void;
  canProceedToNextStep: () => boolean;
  
  // Initialization
  initializeBooking: (rideId: string) => Promise<void>;
  
  // Zone selection
  setPickupZone: (zone: CityZone) => void;
  setDropoffZone: (zone: CityZone) => void;
  validateZoneSelection: () => Promise<boolean>;
  
  // Seat selection
  toggleSeat: (seatId: string) => void;
  setSeatSelection: (seatIds: string[]) => void;
  validateSeatSelection: () => boolean;
  calculateTotalPrice: () => number;
  
  // Passenger details
  updatePassengerDetails: (index: number, details: Partial<PassengerDetail>) => void;
  validatePassengerDetails: () => PassengerValidation;
  
  // Booking submission
  submitBooking: () => Promise<BookingResponse>;
  generateTicket: () => Promise<boolean>;
  
  // Utilities
  resetBooking: () => void;
  clearError: () => void;
  clearValidationErrors: () => void;
}

// ===== VALIDATION TYPES =====

export interface BookingValidationRules {
  minAge: number;
  maxAge: number;
  maxSeatsPerBooking: number;
  requireEmergencyContact: boolean;
  allowSameCityBooking: boolean;
  phoneNumberRegex: RegExp;
  nameMinLength: number;
  advanceBookingHours: number;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: string[];
}

// ===== API RESPONSE TYPES =====

export interface SeatAvailabilityResponse {
  success: boolean;
  ride_id?: string;
  total_seats?: number;
  seats_booked?: number;
  available_seats?: number;
  booked_seat_ids?: string[];
  seat_layout?: SeatLayout;
  seat_pricing?: SeatPricing;
  error?: string;
}

export interface BookingListResponse {
  success: boolean;
  bookings?: BookingData[];
  total_count?: number;
  page?: number;
  limit?: number;
  error?: string;
}

export interface TicketGenerationResponse {
  success: boolean;
  ticket_data?: TicketData;
  qr_code_url?: string;
  download_url?: string;
  error?: string;
}

// ===== FILTER AND SEARCH TYPES =====

export interface BookingFilter {
  status?: BookingStatus[];
  dateFrom?: string;
  dateTo?: string;
  cities?: string[];
  driverId?: string;
  passengerId?: string;
  priceMin?: number;
  priceMax?: number;
}

export interface BookingSearchParams {
  query?: string;
  filters?: BookingFilter;
  sortBy?: 'created_at' | 'departure_date' | 'total_price' | 'status';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// ===== NOTIFICATION TYPES =====

export interface BookingNotification {
  id: string;
  booking_id: string;
  user_id: string;
  type: 'booking_confirmed' | 'payment_reminder' | 'departure_reminder' | 'cancellation' | 'driver_assigned';
  title: string;
  message: string;
  data?: Record<string, any>;
  sent_at: string;
  read_at?: string;
  scheduled_for?: string;
}

// ===== ANALYTICS TYPES =====

export interface BookingAnalytics {
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  averageBookingValue: number;
  popularRoutes: Array<{
    route: string;
    count: number;
    revenue: number;
  }>;
  monthlyTrends: Array<{
    month: string;
    bookings: number;
    revenue: number;
  }>;
}

// ===== EXPORT ALL TYPES =====

export type {
  // Core types
  BookingStatus,
  BookingStep,
  PaymentStatus,
  
  // Passenger types
  PassengerDetail,
  PassengerValidation,
  
  // Seat types
  SeatInfo,
  SeatLayout,
  SeatRow,
  SeatPricing,
  
  // Booking types
  BookingRequest,
  BookingResponse,
  BookingData,
  
  // Entity types
  RideInfo,
  DriverInfo,
  VehicleInfo,
  PassengerInfo,
  PaymentInfo,
  
  // Ticket types
  TicketData,
  QRCodeData,
  QRVerificationResult,
  
  // Flow types
  BookingFlowState,
  BookingFlowActions,
  
  // Validation types
  BookingValidationRules,
  ValidationError,
  ValidationResult,
  
  // API types
  SeatAvailabilityResponse,
  BookingListResponse,
  TicketGenerationResponse,
  
  // Utility types
  BookingFilter,
  BookingSearchParams,
  BookingNotification,
  BookingAnalytics,
};