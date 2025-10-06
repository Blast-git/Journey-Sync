// import { supabase } from "@/integrations/supabase/client";

// // Types based on your secure database schema
// export interface RideSearchParams {
//   from_city?: string;
//   to_city?: string;
//   departure_date?: string;
//   min_seats?: number;
//   max_price?: number;
// }

// export interface DriverProfile {
//   id: string;
//   full_name: string;
//   phone: string;
//   email: string;
//   avatar_url?: string;
//   average_rating: number;
//   total_ratings: number;
//   kyc_status: string;
//   gender?: string;
//   age?: number;
//   // Driver security info (only visible for confirmed bookings)
//   license_number?: string;
//   license_expiry?: string;
//   background_check_status?: string;
//   driving_experience_years?: number;
//   intercity_experience_years?: number;
//   total_rides_completed?: number;
// }

// export interface VehicleDetails {
//   id: string;
//   driver_id: string;
//   car_type: string;
//   car_model: string;
//   license_plate: string;
//   color: string;
//   seat_capacity: number;
//   brand?: string;
//   segment?: string;
//   is_primary: boolean;
//   is_verified: boolean;
// }

// export interface RideWithDetails {
//   id: string;
//   driver_id: string;
//   vehicle_id: string;
//   from_city: string;
//   to_city: string;
//   departure_date: string;
//   departure_time: string;
//   pickup_point: string;
//   available_seats: number;
//   price_per_seat: number;
//   notes?: string;
//   is_active: boolean;
//   created_at: string;
//   updated_at: string;
//   // Joined data (limited based on security policies)
//   driver: DriverProfile;
//   vehicle: VehicleDetails;
// }

// export interface FetchRidesResponse {
//   rides: RideWithDetails[];
//   total_count: number;
//   error?: string;
// }

// /**
//  * Fetches public rides for search - uses security-compliant approach
//  * Only shows basic driver info until booking is confirmed
//  */
// export const fetchRides = async (
//   searchParams: RideSearchParams,
//   limit: number = 20,
//   offset: number = 0
// ): Promise<FetchRidesResponse> => {
//   try {
//     // Build the base query for public ride search
//     // This will only return basic information according to RLS policies
//     let query = supabase
//       .from("rides")
//       .select(`
//         id,
//         driver_id,
//         vehicle_id,
//         from_city,
//         to_city,
//         departure_date,
//         departure_time,
//         pickup_point,
//         available_seats,
//         price_per_seat,
//         notes,
//         is_active,
//         created_at,
//         updated_at
//       `, { count: 'exact' })
//       .eq("is_active", true)
//       .gt("available_seats", 0)
//       .gte("departure_date", new Date().toISOString().split("T")[0])
//       .order("departure_date", { ascending: true })
//       .order("departure_time", { ascending: true });

//     // Apply search filters
//     if (searchParams.from_city) {
//       query = query.ilike("from_city", `%${searchParams.from_city.trim()}%`);
//     }

//     if (searchParams.to_city) {
//       query = query.ilike("to_city", `%${searchParams.to_city.trim()}%`);
//     }

//     if (searchParams.departure_date) {
//       query = query.eq("departure_date", searchParams.departure_date);
//     }

//     if (searchParams.min_seats && searchParams.min_seats > 1) {
//       query = query.gte("available_seats", searchParams.min_seats);
//     }

//     if (searchParams.max_price && searchParams.max_price > 0) {
//       query = query.lte("price_per_seat", searchParams.max_price);
//     }

//     // Apply pagination
//     query = query.range(offset, offset + limit - 1);

//     const { data: ridesData, error: ridesError, count } = await query;

//     if (ridesError) {
//       console.error("Supabase error in fetchRides:", ridesError);
//       throw new Error(`Database error: ${ridesError.message}`);
//     }

//     if (!ridesData || ridesData.length === 0) {
//       return {
//         rides: [],
//         total_count: count || 0,
//         error: undefined,
//       };
//     }

//     console.log("🔍 Raw rides data:", JSON.stringify(ridesData, null, 2));

//     // Now fetch driver and vehicle info for each ride
//     // This respects RLS policies - only basic info is returned for public search
//     const ridesWithDetails: RideWithDetails[] = [];

//     for (const ride of ridesData) {
//       try {
//         // Fetch basic driver profile (RLS will limit what's returned)
//         const { data: driverData, error: driverError } = await supabase
//           .from("profiles")
//           .select(`
//             id,
//             full_name,
//             phone,
//             email,
//             avatar_url,
//             average_rating,
//             total_ratings,
//             kyc_status,
//             gender,
//             age
//           `)
//           .eq("id", ride.driver_id)
//           .single();

//         // Fetch vehicle info (RLS will limit what's returned)  
//         const { data: vehicleData, error: vehicleError } = await supabase
//           .from("vehicles")
//           .select(`
//             id,
//             driver_id,
//             car_type,
//             car_model,
//             license_plate,
//             color,
//             seat_capacity,
//             brand,
//             segment,
//             is_primary,
//             is_verified
//           `)
//           .eq("id", ride.vehicle_id)
//           .single();

//         // For public search, driver details are limited by RLS
//         // Phone numbers and sensitive info won't be returned until booking is confirmed
//         const driver: DriverProfile = driverData ? {
//           id: driverData.id,
//           full_name: driverData.full_name || 'Driver',
//           phone: driverData.phone || '', // May be empty due to RLS
//           email: driverData.email || '',
//           avatar_url: driverData.avatar_url,
//           average_rating: driverData.average_rating || 0,
//           total_ratings: driverData.total_ratings || 0,
//           kyc_status: driverData.kyc_status || 'pending',
//           gender: driverData.gender,
//           age: driverData.age,
//         } : {
//           id: ride.driver_id,
//           full_name: 'Driver',
//           phone: '',
//           email: '',
//           average_rating: 0,
//           total_ratings: 0,
//           kyc_status: 'unknown',
//         };

//         // Vehicle info may also be limited by RLS
//         const vehicle: VehicleDetails = vehicleData ? {
//           id: vehicleData.id,
//           driver_id: vehicleData.driver_id,
//           car_type: vehicleData.car_type || 'Car',
//           car_model: vehicleData.car_model || 'Unknown Model',
//           license_plate: vehicleData.license_plate || 'Will be shared after confirmation',
//           color: vehicleData.color || 'Unknown',
//           seat_capacity: vehicleData.seat_capacity || 4,
//           brand: vehicleData.brand,
//           segment: vehicleData.segment,
//           is_primary: vehicleData.is_primary || false,
//           is_verified: vehicleData.is_verified || false,
//         } : {
//           id: ride.vehicle_id,
//           driver_id: ride.driver_id,
//           car_type: 'Car',
//           car_model: 'Unknown Model',
//           license_plate: 'Will be shared after confirmation',
//           color: 'Unknown',
//           seat_capacity: 4,
//           brand: 'Unknown',
//           segment: 'Unknown',
//           is_primary: false,
//           is_verified: false,
//         };

//         ridesWithDetails.push({
//           ...ride,
//           driver,
//           vehicle,
//         });

//       } catch (detailError) {
//         console.warn(`Failed to fetch details for ride ${ride.id}:`, detailError);
//         // Still include the ride with minimal info
//         ridesWithDetails.push({
//           ...ride,
//           driver: {
//             id: ride.driver_id,
//             full_name: 'Driver',
//             phone: '',
//             email: '',
//             average_rating: 0,
//             total_ratings: 0,
//             kyc_status: 'unknown',
//           },
//           vehicle: {
//             id: ride.vehicle_id,
//             driver_id: ride.driver_id,
//             car_type: 'Car',
//             car_model: 'Unknown Model',
//             license_plate: 'Will be shared after confirmation',
//             color: 'Unknown',
//             seat_capacity: 4,
//             brand: 'Unknown',
//             segment: 'Unknown',
//             is_primary: false,
//             is_verified: false,
//           },
//         });
//       }
//     }

//     console.log("✅ Rides with security-compliant details:", JSON.stringify(ridesWithDetails, null, 2));

//     return {
//       rides: ridesWithDetails,
//       total_count: count || 0,
//       error: undefined,
//     };

//   } catch (error) {
//     console.error("Error in fetchRides:", error);
//     return {
//       rides: [],
//       total_count: 0,
//       error: error instanceof Error ? error.message : "Unknown error occurred",
//     };
//   }
// };

// /**
//  * Fetches a single ride by ID - uses secure view for passenger access
//  */
// export const fetchRideById = async (rideId: string): Promise<RideWithDetails | null> => {
//   try {
//     // First get basic ride info
//     const { data: rideData, error: rideError } = await supabase
//       .from("rides")
//       .select(`
//         id,
//         driver_id,
//         vehicle_id,
//         from_city,
//         to_city,
//         departure_date,
//         departure_time,
//         pickup_point,
//         available_seats,
//         price_per_seat,
//         notes,
//         is_active,
//         created_at,
//         updated_at
//       `)
//       .eq("id", rideId)
//       .eq("is_active", true)
//       .single();

//     if (rideError || !rideData) {
//       console.error("Error fetching ride by ID:", rideError);
//       return null;
//     }

//     // Try to get driver info (RLS will determine what's visible)
//     const { data: driverData } = await supabase
//       .from("profiles")
//       .select(`
//         id,
//         full_name,
//         phone,
//         email,
//         avatar_url,
//         average_rating,
//         total_ratings,
//         kyc_status,
//         gender,
//         age
//       `)
//       .eq("id", rideData.driver_id)
//       .single();

//     // Try to get vehicle info (RLS will determine what's visible)
//     const { data: vehicleData } = await supabase
//       .from("vehicles")
//       .select(`
//         id,
//         driver_id,
//         car_type,
//         car_model,
//         license_plate,
//         color,
//         seat_capacity,
//         brand,
//         segment,
//         is_primary,
//         is_verified
//       `)
//       .eq("id", rideData.vehicle_id)
//       .single();

//     const driver: DriverProfile = driverData ? {
//       id: driverData.id,
//       full_name: driverData.full_name || 'Driver',
//       phone: driverData.phone || '',
//       email: driverData.email || '',
//       avatar_url: driverData.avatar_url,
//       average_rating: driverData.average_rating || 0,
//       total_ratings: driverData.total_ratings || 0,
//       kyc_status: driverData.kyc_status || 'pending',
//       gender: driverData.gender,
//       age: driverData.age,
//     } : {
//       id: rideData.driver_id,
//       full_name: 'Driver',
//       phone: '',
//       email: '',
//       average_rating: 0,
//       total_ratings: 0,
//       kyc_status: 'unknown',
//     };

//     const vehicle: VehicleDetails = vehicleData ? {
//       id: vehicleData.id,
//       driver_id: vehicleData.driver_id,
//       car_type: vehicleData.car_type || 'Car',
//       car_model: vehicleData.car_model || 'Unknown Model',
//       license_plate: vehicleData.license_plate || 'Will be shared after confirmation',
//       color: vehicleData.color || 'Unknown',
//       seat_capacity: vehicleData.seat_capacity || 4,
//       brand: vehicleData.brand,
//       segment: vehicleData.segment,
//       is_primary: vehicleData.is_primary || false,
//       is_verified: vehicleData.is_verified || false,
//     } : {
//       id: rideData.vehicle_id,
//       driver_id: rideData.driver_id,
//       car_type: 'Car',
//       car_model: 'Unknown Model',
//       license_plate: 'Will be shared after confirmation',
//       color: 'Unknown',
//       seat_capacity: 4,
//       brand: 'Unknown',
//       segment: 'Unknown',
//       is_primary: false,
//       is_verified: false,
//     };

//     return {
//       ...rideData,
//       driver,
//       vehicle,
//     };

//   } catch (error) {
//     console.error("Error in fetchRideById:", error);
//     return null;
//   }
// };

// /**
//  * Fetches rides using the secure passenger view 
//  * This should be used when a passenger has bookings
//  */
// export const fetchPassengerRideInfo = async (bookingId: string): Promise<RideWithDetails | null> => {
//   try {
//     // Use the secure passenger view which includes driver security info for confirmed bookings
//     const { data, error } = await supabase
//       .from("secure_passenger_ride_info")
//       .select("*")
//       .eq("booking_id", bookingId)
//       .single();

//     if (error || !data) {
//       console.error("Error fetching passenger ride info:", error);
//       return null;
//     }

//     // Transform the secure view data to match our interface
//     return {
//       id: data.ride_id,
//       driver_id: data.driver_id,
//       vehicle_id: data.vehicle_id,
//       from_city: data.from_city,
//       to_city: data.to_city,
//       departure_date: data.departure_date,
//       departure_time: data.departure_time,
//       pickup_point: data.pickup_point,
//       available_seats: data.available_seats,
//       price_per_seat: data.price_per_seat,
//       notes: data.notes,
//       is_active: data.is_active,
//       created_at: data.created_at,
//       updated_at: data.updated_at,
//       driver: {
//         id: data.driver_id,
//         full_name: data.driver_full_name,
//         phone: data.driver_phone || '',
//         email: data.driver_email || '',
//         avatar_url: data.driver_avatar_url,
//         average_rating: data.driver_rating || 0,
//         total_ratings: data.driver_total_ratings || 0,
//         kyc_status: data.driver_kyc_status || 'pending',
//         gender: data.driver_gender,
//         age: data.driver_age,
//         // Security info available for confirmed bookings
//         license_number: data.license_number,
//         license_expiry: data.license_expiry,
//         background_check_status: data.background_check_status,
//         driving_experience_years: data.driving_experience_years,
//         intercity_experience_years: data.intercity_experience_years,
//         total_rides_completed: data.total_rides_completed,
//       },
//       vehicle: {
//         id: data.vehicle_id,
//         driver_id: data.driver_id,
//         car_type: data.car_type,
//         car_model: data.car_model,
//         license_plate: data.license_plate,
//         color: data.color,
//         seat_capacity: data.seat_capacity,
//         brand: data.brand,
//         segment: data.segment,
//         is_primary: data.is_primary,
//         is_verified: data.vehicle_verified,
//       },
//     };

//   } catch (error) {
//     console.error("Error in fetchPassengerRideInfo:", error);
//     return null;
//   }
// };

// /**
//  * Use the secure API function to get ride info
//  */
// export const getMyRideInfo = async (bookingUuid: string): Promise<any> => {
//   try {
//     const { data, error } = await supabase.rpc('get_my_ride_info', {
//       booking_uuid: bookingUuid
//     });

//     if (error) {
//       console.error("Error calling get_my_ride_info:", error);
//       return null;
//     }

//     return data;
//   } catch (error) {
//     console.error("Error in getMyRideInfo:", error);
//     return null;
//   }
// };

// /**
//  * Fetches rides by driver ID (for driver's own rides)
//  */
// export const fetchRidesByDriverId = async (
//   driverId: string,
//   includeInactive: boolean = false
// ): Promise<RideWithDetails[]> => {
//   try {
//     let query = supabase
//       .from("rides")
//       .select(`
//         id,
//         driver_id,
//         vehicle_id,
//         from_city,
//         to_city,
//         departure_date,
//         departure_time,
//         pickup_point,
//         available_seats,
//         price_per_seat,
//         notes,
//         is_active,
//         created_at,
//         updated_at
//       `)
//       .eq("driver_id", driverId)
//       .order("departure_date", { ascending: false });

//     if (!includeInactive) {
//       query = query.eq("is_active", true);
//     }

//     const { data: ridesData, error } = await query;

//     if (error) {
//       console.error("Error fetching rides by driver ID:", error);
//       return [];
//     }

//     if (!ridesData) return [];

//     // For driver's own rides, they should see full details
//     const ridesWithDetails: RideWithDetails[] = [];

//     for (const ride of ridesData) {
//       // Driver can see their own profile
//       const { data: driverData } = await supabase
//         .from("profiles")
//         .select("*")
//         .eq("id", ride.driver_id)
//         .single();

//       // Driver can see their own vehicle
//       const { data: vehicleData } = await supabase
//         .from("vehicles")
//         .select("*")
//         .eq("id", ride.vehicle_id)
//         .single();

//       ridesWithDetails.push({
//         ...ride,
//         driver: driverData ? {
//           ...driverData,
//           average_rating: driverData.average_rating || 0,
//           total_ratings: driverData.total_ratings || 0,
//         } : {
//           id: ride.driver_id,
//           full_name: 'Driver',
//           phone: '',
//           email: '',
//           average_rating: 0,
//           total_ratings: 0,
//           kyc_status: 'unknown',
//         },
//         vehicle: vehicleData ? {
//           ...vehicleData,
//           seat_capacity: vehicleData.seat_capacity || 4,
//         } : {
//           id: ride.vehicle_id,
//           driver_id: ride.driver_id,
//           car_type: 'Car',
//           car_model: 'Unknown Model',
//           license_plate: 'N/A',
//           color: 'Unknown',
//           seat_capacity: 4,
//           brand: 'Unknown',
//           segment: 'Unknown',
//           is_primary: false,
//           is_verified: false,
//         },
//       });
//     }

//     return ridesWithDetails;

//   } catch (error) {
//     console.error("Error in fetchRidesByDriverId:", error);
//     return [];
//   }
// };

// // Keep the existing searchRidesAdvanced and validateSearchParams functions
// export const searchRidesAdvanced = async (filters: {
//   from_city?: string;
//   to_city?: string;
//   departure_date?: string;
//   min_seats?: number;
//   max_price?: number;
//   car_type?: string;
//   verified_drivers_only?: boolean;
//   min_rating?: number;
// }): Promise<FetchRidesResponse> => {
//   // Use the regular fetchRides and then apply additional client-side filtering
//   const baseParams: RideSearchParams = {
//     from_city: filters.from_city,
//     to_city: filters.to_city,
//     departure_date: filters.departure_date,
//     min_seats: filters.min_seats,
//     max_price: filters.max_price,
//   };

//   const result = await fetchRides(baseParams, 100, 0);
  
//   if (result.error || !result.rides) {
//     return result;
//   }

//   // Apply additional filters client-side
//   let filteredRides = result.rides.filter(ride => {
//     // Filter by car type
//     if (filters.car_type && ride.vehicle.car_type !== filters.car_type) {
//       return false;
//     }

//     // Filter by verified drivers only
//     if (filters.verified_drivers_only && ride.driver.kyc_status !== 'approved') {
//       return false;
//     }

//     // Filter by minimum rating
//     if (filters.min_rating && ride.driver.average_rating < filters.min_rating) {
//       return false;
//     }

//     return true;
//   });

//   return {
//     rides: filteredRides,
//     total_count: filteredRides.length,
//     error: undefined,
//   };
// };

// // Utility function to validate search parameters
// export const validateSearchParams = (params: RideSearchParams): string[] => {
//   const errors: string[] = [];

//   if (params.min_seats && (params.min_seats < 1 || params.min_seats > 8)) {
//     errors.push("Minimum seats must be between 1 and 8");
//   }

//   if (params.max_price && params.max_price < 0) {
//     errors.push("Maximum price must be positive");
//   }

//   if (params.departure_date) {
//     const selectedDate = new Date(params.departure_date);
//     const today = new Date();
//     today.setHours(0, 0, 0, 0);
    
//     if (selectedDate < today) {
//       errors.push("Departure date cannot be in the past");
//     }
//   }

//   return errors;
// };


import { supabase } from "@/integrations/supabase/client";

// Types based on your secure database schema
export interface RideSearchParams {
  from_city?: string;
  to_city?: string;
  departure_date?: string;
  min_seats?: number;
  max_price?: number;
}

export interface DriverProfile {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  avatar_url?: string;
  average_rating: number;
  total_ratings: number;
  kyc_status: string;
  gender?: string;
  age?: number;
  // Driver security info (only visible for confirmed bookings)
  license_number?: string;
  license_expiry?: string;
  background_check_status?: string;
  driving_experience_years?: number;
  intercity_experience_years?: number;
  total_rides_completed?: number;
}

export interface VehicleDetails {
  id: string;
  driver_id: string;
  car_type: string;
  car_model: string;
  license_plate: string;
  color: string;
  seat_capacity: number;
  brand?: string;
  segment?: string;
  is_primary: boolean;
  is_verified: boolean;
}

export interface RideWithDetails {
  id: string;
  driver_id: string;
  vehicle_id: string;
  from_city: string;
  to_city: string;
  departure_date: string;
  departure_time: string;
  pickup_point: string;
  available_seats: number;
  price_per_seat: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Joined data (limited based on security policies)
  driver: DriverProfile;
  vehicle: VehicleDetails;
}

export interface FetchRidesResponse {
  rides: RideWithDetails[];
  total_count: number;
  error?: string;
}

/**
 * Fetches public rides for search - uses security-compliant approach
 * Only shows basic driver info until booking is confirmed
 */
export const fetchRides = async (
  searchParams: RideSearchParams,
  limit: number = 20,
  offset: number = 0
): Promise<FetchRidesResponse> => {
  try {
    // Build the base query for public ride search
    // This will only return basic information according to RLS policies
    let query = supabase
      .from("rides")
      .select(`
        id,
        driver_id,
        vehicle_id,
        from_city,
        to_city,
        departure_date,
        departure_time,
        pickup_point,
        available_seats,
        price_per_seat,
        notes,
        created_at,
        updated_at
      `, { count: 'exact' })
      .gt("available_seats", 0)
      .gte("departure_date", new Date().toISOString().split("T")[0])
      .order("departure_date", { ascending: true })
      .order("departure_time", { ascending: true });

    // Apply search filters
    if (searchParams.from_city) {
      query = query.ilike("from_city", `%${searchParams.from_city.trim()}%`);
    }

    if (searchParams.to_city) {
      query = query.ilike("to_city", `%${searchParams.to_city.trim()}%`);
    }

    if (searchParams.departure_date) {
      query = query.eq("departure_date", searchParams.departure_date);
    }

    if (searchParams.min_seats && searchParams.min_seats > 1) {
      query = query.gte("available_seats", searchParams.min_seats);
    }

    if (searchParams.max_price && searchParams.max_price > 0) {
      query = query.lte("price_per_seat", searchParams.max_price);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: ridesData, error: ridesError, count } = await query;

    if (ridesError) {
      console.error("Supabase error in fetchRides:", ridesError);
      throw new Error(`Database error: ${ridesError.message}`);
    }

    if (!ridesData || ridesData.length === 0) {
      return {
        rides: [],
        total_count: count || 0,
        error: undefined,
      };
    }

    console.log("🔍 Raw rides data:", JSON.stringify(ridesData, null, 2));

    // Now fetch driver and vehicle info for each ride
    // This respects RLS policies - only basic info is returned for public search
    const ridesWithDetails: RideWithDetails[] = [];

    for (const ride of ridesData) {
      try {
        // Fetch basic driver profile (RLS will limit what's returned)
        const { data: driverData, error: driverError } = await supabase
          .from("profiles")
          .select(`
            id,
            full_name,
            phone,
            email,
            avatar_url,
            average_rating,
            total_ratings,
            kyc_status,
            gender,
            age
          `)
          .eq("id", ride.driver_id)
          .single();

        // Fetch vehicle info (RLS will limit what's returned)  
        const { data: vehicleData, error: vehicleError } = await supabase
          .from("vehicles")
          .select(`
            id,
            driver_id,
            car_type,
            car_model,
            license_plate,
            color,
            seat_capacity,
            brand,
            segment,
            is_primary,
            is_verified
          `)
          .eq("id", ride.vehicle_id)
          .single();

        // For public search, driver details are limited by RLS
        // Phone numbers and sensitive info won't be returned until booking is confirmed
        const driver: DriverProfile = driverData ? {
          id: driverData.id,
          full_name: driverData.full_name || 'Driver',
          phone: driverData.phone || '', // May be empty due to RLS
          email: driverData.email || '',
          avatar_url: driverData.avatar_url,
          average_rating: driverData.average_rating || 0,
          total_ratings: driverData.total_ratings || 0,
          kyc_status: driverData.kyc_status || 'pending',
          gender: driverData.gender,
          age: driverData.age,
        } : {
          id: ride.driver_id,
          full_name: 'Driver',
          phone: '',
          email: '',
          average_rating: 0,
          total_ratings: 0,
          kyc_status: 'unknown',
        };

        // Vehicle info may also be limited by RLS
        const vehicle: VehicleDetails = vehicleData ? {
          id: vehicleData.id,
          driver_id: vehicleData.driver_id,
          car_type: vehicleData.car_type || 'Car',
          car_model: vehicleData.car_model || 'Unknown Model',
          license_plate: vehicleData.license_plate || 'Will be shared after confirmation',
          color: vehicleData.color || 'Unknown',
          seat_capacity: vehicleData.seat_capacity || 4,
          brand: vehicleData.brand,
          segment: vehicleData.segment,
          is_primary: vehicleData.is_primary || false,
          is_verified: vehicleData.is_verified || false,
        } : {
          id: ride.vehicle_id,
          driver_id: ride.driver_id,
          car_type: 'Car',
          car_model: 'Unknown Model',
          license_plate: 'Will be shared after confirmation',
          color: 'Unknown',
          seat_capacity: 4,
          brand: 'Unknown',
          segment: 'Unknown',
          is_primary: false,
          is_verified: false,
        };

        ridesWithDetails.push({
          ...ride,
          driver,
          vehicle,
        });

      } catch (detailError) {
        console.warn(`Failed to fetch details for ride ${ride.id}:`, detailError);
        // Still include the ride with minimal info
        ridesWithDetails.push({
          ...ride,
          driver: {
            id: ride.driver_id,
            full_name: 'Driver',
            phone: '',
            email: '',
            average_rating: 0,
            total_ratings: 0,
            kyc_status: 'unknown',
          },
          vehicle: {
            id: ride.vehicle_id,
            driver_id: ride.driver_id,
            car_type: 'Car',
            car_model: 'Unknown Model',
            license_plate: 'Will be shared after confirmation',
            color: 'Unknown',
            seat_capacity: 4,
            brand: 'Unknown',
            segment: 'Unknown',
            is_primary: false,
            is_verified: false,
          },
        });
      }
    }

    console.log("✅ Rides with security-compliant details:", JSON.stringify(ridesWithDetails, null, 2));

    return {
      rides: ridesWithDetails,
      total_count: count || 0,
      error: undefined,
    };

  } catch (error) {
    console.error("Error in fetchRides:", error);
    return {
      rides: [],
      total_count: 0,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
};

/**
 * Fetches a single ride by ID - uses secure view for passenger access
 */
export const fetchRideById = async (rideId: string): Promise<RideWithDetails | null> => {
  try {
    // First get basic ride info
    const { data: rideData, error: rideError } = await supabase
      .from("rides")
      .select(`
        id,
        driver_id,
        vehicle_id,
        from_city,
        to_city,
        departure_date,
        departure_time,
        pickup_point,
        available_seats,
        price_per_seat,
        notes,
        created_at,
        updated_at
      `)
      .eq("id", rideId)
      .single();

    if (rideError || !rideData) {
      console.error("Error fetching ride by ID:", rideError);
      return null;
    }

    // Try to get driver info (RLS will determine what's visible)
    const { data: driverData } = await supabase
      .from("profiles")
      .select(`
        id,
        full_name,
        phone,
        email,
        avatar_url,
        average_rating,
        total_ratings,
        kyc_status,
        gender,
        age
      `)
      .eq("id", rideData.driver_id)
      .single();

    // Try to get vehicle info (RLS will determine what's visible)
    const { data: vehicleData } = await supabase
      .from("vehicles")
      .select(`
        id,
        driver_id,
        car_type,
        car_model,
        license_plate,
        color,
        seat_capacity,
        brand,
        segment,
        is_primary,
        is_verified
      `)
      .eq("id", rideData.vehicle_id)
      .single();

    const driver: DriverProfile = driverData ? {
      id: driverData.id,
      full_name: driverData.full_name || 'Driver',
      phone: driverData.phone || '',
      email: driverData.email || '',
      avatar_url: driverData.avatar_url,
      average_rating: driverData.average_rating || 0,
      total_ratings: driverData.total_ratings || 0,
      kyc_status: driverData.kyc_status || 'pending',
      gender: driverData.gender,
      age: driverData.age,
    } : {
      id: rideData.driver_id,
      full_name: 'Driver',
      phone: '',
      email: '',
      average_rating: 0,
      total_ratings: 0,
      kyc_status: 'unknown',
    };

    const vehicle: VehicleDetails = vehicleData ? {
      id: vehicleData.id,
      driver_id: vehicleData.driver_id,
      car_type: vehicleData.car_type || 'Car',
      car_model: vehicleData.car_model || 'Unknown Model',
      license_plate: vehicleData.license_plate || 'Will be shared after confirmation',
      color: vehicleData.color || 'Unknown',
      seat_capacity: vehicleData.seat_capacity || 4,
      brand: vehicleData.brand,
      segment: vehicleData.segment,
      is_primary: vehicleData.is_primary || false,
      is_verified: vehicleData.is_verified || false,
    } : {
      id: rideData.vehicle_id,
      driver_id: rideData.driver_id,
      car_type: 'Car',
      car_model: 'Unknown Model',
      license_plate: 'Will be shared after confirmation',
      color: 'Unknown',
      seat_capacity: 4,
      brand: 'Unknown',
      segment: 'Unknown',
      is_primary: false,
      is_verified: false,
    };

    return {
      ...rideData,
      driver,
      vehicle,
    };

  } catch (error) {
    console.error("Error in fetchRideById:", error);
    return null;
  }
};

/**
 * Fetches rides using the secure passenger view 
 * This should be used when a passenger has bookings
 */
export const fetchPassengerRideInfo = async (bookingId: string): Promise<RideWithDetails | null> => {
  try {
    // Use the secure passenger view which includes driver security info for confirmed bookings
    const { data, error } = await supabase
      .from("secure_passenger_ride_info")
      .select("*")
      .eq("booking_id", bookingId)
      .single();

    if (error || !data) {
      console.error("Error fetching passenger ride info:", error);
      return null;
    }

    // Transform the secure view data to match our interface
    return {
      id: data.ride_id,
      driver_id: data.driver_id,
      vehicle_id: data.vehicle_id,
      from_city: data.from_city,
      to_city: data.to_city,
      departure_date: data.departure_date,
      departure_time: data.departure_time,
      pickup_point: data.pickup_point,
      available_seats: data.available_seats,
      price_per_seat: data.price_per_seat,
      notes: data.notes,
      created_at: data.created_at,
      updated_at: data.updated_at,
      driver: {
        id: data.driver_id,
        full_name: data.driver_full_name,
        phone: data.driver_phone || '',
        email: data.driver_email || '',
        avatar_url: data.driver_avatar_url,
        average_rating: data.driver_rating || 0,
        total_ratings: data.driver_total_ratings || 0,
        kyc_status: data.driver_kyc_status || 'pending',
        gender: data.driver_gender,
        age: data.driver_age,
        // Security info available for confirmed bookings
        license_number: data.license_number,
        license_expiry: data.license_expiry,
        background_check_status: data.background_check_status,
        driving_experience_years: data.driving_experience_years,
        intercity_experience_years: data.intercity_experience_years,
        total_rides_completed: data.total_rides_completed,
      },
      vehicle: {
        id: data.vehicle_id,
        driver_id: data.driver_id,
        car_type: data.car_type,
        car_model: data.car_model,
        license_plate: data.license_plate,
        color: data.color,
        seat_capacity: data.seat_capacity,
        brand: data.brand,
        segment: data.segment,
        is_primary: data.is_primary,
        is_verified: data.vehicle_verified,
      },
    };

  } catch (error) {
    console.error("Error in fetchPassengerRideInfo:", error);
    return null;
  }
};

/**
 * Use the secure API function to get ride info
 */
export const getMyRideInfo = async (bookingUuid: string): Promise<any> => {
  try {
    const { data, error } = await supabase.rpc('get_my_ride_info', {
      booking_uuid: bookingUuid
    });

    if (error) {
      console.error("Error calling get_my_ride_info:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error in getMyRideInfo:", error);
    return null;
  }
};

/**
 * Fetches rides by driver ID (for driver's own rides)
 */
export const fetchRidesByDriverId = async (
  driverId: string,
  includeInactive: boolean = false
): Promise<RideWithDetails[]> => {
  try {
    let query = supabase
      .from("rides")
      .select(`
        id,
        driver_id,
        vehicle_id,
        from_city,
        to_city,
        departure_date,
        departure_time,
        pickup_point,
        available_seats,
        price_per_seat,
        notes,
        created_at,
        updated_at
      `)
      .eq("driver_id", driverId)
      .order("departure_date", { ascending: false });

    // Note: Removed is_active filter since the column doesn't exist
    // If you need to filter inactive rides, you might need to add this column
    // or use a different approach (like a status column)

    const { data: ridesData, error } = await query;

    if (error) {
      console.error("Error fetching rides by driver ID:", error);
      return [];
    }

    if (!ridesData) return [];

    // For driver's own rides, they should see full details
    const ridesWithDetails: RideWithDetails[] = [];

    for (const ride of ridesData) {
      // Driver can see their own profile
      const { data: driverData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", ride.driver_id)
        .single();

      // Driver can see their own vehicle
      const { data: vehicleData } = await supabase
        .from("vehicles")
        .select("*")
        .eq("id", ride.vehicle_id)
        .single();

      ridesWithDetails.push({
        ...ride,
        driver: driverData ? {
          ...driverData,
          average_rating: driverData.average_rating || 0,
          total_ratings: driverData.total_ratings || 0,
        } : {
          id: ride.driver_id,
          full_name: 'Driver',
          phone: '',
          email: '',
          average_rating: 0,
          total_ratings: 0,
          kyc_status: 'unknown',
        },
        vehicle: vehicleData ? {
          ...vehicleData,
          seat_capacity: vehicleData.seat_capacity || 4,
        } : {
          id: ride.vehicle_id,
          driver_id: ride.driver_id,
          car_type: 'Car',
          car_model: 'Unknown Model',
          license_plate: 'N/A',
          color: 'Unknown',
          seat_capacity: 4,
          brand: 'Unknown',
          segment: 'Unknown',
          is_primary: false,
          is_verified: false,
        },
      });
    }

    return ridesWithDetails;

  } catch (error) {
    console.error("Error in fetchRidesByDriverId:", error);
    return [];
  }
};

// Keep the existing searchRidesAdvanced and validateSearchParams functions
export const searchRidesAdvanced = async (filters: {
  from_city?: string;
  to_city?: string;
  departure_date?: string;
  min_seats?: number;
  max_price?: number;
  car_type?: string;
  verified_drivers_only?: boolean;
  min_rating?: number;
}): Promise<FetchRidesResponse> => {
  // Use the regular fetchRides and then apply additional client-side filtering
  const baseParams: RideSearchParams = {
    from_city: filters.from_city,
    to_city: filters.to_city,
    departure_date: filters.departure_date,
    min_seats: filters.min_seats,
    max_price: filters.max_price,
  };

  const result = await fetchRides(baseParams, 100, 0);
  
  if (result.error || !result.rides) {
    return result;
  }

  // Apply additional filters client-side
  let filteredRides = result.rides.filter(ride => {
    // Filter by car type
    if (filters.car_type && ride.vehicle.car_type !== filters.car_type) {
      return false;
    }

    // Filter by verified drivers only
    if (filters.verified_drivers_only && ride.driver.kyc_status !== 'approved') {
      return false;
    }

    // Filter by minimum rating
    if (filters.min_rating && ride.driver.average_rating < filters.min_rating) {
      return false;
    }

    return true;
  });

  return {
    rides: filteredRides,
    total_count: filteredRides.length,
    error: undefined,
  };
};

// Utility function to validate search parameters
export const validateSearchParams = (params: RideSearchParams): string[] => {
  const errors: string[] = [];

  if (params.min_seats && (params.min_seats < 1 || params.min_seats > 8)) {
    errors.push("Minimum seats must be between 1 and 8");
  }

  if (params.max_price && params.max_price < 0) {
    errors.push("Maximum price must be positive");
  }

  if (params.departure_date) {
    const selectedDate = new Date(params.departure_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      errors.push("Departure date cannot be in the past");
    }
  }

  return errors;
};