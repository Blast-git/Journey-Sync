// src/hooks/useRouteData.ts - Real Google Maps API Integration

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { googleMapsService } from '@/services/googleMapsService';
import { mapUtils } from '@/components/maps/core/mapUtils';
import type { RouteOption, Coordinates } from '@/types/mapTypes';

// ===== INTERFACE DEFINITIONS =====

export interface UseRouteOptionsProps {
  fromCity: string;
  toCity: string;
  enabled?: boolean;
  maxRoutes?: number;
  avoidTolls?: boolean;
  avoidHighways?: boolean;
  departureTime?: Date;
}

export interface UseRouteCalculationParams {
  origin: { latitude: number; longitude: number };
  destination: { latitude: number; longitude: number };
  alternatives?: boolean;
  avoidTolls?: boolean;
  avoidHighways?: boolean;
  departureTime?: Date;
  waypoints?: Coordinates[];
}

// ===== DATABASE SERVICE FUNCTIONS =====

const getRouteCache = async (fromCity: string, toCity: string) => {
  const { data, error } = await supabase
    .from('route_cache')
    .select('*')
    .eq('from_city', fromCity)
    .eq('to_city', toCity)
    .gt('cache_expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(3) // Get up to 3 cached routes
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }
  
  return data;
};

const saveRouteCache = async (routeData: {
  from_city: string;
  to_city: string;
  route_type: string;
  polyline: string;
  distance_km: number;
  duration_minutes: number;
  toll_cost: number;
  fuel_cost: number;
  traffic_level: string;
  cache_expires_at: Date;
}) => {
  const { data, error } = await supabase
    .from('route_cache')
    .insert(routeData)
    .select()
    .single();

  if (error) throw error;
  return data;
};

const cleanExpiredRouteCache = async (fromCity: string, toCity: string) => {
  const { error } = await supabase
    .from('route_cache')
    .delete()
    .eq('from_city', fromCity)
    .eq('to_city', toCity)
    .lt('cache_expires_at', new Date().toISOString());

  if (error) throw error;
};

// ===== MAIN HOOKS =====

export const useRouteOptions = ({
  fromCity,
  toCity,
  enabled = true,
  maxRoutes = 3,
  avoidTolls = false,
  avoidHighways = false,
  departureTime
}: UseRouteOptionsProps) => {
  const queryClient = useQueryClient();

  // Initialize Google Maps service
  useEffect(() => {
    let mounted = true;
   
    if (enabled && fromCity && toCity && mapUtils.isWeb()) {
      googleMapsService.initialize().catch((error) => {
        if (mounted) {
          console.error('Google Maps initialization failed:', error);
        }
      });
    }

    return () => {
      mounted = false;
    };
  }, [enabled, fromCity, toCity]);

  const {
    data: routes,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['routeOptions', fromCity, toCity, maxRoutes, avoidTolls, avoidHighways, departureTime?.toISOString()],
    queryFn: async (): Promise<RouteOption[]> => {
      // Validate inputs
      if (!fromCity || !toCity) {
        throw new Error('Both origin and destination cities are required');
      }

      console.log('🗺️ Fetching real route data for:', { fromCity, toCity, maxRoutes });

      try {
        // Step 1: Check cache first (but don't rely on it completely)
        let cachedRoutes: RouteOption[] = [];
        
        try {
          const cached = await getRouteCache(fromCity, toCity);
          if (cached && !mapUtils.isCacheExpired(cached.cache_expires_at)) {
            console.log('📦 Found cached route data');
            cachedRoutes.push({
              id: cached.id,
              route_type: cached.route_type as 'fastest' | 'shortest' | 'scenic',
              polyline: cached.polyline,
              distance_km: cached.distance_km,
              duration_minutes: cached.duration_minutes,
              toll_cost: cached.toll_cost || 0,
              fuel_cost: cached.fuel_cost || 0,
              traffic_level: cached.traffic_level as 'low' | 'medium' | 'high',
              waypoints: [],
              is_selected: true
            });
          }
        } catch (cacheError) {
          console.warn('Cache check failed:', cacheError);
        }

        // Step 2: Get real coordinates using Google Geocoding API
        console.log('🌍 Geocoding cities using Google Maps API...');
        
        let originCoords: Coordinates;
        let destinationCoords: Coordinates;

        try {
          // Try to geocode using Google Maps API for precise coordinates
          [originCoords, destinationCoords] = await Promise.all([
            googleMapsService.geocodeAddress(fromCity),
            googleMapsService.geocodeAddress(toCity)
          ]);
          
          console.log('✅ Geocoding successful:', { 
            origin: originCoords, 
            destination: destinationCoords 
          });
        } catch (geocodeError) {
          console.warn('Google geocoding failed, using fallback coordinates:', geocodeError);
          
          // Fallback to our city database
          const cityCoords = mapUtils.getCityCoordinates(fromCity, toCity);
          if (!cityCoords.origin || !cityCoords.destination) {
            throw new Error(`Unable to find coordinates for cities: ${fromCity} or ${toCity}`);
          }
          
          originCoords = cityCoords.origin;
          destinationCoords = cityCoords.destination;
        }

        // Step 3: Calculate real routes using Google Directions API
        if (mapUtils.isWeb() && googleMapsService.isReady()) {
          console.log('🚗 Calculating routes using Google Directions API...');
          
          const routeOptions = await googleMapsService.calculateRoutes({
            origin: originCoords,
            destination: destinationCoords,
            alternatives: true,
            maxRoutes,
            avoidTolls,
            avoidHighways,
            departureTime
          });

          console.log(`✅ Successfully calculated ${routeOptions.length} real routes`);

          // Step 4: Cache the routes for future use
          const cachePromises = routeOptions.map(async (route, index) => {
            try {
              await saveRouteCache({
                from_city: fromCity,
                to_city: toCity,
                route_type: route.route_type,
                polyline: route.polyline,
                distance_km: route.distance_km,
                duration_minutes: route.duration_minutes,
                toll_cost: route.toll_cost,
                fuel_cost: route.fuel_cost,
                traffic_level: route.traffic_level,
                cache_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
              });
              console.log(`💾 Cached route ${index + 1}/${routeOptions.length}`);
            } catch (cacheError) {
              console.warn(`Failed to cache route ${index + 1}:`, cacheError);
            }
          });

          // Don't wait for caching to complete
          Promise.all(cachePromises).catch(console.warn);

          return routeOptions;

        } else if (!mapUtils.isWeb()) {
          // For native platforms, use cached data if available or create basic route
          if (cachedRoutes.length > 0) {
            console.log('📱 Using cached routes for native platform');
            return cachedRoutes;
          }

          // Create a basic route for native platforms
          const distance = mapUtils.calculateDistance(originCoords, destinationCoords);
          console.log('📱 Creating basic route for native platform');
          
          return [{
            id: `native_route_${Date.now()}`,
            route_type: 'fastest',
            polyline: '',
            distance_km: distance,
            duration_minutes: Math.round(distance * 1.2), // Rough estimate
            toll_cost: Math.round(distance * 3), // ₹3 per km estimate
            fuel_cost: Math.round(distance * 7), // ₹7 per km estimate
            traffic_level: 'medium',
            waypoints: [
              {
                latitude: originCoords.latitude,
                longitude: originCoords.longitude,
                name: fromCity,
                type: 'start'
              },
              {
                latitude: destinationCoords.latitude,
                longitude: destinationCoords.longitude,
                name: toCity,
                type: 'end'
              }
            ],
            is_selected: true
          }];

        } else {
          // Google Maps not ready yet, return cached data if available
          if (cachedRoutes.length > 0) {
            console.log('⏳ Google Maps not ready, using cached routes');
            return cachedRoutes;
          }
          
          throw new Error('Google Maps service not available and no cached data found');
        }

      } catch (error) {
        console.error('❌ Error in route calculation:', error);
        
        // Enhanced fallback with better error handling
        const cityCoords = mapUtils.getCityCoordinates(fromCity, toCity);
        if (cityCoords.origin && cityCoords.destination) {
          const distance = mapUtils.calculateDistance(cityCoords.origin, cityCoords.destination);
          console.log('🔄 Using fallback route calculation');
          
          return [{
            id: `fallback_route_${Date.now()}`,
            route_type: 'fastest',
            polyline: '',
            distance_km: distance,
            duration_minutes: Math.round(distance * 1.2),
            toll_cost: Math.round(distance * 3),
            fuel_cost: Math.round(distance * 7),
            traffic_level: 'medium',
            waypoints: [
              {
                latitude: cityCoords.origin.latitude,
                longitude: cityCoords.origin.longitude,
                name: fromCity,
                type: 'start'
              },
              {
                latitude: cityCoords.destination.latitude,
                longitude: cityCoords.destination.longitude,
                name: toCity,
                type: 'end'
              }
            ],
            is_selected: true
          }];
        }

        throw error;
      }
    },
    enabled: enabled && !!fromCity && !!toCity,
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60 * 2, // 2 hours
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  });

  const invalidateRoutes = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: ['routeOptions', fromCity, toCity]
    });
  }, [queryClient, fromCity, toCity]);

  const refreshRoutes = useCallback(async () => {
    try {
      await cleanExpiredRouteCache(fromCity, toCity);
      console.log('🗑️ Cleared expired cache');
    } catch (error) {
      console.warn('Failed to clear cache:', error);
    }
    return refetch();
  }, [fromCity, toCity, refetch]);

  return {
    routes: routes || [],
    isLoading,
    error,
    refetch,
    invalidateRoutes,
    refreshRoutes
  };
};

export const useRouteCalculation = () => {
  const queryClient = useQueryClient();

  const calculateRoute = useMutation({
    mutationFn: async (params: UseRouteCalculationParams): Promise<RouteOption[]> => {
      console.log('🧮 Calculating route with real Google Maps API:', params);

      if (!mapUtils.isWeb()) {
        throw new Error('Real-time route calculation only available on web platform');
      }

      if (!googleMapsService.isReady()) {
        await googleMapsService.initialize();
      }

      return googleMapsService.calculateRoutes({
        origin: params.origin,
        destination: params.destination,
        alternatives: params.alternatives ?? true,
        avoidTolls: params.avoidTolls,
        avoidHighways: params.avoidHighways,
        departureTime: params.departureTime,
        waypoints: params.waypoints,
        maxRoutes: 3
      });
    },
    onSuccess: (data, variables) => {
      console.log('✅ Route calculation successful:', data);
      queryClient.setQueryData(
        ['routeCalculation', variables.origin, variables.destination],
        data
      );
    },
    onError: (error) => {
      console.error('❌ Route calculation failed:', error);
    }
  });

  return {
    calculateRoute: calculateRoute.mutate,
    calculateRouteAsync: calculateRoute.mutateAsync,
    isCalculating: calculateRoute.isPending,
    error: calculateRoute.error,
    data: calculateRoute.data
  };
};

export const useRouteSelection = (initialRoutes: RouteOption[] = []) => {
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);

  // Update routes when initialRoutes change
  useEffect(() => {
    if (JSON.stringify(routes) !== JSON.stringify(initialRoutes)) {
      setRoutes(initialRoutes);
      
      // Auto-select first route if none selected
      if (initialRoutes.length > 0 && !selectedRouteId) {
        setSelectedRouteId(initialRoutes[0].id);
      }
    }
  }, [initialRoutes, selectedRouteId]);

  const selectedRoute = useMemo(() => {
    return routes.find(route => route.id === selectedRouteId) || null;
  }, [routes, selectedRouteId]);

  const selectRoute = useCallback((routeId: string) => {
    console.log('🎯 Selecting route:', routeId);
    setRoutes(prev => prev.map(route => ({
      ...route,
      is_selected: route.id === routeId
    })));
    setSelectedRouteId(routeId);
  }, []);

  const routeComparison = useMemo(() => {
    if (routes.length < 2) return null;

    const fastest = routes.reduce((prev, current) =>
      current.duration_minutes < prev.duration_minutes ? current : prev
    );
   
    const shortest = routes.reduce((prev, current) =>
      current.distance_km < prev.distance_km ? current : prev
    );
   
    const cheapest = routes.reduce((prev, current) =>
      (current.toll_cost + current.fuel_cost) < (prev.toll_cost + prev.fuel_cost) ? current : prev
    );

    return {
      fastest,
      shortest,
      cheapest,
      timeDifference: Math.max(...routes.map(r => r.duration_minutes)) - Math.min(...routes.map(r => r.duration_minutes)),
      distanceDifference: Math.max(...routes.map(r => r.distance_km)) - Math.min(...routes.map(r => r.distance_km)),
      costDifference: Math.max(...routes.map(r => r.toll_cost + r.fuel_cost)) - Math.min(...routes.map(r => r.toll_cost + r.fuel_cost))
    };
  }, [routes]);

  return {
    routes,
    selectedRoute,
    selectedRouteId,
    selectRoute,
    routeComparison,
    hasRoutes: routes.length > 0,
    routeCount: routes.length
  };
};

export const useRideRoute = (rideId?: string) => {
  const queryClient = useQueryClient();

  // Get saved route for a ride
  const { data: savedRoute, isLoading } = useQuery({
    queryKey: ['rideRoute', rideId],
    queryFn: async () => {
      if (!rideId) return null;
      
      const { data, error } = await supabase
        .from('ride_routes')
        .select('*')
        .eq('ride_id', rideId)
        .eq('is_selected', true)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      return data;
    },
    enabled: !!rideId
  });

  // Save route to ride
  const saveRoute = useMutation({
    mutationFn: async (params: {
      rideId: string;
      route: RouteOption;
      waypoints?: Array<{ latitude: number; longitude: number; name: string; type: string }>;
    }) => {
      console.log('💾 Saving route to ride:', params.rideId);

      // Save route data
      const { data: routeData, error: routeError } = await supabase
        .from('ride_routes')
        .insert({
          ride_id: params.rideId,
          route_type: params.route.route_type,
          polyline: params.route.polyline,
          distance_km: params.route.distance_km,
          duration_minutes: params.route.duration_minutes,
          toll_cost: params.route.toll_cost,
          fuel_cost: params.route.fuel_cost,
          traffic_level: params.route.traffic_level,
          is_selected: true
        })
        .select()
        .single();

      if (routeError) throw routeError;

      // Save waypoints if provided
      if (params.waypoints && params.waypoints.length > 0) {
        const { error: waypointsError } = await supabase
          .from('ride_waypoints')
          .insert(
            params.waypoints.map((wp, index) => ({
              ride_id: params.rideId,
              route_id: routeData.id,
              waypoint_type: wp.type,
              name: wp.name,
              latitude: wp.latitude,
              longitude: wp.longitude,
              sequence_order: index + 1,
              is_active: true
            }))
          );

        if (waypointsError) throw waypointsError;
      }

      console.log('✅ Route saved successfully');
      return routeData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rideRoute', rideId] });
      queryClient.invalidateQueries({ queryKey: ['ride', rideId] });
    }
  });

  return {
    savedRoute,
    isLoading,
    saveRoute: saveRoute.mutate,
    saveRouteAsync: saveRoute.mutateAsync,
    isSaving: saveRoute.isPending,
    saveError: saveRoute.error
  };
};

// Enhanced geocoding hook using real Google Maps API
export const useGeocoding = () => {
  const geocodeAddress = useMutation({
    mutationFn: async (address: string): Promise<Coordinates> => {
      console.log('🌍 Geocoding address:', address);
      
      if (!googleMapsService.isReady()) {
        await googleMapsService.initialize();
      }

      return googleMapsService.geocodeAddress(address);
    }
  });

  const reverseGeocode = useMutation({
    mutationFn: async (coordinates: Coordinates): Promise<string> => {
      console.log('🗺️ Reverse geocoding coordinates:', coordinates);
      
      if (!googleMapsService.isReady()) {
        await googleMapsService.initialize();
      }

      return googleMapsService.reverseGeocode(coordinates);
    }
  });

  return {
    geocodeAddress: geocodeAddress.mutateAsync,
    reverseGeocode: reverseGeocode.mutateAsync,
    isGeocoding: geocodeAddress.isPending || reverseGeocode.isPending,
    geocodingError: geocodeAddress.error || reverseGeocode.error
  };
};

// Places search hook using real Google Places API
export const usePlacesSearch = () => {
  const searchPlaces = useMutation({
    mutationFn: async (params: {
      query: string;
      location?: Coordinates;
      radius?: number;
    }) => {
      console.log('🔍 Searching places:', params);
      
      if (!googleMapsService.isReady()) {
        await googleMapsService.initialize();
      }

      return googleMapsService.searchPlaces(
        params.query,
        params.location,
        params.radius
      );
    }
  });

  return {
    searchPlaces: searchPlaces.mutateAsync,
    isSearching: searchPlaces.isPending,
    searchError: searchPlaces.error,
    searchResults: searchPlaces.data
  };
};

export default {
  useRouteOptions,
  useRouteCalculation,
  useRouteSelection,
  useRideRoute,
  useGeocoding,
  usePlacesSearch
};