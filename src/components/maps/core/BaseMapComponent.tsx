import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Loader2, AlertTriangle, MapPin } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { MapPlatformDetector, type MapPlatform } from "./MapPlatformDetector";
import { DEFAULT_MAP_CONFIG } from "@/config/mapConfig";
import { validateCoordinates, type Coordinates, type Bounds } from "./mapUtils";

// ===== TYPE DEFINITIONS =====

export interface BaseMapProps {
  center?: Coordinates;
  zoom?: number;
  bounds?: Bounds;
  style?: any[];
  className?: string;
  height?: string | number;
  width?: string | number;
  onMapReady?: (mapInstance: MapInstance) => void;
  onMapClick?: (coordinates: Coordinates, event?: any) => void;
  onMapIdle?: (viewport: MapViewport) => void;
  onBoundsChanged?: (bounds: Bounds) => void;
  onZoomChanged?: (zoom: number) => void;
  onCenterChanged?: (center: Coordinates) => void;
  onError?: (error: MapError) => void;
  children?: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  gestureHandling?: "cooperative" | "greedy" | "none" | "auto";
  showDefaultUI?: boolean;
  enableLocationButton?: boolean;
  enableZoomControls?: boolean;
  restrictBounds?: boolean;
}

export interface MapViewport {
  center: Coordinates;
  zoom: number;
  bounds?: Bounds;
}

export interface MapInstance {
  // Common methods across platforms
  setCenter: (center: Coordinates) => void;
  setZoom: (zoom: number) => void;
  setBounds: (bounds: Bounds, padding?: number) => void;
  getCenter: () => Coordinates;
  getZoom: () => number;
  getBounds: () => Bounds;
  panTo: (coordinates: Coordinates) => void;
  fitBounds: (bounds: Bounds, padding?: number) => void;

  // Platform-specific instance (use with caution)
  nativeInstance: any;

  // Utility methods
  isReady: boolean;
  platform: MapPlatform;
}

export interface MapError {
  code:
    | "INITIALIZATION_FAILED"
    | "API_ERROR"
    | "PERMISSION_DENIED"
    | "NETWORK_ERROR"
    | "INVALID_CONFIG";
  message: string;
  details?: any;
  recoverable: boolean;
}

// ===== UTILITY FUNCTIONS =====

// Enhanced coordinate validation
const isValidCoordinate = (value: any): value is number => {
  return typeof value === "number" && isFinite(value) && !isNaN(value);
};

// Enhanced coordinates validation
const isValidCoordinates = (coords: any): coords is Coordinates => {
  return (
    coords &&
    typeof coords === "object" &&
    isValidCoordinate(coords.latitude) &&
    isValidCoordinate(coords.longitude) &&
    coords.latitude >= -90 &&
    coords.latitude <= 90 &&
    coords.longitude >= -180 &&
    coords.longitude <= 180
  );
};

// Convert from your Coordinates format to Google Maps LatLngLiteral
const toGoogleMapsLatLng = (
  coordinates: Coordinates
): google.maps.LatLngLiteral => {
  if (!isValidCoordinates(coordinates)) {
    throw new Error(`Invalid coordinates: ${JSON.stringify(coordinates)}`);
  }

  return {
    lat: coordinates.latitude,
    lng: coordinates.longitude,
  };
};

// Convert from Google Maps LatLng to your Coordinates format
const fromGoogleMapsLatLng = (
  latLng: google.maps.LatLng | google.maps.LatLngLiteral
): Coordinates => {
  const lat = typeof latLng.lat === "function" ? latLng.lat() : latLng.lat;
  const lng = typeof latLng.lng === "function" ? latLng.lng() : latLng.lng;

  if (!isValidCoordinate(lat) || !isValidCoordinate(lng)) {
    throw new Error(`Invalid LatLng from Google Maps: lat=${lat}, lng=${lng}`);
  }

  return {
    latitude: lat,
    longitude: lng,
  };
};

// Safe coordinate validation that falls back to your existing function
const safeValidateCoordinates = (coords: any): coords is Coordinates => {
  try {
    return isValidCoordinates(coords) || validateCoordinates(coords);
  } catch {
    return false;
  }
};

// ===== WEB MAP IMPLEMENTATION =====

const WebMapImplementation = forwardRef<
  MapInstance,
  BaseMapProps & { platform: MapPlatform }
>(
  (
    {
      platform,
      center,
      zoom,
      bounds,
      style,
      onMapReady,
      onMapClick,
      onMapIdle,
      onBoundsChanged,
      onZoomChanged,
      onCenterChanged,
      onError,
      children,
      gestureHandling,
      showDefaultUI,
      enableLocationButton,
      enableZoomControls,
      restrictBounds,
      ...props
    },
    ref
  ) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const [map, setMap] = useState<google.maps.Map | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const mapInstanceRef = useRef<MapInstance | null>(null);

    // Load Google Maps script
    useEffect(() => {
      if (typeof window !== "undefined" && !window.google) {
        const script = document.createElement("script");
        script.src = `https://maps.googleapis.com/maps/api/js?key=${platform.apiKey}&libraries=geometry`;
        script.async = true;
        script.defer = true;
        script.onload = () => setIsLoaded(true);
        script.onerror = () => {
          onError?.({
            code: "API_ERROR",
            message: "Failed to load Google Maps script",
            recoverable: true,
          });
        };
        document.head.appendChild(script);
      } else if (window.google) {
        setIsLoaded(true);
      }
    }, [platform.apiKey, onError]);

    // Initialize map
    useEffect(() => {
      if (!isLoaded || !mapRef.current || map) return;

      try {
        // Validate and convert center to Google Maps format
        let validCenter: Coordinates;

        if (center && safeValidateCoordinates(center)) {
          validCenter = center;
        } else if (
          DEFAULT_MAP_CONFIG.center &&
          safeValidateCoordinates(DEFAULT_MAP_CONFIG.center)
        ) {
          validCenter = DEFAULT_MAP_CONFIG.center;
        } else {
          // Fallback to a known valid center (San Francisco)
          validCenter = { latitude: 37.7749, longitude: -122.4194 };
          console.warn(
            "Invalid center coordinates provided, using fallback location"
          );
        }

        const googleMapsCenter = toGoogleMapsLatLng(validCenter);

        // Additional validation for Google Maps format
        if (
          typeof googleMapsCenter.lat !== "number" ||
          typeof googleMapsCenter.lng !== "number" ||
          !isFinite(googleMapsCenter.lat) ||
          !isFinite(googleMapsCenter.lng)
        ) {
          throw new Error(
            `Invalid coordinates after conversion: lat=${googleMapsCenter.lat}, lng=${googleMapsCenter.lng}`
          );
        }

        const mapOptions: google.maps.MapOptions = {
          center: googleMapsCenter,
          zoom: zoom || DEFAULT_MAP_CONFIG.zoom.CITY,
          styles: style || DEFAULT_MAP_CONFIG.style,
          gestureHandling:
            gestureHandling || platform.capabilities.gestureHandling,
          disableDefaultUI: !showDefaultUI,
          zoomControl: enableZoomControls ?? true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          restriction: restrictBounds
            ? {
                latLngBounds: {
                  north: DEFAULT_MAP_CONFIG.bounds.north,
                  south: DEFAULT_MAP_CONFIG.bounds.south,
                  east: DEFAULT_MAP_CONFIG.bounds.east,
                  west: DEFAULT_MAP_CONFIG.bounds.west,
                },
                strictBounds: false,
              }
            : undefined,
        };

        const googleMap = new google.maps.Map(mapRef.current, mapOptions);

        // Create map instance wrapper
        const instance: MapInstance = {
          setCenter: (newCenter: Coordinates) => {
            if (safeValidateCoordinates(newCenter)) {
              try {
                const googleMapsLatLng = toGoogleMapsLatLng(newCenter);
                googleMap.setCenter(googleMapsLatLng);
              } catch (error) {
                console.error("Error setting center:", error);
                onError?.({
                  code: "INVALID_CONFIG",
                  message: "Invalid coordinates provided to setCenter",
                  details: error,
                  recoverable: true,
                });
              }
            } else {
              console.error(
                "Invalid coordinates provided to setCenter:",
                newCenter
              );
            }
          },
          setZoom: (newZoom: number) => {
            googleMap.setZoom(Math.max(1, Math.min(20, newZoom)));
          },
          setBounds: (newBounds: Bounds, padding = 50) => {
            const bounds = new google.maps.LatLngBounds(
              { lat: newBounds.south, lng: newBounds.west },
              { lat: newBounds.north, lng: newBounds.east }
            );
            googleMap.fitBounds(bounds, padding);
          },
          getCenter: () => {
            const center = googleMap.getCenter();
            if (!center) {
              return DEFAULT_MAP_CONFIG.center;
            }
            return fromGoogleMapsLatLng(center);
          },
          getZoom: () => googleMap.getZoom() || 10,
          getBounds: () => {
            const bounds = googleMap.getBounds();
            if (!bounds) return DEFAULT_MAP_CONFIG.bounds;

            const ne = bounds.getNorthEast();
            const sw = bounds.getSouthWest();
            return {
              north: ne.lat(),
              south: sw.lat(),
              east: ne.lng(),
              west: sw.lng(),
            };
          },
          panTo: (coordinates: Coordinates) => {
            if (safeValidateCoordinates(coordinates)) {
              try {
                const googleMapsLatLng = toGoogleMapsLatLng(coordinates);
                googleMap.panTo(googleMapsLatLng);
              } catch (error) {
                console.error("Error panning to coordinates:", error);
              }
            } else {
              console.error(
                "Invalid coordinates provided to panTo:",
                coordinates
              );
            }
          },
          fitBounds: (newBounds: Bounds, padding = 50) => {
            const bounds = new google.maps.LatLngBounds(
              { lat: newBounds.south, lng: newBounds.west },
              { lat: newBounds.north, lng: newBounds.east }
            );
            googleMap.fitBounds(bounds, padding);
          },
          nativeInstance: googleMap,
          isReady: true,
          platform,
        };

        mapInstanceRef.current = instance;

        // Set up event listeners
        googleMap.addListener("click", (event: google.maps.MapMouseEvent) => {
          if (event.latLng) {
            const coordinates = fromGoogleMapsLatLng(event.latLng);
            onMapClick?.(coordinates, event);
          }
        });

        googleMap.addListener("idle", () => {
          const center = instance.getCenter();
          const zoom = instance.getZoom();
          const bounds = instance.getBounds();

          onMapIdle?.({ center, zoom, bounds });
        });

        googleMap.addListener("bounds_changed", () => {
          onBoundsChanged?.(instance.getBounds());
        });

        googleMap.addListener("zoom_changed", () => {
          onZoomChanged?.(instance.getZoom());
        });

        googleMap.addListener("center_changed", () => {
          onCenterChanged?.(instance.getCenter());
        });

        setMap(googleMap);
        onMapReady?.(instance);
      } catch (error) {
        console.error("Map initialization error:", error);
        onError?.({
          code: "INITIALIZATION_FAILED",
          message: "Failed to initialize Google Maps",
          details: error,
          recoverable: true,
        });
      }
    }, [
      isLoaded,
      mapRef.current,
      center,
      zoom,
      style,
      gestureHandling,
      showDefaultUI,
      enableZoomControls,
      restrictBounds,
    ]);

    // Update map when props change
    useEffect(() => {
      if (!map || !mapInstanceRef.current) return;

      if (center && safeValidateCoordinates(center)) {
        mapInstanceRef.current.setCenter(center);
      } else if (center) {
        console.error("Invalid center coordinates provided in props:", center);
      }
    }, [center, map]);

    useEffect(() => {
      if (!map || !mapInstanceRef.current || zoom === undefined) return;
      mapInstanceRef.current.setZoom(zoom);
    }, [zoom, map]);

    useEffect(() => {
      if (!map || !bounds) return;
      mapInstanceRef.current?.setBounds(bounds);
    }, [bounds, map]);

    // Expose map instance through ref
    useImperativeHandle(ref, () => mapInstanceRef.current!, [
      mapInstanceRef.current,
    ]);

    return (
      <div
        ref={mapRef}
        className={props.className}
        style={{
          height: props.height || "400px",
          width: props.width || "100%",
          ...(props.disabled && { pointerEvents: "none", opacity: 0.6 }),
        }}
      >
        {children}
      </div>
    );
  }
);

WebMapImplementation.displayName = "WebMapImplementation";

// ===== NATIVE MAP IMPLEMENTATION =====

const NativeMapImplementation = forwardRef<
  MapInstance,
  BaseMapProps & { platform: MapPlatform }
>(
  (
    {
      platform,
      center,
      zoom,
      bounds,
      onMapReady,
      onMapClick,
      onMapIdle,
      onError,
      children,
      ...props
    },
    ref
  ) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const [mapId, setMapId] = useState<string | null>(null);
    const mapInstanceRef = useRef<MapInstance | null>(null);

    useEffect(() => {
      const initializeNativeMap = async () => {
        try {
          if (!mapRef.current) return;

          // Import Capacitor Google Maps
          const { GoogleMap } = await import("@capacitor/google-maps");

          // Convert center coordinates to lat/lng format for native maps
          const mapCenter = center || DEFAULT_MAP_CONFIG.center;
          const nativeCenter = {
            lat: mapCenter.latitude,
            lng: mapCenter.longitude,
          };

          // Create map - native maps actually expect lat/lng format!
          const newMapId = `map_${Date.now()}`;
          const map = await GoogleMap.create({
            id: newMapId,
            element: mapRef.current,
            apiKey: platform.apiKey,
            config: {
              center: nativeCenter, // Use converted lat/lng format
              zoom: zoom || DEFAULT_MAP_CONFIG.zoom.CITY,
              androidLiteMode: false,
            },
          });

          // Create map instance wrapper
          const instance: MapInstance = {
            setCenter: async (newCenter: Coordinates) => {
              if (safeValidateCoordinates(newCenter)) {
                // Convert to lat/lng format for native maps
                await map.setCamera({
                  coordinate: {
                    lat: newCenter.latitude,
                    lng: newCenter.longitude,
                  },
                });
              }
            },
            setZoom: async (newZoom: number) => {
              await map.setCamera({ zoom: Math.max(1, Math.min(20, newZoom)) });
            },
            setBounds: async (newBounds: Bounds, padding = 50) => {
              // Convert bounds to lat/lng format for native map
              const coordinates = [
                { lat: newBounds.north, lng: newBounds.west },
                { lat: newBounds.south, lng: newBounds.east },
              ];
              await map.fitBounds({ coordinates, padding });
            },
            getCenter: () => {
              // Return in your latitude/longitude format
              return center || DEFAULT_MAP_CONFIG.center;
            },
            getZoom: () => {
              return zoom || DEFAULT_MAP_CONFIG.zoom.CITY;
            },
            getBounds: () => {
              return bounds || DEFAULT_MAP_CONFIG.bounds;
            },
            panTo: async (coordinates: Coordinates) => {
              if (safeValidateCoordinates(coordinates)) {
                await map.setCamera({
                  coordinate: {
                    lat: coordinates.latitude,
                    lng: coordinates.longitude,
                  },
                  animate: true,
                });
              }
            },
            fitBounds: async (newBounds: Bounds, padding = 50) => {
              const coordinates = [
                { lat: newBounds.north, lng: newBounds.west },
                { lat: newBounds.south, lng: newBounds.east },
              ];
              await map.fitBounds({ coordinates, padding });
            },
            nativeInstance: map,
            isReady: true,
            platform,
          };

          // Set up event listeners
          await map.setOnMapClickListener((event) => {
            // Native maps already use your coordinate format
            onMapClick?.(
              event.latitude && event.longitude
                ? {
                    latitude: event.latitude,
                    longitude: event.longitude,
                  }
                : center || DEFAULT_MAP_CONFIG.center
            );
          });

          await map.setOnCameraIdleListener(() => {
            // Note: Native maps have limited event data
            // Would need to track viewport state manually
            onMapIdle?.({
              center: center || DEFAULT_MAP_CONFIG.center,
              zoom: zoom || DEFAULT_MAP_CONFIG.zoom.CITY,
            });
          });

          mapInstanceRef.current = instance;
          setMapId(newMapId);
          onMapReady?.(instance);
        } catch (error) {
          onError?.({
            code: "INITIALIZATION_FAILED",
            message: "Failed to initialize native Google Maps",
            details: error,
            recoverable: true,
          });
        }
      };

      initializeNativeMap();

      // Cleanup
      return () => {
        if (mapId) {
          import("@capacitor/google-maps").then(({ GoogleMap }) => {
            GoogleMap.destroy(mapId);
          });
        }
      };
    }, []);

    // Expose map instance through ref
    useImperativeHandle(ref, () => mapInstanceRef.current!, [
      mapInstanceRef.current,
    ]);

    return (
      <div
        ref={mapRef}
        className={props.className}
        style={{
          height: props.height || "400px",
          width: props.width || "100%",
          ...(props.disabled && { pointerEvents: "none", opacity: 0.6 }),
        }}
      >
        {children}
      </div>
    );
  }
);

NativeMapImplementation.displayName = "NativeMapImplementation";

// ===== MAIN BASE MAP COMPONENT =====

export const BaseMapComponent = forwardRef<MapInstance, BaseMapProps>(
  (props, ref) => {
    const [error, setError] = useState<MapError | null>(null);

    const handleError = useCallback(
      (mapError: MapError) => {
        setError(mapError);
        props.onError?.(mapError);
      },
      [props.onError]
    );

    const handleRetry = useCallback(() => {
      setError(null);
      // Force re-render by updating key
      window.location.reload();
    }, []);

    if (error && !error.recoverable) {
      return (
        <div className="p-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">Map Error</p>
                <p className="text-sm">{error.message}</p>
                {error.recoverable && (
                  <Button size="sm" variant="outline" onClick={handleRetry}>
                    Try Again
                  </Button>
                )}
              </div>
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    if (props.loading) {
      return (
        <div
          className={`flex items-center justify-center ${props.className}`}
          style={{
            height: props.height || "400px",
            width: props.width || "100%",
          }}
        >
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="text-center">
              <p className="text-sm font-medium">Loading map...</p>
              <p className="text-xs text-muted-foreground">Please wait</p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <MapPlatformDetector onError={handleError}>
        {(platform) => {
          if (platform.isNative) {
            return (
              <NativeMapImplementation
                ref={ref}
                platform={platform}
                onError={handleError}
                {...props}
              />
            );
          } else {
            return (
              <WebMapImplementation
                ref={ref}
                platform={platform}
                onError={handleError}
                {...props}
              />
            );
          }
        }}
      </MapPlatformDetector>
    );
  }
);

BaseMapComponent.displayName = "BaseMapComponent";

// ===== EXPORT TYPES =====

export type { MapInstance, MapViewport, MapError };
