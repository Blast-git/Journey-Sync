import type { PassengerDetail } from '@/services/bookingService';
import type { CityZone } from '@/types/mapTypes';

export interface DebugInfo {
  timestamp: string;
  step: string;
  data: any;
  issues: string[];
  recommendations: string[];
}

/**
 * Debug booking data to identify validation issues
 */
export const debugBookingData = (
  rideId: string,
  passengerId: string,
  seatIds: string[],
  pickupZone: CityZone | null,
  dropoffZone: CityZone | null,
  passengerDetails: PassengerDetail[],
  totalPrice: number
): DebugInfo => {
  const issues: string[] = [];
  const recommendations: string[] = [];

  console.group('🔍 BOOKING DEBUG ANALYSIS');
  
  // Check basic IDs
  console.log('📋 Basic Information:');
  console.log('- Ride ID:', rideId);
  console.log('- Passenger ID:', passengerId);
  console.log('- Total Price:', totalPrice);

  if (!rideId?.trim()) {
    issues.push('Missing ride ID');
    recommendations.push('Ensure ride is properly loaded before booking');
  }

  if (!passengerId?.trim()) {
    issues.push('Missing passenger ID');
    recommendations.push('Check user authentication status');
  }

  // Check seat selection
  console.log('\n🪑 Seat Selection:');
  console.log('- Selected seats:', seatIds);
  console.log('- Seat count:', seatIds?.length || 0);

  if (!Array.isArray(seatIds) || seatIds.length === 0) {
    issues.push('No seats selected');
    recommendations.push('User must select at least one seat');
  } else {
    const invalidSeats = seatIds.filter(id => !id?.trim());
    if (invalidSeats.length > 0) {
      issues.push(`${invalidSeats.length} invalid seat IDs detected`);
      recommendations.push('Check seat selection component for empty values');
    }
  }

  // Check zones
  console.log('\n📍 Zone Selection:');
  console.log('- Pickup zone:', pickupZone?.zone_name || 'NOT SELECTED');
  console.log('- Pickup city:', pickupZone?.city_name || 'N/A');
  console.log('- Dropoff zone:', dropoffZone?.zone_name || 'NOT SELECTED');
  console.log('- Dropoff city:', dropoffZone?.city_name || 'N/A');

  if (!pickupZone?.id) {
    issues.push('Pickup zone not selected');
    recommendations.push('User must select a pickup zone');
  }

  if (!dropoffZone?.id) {
    issues.push('Dropoff zone not selected');
    recommendations.push('User must select a dropoff zone');
  }

  if (pickupZone?.city_name && dropoffZone?.city_name && 
      pickupZone.city_name === dropoffZone.city_name) {
    issues.push('Same city booking (not intercity)');
    recommendations.push('For intercity service, pickup and drop must be different cities');
  }

  // Check passenger details
  console.log('\n👥 Passenger Details:');
  console.log('- Number of passengers:', passengerDetails?.length || 0);
  console.log('- Expected passengers:', seatIds?.length || 0);

  if (!Array.isArray(passengerDetails) || passengerDetails.length === 0) {
    issues.push('No passenger details provided');
    recommendations.push('Collect passenger information for each seat');
  } else {
    if (passengerDetails.length !== seatIds?.length) {
      issues.push(`Passenger count mismatch: ${passengerDetails.length} passengers vs ${seatIds?.length} seats`);
      recommendations.push('Number of passenger details must match number of seats');
    }

    passengerDetails.forEach((passenger, index) => {
      console.log(`\n  Passenger ${index + 1} (Seat: ${seatIds?.[index] || 'Unknown'}):`);
      console.log('  - Name:', passenger.name || 'MISSING');
      console.log('  - Phone:', passenger.phone || 'MISSING');
      console.log('  - Email:', passenger.email || 'Not provided');
      console.log('  - Age:', passenger.age || 'MISSING');
      console.log('  - Gender:', passenger.gender || 'MISSING');

      if (!passenger.name?.trim()) {
        issues.push(`Passenger ${index + 1}: Name is missing`);
        recommendations.push(`Fill in name for passenger ${index + 1}`);
      }

      if (!passenger.phone?.trim()) {
        issues.push(`Passenger ${index + 1}: Phone is missing`);
        recommendations.push(`Fill in phone for passenger ${index + 1}`);
      } else {
        // Basic phone validation
        const phoneRegex = /^(\+91|91)?[6-9]\d{9}$/;
        const cleanPhone = passenger.phone.replace(/[\s\-\(\)]/g, '');
        if (!phoneRegex.test(cleanPhone)) {
          issues.push(`Passenger ${index + 1}: Invalid phone format`);
          recommendations.push(`Check phone number format for passenger ${index + 1}`);
        }
      }

      if (!passenger.age || passenger.age < 18) {
        issues.push(`Passenger ${index + 1}: Invalid age (must be 18+)`);
        recommendations.push(`Set valid age for passenger ${index + 1}`);
      }

      if (!passenger.gender?.trim()) {
        issues.push(`Passenger ${index + 1}: Gender not selected`);
        recommendations.push(`Select gender for passenger ${index + 1}`);
      }
    });
  }

  // Check pricing
  console.log('\n💰 Pricing:');
  console.log('- Total price:', totalPrice);
  
  if (typeof totalPrice !== 'number' || totalPrice <= 0) {
    issues.push('Invalid total price');
    recommendations.push('Calculate valid total price based on selected seats');
  }

  // Summary
  console.log('\n📊 SUMMARY:');
  console.log('- Issues found:', issues.length);
  console.log('- Status:', issues.length === 0 ? '✅ Ready to book' : '❌ Has issues');

  if (issues.length > 0) {
    console.log('\n❌ Issues:');
    issues.forEach((issue, index) => console.log(`  ${index + 1}. ${issue}`));
    
    console.log('\n💡 Recommendations:');
    recommendations.forEach((rec, index) => console.log(`  ${index + 1}. ${rec}`));
  }

  console.groupEnd();

  return {
    timestamp: new Date().toISOString(),
    step: 'validation',
    data: {
      rideId,
      passengerId,
      seatIds,
      pickupZone: pickupZone?.zone_name,
      dropoffZone: dropoffZone?.zone_name,
      passengerCount: passengerDetails?.length,
      totalPrice
    },
    issues,
    recommendations
  };
};

/**
 * Quick validation check for debugging
 */
export const quickValidationCheck = (bookingData: any): { valid: boolean; issue?: string } => {
  try {
    if (!bookingData) {
      return { valid: false, issue: 'No booking data provided' };
    }

    if (!bookingData.rideId) {
      return { valid: false, issue: 'Missing ride ID' };
    }

    if (!bookingData.selectedSeats?.length) {
      return { valid: false, issue: 'No seats selected' };
    }

    if (!bookingData.pickupZone) {
      return { valid: false, issue: 'No pickup zone selected' };
    }

    if (!bookingData.dropoffZone) {
      return { valid: false, issue: 'No dropoff zone selected' };
    }

    if (!bookingData.passengerDetails?.length) {
      return { valid: false, issue: 'No passenger details provided' };
    }

    // Check first passenger for quick validation
    const firstPassenger = bookingData.passengerDetails[0];
    if (!firstPassenger?.name) {
      return { valid: false, issue: 'First passenger name is missing' };
    }

    if (!firstPassenger?.phone) {
      return { valid: false, issue: 'First passenger phone is missing' };
    }

    return { valid: true };

  } catch (error) {
    return { valid: false, issue: 'Validation check failed' };
  }
};

/**
 * Log booking attempt for debugging
 */
export const logBookingAttempt = (
  step: string,
  success: boolean,
  error?: string,
  data?: any
) => {
  const logLevel = success ? 'info' : 'error';
  const status = success ? '✅' : '❌';
  
  console.log(`${status} Booking ${step}: ${success ? 'SUCCESS' : 'FAILED'}`);
  
  if (error) {
    console.error('Error:', error);
  }
  
  if (data && !success) {
    console.log('Data at time of failure:', data);
  }
  
  // Store in session storage for debugging (if available)
  if (typeof window !== 'undefined' && window.sessionStorage) {
    const debugKey = `booking_debug_${Date.now()}`;
    try {
      sessionStorage.setItem(debugKey, JSON.stringify({
        timestamp: new Date().toISOString(),
        step,
        success,
        error,
        data
      }));
    } catch (e) {
      // Ignore storage errors
    }
  }
};