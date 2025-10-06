// Mobile-Optimized RouteVisualizationMap with Bottom Sheet Pattern

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { BaseMapComponent, type MapInstance } from '@/components/maps/core/BaseMapComponent';
import { useMap } from '@/components/maps/core/MapProvider';
import { useRouteOptions, useRouteSelection, useRideRoute } from '@/hooks/useRouteData';
import { RoutePolylines, type RoutePolylinesRef } from '@/components/maps/shared/components/RoutePolylines';
import { LocationMarkers, type LocationMarkersRef } from '@/components/maps/shared/components/LocationMarkers';
import { CustomMapControls } from '@/components/maps/shared/components/CustomMapControls';
import { mapUtils } from '@/components/maps/core/mapUtils';
import { googleMapsService } from '@/services/googleMapsService';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Route, MapPin, Clock, Fuel, IndianRupee, Check, AlertTriangle, RefreshCw, ChevronUp, ChevronDown, X } from 'lucide-react';
import type { RouteOption, Coordinates } from '@/types/mapTypes';

export interface RouteVisualizationMapProps {
  fromCity: string;
  toCity: string;
  rideId?: string;
  onRouteSelected?: (route: RouteOption) => void;
  onRouteSaved?: (routeId: string) => void;
  height?: string;
  className?: string;
  showRouteSelector?: boolean;
  showSaveButton?: boolean;
  defaultZoom?: number;
  departureTime?: Date;
  avoidTolls?: boolean;
  avoidHighways?: boolean;
}

export const RouteVisualizationMap: React.FC<RouteVisualizationMapProps> = ({
  fromCity,
  toCity,
  rideId,
  onRouteSelected,
  onRouteSaved,
  height = "100vh",
  className = "",
  showRouteSelector = true,
  showSaveButton = true,
  defaultZoom = 8,
  departureTime,
  avoidTolls = false,
  avoidHighways = false
}) => {
  const mapRef = useRef<MapInstance>(null);
  const markersRef = useRef<LocationMarkersRef>(null);
  const polylinesRef = useRef<RoutePolylinesRef>(null);

  const { state, actions } = useMap();
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [geocodingProgress, setGeocodingProgress] = useState<string>('');
  
  // Mobile bottom sheet state
  const [isBottomSheetExpanded, setIsBottomSheetExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Real Google Maps route fetching with proper error handling
  const {
    routes,
    isLoading: isLoadingRoutes,
    error: routeError,
    refreshRoutes
  } = useRouteOptions({
    fromCity,
    toCity,
    enabled: !!fromCity && !!toCity,
    maxRoutes: 3,
    avoidTolls,
    avoidHighways,
    departureTime
  });

  // Route selection state management
  const {
    routes: displayRoutes,
    selectedRoute,
    selectRoute,
    routeComparison
  } = useRouteSelection(routes);

  // Save route to ride functionality
  const {
    saveRoute,
    isSaving,
    saveError
  } = useRideRoute(rideId);

  // Real-time map bounds calculation based on actual route data
  const mapBounds = React.useMemo(() => {
    if (selectedRoute && selectedRoute.waypoints.length >= 2) {
      return mapUtils.boundsFromPoints(selectedRoute.waypoints);
    }

    // Fallback to city coordinates
    const cityCoords = mapUtils.getCityCoordinates(fromCity, toCity);
    if (cityCoords.origin && cityCoords.destination) {
      return mapUtils.boundsFromPoints([cityCoords.origin, cityCoords.destination]);
    }

    return null;
  }, [selectedRoute, fromCity, toCity]);

  // Smart map center calculation
  const mapCenter = React.useMemo(() => {
    if (selectedRoute && selectedRoute.waypoints.length > 0) {
      const waypoints = selectedRoute.waypoints;
      const centerLat = waypoints.reduce((sum, wp) => sum + wp.latitude, 0) / waypoints.length;
      const centerLng = waypoints.reduce((sum, wp) => sum + wp.longitude, 0) / waypoints.length;
      return { latitude: centerLat, longitude: centerLng };
    }

    if (mapBounds) {
      return {
        latitude: (mapBounds.north + mapBounds.south) / 2,
        longitude: (mapBounds.east + mapBounds.west) / 2
      };
    }

    return { latitude: 20.5937, longitude: 78.9629 };
  }, [selectedRoute, mapBounds]);

  // Real marker locations from Google Geocoding API
  const [cityLocations, setCityLocations] = useState<Array<{
    id: string;
    latitude: number;
    longitude: number;
    title: string;
    type: 'origin' | 'destination';
    description: string;
  }>>([]);

  // Geocode cities for accurate marker placement
  useEffect(() => {
    const geocodeCities = async () => {
      if (!fromCity || !toCity) return;

      setGeocodingProgress('Geocoding cities...');

      try {
        if (!googleMapsService.isReady()) {
          await googleMapsService.initialize();
        }

        const [originCoords, destinationCoords] = await Promise.all([
          googleMapsService.geocodeAddress(fromCity),
          googleMapsService.geocodeAddress(toCity)
        ]);

        setCityLocations([
          {
            id: 'origin',
            latitude: originCoords.latitude,
            longitude: originCoords.longitude,
            title: fromCity,
            type: 'origin',
            description: 'Starting city'
          },
          {
            id: 'destination',
            latitude: destinationCoords.latitude,
            longitude: destinationCoords.longitude,
            title: toCity,
            type: 'destination',
            description: 'Destination city'
          }
        ]);

        setGeocodingProgress('');
      } catch (error) {
        console.warn('Geocoding failed, using fallback coordinates:', error);
        setGeocodingProgress('Using approximate coordinates...');

        const cityCoords = mapUtils.getCityCoordinates(fromCity, toCity);
        const locations = [];

        if (cityCoords.origin) {
          locations.push({
            id: 'origin',
            latitude: cityCoords.origin.latitude,
            longitude: cityCoords.origin.longitude,
            title: fromCity,
            type: 'origin' as const,
            description: 'Starting city (approximate)'
          });
        }

        if (cityCoords.destination) {
          locations.push({
            id: 'destination',
            latitude: cityCoords.destination.latitude,
            longitude: cityCoords.destination.longitude,
            title: toCity,
            type: 'destination' as const,
            description: 'Destination city (approximate)'
          });
        }

        setCityLocations(locations);
        setTimeout(() => setGeocodingProgress(''), 2000);
      }
    };

    geocodeCities();
  }, [fromCity, toCity]);

  // Enhanced map ready handler
  const handleMapReady = useCallback((mapInstance: MapInstance) => {
    console.log('Route visualization map ready:', mapInstance.platform.type);
    actions.setMapInstance(mapInstance);
    setIsMapReady(true);
    setMapError(null);

    if (markersRef.current?.setMapInstance) {
      markersRef.current.setMapInstance(mapInstance.nativeInstance);
    }

    if (polylinesRef.current?.setMapInstance) {
      polylinesRef.current.setMapInstance(mapInstance.nativeInstance);
    }

    if (mapBounds) {
      setTimeout(() => {
        mapInstance.fitBounds!(mapBounds, 50);
      }, 500);
    }
  }, [actions, mapBounds]);

  const handleMapError = useCallback((error: any) => {
    console.error('Route visualization map error:', error);
    setMapError(error.message || 'Map initialization failed');
    setIsMapReady(false);
  }, []);

  const handleRouteSelect = useCallback((routeId: string) => {
    console.log('Selecting route:', routeId);
    
    const route = displayRoutes.find(r => r.id === routeId);
    if (!route) {
      console.error('Route not found:', routeId);
      return;
    }

    if (!route.polyline && mapUtils.isWeb()) {
      console.warn('Route missing polyline data');
    }

    selectRoute(routeId);
    
    // Auto-collapse bottom sheet on mobile after selection
    if (window.innerWidth < 1024) {
      setIsBottomSheetExpanded(false);
    }
    
    if (onRouteSelected) {
      onRouteSelected(route);
    }
  }, [selectRoute, displayRoutes, onRouteSelected]);

  const handleRouteSave = useCallback(async () => {
    if (!selectedRoute || !rideId) {
      console.error('Cannot save route: missing route or ride ID');
      return;
    }

    try {
      console.log('Saving route to database:', selectedRoute.id);
      
      const savedRoute = await saveRoute({
        rideId,
        route: selectedRoute,
        waypoints: selectedRoute.waypoints
      });

      console.log('Route saved successfully:', savedRoute.id);
      
      if (onRouteSaved) {
        onRouteSaved(savedRoute.id);
      }
    } catch (error) {
      console.error('Failed to save route:', error);
    }
  }, [selectedRoute, rideId, saveRoute, onRouteSaved]);

  const handleRefreshRoutes = useCallback(async () => {
    console.log('Refreshing routes...');
    setGeocodingProgress('Refreshing routes...');
    
    try {
      await refreshRoutes();
      setGeocodingProgress('');
    } catch (error) {
      console.error('Failed to refresh routes:', error);
      setGeocodingProgress('');
    }
  }, [refreshRoutes]);

  useEffect(() => {
    if (isMapReady && selectedRoute && mapRef.current?.fitBounds) {
      const waypoints = selectedRoute.waypoints;
      if (waypoints.length >= 2) {
        const routeBounds = mapUtils.boundsFromPoints(waypoints);
        if (routeBounds) {
          mapRef.current.fitBounds(routeBounds, 80);
        }
      }
    }
  }, [isMapReady, selectedRoute]);

  // Enhanced loading state
  if (isLoadingRoutes && displayRoutes.length === 0) {
    return (
      <div className={`flex ${className}`} style={{ height }}>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
            <div className="space-y-2">
              <p className="text-lg font-medium">Calculating real routes...</p>
              <p className="text-sm text-muted-foreground">
                Finding the best routes from {fromCity} to {toCity}
              </p>
              {geocodingProgress && (
                <p className="text-xs text-blue-600">{geocodingProgress}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Enhanced error state
  if (routeError && displayRoutes.length === 0) {
    return (
      <div className={`flex ${className}`} style={{ height }}>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4 max-w-md">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">Failed to calculate routes</p>
                  <p className="text-sm">{routeError.message}</p>
                  <p className="text-xs">Please check your internet connection and Google Maps API keys.</p>
                </div>
              </AlertDescription>
            </Alert>
            <Button onClick={handleRefreshRoutes} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} style={{ height }}>
      {/* Full Screen Map */}
      <div className="absolute inset-0">
        {/* Map Error Overlay */}
        {mapError && (
          <Alert className="absolute top-4 left-4 right-4 z-10" variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Map error: {mapError}
            </AlertDescription>
          </Alert>
        )}

        {/* Save Error */}
        {saveError && (
          <Alert className="absolute top-4 left-4 right-4 z-10" variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Failed to save route: {saveError.message}
            </AlertDescription>
          </Alert>
        )}

        {/* Geocoding Progress */}
        {geocodingProgress && (
          <div className="absolute top-4 left-4 right-4 z-10">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 text-blue-700">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">{geocodingProgress}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Map Controls */}
        <div className="absolute top-4 left-4 z-10">
          <CustomMapControls
            onZoomIn={() => mapRef.current?.setZoom?.(mapRef.current.getZoom() + 1)}
            onZoomOut={() => mapRef.current?.setZoom?.(mapRef.current.getZoom() - 1)}
            onCenter={() => {
              if (mapBounds && mapRef.current?.fitBounds) {
                mapRef.current.fitBounds(mapBounds, 50);
              }
            }}
            onRefresh={handleRefreshRoutes}
            isLoading={isLoadingRoutes}
            showLocationControl={true}
            showRefreshControl={true}
          />
        </div>

        {/* Main Map Component */}
        <BaseMapComponent
          ref={mapRef}
          center={mapCenter}
          zoom={defaultZoom}
          height="100%"
          onMapReady={handleMapReady}
          onMapError={handleMapError}
          enableLocationButton={false}
          enableZoomControls={false}
          className="rounded-lg"
        >
          <LocationMarkers
            ref={markersRef}
            locations={cityLocations}
            showInfoWindows={true}
          />

          <RoutePolylines
            ref={polylinesRef}
            routes={displayRoutes}
            selectedRouteId={selectedRoute?.id || null}
            onRouteClick={handleRouteSelect}
            showTrafficLayer={true}
          />
        </BaseMapComponent>

        {/* Loading Overlay for Route Updates */}
        {isLoadingRoutes && displayRoutes.length > 0 && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
            <Card className="p-3 lg:p-4 bg-white/95 backdrop-blur">
              <div className="flex items-center gap-3">
                <Loader2 className="h-4 w-4 lg:h-5 lg:w-5 animate-spin text-blue-600" />
                <span className="text-xs lg:text-sm font-medium">Updating routes with real data...</span>
              </div>
            </Card>
          </div>
        )}

        {/* API Status Indicator */}
        <div className="absolute bottom-4 right-4 z-10">
          <Badge 
            variant={googleMapsService.isReady() ? "default" : "destructive"}
            className="text-xs"
          >
            {googleMapsService.isReady() ? 'Google Maps API Ready' : 'API Not Ready'}
          </Badge>
        </div>
      </div>

      {/* Desktop Sidebar */}
      {showRouteSelector && displayRoutes.length > 0 && (
        <div className="hidden lg:block absolute top-0 left-0 w-80 h-full bg-white border-r border-gray-200 z-20">
          {/* Desktop content - same as before */}
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center gap-2 mb-3">
                <Route className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold">Route Options</h3>
              </div>
              
              <div className="text-xs text-green-600 mb-2">
                Using Google Maps API data
              </div>

              {routeComparison && (
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="text-center">
                    <div className="text-gray-500">Time Diff</div>
                    <div className="font-medium">{Math.round(routeComparison.timeDifference)}m</div>
                  </div>
                  <div className="text-center">
                    <div className="text-gray-500">Distance Diff</div>
                    <div className="font-medium">{routeComparison.distanceDifference.toFixed(1)} km</div>
                  </div>
                  <div className="text-center">
                    <div className="text-gray-500">Cost Diff</div>
                    <div className="font-medium">₹{Math.round(routeComparison.costDifference)}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              {displayRoutes.map((route) => {
                const isSelected = selectedRoute?.id === route.id;
                const isRecommended = routeComparison && (
                  route.id === routeComparison.fastest.id ||
                  route.id === routeComparison.shortest.id ||
                  route.id === routeComparison.cheapest.id
                );

                return (
                  <div
                    key={route.id}
                    className={`p-4 border-b border-gray-100 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-blue-50 border-l-4 border-l-blue-500'
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => handleRouteSelect(route.id)}
                  >
                    {/* Same route card content as before */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${
                          route.route_type === 'fastest' ? 'bg-blue-500' :
                          route.route_type === 'shortest' ? 'bg-green-500' :
                          'bg-purple-500'
                        }`} />
                        <span className="font-medium capitalize">{route.route_type}</span>
                        {isSelected && <Check className="h-4 w-4 text-blue-600" />}
                      </div>
                      
                      {isRecommended && (
                        <Badge variant="secondary" className="text-xs">
                          {routeComparison?.fastest.id === route.id && 'Fastest'}
                          {routeComparison?.shortest.id === route.id && 'Shortest'}
                          {routeComparison?.cheapest.id === route.id && 'Cheapest'}
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span>{Math.floor(route.duration_minutes / 60)}h {route.duration_minutes % 60}m</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <span>{route.distance_km.toFixed(1)} km</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-1">
                          <IndianRupee className="h-4 w-4 text-gray-400" />
                          <span>₹{route.toll_cost.toFixed(0)} tolls</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Fuel className="h-4 w-4 text-gray-400" />
                          <span>₹{route.fuel_cost.toFixed(0)} fuel</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <Badge
                          variant={
                            route.traffic_level === 'low' ? 'default' :
                            route.traffic_level === 'medium' ? 'secondary' : 'destructive'
                          }
                          className="text-xs"
                        >
                          {route.traffic_level} traffic
                        </Badge>
                        <div className="font-medium text-blue-600">
                          ₹{(route.toll_cost + route.fuel_cost).toFixed(0)} total
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        {route.polyline && (
                          <span className="flex items-center gap-1">
                            Real route data
                          </span>
                        )}
                        {route.waypoints.length > 2 && (
                          <span>{route.waypoints.length - 2} waypoints</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-4 border-t border-gray-200 space-y-2">
              {showSaveButton && rideId && selectedRoute && (
                <Button
                  onClick={handleRouteSave}
                  disabled={isSaving}
                  className="w-full"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving Route...
                    </>
                  ) : (
                    'Save Selected Route'
                  )}
                </Button>
              )}

              <Button
                variant="outline"
                onClick={handleRefreshRoutes}
                disabled={isLoadingRoutes}
                className="w-full"
              >
                {isLoadingRoutes ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Refreshing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Routes
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Sheet */}
      {showRouteSelector && displayRoutes.length > 0 && (
        <div className="lg:hidden">
          {/* Bottom Sheet */}
          <div
            className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-xl shadow-2xl z-30 transform transition-transform duration-300 ease-out ${
              isBottomSheetExpanded ? 'translate-y-0' : 'translate-y-[calc(100%-120px)]'
            }`}
            style={{
              height: '70vh',
              maxHeight: '70vh'
            }}
          >
            {/* Handle */}
            <div 
              className="flex justify-center py-3 cursor-pointer"
              onClick={() => setIsBottomSheetExpanded(!isBottomSheetExpanded)}
            >
              <div className="w-12 h-1 bg-gray-300 rounded-full" />
            </div>

            {/* Collapsed Header */}
            <div className="px-4 pb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Route className="h-4 w-4 text-blue-600" />
                  <h3 className="text-base font-semibold">Route Options</h3>
                  <Badge variant="secondary" className="text-xs">
                    {displayRoutes.length} routes
                  </Badge>
                </div>
                
                <button
                  onClick={() => setIsBottomSheetExpanded(!isBottomSheetExpanded)}
                  className="p-1"
                >
                  {isBottomSheetExpanded ? (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronUp className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>

              {/* Selected Route Preview (when collapsed) */}
              {!isBottomSheetExpanded && selectedRoute && (
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium capitalize">{selectedRoute.route_type}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span>{Math.floor(selectedRoute.duration_minutes / 60)}h {selectedRoute.duration_minutes % 60}m</span>
                    <span>{selectedRoute.distance_km.toFixed(1)} km</span>
                    <span className="font-medium">₹{(selectedRoute.toll_cost + selectedRoute.fuel_cost).toFixed(0)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Expanded Content */}
            {isBottomSheetExpanded && (
              <div className="flex-1 overflow-hidden flex flex-col">
                {/* Route Stats */}
                {routeComparison && (
                  <div className="px-4 pb-3 border-b border-gray-200">
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="text-center">
                        <div className="text-gray-500">Time Diff</div>
                        <div className="font-medium">{Math.round(routeComparison.timeDifference)}m</div>
                      </div>
                      <div className="text-center">
                        <div className="text-gray-500">Distance Diff</div>
                        <div className="font-medium">{routeComparison.distanceDifference.toFixed(1)} km</div>
                      </div>
                      <div className="text-center">
                        <div className="text-gray-500">Cost Diff</div>
                        <div className="font-medium">₹{Math.round(routeComparison.costDifference)}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Route Cards - Scrollable */}
                <div className="flex-1 overflow-y-auto px-4 space-y-3 py-3">
                  {displayRoutes.map((route) => {
                    const isSelected = selectedRoute?.id === route.id;
                    const isRecommended = routeComparison && (
                      route.id === routeComparison.fastest.id ||
                      route.id === routeComparison.shortest.id ||
                      route.id === routeComparison.cheapest.id
                    );

                    return (
                      <div
                        key={route.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-blue-50 border-blue-200'
                            : 'hover:bg-gray-50 border-gray-200'
                        }`}
                        onClick={() => handleRouteSelect(route.id)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${
                              route.route_type === 'fastest' ? 'bg-blue-500' :
                              route.route_type === 'shortest' ? 'bg-green-500' :
                              'bg-purple-500'
                            }`} />
                            <span className="font-medium capitalize text-sm">{route.route_type}</span>
                            {isSelected && <Check className="h-4 w-4 text-blue-600" />}
                          </div>
                          
                          {isRecommended && (
                            <Badge variant="secondary" className="text-xs">
                              {routeComparison?.fastest.id === route.id && 'Fastest'}
                              {routeComparison?.shortest.id === route.id && 'Shortest'}
                              {routeComparison?.cheapest.id === route.id && 'Cheapest'}
                            </Badge>
                          )}
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-gray-400" />
                              <span>{Math.floor(route.duration_minutes / 60)}h {route.duration_minutes % 60}m</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-gray-400" />
                              <span>{route.distance_km.toFixed(1)} km</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-1">
                              <IndianRupee className="h-3 w-3 text-gray-400" />
                              <span>₹{route.toll_cost.toFixed(0)} tolls</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Fuel className="h-3 w-3 text-gray-400" />
                              <span>₹{route.fuel_cost.toFixed(0)} fuel</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <Badge
                              variant={
                                route.traffic_level === 'low' ? 'default' :
                                route.traffic_level === 'medium' ? 'secondary' : 'destructive'
                              }
                              className="text-xs"
                            >
                              {route.traffic_level} traffic
                            </Badge>
                            <div className="font-medium text-blue-600 text-sm">
                              ₹{(route.toll_cost + route.fuel_cost).toFixed(0)} total
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            {route.polyline && (
                              <span className="flex items-center gap-1">
                                Real route data
                              </span>
                            )}
                            {route.waypoints.length > 2 && (
                              <span>{route.waypoints.length - 2} waypoints</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Action Buttons */}
                <div className="px-4 py-3 border-t border-gray-200 space-y-2">
                  {showSaveButton && rideId && selectedRoute && (
                    <Button
                      onClick={handleRouteSave}
                      disabled={isSaving}
                      className="w-full"
                      size="sm"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving Route...
                        </>
                      ) : (
                        'Save Selected Route'
                      )}
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    onClick={handleRefreshRoutes}
                    disabled={isLoadingRoutes}
                    className="w-full"
                    size="sm"
                  >
                    {isLoadingRoutes ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Refreshing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh Routes
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Overlay for expanded state */}
          {isBottomSheetExpanded && (
            <div 
              className="absolute inset-0 bg-black/20 z-20"
              onClick={() => setIsBottomSheetExpanded(false)}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default RouteVisualizationMap;