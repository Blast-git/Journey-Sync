// src/components/maps/shared/components/LocationMarkers.tsx
import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { mapUtils } from '@/components/maps/core/mapUtils';

export interface MarkerLocation {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  description?: string;
  type: 'origin' | 'destination' | 'waypoint' | 'driver' | 'passenger' | 'pickup' | 'dropoff';
  icon?: string;
  color?: string;
  onClick?: () => void;
}

export interface LocationMarkersProps {
  locations: MarkerLocation[];
  showInfoWindows?: boolean;
  clusterable?: boolean;
  onMarkerClick?: (location: MarkerLocation) => void;
}

// FIXED: Add ref interface
export interface LocationMarkersRef {
  setMapInstance: (mapInstance: google.maps.Map) => void;
  updateMarkerPosition: (locationId: string, newPosition: { latitude: number; longitude: number }) => void;
  showMarkerInfoWindow: (locationId: string) => void;
  hideAllInfoWindows: () => void;
}

const getMarkerIcon = (type: string, color?: string): string => {
  const iconBase = 'data:image/svg+xml;charset=UTF-8,';
  
  const createSVGIcon = (fillColor: string, symbol: string) => {
    const svg = `
      <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="12" fill="${fillColor}" stroke="white" stroke-width="2"/>
        <text x="16" y="20" text-anchor="middle" fill="white" font-family="Arial" font-size="12" font-weight="bold">
          ${symbol}
        </text>
      </svg>
    `;
    return iconBase + encodeURIComponent(svg);
  };

  const icons = {
    origin: createSVGIcon(color || '#10b981', 'A'),
    destination: createSVGIcon(color || '#ef4444', 'B'),
    waypoint: createSVGIcon(color || '#3b82f6', '•'),
    driver: createSVGIcon(color || '#f59e0b', 'D'),
    passenger: createSVGIcon(color || '#8b5cf6', 'P'),
    pickup: createSVGIcon(color || '#06b6d4', '↑'),
    dropoff: createSVGIcon(color || '#84cc16', '↓')
  };

  return icons[type as keyof typeof icons] || icons.waypoint;
};

// FIXED: Use forwardRef
export const LocationMarkers = forwardRef<LocationMarkersRef, LocationMarkersProps>(({
  locations,
  showInfoWindows = true,
  clusterable = false,
  onMarkerClick
}, ref) => {
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const infoWindowsRef = useRef<Map<string, google.maps.InfoWindow>>(new Map());
  const mapInstanceRef = useRef<google.maps.Map | null>(null);

  // Web implementation using Google Maps Markers
  const createWebMarkers = () => {
    if (!mapUtils.isWeb() || typeof google === 'undefined') {
      console.log('Google Maps not available - skipping marker creation');
      return;
    }

    // Clear existing markers
    markersRef.current.forEach(marker => {
      marker.setMap(null);
    });
    markersRef.current.clear();

    // Clear existing info windows
    infoWindowsRef.current.forEach(infoWindow => {
      infoWindow.close();
    });
    infoWindowsRef.current.clear();

    console.log('Creating markers for locations:', locations.length);

    // Create new markers
    locations.forEach(location => {
      try {
        // Validate coordinates
        if (!mapUtils.validateCoordinates(location)) {
          console.warn('Invalid coordinates for location:', location.id);
          return;
        }

        const marker = new google.maps.Marker({
          position: {
            lat: location.latitude,
            lng: location.longitude
          },
          title: location.title,
          icon: {
            url: location.icon || getMarkerIcon(location.type, location.color),
            scaledSize: new google.maps.Size(32, 32),
            anchor: new google.maps.Point(16, 16)
          },
          animation: google.maps.Animation.DROP
        });

        // Create info window if descriptions provided
        if (showInfoWindows && (location.description || location.title)) {
          const infoWindow = new google.maps.InfoWindow({
            content: `
              <div style="padding: 8px; max-width: 200px;">
                <h3 style="margin: 0 0 4px 0; font-size: 14px; font-weight: bold;">
                  ${location.title}
                </h3>
                ${location.description ? `
                  <p style="margin: 0; font-size: 12px; color: #666;">
                    ${location.description}
                  </p>
                ` : ''}
                <div style="margin-top: 4px; font-size: 11px; color: #999;">
                  ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}
                </div>
              </div>
            `
          });

          // Add click listener to show info window
          marker.addListener('click', () => {
            // Close all other info windows
            infoWindowsRef.current.forEach(iw => iw.close());
            
            // Open this info window
            if (mapInstanceRef.current) {
              infoWindow.open(mapInstanceRef.current, marker);
            }
            
            // Call custom click handler
            if (location.onClick) {
              location.onClick();
            }
            if (onMarkerClick) {
              onMarkerClick(location);
            }
          });

          infoWindowsRef.current.set(location.id, infoWindow);
        } else {
          // Just add click listener without info window
          marker.addListener('click', () => {
            if (location.onClick) {
              location.onClick();
            }
            if (onMarkerClick) {
              onMarkerClick(location);
            }
          });
        }

        // Store marker reference
        markersRef.current.set(location.id, marker);

        // Add to map if instance is available
        if (mapInstanceRef.current) {
          marker.setMap(mapInstanceRef.current);
        }

        console.log('Created marker for:', location.id, location.title);
      } catch (error) {
        console.error('Failed to create marker for location:', location.id, error);
      }
    });
  };

  // Native implementation using Capacitor Google Maps
  const createNativeMarkers = async () => {
    if (!mapUtils.isNative()) return;

    try {
      // Import Capacitor Google Maps
      const { GoogleMap } = await import('@capacitor/google-maps');
      
      console.log('Native markers configuration:', locations);
      
      // TODO: Implement native marker creation
      
    } catch (error) {
      console.error('Failed to create native markers:', error);
    }
  };

  // Public methods for marker management
  const updateMarkerPosition = (locationId: string, newPosition: { latitude: number; longitude: number }) => {
    const marker = markersRef.current.get(locationId);
    if (marker) {
      marker.setPosition({
        lat: newPosition.latitude,
        lng: newPosition.longitude
      });
    }
  };

  const showMarkerInfoWindow = (locationId: string) => {
    const marker = markersRef.current.get(locationId);
    const infoWindow = infoWindowsRef.current.get(locationId);
    
    if (marker && infoWindow && mapInstanceRef.current) {
      // Close all other info windows
      infoWindowsRef.current.forEach(iw => iw.close());
      
      // Open this info window
      infoWindow.open(mapInstanceRef.current, marker);
    }
  };

  const hideAllInfoWindows = () => {
    infoWindowsRef.current.forEach(infoWindow => {
      infoWindow.close();
    });
  };

  // Method to set map instance (called by parent map component)
  const setMapInstance = (mapInstance: google.maps.Map) => {
    console.log('Setting map instance for markers');
    mapInstanceRef.current = mapInstance;
    
    // Add existing markers to the new map
    markersRef.current.forEach(marker => {
      marker.setMap(mapInstance);
    });
  };

  // FIXED: Use useImperativeHandle with ref parameter
  useImperativeHandle(ref, () => ({
    updateMarkerPosition,
    showMarkerInfoWindow,
    hideAllInfoWindows,
    setMapInstance
  }));

  // Update markers when locations change
  useEffect(() => {
    if (locations.length === 0) {
      console.log('No locations provided for markers');
      // Clear existing markers
      markersRef.current.forEach(marker => {
        marker.setMap(null);
      });
      markersRef.current.clear();
      return;
    }

    if (mapUtils.isWeb()) {
      createWebMarkers();
    } else {
      createNativeMarkers();
    }
  }, [locations, showInfoWindows]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      markersRef.current.forEach(marker => {
        marker.setMap(null);
      });
      markersRef.current.clear();
      
      infoWindowsRef.current.forEach(infoWindow => {
        infoWindow.close();
      });
      infoWindowsRef.current.clear();
    };
  }, []);

  // This component doesn't render anything visible itself
  // It manages Google Maps objects directly
  return null;
});

LocationMarkers.displayName = 'LocationMarkers';

// Hook to use with map instances and provide marker controls
export const useLocationMarkers = () => {
  const markersRef = useRef<Map<string, MarkerLocation>>(new Map());

  const addMarker = (location: MarkerLocation) => {
    markersRef.current.set(location.id, location);
  };

  const removeMarker = (locationId: string) => {
    markersRef.current.delete(locationId);
  };

  const updateMarker = (locationId: string, updates: Partial<MarkerLocation>) => {
    const existing = markersRef.current.get(locationId);
    if (existing) {
      markersRef.current.set(locationId, { ...existing, ...updates });
    }
  };

  const getAllMarkers = (): MarkerLocation[] => {
    return Array.from(markersRef.current.values());
  };

  const clearAllMarkers = () => {
    markersRef.current.clear();
  };

  return {
    addMarker,
    removeMarker,
    updateMarker,
    getAllMarkers,
    clearAllMarkers
  };
};

export default LocationMarkers;