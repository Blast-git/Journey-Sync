// ===== CORE MAP TYPES =====

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Bounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface MapViewport {
  center: Coordinates;
  zoom: number;
  bounds?: Bounds;
}

// ===== ROUTE TYPES =====

export type RouteType = 'fastest' | 'shortest' | 'scenic';
export type TrafficLevel = 'low' | 'medium' | 'high';

export interface RouteOption {
  id: string;
  route_type: 'fastest' | 'shortest' | 'scenic' | 'optimized';
  polyline: string;
  distance_km: number;
  duration_minutes: number;
  toll_cost: number;
  fuel_cost: number;
  traffic_level: 'low' | 'medium' | 'high';
  waypoints: Array<{
    latitude: number;
    longitude: number;
    name: string;
    type: string;
  }>;
  is_selected: boolean;
}

export interface RouteWaypoint {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  waypoint_type: 'pickup' | 'dropoff' | 'rest_stop' | 'toll' | 'landmark';
  sequence_order: number;
  estimated_time?: string;
  instructions?: string;
}

// ===== ZONE TYPES =====

export type ZoneType = 'pickup' | 'dropoff' | 'general' | 'restricted';

export interface CityZone {
  id: string;
  city_name: string;
  zone_name: string;
  zone_type: ZoneType;
  center_latitude?: number;
  center_longitude?: number;
  radius_meters?: number;
  polygon_coordinates?: GeoJSONPolygon;
  description?: string;
  landmarks?: string[];
  is_active: boolean;
}

export interface GeoJSONPolygon {
  type: 'Polygon';
  coordinates: number[][][]; // [longitude, latitude] pairs
}

// ===== LOCATION TRACKING TYPES =====

export interface DriverLocation {
  id: string;
  driver_id: string;
  ride_id?: string;
  latitude: number;
  longitude: number;
  heading?: number;
  speed_kmh?: number;
  accuracy_meters?: number;
  altitude_meters?: number;
  is_active: boolean;
  created_at: string;
}

export interface TripTracking {
  id: string;
  booking_id: string;
  driver_id: string;
  passenger_id: string;
  current_latitude: number;
  current_longitude: number;
  estimated_arrival?: string;
  trip_status: TripStatus;
  heading?: number;
  speed_kmh?: number;
  route_progress_percent?: number;
  next_waypoint_id?: string;
  eta_minutes?: number;
  last_updated: string;
}

export type TripStatus = 'starting' | 'en_route' | 'pickup' | 'in_progress' | 'dropoff' | 'completed' | 'cancelled';

// ===== MARKER TYPES =====

export type MarkerType = 'driver' | 'passenger' | 'pickup' | 'dropoff' | 'waypoint' | 'rest_stop' | 'fuel_station' | 'toll_booth';

export interface MapMarker {
  id: string;
  type: MarkerType;
  position: Coordinates;
  title?: string;
  description?: string;
  icon?: string;
  color?: string;
  size?: { width: number; height: number };
  zIndex?: number;
  clickable?: boolean;
  draggable?: boolean;
}

// ===== MAP COMPONENT PROPS =====

export interface BaseMapProps {
  center?: Coordinates;
  zoom?: number;
  bounds?: Bounds;
  style?: any[]; // Google Maps style array
  markers?: MapMarker[];
  routes?: RouteOption[];
  zones?: CityZone[];
  className?: string;
  height?: string | number;
  width?: string | number;
  onMapClick?: (coordinates: Coordinates) => void;
  onMarkerClick?: (marker: MapMarker) => void;
  onRouteSelect?: (route: RouteOption) => void;
  onZoneSelect?: (zone: CityZone) => void;
  loading?: boolean;
  error?: string;
}

export interface RouteVisualizationProps extends BaseMapProps {
  rideId?: string;
  fromCity: string;
  toCity: string;
  routeOptions?: RouteOption[];
  selectedRouteId?: string;
  onRouteSelected?: (routeId: string, route: RouteOption) => void;
  showAlternatives?: boolean;
  interactive?: boolean;
}

export interface ZoneSelectionProps extends BaseMapProps {
  cityName: string;
  zoneType: ZoneType;
  selectedZoneIds?: string[];
  maxSelections?: number;
  onZoneSelectionChange?: (selectedZones: CityZone[]) => void;
  allowMultiSelect?: boolean;
}

export interface LiveTrackingProps extends BaseMapProps {
  driverId: string;
  rideId?: string;
  bookingId?: string;
  showRoute?: boolean;
  showETA?: boolean;
  updateInterval?: number;
  onLocationUpdate?: (location: DriverLocation) => void;
}

// ===== MAP SERVICE TYPES =====

export interface MapDataService {
  getCityZones(cityName: string, zoneType?: ZoneType): Promise<CityZone[]>;
  getRouteCache(fromCity: string, toCity: string, routeType: RouteType): Promise<RouteOption | null>;
  saveRoute(routeData: Partial<RouteOption>): Promise<RouteOption>;
  getDriverLocation(driverId: string, rideId?: string): Promise<DriverLocation | null>;
  updateDriverLocation(location: Partial<DriverLocation>): Promise<DriverLocation>;
  getRideWaypoints(rideId: string): Promise<RouteWaypoint[]>;
}

export interface RouteCalculationService {
  calculateRoute(origin: Coordinates, destination: Coordinates, options?: RouteCalculationOptions): Promise<RouteOption[]>;
  optimizeWaypoints(waypoints: Coordinates[]): Promise<Coordinates[]>;
  estimateTime(route: RouteOption, trafficLevel?: TrafficLevel): number;
  calculateCost(route: RouteOption): { toll: number; fuel: number };
}

export interface RouteCalculationOptions {
  routeType?: RouteType;
  avoidTolls?: boolean;
  avoidHighways?: boolean;
  waypoints?: Coordinates[];
  departureTime?: Date;
}

// ===== PLATFORM TYPES =====

export type Platform = 'web' | 'ios' | 'android';

export interface PlatformCapabilities {
  supportsNativeNavigation: boolean;
  supportsBackgroundLocation: boolean;
  supportsVoiceGuidance: boolean;
  supportsPushNotifications: boolean;
  maxMarkers: number;
  maxPolylinePoints: number;
}

// ===== ERROR TYPES =====

export interface MapError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
}

export type MapErrorType = 
  | 'API_KEY_INVALID'
  | 'LOCATION_PERMISSION_DENIED'
  | 'NETWORK_ERROR'
  | 'ROUTE_CALCULATION_FAILED'
  | 'ZONE_DATA_UNAVAILABLE'
  | 'PLATFORM_NOT_SUPPORTED';

// ===== MAP STATE TYPES =====

export interface MapState {
  isLoaded: boolean;
  isLoading: boolean;
  error?: MapError;
  viewport: MapViewport;
  selectedRoute?: RouteOption;
  selectedZones: CityZone[];
  activeMarkers: MapMarker[];
  driverLocation?: DriverLocation;
  trackingActive: boolean;
}

export interface MapActions {
  setViewport: (viewport: MapViewport) => void;
  selectRoute: (route: RouteOption) => void;
  selectZone: (zone: CityZone) => void;
  addMarker: (marker: MapMarker) => void;
  removeMarker: (markerId: string) => void;
  updateDriverLocation: (location: DriverLocation) => void;
  startTracking: () => void;
  stopTracking: () => void;
  setError: (error: MapError) => void;
  clearError: () => void;
}

// ===== HOOK RETURN TYPES =====

export interface UseMapInstanceReturn {
  mapInstance: any; // Platform-specific map instance
  isLoaded: boolean;
  error?: MapError;
  reload: () => void;
}

export interface UseGeolocationReturn {
  location: Coordinates | null;
  accuracy?: number;
  isLoading: boolean;
  error?: string;
  requestPermission: () => Promise<boolean>;
  startWatching: () => void;
  stopWatching: () => void;
}

export interface UseRouteCalculationReturn {
  routes: RouteOption[];
  isCalculating: boolean;
  error?: string;
  calculateRoute: (origin: Coordinates, destination: Coordinates, options?: RouteCalculationOptions) => Promise<void>;
  selectRoute: (routeId: string) => void;
  clearRoutes: () => void;
}

export interface UseRealTimeLocationReturn {
  location: DriverLocation | null;
  isConnected: boolean;
  error?: string;
  subscribe: (driverId: string, rideId?: string) => void;
  unsubscribe: () => void;
}

// ===== VALIDATION TYPES =====

export interface CoordinateValidation {
  isValid: boolean;
  errors: string[];
}

export interface RouteValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ZoneValidation {
  isValid: boolean;
  errors: string[];
  conflicts: string[];
}

// ===== CACHE TYPES =====

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export interface MapCache {
  routes: Map<string, CacheEntry<RouteOption[]>>;
  zones: Map<string, CacheEntry<CityZone[]>>;
  locations: Map<string, CacheEntry<DriverLocation>>;
}

// ===== UTILITY TYPES =====

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Re-export commonly used types
export type { Database } from '@/integrations/supabase/types';