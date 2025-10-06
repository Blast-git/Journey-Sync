import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getDriverLocation, updateDriverLocation } from '@/services/mapDataService';
import { DEFAULT_MAP_CONFIG } from '@/config/mapConfig';
import { validateCoordinates, calculateDistance, type Coordinates, type Bounds } from './mapUtils';
import { type MapInstance, type MapViewport, type MapError } from './BaseMapComponent';

// ===== TYPE DEFINITIONS =====

export interface DriverLocationState {
  id: string;
  driver_id: string;
  ride_id?: string;
  latitude: number;
  longitude: number;
  heading?: number;
  speed_kmh?: number;
  accuracy_meters?: number;
  is_active: boolean;
  created_at: string;
}

export interface RouteState {
  id: string;
  polyline: string;
  distance_km: number;
  duration_minutes: number;
  is_selected: boolean;
  route_type: string;
}

export interface MapState {
  // Map instance and viewport
  mapInstance: MapInstance | null;
  viewport: MapViewport;
  isMapReady: boolean;
  
  // Current user location
  userLocation: Coordinates | null;
  locationAccuracy?: number;
  locationPermission: 'granted' | 'denied' | 'prompt' | 'unknown';
  
  // Driver tracking (for passengers)
  driverLocation: DriverLocationState | null;
  isTrackingDriver: boolean;
  trackingRideId?: string;
  
  // Real-time subscriptions
  subscriptions: Map<string, any>;
  isConnected: boolean;
  
  // Route and navigation
  activeRoute: RouteState | null;
  routeProgress: number; // 0-100 percentage
  
  // Cache management
  cache: {
    routes: Map<string, any>;
    zones: Map<string, any>;
    lastClearTime: number;
  };
  
  // Error handling
  error: MapError | null;
  isLoading: boolean;
}

export interface MapActions {
  // Map instance management
  setMapInstance: (instance: MapInstance) => void;
  setViewport: (viewport: Partial<MapViewport>) => void;
  
  // Location management
  setUserLocation: (location: Coordinates, accuracy?: number) => void;
  requestLocationPermission: () => Promise<boolean>;
  
  // Driver tracking
  startDriverTracking: (driverId: string, rideId?: string) => Promise<void>;
  stopDriverTracking: () => void;
  updateDriverLocation: (location: DriverLocationState) => void;
  
  // Route management
  setActiveRoute: (route: RouteState) => void;
  updateRouteProgress: (progress: number) => void;
  clearActiveRoute: () => void;
  
  // Cache management
  clearCache: () => void;
  getCachedData: <T>(key: string) => T | null;
  setCachedData: <T>(key: string, data: T, expiryMs?: number) => void;
  
  // Error handling
  setError: (error: MapError | null) => void;
  setLoading: (loading: boolean) => void;
}

type MapAction =
  | { type: 'SET_MAP_INSTANCE'; payload: MapInstance }
  | { type: 'SET_VIEWPORT'; payload: Partial<MapViewport> }
  | { type: 'SET_USER_LOCATION'; payload: { location: Coordinates; accuracy?: number } }
  | { type: 'SET_LOCATION_PERMISSION'; payload: 'granted' | 'denied' | 'prompt' | 'unknown' }
  | { type: 'SET_DRIVER_LOCATION'; payload: DriverLocationState }
  | { type: 'START_DRIVER_TRACKING'; payload: { rideId?: string } }
  | { type: 'STOP_DRIVER_TRACKING' }
  | { type: 'SET_ACTIVE_ROUTE'; payload: RouteState }
  | { type: 'UPDATE_ROUTE_PROGRESS'; payload: number }
  | { type: 'CLEAR_ACTIVE_ROUTE' }
  | { type: 'SET_SUBSCRIPTION'; payload: { key: string; subscription: any } }
  | { type: 'REMOVE_SUBSCRIPTION'; payload: string }
  | { type: 'SET_CONNECTION_STATUS'; payload: boolean }
  | { type: 'SET_CACHE_DATA'; payload: { key: string; data: any } }
  | { type: 'CLEAR_CACHE' }
  | { type: 'SET_ERROR'; payload: MapError | null }
  | { type: 'SET_LOADING'; payload: boolean };

// ===== INITIAL STATE =====

const initialState: MapState = {
  mapInstance: null,
  viewport: {
    center: DEFAULT_MAP_CONFIG.center,
    zoom: DEFAULT_MAP_CONFIG.zoom.COUNTRY,
    bounds: DEFAULT_MAP_CONFIG.bounds
  },
  isMapReady: false,
  userLocation: null,
  locationPermission: 'unknown',
  driverLocation: null,
  isTrackingDriver: false,
  subscriptions: new Map(),
  isConnected: true,
  activeRoute: null,
  routeProgress: 0,
  cache: {
    routes: new Map(),
    zones: new Map(),
    lastClearTime: Date.now()
  },
  error: null,
  isLoading: false
};

// ===== REDUCER =====

const mapReducer = (state: MapState, action: MapAction): MapState => {
  switch (action.type) {
    case 'SET_MAP_INSTANCE':
      return {
        ...state,
        mapInstance: action.payload,
        isMapReady: true
      };

    case 'SET_VIEWPORT':
      return {
        ...state,
        viewport: { ...state.viewport, ...action.payload }
      };

    case 'SET_USER_LOCATION':
      return {
        ...state,
        userLocation: action.payload.location,
        locationAccuracy: action.payload.accuracy
      };

    case 'SET_LOCATION_PERMISSION':
      return {
        ...state,
        locationPermission: action.payload
      };

    case 'SET_DRIVER_LOCATION':
      return {
        ...state,
        driverLocation: action.payload
      };

    case 'START_DRIVER_TRACKING':
      return {
        ...state,
        isTrackingDriver: true,
        trackingRideId: action.payload.rideId
      };

    case 'STOP_DRIVER_TRACKING':
      return {
        ...state,
        isTrackingDriver: false,
        trackingRideId: undefined,
        driverLocation: null
      };

    case 'SET_ACTIVE_ROUTE':
      return {
        ...state,
        activeRoute: action.payload,
        routeProgress: 0
      };

    case 'UPDATE_ROUTE_PROGRESS':
      return {
        ...state,
        routeProgress: Math.max(0, Math.min(100, action.payload))
      };

    case 'CLEAR_ACTIVE_ROUTE':
      return {
        ...state,
        activeRoute: null,
        routeProgress: 0
      };

    case 'SET_SUBSCRIPTION':
      const newSubscriptions = new Map(state.subscriptions);
      newSubscriptions.set(action.payload.key, action.payload.subscription);
      return {
        ...state,
        subscriptions: newSubscriptions
      };

    case 'REMOVE_SUBSCRIPTION':
      const updatedSubscriptions = new Map(state.subscriptions);
      updatedSubscriptions.delete(action.payload);
      return {
        ...state,
        subscriptions: updatedSubscriptions
      };

    case 'SET_CONNECTION_STATUS':
      return {
        ...state,
        isConnected: action.payload
      };

    case 'SET_CACHE_DATA':
      const newRoutes = new Map(state.cache.routes);
      newRoutes.set(action.payload.key, {
        data: action.payload.data,
        timestamp: Date.now()
      });
      return {
        ...state,
        cache: {
          ...state.cache,
          routes: newRoutes
        }
      };

    case 'CLEAR_CACHE':
      return {
        ...state,
        cache: {
          routes: new Map(),
          zones: new Map(),
          lastClearTime: Date.now()
        }
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload
      };

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload
      };

    default:
      return state;
  }
};

// ===== CONTEXT =====

const MapContext = createContext<{
  state: MapState;
  actions: MapActions;
} | null>(null);

// ===== PROVIDER COMPONENT =====

export const MapProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(mapReducer, initialState);
  const { user } = useAuth();
  const locationWatchRef = useRef<number | null>(null);
  const trackingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ===== ACTION IMPLEMENTATIONS =====

  const setMapInstance = useCallback((instance: MapInstance) => {
    dispatch({ type: 'SET_MAP_INSTANCE', payload: instance });
  }, []);

  const setViewport = useCallback((viewport: Partial<MapViewport>) => {
    dispatch({ type: 'SET_VIEWPORT', payload: viewport });
  }, []);

  const setUserLocation = useCallback((location: Coordinates, accuracy?: number) => {
    if (validateCoordinates(location)) {
      dispatch({ type: 'SET_USER_LOCATION', payload: { location, accuracy } });
    }
  }, []);

  const requestLocationPermission = useCallback(async (): Promise<boolean> => {
    try {
      if (!navigator.geolocation) {
        dispatch({ type: 'SET_LOCATION_PERMISSION', payload: 'denied' });
        return false;
      }

      const permission = await navigator.permissions.query({ name: 'geolocation' });
      
      if (permission.state === 'granted') {
        dispatch({ type: 'SET_LOCATION_PERMISSION', payload: 'granted' });
        return true;
      } else if (permission.state === 'denied') {
        dispatch({ type: 'SET_LOCATION_PERMISSION', payload: 'denied' });
        return false;
      }

      // Request permission by trying to get current position
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            dispatch({ type: 'SET_LOCATION_PERMISSION', payload: 'granted' });
            setUserLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            }, position.coords.accuracy);
            resolve(true);
          },
          (error) => {
            dispatch({ type: 'SET_LOCATION_PERMISSION', payload: 'denied' });
            console.error('Location permission denied:', error);
            resolve(false);
          }
        );
      });
    } catch (error) {
      dispatch({ type: 'SET_LOCATION_PERMISSION', payload: 'denied' });
      console.error('Error requesting location permission:', error);
      return false;
    }
  }, [setUserLocation]);

  const startDriverTracking = useCallback(async (driverId: string, rideId?: string) => {
    try {
      dispatch({ type: 'START_DRIVER_TRACKING', payload: { rideId } });

      // Get initial driver location
      const location = await getDriverLocation(driverId, rideId);
      if (location) {
        dispatch({ type: 'SET_DRIVER_LOCATION', payload: location });
      }

      // Set up real-time subscription
      const subscription = supabase
        .channel(`driver_location_${driverId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'driver_locations',
            filter: `driver_id=eq.${driverId}${rideId ? ` AND ride_id=eq.${rideId}` : ''}`
          },
          (payload) => {
            if (payload.new) {
              dispatch({ type: 'SET_DRIVER_LOCATION', payload: payload.new as DriverLocationState });
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'driver_locations',
            filter: `driver_id=eq.${driverId}${rideId ? ` AND ride_id=eq.${rideId}` : ''}`
          },
          (payload) => {
            if (payload.new) {
              dispatch({ type: 'SET_DRIVER_LOCATION', payload: payload.new as DriverLocationState });
            }
          }
        )
        .subscribe((status) => {
          dispatch({ type: 'SET_CONNECTION_STATUS', payload: status === 'SUBSCRIBED' });
        });

      dispatch({
        type: 'SET_SUBSCRIPTION',
        payload: { key: `driver_${driverId}`, subscription }
      });

    } catch (error) {
      console.error('Failed to start driver tracking:', error);
      dispatch({
        type: 'SET_ERROR',
        payload: {
          code: 'NETWORK_ERROR',
          message: 'Failed to start driver tracking',
          details: error,
          recoverable: true
        }
      });
    }
  }, []);

  const stopDriverTracking = useCallback(() => {
    dispatch({ type: 'STOP_DRIVER_TRACKING' });
    
    // Clean up subscriptions
    state.subscriptions.forEach((subscription, key) => {
      if (key.startsWith('driver_')) {
        subscription.unsubscribe();
        dispatch({ type: 'REMOVE_SUBSCRIPTION', payload: key });
      }
    });
  }, [state.subscriptions]);

  const updateDriverLocationAction = useCallback((location: DriverLocationState) => {
    dispatch({ type: 'SET_DRIVER_LOCATION', payload: location });
  }, []);

  const setActiveRoute = useCallback((route: RouteState) => {
    dispatch({ type: 'SET_ACTIVE_ROUTE', payload: route });
  }, []);

  const updateRouteProgress = useCallback((progress: number) => {
    dispatch({ type: 'UPDATE_ROUTE_PROGRESS', payload: progress });
  }, []);

  const clearActiveRoute = useCallback(() => {
    dispatch({ type: 'CLEAR_ACTIVE_ROUTE' });
  }, []);

  const clearCache = useCallback(() => {
    dispatch({ type: 'CLEAR_CACHE' });
  }, []);

  const getCachedData = useCallback(<T,>(key: string): T | null => {
    const cached = state.cache.routes.get(key);
    if (!cached) return null;
    
    // Check if cache has expired (default 1 hour)
    const maxAge = 60 * 60 * 1000; // 1 hour
    if (Date.now() - cached.timestamp > maxAge) {
      return null;
    }
    
    return cached.data as T;
  }, [state.cache.routes]);

  const setCachedData = useCallback(<T,>(key: string, data: T, expiryMs?: number) => {
    dispatch({
      type: 'SET_CACHE_DATA',
      payload: { key, data }
    });
  }, []);

  const setError = useCallback((error: MapError | null) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  }, []);

  // ===== EFFECTS =====

  // Start location watching when permission is granted
  useEffect(() => {
    if (state.locationPermission === 'granted' && navigator.geolocation) {
      locationWatchRef.current = navigator.geolocation.watchPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          }, position.coords.accuracy);
        },
        (error) => {
          console.error('Location watch error:', error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000
        }
      );
    }

    return () => {
      if (locationWatchRef.current) {
        navigator.geolocation.clearWatch(locationWatchRef.current);
      }
    };
  }, [state.locationPermission, setUserLocation]);

  // Clean up subscriptions on unmount
  useEffect(() => {
    return () => {
      state.subscriptions.forEach((subscription) => {
        subscription.unsubscribe();
      });
      
      if (trackingIntervalRef.current) {
        clearInterval(trackingIntervalRef.current);
      }
    };
  }, []);

  // Auto-clean cache periodically
  useEffect(() => {
    const interval = setInterval(() => {
      // Clean cache older than 24 hours
      const maxAge = 24 * 60 * 60 * 1000;
      if (Date.now() - state.cache.lastClearTime > maxAge) {
        clearCache();
      }
    }, 60 * 60 * 1000); // Check every hour

    return () => clearInterval(interval);
  }, [state.cache.lastClearTime, clearCache]);

  // ===== ACTIONS OBJECT =====

  const actions: MapActions = {
    setMapInstance,
    setViewport,
    setUserLocation,
    requestLocationPermission,
    startDriverTracking,
    stopDriverTracking,
    updateDriverLocation: updateDriverLocationAction,
    setActiveRoute,
    updateRouteProgress,
    clearActiveRoute,
    clearCache,
    getCachedData,
    setCachedData,
    setError,
    setLoading
  };

  return (
    <MapContext.Provider value={{ state, actions }}>
      {children}
    </MapContext.Provider>
  );
};

// ===== CUSTOM HOOK =====

export const useMap = () => {
  const context = useContext(MapContext);
  if (!context) {
    throw new Error('useMap must be used within a MapProvider');
  }
  return context;
};

// ===== CONVENIENCE HOOKS =====

export const useMapInstance = () => {
  const { state } = useMap();
  return {
    mapInstance: state.mapInstance,
    isReady: state.isMapReady
  };
};

export const useUserLocation = () => {
  const { state, actions } = useMap();
  return {
    location: state.userLocation,
    accuracy: state.locationAccuracy,
    permission: state.locationPermission,
    requestPermission: actions.requestLocationPermission
  };
};

export const useDriverTracking = () => {
  const { state, actions } = useMap();
  return {
    driverLocation: state.driverLocation,
    isTracking: state.isTrackingDriver,
    rideId: state.trackingRideId,
    startTracking: actions.startDriverTracking,
    stopTracking: actions.stopDriverTracking
  };
};

export const useMapRoute = () => {
  const { state, actions } = useMap();
  return {
    activeRoute: state.activeRoute,
    progress: state.routeProgress,
    setRoute: actions.setActiveRoute,
    updateProgress: actions.updateRouteProgress,
    clearRoute: actions.clearActiveRoute
  };
};