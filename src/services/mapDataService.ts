import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

// ===== TYPE DEFINITIONS FROM ACTUAL SCHEMA =====

type CityZone = Database['public']['Tables']['city_zones']['Row'];
type RouteCache = Database['public']['Tables']['route_cache']['Row'];
type RideRoute = Database['public']['Tables']['ride_routes']['Row'];
type DriverLocation = Database['public']['Tables']['driver_locations']['Row'];
type RideWaypoint = Database['public']['Tables']['ride_waypoints']['Row'];
type RideZone = Database['public']['Tables']['ride_zones']['Row'];

// Insert types for new records
type CityZoneInsert = Database['public']['Tables']['city_zones']['Insert'];
type RouteInsert = Database['public']['Tables']['ride_routes']['Insert'];
type DriverLocationInsert = Database['public']['Tables']['driver_locations']['Insert'];
type WaypointInsert = Database['public']['Tables']['ride_waypoints']['Insert'];
type RouteCacheInsert = Database['public']['Tables']['route_cache']['Insert'];

// ===== CITY ZONES OPERATIONS =====

/**
 * Get all active zones for a specific city
 * @param cityName Name of the city
 * @returns Array of city zones
 */
export const getCityZones = async (cityName: string): Promise<CityZone[]> => {
  try {
    const { data, error } = await supabase
      .from('city_zones')
      .select('*')
      .eq('city_name', cityName)
      .eq('is_active', true)
      .order('zone_name');

    if (error) {
      console.error('Error fetching city zones:', error);
      throw new Error(`Failed to fetch zones for ${cityName}: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('getCityZones error:', error);
    throw error;
  }
};

/**
 * Get zones by type for a specific city
 * @param cityName Name of the city
 * @param zoneType Type of zone (pickup, dropoff, etc.)
 * @returns Array of matching zones
 */
export const getCityZonesByType = async (
  cityName: string, 
  zoneType: string
): Promise<CityZone[]> => {
  try {
    const { data, error } = await supabase
      .from('city_zones')
      .select('*')
      .eq('city_name', cityName)
      .eq('zone_type', zoneType)
      .eq('is_active', true)
      .order('zone_name');

    if (error) {
      console.error('Error fetching city zones by type:', error);
      throw new Error(`Failed to fetch ${zoneType} zones for ${cityName}: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('getCityZonesByType error:', error);
    throw error;
  }
};

/**
 * Create a new city zone (requires admin privileges)
 * @param zoneData Zone data to insert
 * @returns Created zone
 */
export const createCityZone = async (zoneData: CityZoneInsert): Promise<CityZone> => {
  try {
    const { data, error } = await supabase
      .from('city_zones')
      .insert(zoneData)
      .select()
      .single();

    if (error) {
      console.error('Error creating city zone:', error);
      throw new Error(`Failed to create zone: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('createCityZone error:', error);
    throw error;
  }
};

/**
 * Get zones within a radius of given coordinates
 * @param latitude Center latitude
 * @param longitude Center longitude
 * @param radiusKm Radius in kilometers
 * @returns Array of zones within radius
 */
export const getZonesNearLocation = async (
  latitude: number,
  longitude: number,
  radiusKm: number = 50
): Promise<CityZone[]> => {
  try {
    // Note: This is a simplified version. For production, you'd want to use PostGIS for proper spatial queries
    const { data, error } = await supabase
      .from('city_zones')
      .select('*')
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching zones near location:', error);
      throw new Error(`Failed to fetch zones: ${error.message}`);
    }

    // Filter by approximate distance (for exact distance, use PostGIS ST_DWithin)
    const filteredZones = (data || []).filter(zone => {
      if (!zone.center_latitude || !zone.center_longitude) return false;
      
      const distance = calculateDistance(
        { latitude, longitude },
        { latitude: zone.center_latitude, longitude: zone.center_longitude }
      );
      
      return distance <= radiusKm;
    });

    return filteredZones;
  } catch (error) {
    console.error('getZonesNearLocation error:', error);
    throw error;
  }
};

// Simple distance calculation for zone filtering
const calculateDistance = (
  coord1: { latitude: number; longitude: number },
  coord2: { latitude: number; longitude: number }
): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (coord2.latitude - coord1.latitude) * Math.PI / 180;
  const dLon = (coord2.longitude - coord1.longitude) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(coord1.latitude * Math.PI / 180) * Math.cos(coord2.latitude * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// ===== ROUTE CACHE OPERATIONS =====

/**
 * Get cached route between two cities
 * @param fromCity Origin city
 * @param toCity Destination city
 * @param routeType Type of route (fastest, shortest, scenic)
 * @returns Cached route or null if not found/expired
 */
export const getRouteCache = async (
  fromCity: string,
  toCity: string,
  routeType: string = 'fastest'
): Promise<RouteCache | null> => {
  try {
    const { data, error } = await supabase
      .from('route_cache')
      .select('*')
      .eq('from_city', fromCity)
      .eq('to_city', toCity)
      .eq('route_type', routeType)
      .gt('cache_expires_at', new Date().toISOString())
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned - cache miss
        return null;
      }
      console.error('Error fetching route cache:', error);
      throw new Error(`Failed to fetch cached route: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('getRouteCache error:', error);
    return null; // Return null for cache miss instead of throwing
  }
};

/**
 * Save route to cache
 * @param routeData Route data to cache
 * @returns Cached route
 */
export const saveRouteCache = async (routeData: {
  from_city: string;
  to_city: string;
  route_type: string;
  polyline: string;
  distance_km: number;
  duration_minutes: number;
  toll_cost?: number;
  fuel_cost?: number;
  traffic_level?: string;
  cache_hours?: number;
}): Promise<RouteCache> => {
  try {
    const cacheExpiresAt = new Date();
    cacheExpiresAt.setHours(cacheExpiresAt.getHours() + (routeData.cache_hours || 24));

    const insertData: RouteCacheInsert = {
      from_city: routeData.from_city,
      to_city: routeData.to_city,
      route_type: routeData.route_type,
      polyline: routeData.polyline,
      distance_km: routeData.distance_km,
      duration_minutes: routeData.duration_minutes,
      toll_cost: routeData.toll_cost || null,
      fuel_cost: routeData.fuel_cost || null,
      traffic_level: routeData.traffic_level || null,
      cache_expires_at: cacheExpiresAt.toISOString()
    };

    const { data, error } = await supabase
      .from('route_cache')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Error saving route cache:', error);
      throw new Error(`Failed to save route cache: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('saveRouteCache error:', error);
    throw error;
  }
};

/**
 * Clean expired cache entries
 * @returns Number of entries deleted
 */
export const cleanExpiredRouteCache = async (): Promise<number> => {
  try {
    const { data, error } = await supabase
      .from('route_cache')
      .delete()
      .lt('cache_expires_at', new Date().toISOString())
      .select('id');

    if (error) {
      console.error('Error cleaning expired cache:', error);
      throw new Error(`Failed to clean cache: ${error.message}`);
    }

    return data?.length || 0;
  } catch (error) {
    console.error('cleanExpiredRouteCache error:', error);
    throw error;
  }
};

// ===== RIDE ROUTES OPERATIONS =====

/**
 * Get routes for a specific ride
 * @param rideId Ride ID
 * @returns Array of route options
 */
export const getRideRoutes = async (rideId: string): Promise<RideRoute[]> => {
  try {
    const { data, error } = await supabase
      .from('ride_routes')
      .select('*')
      .eq('ride_id', rideId)
      .order('route_type');

    if (error) {
      console.error('Error fetching ride routes:', error);
      throw new Error(`Failed to fetch routes for ride ${rideId}: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('getRideRoutes error:', error);
    throw error;
  }
};

/**
 * Get selected route for a ride
 * @param rideId Ride ID
 * @returns Selected route or null
 */
export const getSelectedRoute = async (rideId: string): Promise<RideRoute | null> => {
  try {
    const { data, error } = await supabase
      .from('ride_routes')
      .select('*')
      .eq('ride_id', rideId)
      .eq('is_selected', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No selected route
      }
      console.error('Error fetching selected route:', error);
      throw new Error(`Failed to fetch selected route: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('getSelectedRoute error:', error);
    throw error;
  }
};

/**
 * Save route option for a ride
 * @param routeData Route data to save
 * @returns Saved route
 */
export const saveRoute = async (routeData: RouteInsert): Promise<RideRoute> => {
  try {
    const { data, error } = await supabase
      .from('ride_routes')
      .insert(routeData)
      .select()
      .single();

    if (error) {
      console.error('Error saving route:', error);
      throw new Error(`Failed to save route: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('saveRoute error:', error);
    throw error;
  }
};

/**
 * Update route selection status
 * This will be handled by the database trigger to ensure only one route is selected
 * @param rideId Ride ID
 * @param selectedRouteId ID of selected route
 * @returns Updated route
 */
export const selectRoute = async (rideId: string, selectedRouteId: string): Promise<RideRoute> => {
  try {
    // The trigger 'ensure_single_selected_route' will handle deselecting others
    const { data, error } = await supabase
      .from('ride_routes')
      .update({ is_selected: true })
      .eq('id', selectedRouteId)
      .eq('ride_id', rideId) // Additional safety check
      .select()
      .single();

    if (error) {
      console.error('Error selecting route:', error);
      throw new Error(`Failed to select route: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('selectRoute error:', error);
    throw error;
  }
};

// ===== DRIVER LOCATION OPERATIONS =====

/**
 * Get current active driver location
 * @param driverId Driver ID
 * @param rideId Optional ride ID for specific ride tracking
 * @returns Latest active driver location or null
 */
export const getDriverLocation = async (
  driverId: string,
  rideId?: string
): Promise<DriverLocation | null> => {
  try {
    let query = supabase
      .from('driver_locations')
      .select('*')
      .eq('driver_id', driverId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1);

    if (rideId) {
      query = query.eq('ride_id', rideId);
    }

    const { data, error } = await query.single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No active location found
      }
      console.error('Error fetching driver location:', error);
      throw new Error(`Failed to fetch driver location: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('getDriverLocation error:', error);
    throw error;
  }
};

/**
 * Update driver location
 * RLS policy ensures drivers can only update their own locations
 * @param locationData Location data to save
 * @returns Saved location
 */
export const updateDriverLocation = async (
  locationData: DriverLocationInsert
): Promise<DriverLocation> => {
  try {
    const { data, error } = await supabase
      .from('driver_locations')
      .insert({
        ...locationData,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating driver location:', error);
      throw new Error(`Failed to update driver location: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('updateDriverLocation error:', error);
    throw error;
  }
};

/**
 * Get driver location history for a ride
 * @param driverId Driver ID
 * @param rideId Ride ID
 * @param limit Number of locations to return
 * @returns Array of location history
 */
export const getDriverLocationHistory = async (
  driverId: string,
  rideId: string,
  limit: number = 50
): Promise<DriverLocation[]> => {
  try {
    const { data, error } = await supabase
      .from('driver_locations')
      .select('*')
      .eq('driver_id', driverId)
      .eq('ride_id', rideId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching driver location history:', error);
      throw new Error(`Failed to fetch location history: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('getDriverLocationHistory error:', error);
    throw error;
  }
};

/**
 * Deactivate old driver locations for a ride
 * @param driverId Driver ID
 * @param rideId Ride ID
 * @returns Number of deactivated locations
 */
export const deactivateOldDriverLocations = async (
  driverId: string,
  rideId?: string
): Promise<number> => {
  try {
    let query = supabase
      .from('driver_locations')
      .update({ is_active: false })
      .eq('driver_id', driverId)
      .eq('is_active', true);

    if (rideId) {
      query = query.eq('ride_id', rideId);
    }

    const { data, error } = await query.select('id');

    if (error) {
      console.error('Error deactivating old locations:', error);
      throw new Error(`Failed to deactivate locations: ${error.message}`);
    }

    return data?.length || 0;
  } catch (error) {
    console.error('deactivateOldDriverLocations error:', error);
    throw error;
  }
};

// ===== WAYPOINTS OPERATIONS =====

/**
 * Get waypoints for a ride
 * @param rideId Ride ID
 * @param waypointType Optional type filter (pickup, dropoff, rest_stop)
 * @returns Array of waypoints ordered by sequence
 */
export const getRideWaypoints = async (
  rideId: string,
  waypointType?: string
): Promise<RideWaypoint[]> => {
  try {
    let query = supabase
      .from('ride_waypoints')
      .select('*')
      .eq('ride_id', rideId)
      .eq('is_active', true)
      .order('sequence_order');

    if (waypointType) {
      query = query.eq('waypoint_type', waypointType);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching ride waypoints:', error);
      throw new Error(`Failed to fetch waypoints: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('getRideWaypoints error:', error);
    throw error;
  }
};

/**
 * Save waypoints for a ride
 * @param waypoints Array of waypoint data
 * @returns Array of saved waypoints
 */
export const saveWaypoints = async (waypoints: WaypointInsert[]): Promise<RideWaypoint[]> => {
  try {
    const { data, error } = await supabase
      .from('ride_waypoints')
      .insert(waypoints)
      .select();

    if (error) {
      console.error('Error saving waypoints:', error);
      throw new Error(`Failed to save waypoints: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('saveWaypoints error:', error);
    throw error;
  }
};

/**
 * Update waypoint sequence order
 * @param rideId Ride ID
 * @param waypointUpdates Array of waypoint ID and new sequence order
 * @returns Updated waypoints
 */
export const updateWaypointOrder = async (
  rideId: string,
  waypointUpdates: Array<{ id: string; sequence_order: number }>
): Promise<RideWaypoint[]> => {
  try {
    const updates = waypointUpdates.map(update =>
      supabase
        .from('ride_waypoints')
        .update({ sequence_order: update.sequence_order })
        .eq('id', update.id)
        .eq('ride_id', rideId)
    );

    await Promise.all(updates);

    // Return updated waypoints
    return await getRideWaypoints(rideId);
  } catch (error) {
    console.error('updateWaypointOrder error:', error);
    throw error;
  }
};

/**
 * Get waypoints by route
 * @param routeId Route ID
 * @returns Array of waypoints for the route
 */
export const getWaypointsByRoute = async (routeId: string): Promise<RideWaypoint[]> => {
  try {
    const { data, error } = await supabase
      .from('ride_waypoints')
      .select('*')
      .eq('route_id', routeId)
      .eq('is_active', true)
      .order('sequence_order');

    if (error) {
      console.error('Error fetching waypoints by route:', error);
      throw new Error(`Failed to fetch waypoints: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('getWaypointsByRoute error:', error);
    throw error;
  }
};

// ===== ZONE ASSIGNMENT OPERATIONS =====

/**
 * Get zones assigned to a ride
 * @param rideId Ride ID
 * @param zoneType Optional zone type filter
 * @returns Array of assigned zones with zone details
 */
export const getRideZones = async (
  rideId: string,
  zoneType?: string
): Promise<(RideZone & { zone_details: CityZone })[]> => {
  try {
    let query = supabase
      .from('ride_zones')
      .select(`
        *,
        zone_details:city_zones(*)
      `)
      .eq('ride_id', rideId);

    if (zoneType) {
      query = query.eq('zone_type', zoneType);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching ride zones:', error);
      throw new Error(`Failed to fetch ride zones: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('getRideZones error:', error);
    throw error;
  }
};

/**
 * Assign zones to a ride
 * @param rideId Ride ID
 * @param zoneAssignments Array of zone assignments
 * @returns Array of created zone assignments
 */
export const assignZonesToRide = async (
  rideId: string,
  zoneAssignments: Array<{ zone_id: string; zone_type: string }>
): Promise<RideZone[]> => {
  try {
    const assignments = zoneAssignments.map(assignment => ({
      ride_id: rideId,
      zone_id: assignment.zone_id,
      zone_type: assignment.zone_type
    }));

    const { data, error } = await supabase
      .from('ride_zones')
      .insert(assignments)
      .select();

    if (error) {
      console.error('Error assigning zones to ride:', error);
      throw new Error(`Failed to assign zones: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('assignZonesToRide error:', error);
    throw error;
  }
};

/**
 * Remove zone assignments from a ride
 * @param rideId Ride ID
 * @param zoneType Optional zone type to remove
 * @returns Number of removed assignments
 */
export const removeRideZones = async (
  rideId: string,
  zoneType?: string
): Promise<number> => {
  try {
    let query = supabase
      .from('ride_zones')
      .delete()
      .eq('ride_id', rideId);

    if (zoneType) {
      query = query.eq('zone_type', zoneType);
    }

    const { data, error } = await query.select('id');

    if (error) {
      console.error('Error removing ride zones:', error);
      throw new Error(`Failed to remove zones: ${error.message}`);
    }

    return data?.length || 0;
  } catch (error) {
    console.error('removeRideZones error:', error);
    throw error;
  }
};

// ===== TRIP TRACKING OPERATIONS =====

/**
 * Get trip tracking data for a booking
 * @param bookingId Booking ID
 * @returns Trip tracking data or null
 */
export const getTripTracking = async (bookingId: string) => {
  try {
    const { data, error } = await supabase
      .from('trip_tracking')
      .select('*')
      .eq('booking_id', bookingId)
      .order('last_updated', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No tracking data found
      }
      console.error('Error fetching trip tracking:', error);
      throw new Error(`Failed to fetch trip tracking: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('getTripTracking error:', error);
    throw error;
  }
};

/**
 * Update trip tracking information
 * @param trackingData Trip tracking data
 * @returns Updated tracking data
 */
export const updateTripTracking = async (trackingData: {
  booking_id: string;
  driver_id?: string;
  passenger_id?: string;
  current_latitude: number;
  current_longitude: number;
  estimated_arrival?: string;
  trip_status?: string;
  heading?: number;
  speed_kmh?: number;
  route_progress_percent?: number;
  next_waypoint_id?: string;
  eta_minutes?: number;
}) => {
  try {
    const { data, error } = await supabase
      .from('trip_tracking')
      .upsert({
        ...trackingData,
        last_updated: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating trip tracking:', error);
      throw new Error(`Failed to update trip tracking: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('updateTripTracking error:', error);
    throw error;
  }
};

// ===== UTILITY FUNCTIONS =====

/**
 * Clean up old location data (for maintenance)
 * @param daysOld Number of days old to clean up
 * @returns Number of records deleted
 */
export const cleanupOldLocations = async (daysOld: number = 7): Promise<number> => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const { data, error } = await supabase
      .from('driver_locations')
      .delete()
      .lt('created_at', cutoffDate.toISOString())
      .eq('is_active', false) // Only clean up inactive locations
      .select('id');

    if (error) {
      console.error('Error cleaning up old locations:', error);
      throw new Error(`Failed to cleanup locations: ${error.message}`);
    }

    return data?.length || 0;
  } catch (error) {
    console.error('cleanupOldLocations error:', error);
    throw error;
  }
};

/**
 * Get ride summary with routes and zones
 * @param rideId Ride ID
 * @returns Complete ride information
 */
export const getRideSummary = async (rideId: string) => {
  try {
    const [routes, waypoints, zones] = await Promise.all([
      getRideRoutes(rideId),
      getRideWaypoints(rideId),
      getRideZones(rideId)
    ]);

    return {
      routes,
      waypoints,
      zones,
      selectedRoute: routes.find(route => route.is_selected) || null
    };
  } catch (error) {
    console.error('getRideSummary error:', error);
    throw error;
  }
};

const mapDataService = {
  // City zones
  getCityZones,
  getCityZonesByType,
  createCityZone,
  getZonesNearLocation,
  
  // Route cache
  getCachedRoute: getRouteCache,
  saveCachedRoute: saveRouteCache,
  clearCachedRoute: cleanExpiredRouteCache,
  
  // Ride routes
  getRideRoute: getSelectedRoute,
  getRideRoutes,
  saveRideRoute: saveRoute,
  selectRoute,
  
  // Driver locations
  getDriverLocation,
  updateDriverLocation,
  getDriverLocationHistory,
  deactivateOldDriverLocations,
  
  // Waypoints
  getRideWaypoints,
  saveRideWaypoints: saveWaypoints,
  updateWaypointOrder,
  getWaypointsByRoute,
  
  // Zone assignments
  getRideZones,
  assignZonesToRide,
  removeRideZones,
  
  // Trip tracking
  getTripTracking,
  updateTripTracking,
  
  // Utility
  cleanupOldLocations,
  getRideSummary
};

export default mapDataService;
export { mapDataService };