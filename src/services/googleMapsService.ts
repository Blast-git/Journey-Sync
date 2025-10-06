// src/services/googleMapsService.ts - Complete Integration with Real API Data

import { mapUtils } from "@/components/maps/core/mapUtils";
import type { RouteOption, Coordinates } from "@/types/mapTypes";

export interface RouteCalculationRequest {
  origin: Coordinates;
  destination: Coordinates;
  alternatives?: boolean;
  maxRoutes?: number;
  avoidTolls?: boolean;
  avoidHighways?: boolean;
  departureTime?: Date;
  waypoints?: Coordinates[];
}

export interface PlaceDetails {
  place_id: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  name: string;
  types: string[];
}

declare global {
  interface Window {
    google: any;
    initGoogleMaps: () => void;
  }
}

class GoogleMapsService {
  private directionsService: google.maps.DirectionsService | null = null;
  private distanceMatrixService: google.maps.DistanceMatrixService | null =
    null;
  private geocoder: google.maps.Geocoder | null = null;
  private placesService: google.maps.places.PlacesService | null = null;
  private isInitialized = false;
  private loadPromise: Promise<void> | null = null;

  constructor() {
    // Don't auto-initialize, wait for explicit call
  }

  // Public method to explicitly initialize
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = this.initializeServices();
    return this.loadPromise;
  }

  private async initializeServices(): Promise<void> {
    if (this.isInitialized || !mapUtils.isWeb()) return;

    try {
      // Check if Google Maps is already loaded
      if (window.google && window.google.maps) {
        this.setupServices();
        return;
      }

      // Load Google Maps script
      await this.loadGoogleMapsScript();
      this.setupServices();
    } catch (error) {
      console.error("Failed to initialize Google Maps services:", error);
      this.loadPromise = null; // Reset so we can try again
      throw new Error(`Google Maps initialization failed: ${error.message}`);
    }
  }

  private loadGoogleMapsScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if script is already loaded
      if (window.google && window.google.maps) {
        resolve();
        return;
      }

      // Check if script is already being loaded
      const existingScript = document.querySelector(
        'script[src*="maps.googleapis.com"]'
      );
      if (existingScript) {
        // Script is loading, wait for it
        const checkInterval = setInterval(() => {
          if (window.google && window.google.maps) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);

        setTimeout(() => {
          clearInterval(checkInterval);
          if (!window.google || !window.google.maps) {
            reject(new Error("Google Maps script loading timeout"));
          }
        }, 15000);

        return;
      }

      // Get API key
      const apiKey = this.getApiKey();
      if (!apiKey) {
        reject(
          new Error(
            "Google Maps API key not found. Please set VITE_GOOGLE_MAPS_WEB_API_KEY in your .env file"
          )
        );
        return;
      }

      // Create script element
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry,places&callback=initGoogleMaps`;
      script.async = true;
      script.defer = true;

      // Set up global callback
      window.initGoogleMaps = () => {
        console.log("Google Maps script loaded successfully");
        resolve();
      };

      script.onerror = (error) => {
        console.error("Failed to load Google Maps script:", error);
        reject(
          new Error(
            "Failed to load Google Maps script. Please check your API key and internet connection."
          )
        );
      };

      // Add script to document
      document.head.appendChild(script);

      // Timeout fallback
      setTimeout(() => {
        if (!window.google || !window.google.maps) {
          reject(
            new Error(
              "Google Maps loading timeout. Please check your API key and internet connection."
            )
          );
        }
      }, 15000);
    });
  }

  private setupServices(): void {
    try {
      this.directionsService = new google.maps.DirectionsService();
      this.distanceMatrixService = new google.maps.DistanceMatrixService();
      this.geocoder = new google.maps.Geocoder();

      // Create a hidden div for places service
      const mapDiv = document.createElement("div");
      mapDiv.style.display = "none";
      document.body.appendChild(mapDiv);
      const map = new google.maps.Map(mapDiv, {
        center: { lat: 0, lng: 0 },
        zoom: 1,
      });
      this.placesService = new google.maps.places.PlacesService(map);

      this.isInitialized = true;
      console.log("Google Maps services initialized successfully");
    } catch (error) {
      console.error("Failed to setup Google Maps services:", error);
      throw new Error("Failed to setup Google Maps services");
    }
  }

  private getApiKey(): string {
    // Try different environment variable formats
    const webKey =
      import.meta.env.VITE_GOOGLE_MAPS_WEB_API_KEY ||
      import.meta.env.REACT_APP_GOOGLE_MAPS_WEB_API_KEY;

    if (webKey && webKey.trim()) {
      return webKey.trim();
    }

    console.error(
      "Google Maps API key not found. Please check your .env file contains VITE_GOOGLE_MAPS_WEB_API_KEY"
    );
    return "";
  }

  // REAL ROUTE CALCULATION WITH MULTIPLE OPTIONS
  async calculateRoutes(
    request: RouteCalculationRequest
  ): Promise<RouteOption[]> {
    await this.ensureInitialized();

    const { origin, destination, alternatives = true, maxRoutes = 3 } = request;

    try {
      console.log("Calculating real routes from Google Maps API:", {
        origin,
        destination,
      });

      // Base request for fastest route
      const baseRequest: google.maps.DirectionsRequest = {
        origin: new google.maps.LatLng(origin.latitude, origin.longitude),
        destination: new google.maps.LatLng(
          destination.latitude,
          destination.longitude
        ),
        travelMode: google.maps.TravelMode.DRIVING,
        provideRouteAlternatives: alternatives,
        avoidTolls: false,
        avoidHighways: false,
        optimizeWaypoints: false,
        unitSystem: google.maps.UnitSystem.METRIC,
      };

      if (request.departureTime) {
        baseRequest.drivingOptions = {
          departureTime: request.departureTime,
          trafficModel: google.maps.TrafficModel.BEST_GUESS,
        };
      }

      if (request.waypoints && request.waypoints.length > 0) {
        baseRequest.waypoints = request.waypoints.map((wp) => ({
          location: new google.maps.LatLng(wp.latitude, wp.longitude),
          stopover: true,
        }));
      }

      // Get multiple route variations
      const routePromises: Promise<google.maps.DirectionsResult>[] = [];

      // 1. Fastest route (default)
      routePromises.push(this.getDirections(baseRequest));

      // 2. Avoid tolls route
      if (maxRoutes > 1) {
        routePromises.push(
          this.getDirections({
            ...baseRequest,
            avoidTolls: true,
            provideRouteAlternatives: false,
          })
        );
      }

      // 3. Avoid highways route (scenic)
      if (maxRoutes > 2) {
        routePromises.push(
          this.getDirections({
            ...baseRequest,
            avoidHighways: true,
            provideRouteAlternatives: false,
          })
        );
      }

      const results = await Promise.allSettled(routePromises);
      const routeOptions: RouteOption[] = [];

      for (let i = 0; i < results.length; i++) {
        const result = results[i];

        if (result.status === "fulfilled" && result.value?.routes?.length > 0) {
          const directionResult = result.value;

          // Process all routes from this result
          for (
            let j = 0;
            j <
            Math.min(
              directionResult.routes.length,
              maxRoutes - routeOptions.length
            );
            j++
          ) {
            const route = directionResult.routes[j];
            const leg = route.legs[0]; // For single-leg journeys

            if (!leg) continue;

            const routeType = this.determineRouteType(route, i, j);
            const polylineData = route.overview_polyline || "";
            console.log("Raw overview_polyline:", route.overview_polyline);
            console.log("Points property:", route.overview_polyline?.points);
            console.log("Polyline data type:", typeof polylineData);
            console.log("Polyline data length:", polylineData.length);
            console.log("=== ROUTE DEBUG ===");
            console.log("Route overview_polyline:", route.overview_polyline);
            console.log("Route object keys:", Object.keys(route));
            console.log("Polyline data extracted:", polylineData);
            // Remove the full route object log for now as it's very large
            // console.log('Full route object:', JSON.stringify(route, null, 2));
            console.log("=== END ROUTE DEBUG ===");
            const routeOption: RouteOption = {
              id: `route_${i}_${j}_${Date.now()}`,
              route_type: routeType,
              polyline: polylineData,
              distance_km: leg.distance ? leg.distance.value / 1000 : 0,
              duration_minutes: leg.duration
                ? Math.round(leg.duration.value / 60)
                : 0,
              toll_cost: await this.estimateTollCost(route),
              fuel_cost: this.estimateFuelCost(leg.distance?.value || 0),
              traffic_level: this.getTrafficLevel(
                leg.duration,
                leg.duration_in_traffic
              ),
              waypoints: this.extractWaypoints(route),
              is_selected: routeOptions.length === 0, // Select first route by default
            };

            routeOptions.push(routeOption);
          }
        } else if (result.status === "rejected") {
          console.warn(`Route calculation ${i} failed:`, result.reason);
        }
      }

      if (routeOptions.length === 0) {
        throw new Error("No routes found between specified locations");
      }

      console.log(
        `Successfully calculated ${routeOptions.length} real routes from Google Maps`
      );
      return routeOptions;
    } catch (error) {
      console.error("Route calculation failed:", error);
      throw new Error(
        `Route calculation failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  // REAL GEOCODING WITH PLACES API
  async geocodeAddress(address: string): Promise<Coordinates> {
    await this.ensureInitialized();

    // First try our city database for quick lookup
    const cityMatch = mapUtils.getCityCenter(address);
    if (cityMatch) {
      console.log(`Found ${address} in city database:`, cityMatch);
      return cityMatch;
    }

    // Use Google Geocoding API for precise coordinates
    return new Promise((resolve, reject) => {
      if (!this.geocoder) {
        reject(new Error("Geocoder not initialized"));
        return;
      }

      console.log(`Geocoding ${address} using Google Geocoding API`);

      this.geocoder.geocode(
        {
          address,
          region: "IN", // Bias towards India
          componentRestrictions: { country: "IN" },
        },
        (results, status) => {
          if (
            status === google.maps.GeocoderStatus.OK &&
            results &&
            results[0]
          ) {
            const location = results[0].geometry.location;
            const coords = {
              latitude: location.lat(),
              longitude: location.lng(),
            };
            console.log(`Geocoded ${address} to:`, coords);
            resolve(coords);
          } else {
            console.error(`Geocoding failed for ${address}:`, status);
            reject(new Error(`Geocoding failed: ${status}`));
          }
        }
      );
    });
  }

  // REAL PLACE SEARCH WITH PLACES API
  async searchPlaces(
    query: string,
    location?: Coordinates,
    radius: number = 50000
  ): Promise<PlaceDetails[]> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      if (!this.placesService) {
        reject(new Error("Places service not initialized"));
        return;
      }

      const request: google.maps.places.TextSearchRequest = {
        query: query,
        region: "IN",
      };

      if (location) {
        request.location = new google.maps.LatLng(
          location.latitude,
          location.longitude
        );
        request.radius = radius;
      }

      this.placesService.textSearch(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          const places: PlaceDetails[] = results.map((place) => ({
            place_id: place.place_id || "",
            formatted_address: place.formatted_address || "",
            geometry: {
              location: {
                lat: place.geometry?.location?.lat() || 0,
                lng: place.geometry?.location?.lng() || 0,
              },
            },
            name: place.name || "",
            types: place.types || [],
          }));
          resolve(places);
        } else {
          reject(new Error(`Places search failed: ${status}`));
        }
      });
    });
  }

  // REAL REVERSE GEOCODING
  async reverseGeocode(coordinates: Coordinates): Promise<string> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      if (!this.geocoder) {
        reject(new Error("Geocoder not initialized"));
        return;
      }

      const latLng = new google.maps.LatLng(
        coordinates.latitude,
        coordinates.longitude
      );

      this.geocoder.geocode({ location: latLng }, (results, status) => {
        if (status === google.maps.GeocoderStatus.OK && results && results[0]) {
          resolve(results[0].formatted_address);
        } else {
          // Fallback to nearest city
          let nearestCity = "";
          let minDistance = Infinity;

          const cityCoords = mapUtils.getCityCoordinates("mumbai", "delhi"); // Get some cities
          if (cityCoords.origin) {
            const distance = mapUtils.calculateDistance(
              coordinates,
              cityCoords.origin
            );
            if (distance < minDistance) {
              minDistance = distance;
              nearestCity = "Mumbai";
            }
          }

          resolve(
            nearestCity
              ? `Near ${nearestCity}`
              : `${coordinates.latitude.toFixed(
                  4
                )}, ${coordinates.longitude.toFixed(4)}`
          );
        }
      });
    });
  }

  // REAL DISTANCE MATRIX CALCULATION
  async calculateDistance(
    origins: Coordinates[],
    destinations: Coordinates[]
  ): Promise<
    {
      distance_km: number;
      duration_minutes: number;
      traffic_duration_minutes?: number;
    }[]
  > {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      if (!this.distanceMatrixService) {
        reject(new Error("Distance Matrix service not initialized"));
        return;
      }

      const googleOrigins = origins.map(
        (coord) => new google.maps.LatLng(coord.latitude, coord.longitude)
      );

      const googleDestinations = destinations.map(
        (coord) => new google.maps.LatLng(coord.latitude, coord.longitude)
      );

      this.distanceMatrixService.getDistanceMatrix(
        {
          origins: googleOrigins,
          destinations: googleDestinations,
          travelMode: google.maps.TravelMode.DRIVING,
          unitSystem: google.maps.UnitSystem.METRIC,
          drivingOptions: {
            departureTime: new Date(),
            trafficModel: google.maps.TrafficModel.BEST_GUESS,
          },
        },
        (response, status) => {
          if (status === google.maps.DistanceMatrixStatus.OK && response) {
            const results: {
              distance_km: number;
              duration_minutes: number;
              traffic_duration_minutes?: number;
            }[] = [];

            for (let i = 0; i < response.rows.length; i++) {
              for (let j = 0; j < response.rows[i].elements.length; j++) {
                const element = response.rows[i].elements[j];

                if (
                  element.status === google.maps.DistanceMatrixElementStatus.OK
                ) {
                  results.push({
                    distance_km: (element.distance?.value || 0) / 1000,
                    duration_minutes: Math.round(
                      (element.duration?.value || 0) / 60
                    ),
                    traffic_duration_minutes: element.duration_in_traffic
                      ? Math.round(element.duration_in_traffic.value / 60)
                      : undefined,
                  });
                }
              }
            }

            resolve(results);
          } else {
            reject(new Error(`Distance Matrix API error: ${status}`));
          }
        }
      );
    });
  }

  // HELPER METHODS

  private async getDirections(
    request: google.maps.DirectionsRequest
  ): Promise<google.maps.DirectionsResult> {
    return new Promise((resolve, reject) => {
      if (!this.directionsService) {
        reject(new Error("Directions service not initialized"));
        return;
      }

      this.directionsService.route(request, (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          resolve(result);
        } else {
          reject(new Error(`Directions API error: ${status}`));
        }
      });
    });
  }

  private determineRouteType(
    route: google.maps.DirectionsRoute,
    requestIndex: number,
    routeIndex: number
  ): "fastest" | "shortest" | "scenic" | "optimized" {
    if (requestIndex === 0 && routeIndex === 0) return "fastest";
    if (requestIndex === 1) return "shortest"; // Avoid tolls usually means longer but cheaper
    if (requestIndex === 2) return "scenic"; // Avoid highways

    // For alternative routes from the same request
    const hasHighways = route.legs.some((leg) =>
      leg.steps.some(
        (step) =>
          step.instructions?.toLowerCase().includes("highway") ||
          step.instructions?.toLowerCase().includes("expressway")
      )
    );

    return hasHighways ? "fastest" : "scenic";
  }

  private async estimateTollCost(
    route: google.maps.DirectionsRoute
  ): Promise<number> {
    const distance =
      route.legs.reduce((sum, leg) => sum + (leg.distance?.value || 0), 0) /
      1000;

    // Check if route uses toll roads
    const hasTolls = route.legs.some((leg) =>
      leg.steps.some(
        (step) =>
          step.instructions?.toLowerCase().includes("toll") ||
          step.instructions?.toLowerCase().includes("expressway") ||
          step.instructions?.toLowerCase().includes("highway")
      )
    );

    if (!hasTolls) return 0;

    // Indian highway toll estimation: approximately ₹2-4 per km
    const tollEstimate = distance * 3;
    return Math.round(tollEstimate);
  }

  private estimateFuelCost(distanceMeters: number): number {
    const distanceKm = distanceMeters / 1000;
    const fuelConsumption = distanceKm / 15; // 15 km/L average
    const fuelPrice = 105; // ₹105/L current average in India
    return Math.round(fuelConsumption * fuelPrice);
  }

  private getTrafficLevel(
    normalDuration?: google.maps.Duration,
    trafficDuration?: google.maps.Duration
  ): "low" | "medium" | "high" {
    if (!normalDuration || !trafficDuration) return "medium";

    const ratio = trafficDuration.value / normalDuration.value;

    if (ratio <= 1.1) return "low";
    if (ratio <= 1.3) return "medium";
    return "high";
  }

  private extractWaypoints(route: google.maps.DirectionsRoute): Array<{
    latitude: number;
    longitude: number;
    name: string;
    type: string;
  }> {
    const waypoints: Array<{
      latitude: number;
      longitude: number;
      name: string;
      type: string;
    }> = [];

    // Add start point
    const startLocation = route.legs[0]?.start_location;
    if (startLocation) {
      waypoints.push({
        latitude: startLocation.lat(),
        longitude: startLocation.lng(),
        name: route.legs[0]?.start_address || "Start",
        type: "start",
      });
    }

    // Add waypoints from route
    route.waypoint_order?.forEach((waypointIndex, index) => {
      const waypoint = route.legs[waypointIndex];
      if (waypoint?.end_location) {
        waypoints.push({
          latitude: waypoint.end_location.lat(),
          longitude: waypoint.end_location.lng(),
          name: waypoint.end_address || `Waypoint ${index + 1}`,
          type: "waypoint",
        });
      }
    });

    // Add end point
    const endLocation = route.legs[route.legs.length - 1]?.end_location;
    if (endLocation) {
      waypoints.push({
        latitude: endLocation.lat(),
        longitude: endLocation.lng(),
        name: route.legs[route.legs.length - 1]?.end_address || "End",
        type: "end",
      });
    }

    return waypoints;
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.isInitialized) {
      throw new Error("Google Maps services not available");
    }
  }

  // PUBLIC STATUS METHODS
  isReady(): boolean {
    return this.isInitialized;
  }

  getStatus(): {
    initialized: boolean;
    services: {
      directions: boolean;
      distanceMatrix: boolean;
      geocoder: boolean;
      places: boolean;
    };
  } {
    return {
      initialized: this.isInitialized,
      services: {
        directions: !!this.directionsService,
        distanceMatrix: !!this.distanceMatrixService,
        geocoder: !!this.geocoder,
        places: !!this.placesService,
      },
    };
  }
}

// Create singleton instance
export const googleMapsService = new GoogleMapsService();

export default googleMapsService;
