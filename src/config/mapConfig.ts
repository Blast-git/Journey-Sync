// src/config/mapConfig.ts - Real Google Maps API Configuration

import { isNative, isIOS, isAndroid } from "@/components/maps/core/mapUtils";

// ===== API KEY CONFIGURATION =====

/**
 * Get Google Maps API key based on platform
 * Supports both VITE_ and REACT_APP_ prefixes for compatibility
 */
export const getGoogleMapsApiKey = (): string => {
  if (isNative()) {
    if (isIOS()) {
      const iosKey =
        import.meta.env.VITE_GOOGLE_MAPS_IOS_API_KEY ||
        import.meta.env.REACT_APP_GOOGLE_MAPS_IOS_API_KEY;
      if (iosKey && iosKey.trim()) {
        console.log("📱 Using iOS Google Maps API key");
        return iosKey.trim();
      }
    } else if (isAndroid()) {
      const androidKey =
        import.meta.env.VITE_GOOGLE_MAPS_ANDROID_API_KEY ||
        import.meta.env.REACT_APP_GOOGLE_MAPS_ANDROID_API_KEY;
      if (androidKey && androidKey.trim()) {
        console.log("🤖 Using Android Google Maps API key");
        return androidKey.trim();
      }
    }
  }

  // Web platform
  const webKey =
    import.meta.env.VITE_GOOGLE_MAPS_WEB_API_KEY ||
    import.meta.env.REACT_APP_GOOGLE_MAPS_WEB_API_KEY;

  if (webKey && webKey.trim()) {
    console.log("🌐 Using Web Google Maps API key");
    return webKey.trim();
  }

  console.error(
    "❌ Google Maps API key not found. Please check your .env file:"
  );
  console.error("Required variables:");
  console.error("- VITE_GOOGLE_MAPS_WEB_API_KEY (for web)");
  console.error("- VITE_GOOGLE_MAPS_IOS_API_KEY (for iOS)");
  console.error("- VITE_GOOGLE_MAPS_ANDROID_API_KEY (for Android)");

  return "";
};

/**
 * Validate API key configuration
 */
export const validateApiKeys = (): { valid: boolean; missing: string[] } => {
  const missing: string[] = [];

  const webKey = import.meta.env.VITE_GOOGLE_MAPS_WEB_API_KEY;
  const iosKey = import.meta.env.VITE_GOOGLE_MAPS_IOS_API_KEY;
  const androidKey = import.meta.env.VITE_GOOGLE_MAPS_ANDROID_API_KEY;

  if (!webKey || !webKey.trim()) {
    missing.push("VITE_GOOGLE_MAPS_WEB_API_KEY");
  }

  if (!iosKey || !iosKey.trim()) {
    missing.push("VITE_GOOGLE_MAPS_IOS_API_KEY");
  }

  if (!androidKey || !androidKey.trim()) {
    missing.push("VITE_GOOGLE_MAPS_ANDROID_API_KEY");
  }

  return {
    valid: missing.length === 0,
    missing,
  };
};

// ===== MAP STYLE DEFINITIONS =====

/**
 * Ultra-minimal map style similar to Uber/Ola for maximum route visibility
 */
export const LIGHT_MAP_STYLE = [
  {
    elementType: "geometry",
    stylers: [{ color: "#f5f5f5" }],
  },
  {
    elementType: "labels",
    stylers: [{ visibility: "on" }],
  },
  {
    elementType: "labels.icon",
    stylers: [{ visibility: "off" }],
  },
  {
    elementType: "labels.text.fill",
    stylers: [{ color: "#9e9e9e" }],
  },
  {
    elementType: "labels.text.stroke",
    stylers: [{ color: "#ffffff" }],
  },
  {
    featureType: "administrative",
    elementType: "geometry",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "administrative.land_parcel",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "administrative.neighborhood",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "poi",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "poi.business",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#e8f5e8" }],
  },
  {
    featureType: "poi.park",
    elementType: "labels",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#ffffff" }],
  },
  {
    featureType: "road",
    elementType: "labels.icon",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "road.arterial",
    elementType: "geometry",
    stylers: [{ color: "#ffffff" }],
  },
  {
    featureType: "road.arterial",
    elementType: "labels",
    stylers: [{ visibility: "simplified" }],
  },
  {
    featureType: "road.arterial",
    elementType: "labels.text.fill",
    stylers: [{ color: "#757575" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#ffffff" }],
  },
  {
    featureType: "road.highway",
    elementType: "labels",
    stylers: [{ visibility: "simplified" }],
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "#616161" }],
  },
  {
    featureType: "road.local",
    elementType: "geometry",
    stylers: [{ color: "#ffffff" }],
  },
  {
    featureType: "road.local",
    elementType: "labels",
    stylers: [{ visibility: "simplified" }],
  },
  {
    featureType: "road.local",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9e9e9e" }],
  },
  {
    featureType: "transit",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#e1f4fd" }],
  },
  {
    featureType: "water",
    elementType: "labels.text",
    stylers: [{ visibility: "off" }],
  },
];

/**
 * Dark theme map style for night mode
 */
export const DARK_MAP_STYLE = [
  {
    elementType: "geometry",
    stylers: [{ color: "#1d2c4d" }],
  },
  {
    elementType: "labels.text.fill",
    stylers: [{ color: "#8ec3b9" }],
  },
  {
    elementType: "labels.text.stroke",
    stylers: [{ color: "#1a3646" }],
  },
  {
    featureType: "administrative.country",
    elementType: "geometry.stroke",
    stylers: [{ color: "#4b6878" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#2c6675" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#255763" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#0e1626" }],
  },
];

/**
 * Navigation mode style for better route visibility
 */
export const NAVIGATION_MAP_STYLE = [
  {
    featureType: "all",
    stylers: [{ saturation: 0 }, { lightness: 20 }],
  },
  {
    featureType: "road.highway",
    stylers: [{ color: "#ff6b35" }, { weight: 4 }],
  },
  {
    featureType: "road.arterial",
    stylers: [{ color: "#4285f4" }, { weight: 3 }],
  },
  {
    featureType: "poi",
    stylers: [{ visibility: "simplified" }],
  },
  {
    featureType: "transit",
    stylers: [{ visibility: "off" }],
  },
];

// ===== MAP CONFIGURATION CONSTANTS =====

/**
 * Zoom levels optimized for Indian geography
 */
export const MAP_ZOOM_LEVELS = {
  COUNTRY: 5, // India overview
  STATE: 7, // State level view
  INTERCITY: 9, // Between cities
  CITY: 12, // City overview
  AREA: 14, // Area/locality
  STREET: 16, // Street level
  BUILDING: 18, // Building level
  PICKUP: 19, // Precise pickup location
} as const;

/**
 * India geographical bounds for map restriction
 */
export const INDIA_BOUNDS = {
  north: 37.0902, // Kashmir (northernmost point)
  south: 6.7526, // Kanyakumari (southernmost point)
  east: 97.4025, // Arunachal Pradesh (easternmost point)
  west: 68.0325, // Gujarat (westernmost point)
} as const;

/**
 * Geographic center of India
 */
export const INDIA_CENTER = {
  latitude: 20.5937,
  longitude: 78.9629,
} as const;

/**
 * Major Indian cities with optimized coordinates and zoom preferences
 */
export const INDIAN_CITIES = {
  delhi: {
    center: { latitude: 28.6139, longitude: 77.209 },
    zoom: MAP_ZOOM_LEVELS.CITY,
    state: "Delhi",
    aliases: ["new delhi", "ncr"],
  },
  mumbai: {
    center: { latitude: 19.076, longitude: 72.8777 },
    zoom: MAP_ZOOM_LEVELS.CITY,
    state: "Maharashtra",
    aliases: ["bombay"],
  },
  bangalore: {
    center: { latitude: 12.9716, longitude: 77.5946 },
    zoom: MAP_ZOOM_LEVELS.CITY,
    state: "Karnataka",
    aliases: ["bengaluru", "blr"],
  },
  chennai: {
    center: { latitude: 13.0827, longitude: 80.2707 },
    zoom: MAP_ZOOM_LEVELS.CITY,
    state: "Tamil Nadu",
    aliases: ["madras"],
  },
  hyderabad: {
    center: { latitude: 17.385, longitude: 78.4867 },
    zoom: MAP_ZOOM_LEVELS.CITY,
    state: "Telangana",
    aliases: ["hyd"],
  },
  pune: {
    center: { latitude: 18.5204, longitude: 73.8567 },
    zoom: MAP_ZOOM_LEVELS.CITY,
    state: "Maharashtra",
    aliases: ["poona"],
  },
  kolkata: {
    center: { latitude: 22.5726, longitude: 88.3639 },
    zoom: MAP_ZOOM_LEVELS.CITY,
    state: "West Bengal",
    aliases: ["calcutta"],
  },
  ahmedabad: {
    center: { latitude: 23.0225, longitude: 72.5714 },
    zoom: MAP_ZOOM_LEVELS.CITY,
    state: "Gujarat",
    aliases: ["amdavad"],
  },
  jaipur: {
    center: { latitude: 26.9124, longitude: 75.7873 },
    zoom: MAP_ZOOM_LEVELS.CITY,
    state: "Rajasthan",
    aliases: ["pink city"],
  },
  lucknow: {
    center: { latitude: 26.8467, longitude: 80.9462 },
    zoom: MAP_ZOOM_LEVELS.CITY,
    state: "Uttar Pradesh",
    aliases: [],
  },
  surat: {
    center: { latitude: 21.1702, longitude: 72.8311 },
    zoom: MAP_ZOOM_LEVELS.CITY,
    state: "Gujarat",
    aliases: [],
  },
  kanpur: {
    center: { latitude: 26.4499, longitude: 80.3319 },
    zoom: MAP_ZOOM_LEVELS.CITY,
    state: "Uttar Pradesh",
    aliases: [],
  },
  nagpur: {
    center: { latitude: 21.1458, longitude: 79.0882 },
    zoom: MAP_ZOOM_LEVELS.CITY,
    state: "Maharashtra",
    aliases: [],
  },
  indore: {
    center: { latitude: 22.7196, longitude: 75.8577 },
    zoom: MAP_ZOOM_LEVELS.CITY,
    state: "Madhya Pradesh",
    aliases: [],
  },
  bhopal: {
    center: { latitude: 23.2599, longitude: 77.4126 },
    zoom: MAP_ZOOM_LEVELS.CITY,
    state: "Madhya Pradesh",
    aliases: [],
  },
  visakhapatnam: {
    center: { latitude: 17.6868, longitude: 83.2185 },
    zoom: MAP_ZOOM_LEVELS.CITY,
    state: "Andhra Pradesh",
    aliases: ["vizag"],
  },
  patna: {
    center: { latitude: 25.5941, longitude: 85.1376 },
    zoom: MAP_ZOOM_LEVELS.CITY,
    state: "Bihar",
    aliases: [],
  },
  vadodara: {
    center: { latitude: 22.3072, longitude: 73.1812 },
    zoom: MAP_ZOOM_LEVELS.CITY,
    state: "Gujarat",
    aliases: ["baroda"],
  },
  ghaziabad: {
    center: { latitude: 28.6692, longitude: 77.4538 },
    zoom: MAP_ZOOM_LEVELS.CITY,
    state: "Uttar Pradesh",
    aliases: [],
  },
  ludhiana: {
    center: { latitude: 30.901, longitude: 75.8573 },
    zoom: MAP_ZOOM_LEVELS.CITY,
    state: "Punjab",
    aliases: [],
  },
  agra: {
    center: { latitude: 27.1767, longitude: 78.0081 },
    zoom: MAP_ZOOM_LEVELS.CITY,
    state: "Uttar Pradesh",
    aliases: [],
  },
  nashik: {
    center: { latitude: 19.9975, longitude: 73.7898 },
    zoom: MAP_ZOOM_LEVELS.CITY,
    state: "Maharashtra",
    aliases: [],
  },
  faridabad: {
    center: { latitude: 28.4089, longitude: 77.3178 },
    zoom: MAP_ZOOM_LEVELS.CITY,
    state: "Haryana",
    aliases: [],
  },
  meerut: {
    center: { latitude: 28.9845, longitude: 77.7064 },
    zoom: MAP_ZOOM_LEVELS.CITY,
    state: "Uttar Pradesh",
    aliases: [],
  },
  rajkot: {
    center: { latitude: 22.3039, longitude: 70.8022 },
    zoom: MAP_ZOOM_LEVELS.CITY,
    state: "Gujarat",
    aliases: [],
  },
  kalyan: {
    center: { latitude: 19.2437, longitude: 73.1355 },
    zoom: MAP_ZOOM_LEVELS.CITY,
    state: "Maharashtra",
    aliases: [],
  },
  vasai: {
    center: { latitude: 19.4883, longitude: 72.8054 },
    zoom: MAP_ZOOM_LEVELS.CITY,
    state: "Maharashtra",
    aliases: [],
  },
  varanasi: {
    center: { latitude: 25.3176, longitude: 82.9739 },
    zoom: MAP_ZOOM_LEVELS.CITY,
    state: "Uttar Pradesh",
    aliases: ["banaras", "kashi"],
  },
  srinagar: {
    center: { latitude: 34.0837, longitude: 74.7973 },
    zoom: MAP_ZOOM_LEVELS.CITY,
    state: "Jammu and Kashmir",
    aliases: [],
  },
  aurangabad: {
    center: { latitude: 19.8762, longitude: 75.3433 },
    zoom: MAP_ZOOM_LEVELS.CITY,
    state: "Maharashtra",
    aliases: [],
  },
  dhanbad: {
    center: { latitude: 23.7957, longitude: 86.4304 },
    zoom: MAP_ZOOM_LEVELS.CITY,
    state: "Jharkhand",
    aliases: [],
  },
  amritsar: {
    center: { latitude: 31.634, longitude: 74.8723 },
    zoom: MAP_ZOOM_LEVELS.CITY,
    state: "Punjab",
    aliases: [],
  },
  "navi mumbai": {
    center: { latitude: 19.033, longitude: 73.0297 },
    zoom: MAP_ZOOM_LEVELS.CITY,
    state: "Maharashtra",
    aliases: ["new mumbai"],
  },
  allahabad: {
    center: { latitude: 25.4358, longitude: 81.8463 },
    zoom: MAP_ZOOM_LEVELS.CITY,
    state: "Uttar Pradesh",
    aliases: ["prayagraj"],
  },
  ranchi: {
    center: { latitude: 23.3441, longitude: 85.3096 },
    zoom: MAP_ZOOM_LEVELS.CITY,
    state: "Jharkhand",
    aliases: [],
  },
  howrah: {
    center: { latitude: 22.5958, longitude: 88.2636 },
    zoom: MAP_ZOOM_LEVELS.CITY,
    state: "West Bengal",
    aliases: [],
  },
  coimbatore: {
    center: { latitude: 11.0168, longitude: 76.9558 },
    zoom: MAP_ZOOM_LEVELS.CITY,
    state: "Tamil Nadu",
    aliases: [],
  },
  jabalpur: {
    center: { latitude: 23.1815, longitude: 79.9864 },
    zoom: MAP_ZOOM_LEVELS.CITY,
    state: "Madhya Pradesh",
    aliases: [],
  },
  gwalior: {
    center: { latitude: 26.2183, longitude: 78.1828 },
    zoom: MAP_ZOOM_LEVELS.CITY,
    state: "Madhya Pradesh",
    aliases: [],
  },
  vijayawada: {
    center: { latitude: 16.5062, longitude: 80.648 },
    zoom: MAP_ZOOM_LEVELS.CITY,
    state: "Andhra Pradesh",
    aliases: [],
  },
  jodhpur: {
    center: { latitude: 26.2389, longitude: 73.0243 },
    zoom: MAP_ZOOM_LEVELS.CITY,
    state: "Rajasthan",
    aliases: ["blue city"],
  },
  madurai: {
    center: { latitude: 9.9252, longitude: 78.1198 },
    zoom: MAP_ZOOM_LEVELS.CITY,
    state: "Tamil Nadu",
    aliases: [],
  },
  raipur: {
    center: { latitude: 21.2514, longitude: 81.6296 },
    zoom: MAP_ZOOM_LEVELS.CITY,
    state: "Chhattisgarh",
    aliases: [],
  },
  kota: {
    center: { latitude: 25.2138, longitude: 75.8648 },
    zoom: MAP_ZOOM_LEVELS.CITY,
    state: "Rajasthan",
    aliases: [],
  },
  chandigarh: {
    center: { latitude: 30.7333, longitude: 76.7794 },
    zoom: MAP_ZOOM_LEVELS.CITY,
    state: "Chandigarh",
    aliases: [],
  },
  guwahati: {
    center: { latitude: 26.1445, longitude: 91.7362 },
    zoom: MAP_ZOOM_LEVELS.CITY,
    state: "Assam",
    aliases: [],
  },
  noida: {
    center: { latitude: 28.5355, longitude: 77.391 },
    zoom: MAP_ZOOM_LEVELS.CITY,
    state: "Uttar Pradesh",
    aliases: [],
  },
  "greater noida": {
    center: { latitude: 28.4744, longitude: 77.504 },
    zoom: MAP_ZOOM_LEVELS.CITY,
    state: "Uttar Pradesh",
    aliases: [],
  },
  gurugram: {
    center: { latitude: 28.4595, longitude: 77.0266 },
    zoom: MAP_ZOOM_LEVELS.CITY,
    state: "Haryana",
    aliases: ["gurgaon"],
  },
  mysore: {
    center: { latitude: 12.2958, longitude: 76.6394 },
    zoom: MAP_ZOOM_LEVELS.CITY,
    state: "Karnataka",
    aliases: ["mysuru"],
  },
  kochi: {
    center: { latitude: 9.9312, longitude: 76.2673 },
    zoom: MAP_ZOOM_LEVELS.CITY,
    state: "Kerala",
    aliases: ["cochin"],
  },
  thiruvananthapuram: {
    center: { latitude: 8.5241, longitude: 76.9366 },
    zoom: MAP_ZOOM_LEVELS.CITY,
    state: "Kerala",
    aliases: ["trivandrum"],
  },
  bhubaneswar: {
    center: { latitude: 20.2961, longitude: 85.8245 },
    zoom: MAP_ZOOM_LEVELS.CITY,
    state: "Odisha",
    aliases: [],
  },
  cuttack: {
    center: { latitude: 20.4625, longitude: 85.8828 },
    zoom: MAP_ZOOM_LEVELS.CITY,
    state: "Odisha",
    aliases: [],
  },
  dehradun: {
    center: { latitude: 30.3165, longitude: 78.0322 },
    zoom: MAP_ZOOM_LEVELS.CITY,
    state: "Uttarakhand",
    aliases: [],
  },
} as const;

// ===== ROUTE STYLING CONFIGURATION =====

/**
 * High-contrast route colors for maximum visibility on minimal background
 */
export const ROUTE_COLORS = {
  FASTEST: "#1a73e8", // Google Blue - clear and recognizable
  SHORTEST: "#9333ea", // Purple - distinctive from infrastructure
  SCENIC: "#d93025", // Red - good contrast, commonly used for routes
  OPTIMIZED: "#f57c00", // Orange - visible and unique
  SELECTED: "#000000", // Black for maximum contrast when selected
  ACTIVE: "#fbbc04", // Yellow/amber for active/current route
  COMPLETED: "#5f6368", // Gray for completed routes
  TOLL_FREE: "#8b5cf6", // Light purple for toll-free options
  HIGHWAY: "#1565c0", // Dark Blue for highway-specific routes
} as const;

/**
 * Enhanced route weights for better visibility
 */
export const ROUTE_WEIGHTS = {
  DEFAULT: 6, // Increased for better visibility
  SELECTED: 10, // Very thick for selected
  HOVER: 8, // Thicker on hover
  INACTIVE: 4, // Thinner for inactive
  HIGHLIGHTED: 12, // Maximum thickness for highlighted
} as const;

/**
 * Enhanced route opacity for better contrast
 */
export const ROUTE_OPACITY = {
  DEFAULT: 0.95, // High opacity for visibility
  SELECTED: 1.0, // Full opacity for selected
  HOVER: 1.0, // Full opacity on hover
  INACTIVE: 0.6, // Lower for inactive
  HIGHLIGHTED: 1.0, // Full opacity for highlighted
} as const;

// ===== MARKER CONFIGURATION =====

/**
 * Marker styles optimized for Indian ride-sharing context
 */
export const MARKER_STYLES = {
  DRIVER: {
    color: "#1e40af",
    icon: "🚗",
    size: { width: 32, height: 32 },
    zIndex: 100,
  },
  PASSENGER: {
    color: "#059669",
    icon: "👤",
    size: { width: 24, height: 24 },
    zIndex: 90,
  },
  PICKUP: {
    color: "#0ea5e9",
    icon: "📍",
    size: { width: 28, height: 28 },
    zIndex: 110,
  },
  DROPOFF: {
    color: "#dc2626",
    icon: "🏁",
    size: { width: 28, height: 28 },
    zIndex: 110,
  },
  WAYPOINT: {
    color: "#f59e0b",
    icon: "⭐",
    size: { width: 20, height: 20 },
    zIndex: 80,
  },
  REST_STOP: {
    color: "#8b5cf6",
    icon: "🛑",
    size: { width: 24, height: 24 },
    zIndex: 70,
  },
  FUEL_STATION: {
    color: "#10b981",
    icon: "⛽",
    size: { width: 24, height: 24 },
    zIndex: 70,
  },
  TOLL_BOOTH: {
    color: "#f97316",
    icon: "💰",
    size: { width: 24, height: 24 },
    zIndex: 70,
  },
  LANDMARK: {
    color: "#6b7280",
    icon: "🏛️",
    size: { width: 20, height: 20 },
    zIndex: 60,
  },
} as const;

/**
 * Zone styling configuration for pickup/dropoff areas
 */
export const ZONE_STYLES = {
  PICKUP: {
    fillColor: "#3b82f6",
    fillOpacity: 0.2,
    strokeColor: "#1d4ed8",
    strokeOpacity: 0.8,
    strokeWeight: 2,
  },
  DROPOFF: {
    fillColor: "#ef4444",
    fillOpacity: 0.2,
    strokeColor: "#dc2626",
    strokeOpacity: 0.8,
    strokeWeight: 2,
  },
  GENERAL: {
    fillColor: "#6b7280",
    fillOpacity: 0.15,
    strokeColor: "#4b5563",
    strokeOpacity: 0.6,
    strokeWeight: 1,
  },
  SELECTED: {
    fillColor: "#8b5cf6",
    fillOpacity: 0.3,
    strokeColor: "#7c3aed",
    strokeOpacity: 1.0,
    strokeWeight: 3,
  },
  RESTRICTED: {
    fillColor: "#dc2626",
    fillOpacity: 0.1,
    strokeColor: "#b91c1c",
    strokeOpacity: 0.5,
    strokeWeight: 1,
  },
} as const;

// ===== PLATFORM-SPECIFIC CONFIGURATION =====

/**
 * Get platform-specific map options
 */
export const getPlatformMapOptions = () => {
  const baseOptions = {
    center: INDIA_CENTER,
    zoom: MAP_ZOOM_LEVELS.COUNTRY,
    restriction: {
      latLngBounds: INDIA_BOUNDS,
      strictBounds: false,
    },
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
    gestureHandling: "cooperative" as const,
    zoomControl: true,
    rotateControl: false,
    scaleControl: true,
    // Optimize for Indian context
    mapTypeId: "roadmap" as const,
    styles: LIGHT_MAP_STYLE,
  };

  if (isNative()) {
    return {
      ...baseOptions,
      // Native-specific optimizations
      gestureHandling: "greedy" as const,
      zoomControl: true,
      rotateControl: false,
      scaleControl: false,
      mapTypeControl: false,
    };
  } else {
    return {
      ...baseOptions,
      // Web-specific optimizations
      gestureHandling: "cooperative" as const,
      zoomControl: true,
      rotateControl: true,
      scaleControl: true,
      mapTypeControl: true,
      // Enable traffic layer by default for web
      clickableIcons: true,
    };
  }
};

/**
 * Get appropriate map style based on theme and context
 */
export const getMapStyle = (
  theme: "light" | "dark" | "navigation" = "light"
) => {
  switch (theme) {
    case "dark":
      return DARK_MAP_STYLE;
    case "navigation":
      return NAVIGATION_MAP_STYLE;
    default:
      return LIGHT_MAP_STYLE;
  }
};

// ===== PERFORMANCE CONFIGURATION =====

/**
 * Map performance settings optimized for Indian conditions
 */
export const MAP_PERFORMANCE = {
  // Update frequencies in milliseconds
  LOCATION_UPDATE_INTERVAL: {
    HIGHWAY: 180000, // 3 minutes on highway (battery saving)
    CITY: 60000, // 1 minute in city traffic
    PICKUP: 10000, // 10 seconds during pickup/dropoff
    DROPOFF: 10000, // 10 seconds during dropoff
    EMERGENCY: 5000, // 5 seconds during emergency
  },

  // Maximum number of elements to render
  MAX_ELEMENTS: {
    ZONES: 50,
    WAYPOINTS: 20,
    MARKERS: 100,
    ROUTES: 5,
    HISTORY_POINTS: 200,
  },

  // Clustering thresholds
  CLUSTER_THRESHOLD: {
    ZONES: 10,
    MARKERS: 15,
    WAYPOINTS: 8,
  },

  // Cache durations in milliseconds
  CACHE_DURATION: {
    ROUTES: 3600000, // 1 hour (routes change with traffic)
    ZONES: 86400000, // 24 hours (zones rarely change)
    LOCATIONS: 300000, // 5 minutes (location data)
    GEOCODING: 604800000, // 7 days (geocoding results)
    PLACES: 86400000, // 24 hours (places data)
  },

  // Network optimization
  BATCH_SIZE: {
    LOCATION_UPDATES: 10,
    WAYPOINT_UPLOADS: 20,
    ROUTE_CALCULATIONS: 3,
  },
} as const;

// ===== ANIMATION CONFIGURATION =====

/**
 * Map animation settings
 */
export const MAP_ANIMATIONS = {
  PAN_DURATION: 1000, // Pan animation duration in ms
  ZOOM_DURATION: 800, // Zoom animation duration in ms
  MARKER_BOUNCE_DURATION: 600, // Marker bounce duration in ms
  ROUTE_DRAW_SPEED: 50, // Route drawing speed (points per second)
  FADE_DURATION: 300, // Fade in/out duration in ms
  POLYLINE_ANIMATION: true, // Enable polyline animations
  MARKER_CLUSTERING: true, // Enable marker clustering animations
} as const;

// ===== ERROR HANDLING CONFIGURATION =====

/**
 * Map error handling configuration
 */
export const MAP_ERROR_CONFIG = {
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
  TIMEOUT: 15000, // Increased timeout for Indian network conditions
  FALLBACK_ZOOM: MAP_ZOOM_LEVELS.CITY,
  FALLBACK_CENTER: INDIA_CENTER,
  ENABLE_OFFLINE_FALLBACK: true,
  CACHE_FALLBACK: true,
} as const;

// ===== GOOGLE MAPS LIBRARIES =====

/**
 * Required Google Maps libraries
 */
export const GOOGLE_MAPS_LIBRARIES = [
  "geometry", // For distance calculations
  "places", // For place search and geocoding
  "drawing", // For zone drawing (future feature)
  "visualization", // For traffic layer
] as const;

// ===== EXPORT DEFAULT CONFIGURATION =====

/**
 * Default map configuration object
 */
export const DEFAULT_MAP_CONFIG = {
  apiKey: getGoogleMapsApiKey(),
  libraries: GOOGLE_MAPS_LIBRARIES,
  options: getPlatformMapOptions(),
  style: getMapStyle("light"),
  zoom: MAP_ZOOM_LEVELS,
  bounds: INDIA_BOUNDS,
  center: INDIA_CENTER,
  cities: INDIAN_CITIES,
  routes: {
    colors: ROUTE_COLORS,
    weights: ROUTE_WEIGHTS,
    opacity: ROUTE_OPACITY,
  },
  markers: MARKER_STYLES,
  zones: ZONE_STYLES,
  performance: MAP_PERFORMANCE,
  animations: MAP_ANIMATIONS,
  errors: MAP_ERROR_CONFIG,
} as const;

// ===== HELPER FUNCTIONS =====

/**
 * Get city configuration by name with alias support
 */
export const getCityConfig = (cityName: string) => {
  const normalizedName = cityName.toLowerCase().trim();

  // Direct match
  const directMatch =
    INDIAN_CITIES[normalizedName as keyof typeof INDIAN_CITIES];
  if (directMatch) return directMatch;

  // Search through aliases
  for (const [key, city] of Object.entries(INDIAN_CITIES)) {
    if (city.aliases.some((alias) => alias.toLowerCase() === normalizedName)) {
      return city;
    }
  }

  return null;
};

/**
 * Get appropriate zoom level for distance (optimized for Indian geography)
 */
export const getZoomForDistance = (distanceKm: number): number => {
  if (distanceKm > 1500) return MAP_ZOOM_LEVELS.COUNTRY; // Cross-country
  if (distanceKm > 800) return MAP_ZOOM_LEVELS.STATE; // Inter-state
  if (distanceKm > 200) return MAP_ZOOM_LEVELS.INTERCITY; // Long intercity
  if (distanceKm > 50) return MAP_ZOOM_LEVELS.CITY; // City to city
  if (distanceKm > 10) return MAP_ZOOM_LEVELS.AREA; // Within city
  if (distanceKm > 2) return MAP_ZOOM_LEVELS.STREET; // Street level
  return MAP_ZOOM_LEVELS.BUILDING; // Building level
};

/**
 * Get update interval based on journey phase
 */
export const getUpdateInterval = (
  phase: "highway" | "city" | "pickup" | "dropoff" | "emergency"
): number => {
  return MAP_PERFORMANCE.LOCATION_UPDATE_INTERVAL[
    phase.toUpperCase() as keyof typeof MAP_PERFORMANCE.LOCATION_UPDATE_INTERVAL
  ];
};

/**
 * Check if coordinates are within India bounds
 */
export const isWithinIndiaBounds = (
  latitude: number,
  longitude: number
): boolean => {
  return (
    latitude >= INDIA_BOUNDS.south &&
    latitude <= INDIA_BOUNDS.north &&
    longitude >= INDIA_BOUNDS.west &&
    longitude <= INDIA_BOUNDS.east
  );
};

/**
 * Get route color based on type and state (updated for better visibility)
 */
export const getRouteColor = (
  routeType: string,
  isSelected: boolean = false
): string => {
  if (isSelected) return ROUTE_COLORS.SELECTED;

  switch (routeType) {
    case "fastest":
      return ROUTE_COLORS.FASTEST;
    case "shortest":
      return ROUTE_COLORS.SHORTEST;
    case "scenic":
      return ROUTE_COLORS.SCENIC;
    case "optimized":
      return ROUTE_COLORS.OPTIMIZED;
    case "toll_free":
      return ROUTE_COLORS.TOLL_FREE;
    case "highway":
      return ROUTE_COLORS.HIGHWAY;
    default:
      return ROUTE_COLORS.FASTEST;
  }
};

/**
 * Validate and log API configuration on startup
 */
export const validateMapConfiguration = (): boolean => {
  console.log("🗺️ Validating Google Maps configuration...");

  const validation = validateApiKeys();

  if (!validation.valid) {
    console.error("❌ Missing Google Maps API keys:", validation.missing);
    console.error("📝 Please add these keys to your .env file:");
    validation.missing.forEach((key) => {
      console.error(`   ${key}=your_api_key_here`);
    });
    return false;
  }

  console.log("✅ Google Maps API keys configured");
  console.log(
    `🌍 Platform: ${
      isNative()
        ? isIOS()
          ? "iOS"
          : isAndroid()
          ? "Android"
          : "Native"
        : "Web"
    }`
  );
  console.log(`🔑 Using API key: ${getGoogleMapsApiKey().substring(0, 10)}...`);

  return true;
};

// Auto-validate configuration on import (development only)
if (import.meta.env.DEV) {
  validateMapConfiguration();
}
