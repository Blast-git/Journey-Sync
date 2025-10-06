// src/components/maps/shared/components/RoutePolylines.tsx
import React, {
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import { mapUtils } from "@/components/maps/core/mapUtils";
import type { RouteOption } from "@/types/mapTypes";

export interface RoutePolylinesProps {
  routes: RouteOption[];
  selectedRouteId: string | null;
  onRouteClick?: (routeId: string) => void;
  showTrafficLayer?: boolean;
  opacity?: number;
  strokeWidth?: number;
}

// FIXED: Add ref interface
export interface RoutePolylinesRef {
  setMapInstance: (mapInstance: google.maps.Map) => void;
}

interface RoutePolylineConfig {
  route: RouteOption;
  isSelected: boolean;
  color: string;
  weight: number;
  opacity: number;
  zIndex: number;
}

const getRouteColor = (routeType: string, isSelected: boolean): string => {
  const colors = {
    fastest: isSelected ? "#2563eb" : "#60a5fa",
    shortest: isSelected ? "#16a34a" : "#4ade80",
    scenic: isSelected ? "#9333ea" : "#c084fc",
    optimized: isSelected ? "#ea580c" : "#fb923c",
    default: isSelected ? "#374151" : "#9ca3af",
  };

  return colors[routeType as keyof typeof colors] || colors.default;
};

// FIXED: Use forwardRef
export const RoutePolylines = forwardRef<
  RoutePolylinesRef,
  RoutePolylinesProps
>(
  (
    {
      routes,
      selectedRouteId,
      onRouteClick,
      showTrafficLayer = false,
      opacity = 0.8,
      strokeWidth = 4,
    },
    ref
  ) => {
    const polylinesRef = useRef<Map<string, google.maps.Polyline>>(new Map());
    const trafficLayerRef = useRef<google.maps.TrafficLayer | null>(null);
    const mapInstanceRef = useRef<google.maps.Map | null>(null);

    // Method to set map instance (called by parent map component)
    const setMapInstance = (mapInstance: google.maps.Map) => {
      console.log("Setting map instance for polylines");
      mapInstanceRef.current = mapInstance;

      // Add existing polylines to the new map
      polylinesRef.current.forEach((polyline) => {
        polyline.setMap(mapInstance);
      });

      // Add traffic layer if enabled
      if (showTrafficLayer && trafficLayerRef.current) {
        trafficLayerRef.current.setMap(mapInstance);
      }
    };

    // FIXED: Use useImperativeHandle with ref parameter
    useImperativeHandle(ref, () => ({
      setMapInstance,
    }));

    // Initialize traffic layer
    useEffect(() => {
      if (
        showTrafficLayer &&
        mapUtils.isWeb() &&
        typeof google !== "undefined"
      ) {
        if (!trafficLayerRef.current) {
          trafficLayerRef.current = new google.maps.TrafficLayer();
        }

        if (mapInstanceRef.current) {
          trafficLayerRef.current.setMap(mapInstanceRef.current);
        }
      }

      return () => {
        if (trafficLayerRef.current) {
          trafficLayerRef.current.setMap(null);
        }
      };
    }, [showTrafficLayer]);

    // Create polyline configurations
    const polylineConfigs: RoutePolylineConfig[] = routes.map(
      (route, index) => {
        const isSelected = route.id === selectedRouteId;
        return {
          route,
          isSelected,
          color: getRouteColor(route.route_type, isSelected),
          weight: isSelected ? strokeWidth + 2 : strokeWidth,
          opacity: isSelected ? opacity : opacity * 0.6,
          zIndex: isSelected ? 1000 + index : 100 + index,
        };
      }
    );

    // Web implementation using Google Maps Polylines
    const createWebPolylines = () => {
      if (!mapUtils.isWeb() || typeof google === "undefined") {
        console.log("Google Maps not available - skipping polyline creation");
        return;
      }

      // Check if geometry library is loaded
      if (!google.maps.geometry || !google.maps.geometry.encoding) {
        console.warn(
          "Google Maps geometry library not loaded - cannot decode polylines"
        );
        return;
      }
      console.log("=== ROUTE DATA STRUCTURE DEBUG ===");
      console.log("Total routes:", routes.length);
      if (routes.length > 0) {
        console.log(
          "First route structure:",
          JSON.stringify(routes[0], null, 2)
        );
      }
      routes.forEach((route, index) => {
        console.log(`Route ${index} (${route.id}):`);
        console.log(`  - Keys:`, Object.keys(route));
        console.log(`  - Polyline value:`, JSON.stringify(route.polyline));
        console.log(`  - Polyline type:`, typeof route.polyline);
        console.log(
          `  - Polyline length:`,
          route.polyline ? route.polyline.length : "N/A"
        );
        console.log(`  - Geometry:`, route.geometry);
        console.log(`  - Full route object:`, JSON.stringify(route, null, 2));
      });
      console.log("=== END DEBUG ===");
      // Clear existing polylines
      polylinesRef.current.forEach((polyline) => {
        polyline.setMap(null);
      });
      polylinesRef.current.clear();

      console.log("Creating polylines for", polylineConfigs.length, "routes");

      polylineConfigs.forEach((config) => {
        if (!config.route.polyline || config.route.polyline.trim() === "") {
          console.warn("No polyline data for route:", config.route.id);
          return;
        }

        try {
          // Decode polyline
          const path = google.maps.geometry.encoding.decodePath(
            config.route.polyline
          );

          if (path.length === 0) {
            console.warn("Empty polyline path for route:", config.route.id);
            return;
          }

          // Create polyline
          const polyline = new google.maps.Polyline({
            path,
            geodesic: true,
            strokeColor: config.color,
            strokeOpacity: 1.0, // Increased opacity
            strokeWeight: config.weight,
            zIndex: config.zIndex + 1000, // Ensure polylines are above other elements
            clickable: !!onRouteClick,
          });

          // Add click handler
          if (onRouteClick) {
            polyline.addListener("click", () => {
              onRouteClick(config.route.id);
            });
          }

          // Store reference
          polylinesRef.current.set(config.route.id, polyline);

          // Add to map
          if (mapInstanceRef.current) {
            polyline.setMap(mapInstanceRef.current);
          }

          console.log(
            "Created polyline for route:",
            config.route.id,
            "with",
            path.length,
            "points"
          );
        } catch (error) {
          console.error(
            "Failed to create polyline for route:",
            config.route.id,
            error
          );
        }
      });
    };

    // Native implementation using Capacitor Google Maps
    const createNativePolylines = async () => {
      if (!mapUtils.isNative()) return;

      try {
        // Import Capacitor Google Maps
        const { GoogleMap } = await import("@capacitor/google-maps");

        console.log("Native polylines configuration:", polylineConfigs);

        // TODO: Implement native polyline creation
      } catch (error) {
        console.error("Failed to create native polylines:", error);
      }
    };

    // Update polylines when routes or selection changes
    useEffect(() => {
      if (routes.length === 0) {
        console.log("No routes provided for polylines");
        // Clear existing polylines
        polylinesRef.current.forEach((polyline) => {
          polyline.setMap(null);
        });
        polylinesRef.current.clear();
        return;
      }

      if (mapUtils.isWeb()) {
        createWebPolylines();
      } else {
        createNativePolylines();
      }
    }, [routes, selectedRouteId, opacity, strokeWidth]);

    // Cleanup on unmount
    useEffect(() => {
      return () => {
        polylinesRef.current.forEach((polyline) => {
          polyline.setMap(null);
        });
        polylinesRef.current.clear();

        if (trafficLayerRef.current) {
          trafficLayerRef.current.setMap(null);
        }
      };
    }, []);

    // This component doesn't render anything visible itself
    // It manages Google Maps objects directly
    return null;
  }
);

RoutePolylines.displayName = "RoutePolylines";

// Hook to use with map instances
export const useRoutePolylines = (mapInstance: google.maps.Map | null) => {
  const setMapInstance = (map: google.maps.Map | null) => {
    console.log("Map instance set for polylines:", map);
  };

  return { setMapInstance };
};

export default RoutePolylines;
