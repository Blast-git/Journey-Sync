// src/components/maps/core/mapUtils.ts - Fixed version
import { Capacitor } from '@capacitor/core';

// ===== PLATFORM DETECTION =====

/**
 * Check if running on native platform (iOS/Android)
 */
export const isNative = (): boolean => {
  return Capacitor.isNativePlatform();
};

/**
 * Check if running on web platform
 */
export const isWeb = (): boolean => {
  return Capacitor.getPlatform() === 'web';
};

/**
 * Check if running on iOS
 */
export const isIOS = (): boolean => {
  return Capacitor.getPlatform() === 'ios';
};

/**
 * Check if running on Android
 */
export const isAndroid = (): boolean => {
  return Capacitor.getPlatform() === 'android';
};

/**
 * Get current platform string
 */
export const getCurrentPlatform = (): string => {
  return Capacitor.getPlatform();
};

// ===== COORDINATE TYPES =====

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

// ===== CITY COORDINATES (MOVED TO MODULE SCOPE) =====

const CITY_COORDINATES: Record<string, Coordinates> = {
  'mumbai': { latitude: 19.0760, longitude: 72.8777 },
  'delhi': { latitude: 28.7041, longitude: 77.1025 },
  'bangalore': { latitude: 12.9716, longitude: 77.5946 },
  'bengaluru': { latitude: 12.9716, longitude: 77.5946 },
  'hyderabad': { latitude: 17.3850, longitude: 78.4867 },
  'ahmedabad': { latitude: 23.0225, longitude: 72.5714 },
  'chennai': { latitude: 13.0827, longitude: 80.2707 },
  'kolkata': { latitude: 22.5726, longitude: 88.3639 },
  'pune': { latitude: 18.5204, longitude: 73.8567 },
  'jaipur': { latitude: 26.9124, longitude: 75.7873 },
  'surat': { latitude: 21.1702, longitude: 72.8311 },
  'lucknow': { latitude: 26.8467, longitude: 80.9462 },
  'kanpur': { latitude: 26.4499, longitude: 80.3319 },
  'nagpur': { latitude: 21.1458, longitude: 79.0882 },
  'indore': { latitude: 22.7196, longitude: 75.8577 },
  'thane': { latitude: 19.2183, longitude: 72.9781 },
  'bhopal': { latitude: 23.2599, longitude: 77.4126 },
  'visakhapatnam': { latitude: 17.6868, longitude: 83.2185 },
  'pimpri': { latitude: 18.6298, longitude: 73.7997 },
  'patna': { latitude: 25.5941, longitude: 85.1376 },
  'vadodara': { latitude: 22.3072, longitude: 73.1812 },
  'ghaziabad': { latitude: 28.6692, longitude: 77.4538 },
  'ludhiana': { latitude: 30.9010, longitude: 75.8573 },
  'agra': { latitude: 27.1767, longitude: 78.0081 },
  'nashik': { latitude: 19.9975, longitude: 73.7898 },
  'faridabad': { latitude: 28.4089, longitude: 77.3178 },
  'meerut': { latitude: 28.9845, longitude: 77.7064 },
  'rajkot': { latitude: 22.3039, longitude: 70.8022 },
  'kalyan': { latitude: 19.2437, longitude: 73.1355 },
  'vasai': { latitude: 19.4883, longitude: 72.8054 },
  'varanasi': { latitude: 25.3176, longitude: 82.9739 },
  'srinagar': { latitude: 34.0837, longitude: 74.7973 },
  'aurangabad': { latitude: 19.8762, longitude: 75.3433 },
  'dhanbad': { latitude: 23.7957, longitude: 86.4304 },
  'amritsar': { latitude: 31.6340, longitude: 74.8723 },
  'navi mumbai': { latitude: 19.0330, longitude: 73.0297 },
  'allahabad': { latitude: 25.4358, longitude: 81.8463 },
  'prayagraj': { latitude: 25.4358, longitude: 81.8463 },
  'ranchi': { latitude: 23.3441, longitude: 85.3096 },
  'howrah': { latitude: 22.5958, longitude: 88.2636 },
  'coimbatore': { latitude: 11.0168, longitude: 76.9558 },
  'jabalpur': { latitude: 23.1815, longitude: 79.9864 },
  'gwalior': { latitude: 26.2183, longitude: 78.1828 },
  'vijayawada': { latitude: 16.5062, longitude: 80.6480 },
  'jodhpur': { latitude: 26.2389, longitude: 73.0243 },
  'madurai': { latitude: 9.9252, longitude: 78.1198 },
  'raipur': { latitude: 21.2514, longitude: 81.6296 },
  'kota': { latitude: 25.2138, longitude: 75.8648 },
  'chandigarh': { latitude: 30.7333, longitude: 76.7794 },
  'guwahati': { latitude: 26.1445, longitude: 91.7362 },
  'noida': { latitude: 28.5355, longitude: 77.3910 },
  'greater noida': { latitude: 28.4744, longitude: 77.5040 },
  'gurugram': { latitude: 28.4595, longitude: 77.0266 },
  'gurgaon': { latitude: 28.4595, longitude: 77.0266 },
  'mysore': { latitude: 12.2958, longitude: 76.6394 },
  'mysuru': { latitude: 12.2958, longitude: 76.6394 },
  'kochi': { latitude: 9.9312, longitude: 76.2673 },
  'cochin': { latitude: 9.9312, longitude: 76.2673 },
  'thiruvananthapuram': { latitude: 8.5241, longitude: 76.9366 },
  'trivandrum': { latitude: 8.5241, longitude: 76.9366 },
  'bhubaneswar': { latitude: 20.2961, longitude: 85.8245 },
  'cuttack': { latitude: 20.4625, longitude: 85.8828 },
  'dehradun': { latitude: 30.3165, longitude: 78.0322 },
  'haridwar': { latitude: 29.9457, longitude: 78.1642 },
  'rishikesh': { latitude: 30.0869, longitude: 78.2676 },
  'shimla': { latitude: 31.1048, longitude: 77.1734 },
  'manali': { latitude: 32.2396, longitude: 77.1887 },
  'darjeeling': { latitude: 27.0360, longitude: 88.2627 },
  'siliguri': { latitude: 26.7271, longitude: 88.3953 },
  'gangtok': { latitude: 27.3389, longitude: 88.6065 },
  'imphal': { latitude: 24.8170, longitude: 93.9368 },
  'aizawl': { latitude: 23.1645, longitude: 92.9376 },
  'shillong': { latitude: 25.5788, longitude: 91.8933 },
  'itanagar': { latitude: 27.0844, longitude: 93.6053 },
  'kohima': { latitude: 25.6751, longitude: 94.1086 },
  'dimapur': { latitude: 25.9044, longitude: 93.7267 },
  'agartala': { latitude: 23.8315, longitude: 91.2868 }
};

// ===== DISTANCE & BEARING CALCULATIONS =====

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param coord1 First coordinate
 * @param coord2 Second coordinate
 * @returns Distance in kilometers
 */
export const calculateDistance = (coord1: Coordinates, coord2: Coordinates): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(coord2.latitude - coord1.latitude);
  const dLon = toRadians(coord2.longitude - coord1.longitude);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(coord1.latitude)) * Math.cos(toRadians(coord2.latitude)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Calculate bearing from one coordinate to another
 * @param coord1 Starting coordinate
 * @param coord2 Ending coordinate
 * @returns Bearing in degrees (0-360)
 */
export const calculateBearing = (coord1: Coordinates, coord2: Coordinates): number => {
  const dLon = toRadians(coord2.longitude - coord1.longitude);
  const lat1 = toRadians(coord1.latitude);
  const lat2 = toRadians(coord2.latitude);
  
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  
  const bearing = toDegrees(Math.atan2(y, x));
  return (bearing + 360) % 360;
};

/**
 * Format duration in minutes to human-readable string
 * @param minutes Duration in minutes
 * @returns Formatted string like "2h 30m" or "45m"
 */
export const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${Math.round(minutes)}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.round(minutes % 60);
  
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${remainingMinutes}m`;
};

/**
 * Format distance in kilometers to human-readable string
 * @param kilometers Distance in kilometers
 * @returns Formatted string like "1.5 km" or "120 km"
 */
export const formatDistance = (kilometers: number): string => {
  if (kilometers < 1) {
    return `${Math.round(kilometers * 1000)}m`;
  }
  
  if (kilometers < 100) {
    return `${kilometers.toFixed(1)} km`;
  }
  
  return `${Math.round(kilometers)} km`;
};

// ===== POLYLINE ENCODING/DECODING =====

/**
 * Encode array of coordinates to Google polyline string
 * @param coordinates Array of lat/lng coordinates
 * @returns Encoded polyline string
 */
export const encodePolyline = (coordinates: Coordinates[]): string => {
  let result = '';
  let prevLat = 0;
  let prevLng = 0;
  
  for (const coord of coordinates) {
    const lat = Math.round(coord.latitude * 1e5);
    const lng = Math.round(coord.longitude * 1e5);
    
    const deltaLat = lat - prevLat;
    const deltaLng = lng - prevLng;
    
    result += encodeSignedNumber(deltaLat);
    result += encodeSignedNumber(deltaLng);
    
    prevLat = lat;
    prevLng = lng;
  }
  
  return result;
};

/**
 * Decode Google polyline string to array of coordinates
 * @param polyline Encoded polyline string
 * @returns Array of decoded coordinates
 */
export const decodePolyline = (polyline: string): Coordinates[] => {
  const coordinates: Coordinates[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  
  while (index < polyline.length) {
    const deltaLat = decodeSignedNumber(polyline, index);
    index = deltaLat.index;
    lat += deltaLat.value;
    
    const deltaLng = decodeSignedNumber(polyline, index);
    index = deltaLng.index;
    lng += deltaLng.value;
    
    coordinates.push({
      latitude: lat / 1e5,
      longitude: lng / 1e5
    });
  }
  
  return coordinates;
};

// ===== VALIDATION FUNCTIONS =====

/**
 * Validate if coordinates are valid lat/lng values
 * @param coordinates Coordinates to validate
 * @returns True if valid
 */
export const validateCoordinates = (coordinates: Coordinates): boolean => {
  const { latitude, longitude } = coordinates;
  
  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    latitude >= -90 && latitude <= 90 &&
    longitude >= -180 && longitude <= 180 &&
    !isNaN(latitude) && !isNaN(longitude)
  );
};

/**
 * Create bounds from array of coordinates
 * @param coordinates Array of coordinates
 * @returns Bounds object containing north, south, east, west
 */
export const boundsFromPoints = (coordinates: Coordinates[]): Bounds | null => {
  if (coordinates.length === 0) return null;
  
  let north = coordinates[0].latitude;
  let south = coordinates[0].latitude;
  let east = coordinates[0].longitude;
  let west = coordinates[0].longitude;
  
  for (const coord of coordinates) {
    if (!validateCoordinates(coord)) continue;
    
    north = Math.max(north, coord.latitude);
    south = Math.min(south, coord.latitude);
    east = Math.max(east, coord.longitude);
    west = Math.min(west, coord.longitude);
  }
  
  return { north, south, east, west };
};

/**
 * Check if a coordinate is within given bounds
 * @param coordinate Coordinate to check
 * @param bounds Bounds to check against
 * @returns True if coordinate is within bounds
 */
export const isWithinBounds = (coordinate: Coordinates, bounds: Bounds): boolean => {
  return (
    coordinate.latitude >= bounds.south &&
    coordinate.latitude <= bounds.north &&
    coordinate.longitude >= bounds.west &&
    coordinate.longitude <= bounds.east
  );
};

// ===== CACHE UTILITIES =====

/**
 * Check if cached data is expired
 * @param expiresAt Expiration timestamp
 * @returns True if expired
 */
export const isCacheExpired = (expiresAt: string | Date): boolean => {
  const expiration = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;
  return expiration.getTime() < Date.now();
};

// ===== HELPER FUNCTIONS =====

/**
 * Convert degrees to radians
 */
const toRadians = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};

/**
 * Convert radians to degrees
 */
const toDegrees = (radians: number): number => {
  return radians * (180 / Math.PI);
};

/**
 * Encode a signed number for polyline encoding
 */
const encodeSignedNumber = (num: number): string => {
  let signedNum = num << 1;
  if (num < 0) {
    signedNum = ~signedNum;
  }
  return encodeUnsignedNumber(signedNum);
};

/**
 * Encode an unsigned number for polyline encoding
 */
const encodeUnsignedNumber = (num: number): string => {
  let encoded = '';
  while (num >= 0x20) {
    encoded += String.fromCharCode((0x20 | (num & 0x1f)) + 63);
    num >>= 5;
  }
  encoded += String.fromCharCode(num + 63);
  return encoded;
};

/**
 * Decode a signed number from polyline string
 */
const decodeSignedNumber = (polyline: string, index: number): { value: number; index: number } => {
  const result = decodeUnsignedNumber(polyline, index);
  const signedNum = result.value;
  
  return {
    value: (signedNum & 1) ? ~(signedNum >> 1) : (signedNum >> 1),
    index: result.index
  };
};

/**
 * Decode an unsigned number from polyline string
 */
const decodeUnsignedNumber = (polyline: string, index: number): { value: number; index: number } => {
  let shift = 0;
  let result = 0;
  
  while (index < polyline.length) {
    let byte = polyline.charCodeAt(index) - 63;
    index++;
    result |= (byte & 0x1f) << shift;
    shift += 5;
    
    if (byte < 0x20) break;
  }
  
  return { value: result, index };
};

// ===== CITY HELPERS FOR INDIAN CONTEXT =====

/**
 * Get center coordinates for major Indian cities
 */
export const getCityCenter = (cityName: string): Coordinates | null => {
  return CITY_COORDINATES[cityName.toLowerCase()] || null;
};

/**
 * Get coordinates for both origin and destination cities
 * @param fromCity Origin city name
 * @param toCity Destination city name
 * @returns Object with origin and destination coordinates
 */
export const getCityCoordinates = (fromCity: string, toCity: string): {
  origin: Coordinates | null;
  destination: Coordinates | null;
} => {
  const normalizeCity = (city: string) => {
    return city.toLowerCase().trim()
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
  };
  
  const fromNormalized = normalizeCity(fromCity);
  const toNormalized = normalizeCity(toCity);
  
  console.log(`Looking up coordinates: ${fromCity} -> ${fromNormalized}, ${toCity} -> ${toNormalized}`);
  
  const origin = CITY_COORDINATES[fromNormalized] || null;
  const destination = CITY_COORDINATES[toNormalized] || null;
  
  if (!origin) {
    console.warn(`Coordinates not found for origin city: ${fromCity} (normalized: ${fromNormalized})`);
  }
  
  if (!destination) {
    console.warn(`Coordinates not found for destination city: ${toCity} (normalized: ${toNormalized})`);
  }
  
  return { origin, destination };
};

/**
 * Calculate appropriate zoom level based on distance
 * @param distanceKm Distance in kilometers
 * @returns Appropriate zoom level (1-20)
 */
export const getZoomForDistance = (distanceKm: number): number => {
  if (distanceKm > 1000) return 6;
  if (distanceKm > 500) return 7;
  if (distanceKm > 200) return 8;
  if (distanceKm > 100) return 9;
  if (distanceKm > 50) return 10;
  if (distanceKm > 20) return 11;
  if (distanceKm > 10) return 12;
  if (distanceKm > 5) return 13;
  if (distanceKm > 2) return 14;
  if (distanceKm > 1) return 15;
  return 16;
};

/**
 * Check if a point is within a polygon (for zone checking)
 * @param point Point to check
 * @param polygon Array of coordinates forming polygon
 * @returns True if point is inside polygon
 */
export const isPointInPolygon = (point: Coordinates, polygon: Coordinates[]): boolean => {
  let inside = false;
  const { latitude: x, longitude: y } = point;
  
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const { latitude: xi, longitude: yi } = polygon[i];
    const { latitude: xj, longitude: yj } = polygon[j];
    
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  
  return inside;
};

/**
 * Calculate center point of a polygon
 * @param polygon Array of coordinates
 * @returns Center coordinate
 */
export const getPolygonCenter = (polygon: Coordinates[]): Coordinates => {
  let totalLat = 0;
  let totalLng = 0;
  
  for (const coord of polygon) {
    totalLat += coord.latitude;
    totalLng += coord.longitude;
  }
  
  return {
    latitude: totalLat / polygon.length,
    longitude: totalLng / polygon.length
  };
};

/**
 * Expand bounds by a certain margin (in kilometers)
 * @param bounds Original bounds
 * @param marginKm Margin in kilometers
 * @returns Expanded bounds
 */
export const expandBounds = (bounds: Bounds, marginKm: number): Bounds => {
  // Approximate: 1 degree latitude ≈ 111 km
  // Longitude varies by latitude, but this is a rough approximation
  const latMargin = marginKm / 111;
  const lngMargin = marginKm / (111 * Math.cos(toRadians((bounds.north + bounds.south) / 2)));
  
  return {
    north: bounds.north + latMargin,
    south: bounds.south - latMargin,
    east: bounds.east + lngMargin,
    west: bounds.west - lngMargin
  };
};

// ===== DEFAULT EXPORT OBJECT =====

const mapUtils = {
  // Platform detection
  isNative,
  isWeb,
  isIOS,
  isAndroid,
  getCurrentPlatform,
  
  // Calculations
  calculateDistance,
  calculateBearing,
  formatDuration,
  formatDistance,
  
  // Polyline
  encodePolyline,
  decodePolyline,
  
  // Validation
  validateCoordinates,
  boundsFromPoints,
  isWithinBounds,
  
  // Cache utilities
  isCacheExpired,
  
  // City helpers
  getCityCenter,
  getCityCoordinates,
  getZoomForDistance,
  isPointInPolygon,
  getPolygonCenter,
  expandBounds
};

export default mapUtils;
export { mapUtils };