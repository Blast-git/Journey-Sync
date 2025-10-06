// ===========================================
// Updated: src/components/maps/driver/PostRide/PickupDropPointMap.tsx
// Route corridor zone visualization component
// ===========================================

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { BaseMapComponent, type MapInstance } from '@/components/maps/core/BaseMapComponent';
import { ZoneOverlay } from '@/components/maps/shared/components/ZoneOverlay';
import { useRideZones } from '@/hooks/useZoneData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  MapPin, 
  CheckCircle, 
  AlertTriangle, 
  Navigation,
  Loader2,
  Eye,
  Route,
  Clock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

// Define RouteOption interface locally if not available
interface RouteOption {
  id: string;
  route_type: string;
  distance_km: number;
  duration_minutes: number;
  toll_cost: number;
  fuel_cost: number;
  polyline?: string;
}

interface ZoneInfo {
  id: string;
  zone_name: string;
  description?: string;
  landmarks: string[];
  center_latitude: number;
  center_longitude: number;
  radius_meters: number;
}

export interface PickupDropPointsMapProps {
  fromCity: string;
  toCity: string;
  selectedPickupZoneIds: string[];
  selectedDropoffZoneIds: string[];
  selectedRoute?: RouteOption;
  onContinue?: () => void;
  height?: string;
  className?: string;
  readOnly?: boolean;
}

export const PickupDropPointsMap: React.FC<PickupDropPointsMapProps> = ({
  fromCity,
  toCity,
  selectedPickupZoneIds,
  selectedDropoffZoneIds,
  selectedRoute,
  onContinue,
  height = "100vh",
  className = "",
  readOnly = true
}) => {
  const mapRef = useRef<MapInstance>(null);
  const [currentView, setCurrentView] = useState<'overview' | 'pickup' | 'dropoff'>('overview');
  const [isMapReady, setIsMapReady] = useState(false);
  const [pickupZones, setPickupZones] = useState<ZoneInfo[]>([]);
  const [dropoffZones, setDropoffZones] = useState<ZoneInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load zone details from database
  const loadZoneDetails = useCallback(async () => {
    if (selectedPickupZoneIds.length === 0 && selectedDropoffZoneIds.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      // Load pickup zones
      if (selectedPickupZoneIds.length > 0) {
        const { data: pickupData, error: pickupError } = await supabase
          .from('city_zones')
          .select('*')
          .in('id', selectedPickupZoneIds)
          .eq('is_active', true);

        if (pickupError) throw pickupError;
        setPickupZones(pickupData || []);
      }

      // Load dropoff zones
      if (selectedDropoffZoneIds.length > 0) {
        const { data: dropoffData, error: dropoffError } = await supabase
          .from('city_zones')
          .select('*')
          .in('id', selectedDropoffZoneIds)
          .eq('is_active', true);

        if (dropoffError) throw dropoffError;
        setDropoffZones(dropoffData || []);
      }
    } catch (err) {
      console.error('Failed to load zone details:', err);
      setError('Failed to load zone information');
    } finally {
      setIsLoading(false);
    }
  }, [selectedPickupZoneIds, selectedDropoffZoneIds]);

  useEffect(() => {
    loadZoneDetails();
  }, [loadZoneDetails]);

  // Get current zones based on view
  const getCurrentZones = () => {
    switch (currentView) {
      case 'pickup':
        return pickupZones;
      case 'dropoff':
        return dropoffZones;
      case 'overview':
      default:
        return [...pickupZones, ...dropoffZones];
    }
  };

  const currentZones = getCurrentZones();

  // Calculate map center based on current view
  const mapCenter = React.useMemo(() => {
    if (currentZones.length > 0) {
      const avgLat = currentZones.reduce((sum, zone) => sum + zone.center_latitude, 0) / currentZones.length;
      const avgLng = currentZones.reduce((sum, zone) => sum + zone.center_longitude, 0) / currentZones.length;
      return { latitude: avgLat, longitude: avgLng };
    }
    
    // Default center for Indian cities
    return { latitude: 20.5937, longitude: 78.9629 };
  }, [currentZones]);

  const handleMapReady = useCallback((mapInstance: MapInstance) => {
    console.log('PickupDropPointsMap visualization ready');
    setIsMapReady(true);
    
    // Auto-fit to show all relevant zones and route
    if (currentZones.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      
      // Add zone centers to bounds
      currentZones.forEach(zone => {
        bounds.extend({
          lat: zone.center_latitude,
          lng: zone.center_longitude
        });
      });
      
      // Add route waypoints to bounds if available
      if (selectedRoute && currentView === 'overview') {
        // You can decode route polyline and add waypoints to bounds
        // This ensures the full route context is visible
      }
      
      setTimeout(() => {
        mapInstance.nativeInstance.fitBounds(bounds, 80);
      }, 500);
    }
  }, [currentZones, selectedRoute, currentView]);

  const handleViewChange = useCallback((view: 'overview' | 'pickup' | 'dropoff') => {
    setCurrentView(view);
  }, []);

  const hasSelectedZones = pickupZones.length > 0 && dropoffZones.length > 0;

  return (
    <div className={`flex flex-col ${className}`} style={{ height }}>
      {/* Header Section - Always visible on top */}
      <div className="bg-white border-b border-gray-200 p-4 flex-shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-green-600" />
            <div>
              <h3 className="text-lg font-semibold">Route Corridor Review</h3>
              <p className="text-sm text-gray-600">
                {pickupZones.length} pickup + {dropoffZones.length} dropoff zones selected
              </p>
            </div>
          </div>

          {/* View Toggle - Horizontal on mobile, compact */}
          <div className="flex bg-gray-100 rounded-lg p-1 text-sm w-full sm:w-auto">
            <button
              onClick={() => handleViewChange('overview')}
              className={`flex-1 sm:flex-none py-2 px-3 sm:px-4 rounded-md font-medium transition-colors ${
                currentView === 'overview'
                  ? 'bg-white shadow-sm text-gray-900'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => handleViewChange('pickup')}
              className={`flex-1 sm:flex-none py-2 px-3 sm:px-4 rounded-md font-medium transition-colors ${
                currentView === 'pickup'
                  ? 'bg-white shadow-sm text-gray-900'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Pickup
            </button>
            <button
              onClick={() => handleViewChange('dropoff')}
              className={`flex-1 sm:flex-none py-2 px-3 sm:px-4 rounded-md font-medium transition-colors ${
                currentView === 'dropoff'
                  ? 'bg-white shadow-sm text-gray-900'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Dropoff
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        {/* Zone Details Panel - Collapsible on mobile */}
        <div className="w-full lg:w-80 bg-white border-b lg:border-b-0 lg:border-r border-gray-200 flex flex-col max-h-64 lg:max-h-none">
          {/* Zone Information */}
          <div className="flex-1 overflow-y-auto p-4">
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-green-600" />
                  <p className="text-sm text-gray-600">Loading zone details...</p>
                </div>
              </div>
            )}

            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {!isLoading && !error && (
              <div className="space-y-4">
                {/* Pickup Zones Section */}
                {(currentView === 'overview' || currentView === 'pickup') && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      <h4 className="font-medium text-gray-900 text-sm">
                        Pickup in {fromCity}
                      </h4>
                      <Badge variant="outline" className="text-xs">
                        {pickupZones.length}
                      </Badge>
                    </div>
                    
                    {pickupZones.map((zone) => (
                      <Card key={zone.id} className="bg-green-50 border-green-200">
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h5 className="font-medium text-green-900 text-sm truncate">{zone.zone_name}</h5>
                              {zone.description && (
                                <p className="text-xs text-green-700 mt-1 line-clamp-2">{zone.description}</p>
                              )}
                              {zone.landmarks.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {zone.landmarks.slice(0, 2).map((landmark, idx) => (
                                    <Badge key={idx} variant="secondary" className="text-xs bg-green-100 text-green-800">
                                      {landmark}
                                    </Badge>
                                  ))}
                                  {zone.landmarks.length > 2 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{zone.landmarks.length - 2}
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                            <CheckCircle className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Dropoff Zones Section */}
                {(currentView === 'overview' || currentView === 'dropoff') && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500" />
                      <h4 className="font-medium text-gray-900 text-sm">
                        Dropoff in {toCity}
                      </h4>
                      <Badge variant="outline" className="text-xs">
                        {dropoffZones.length}
                      </Badge>
                    </div>
                    
                    {dropoffZones.map((zone) => (
                      <Card key={zone.id} className="bg-blue-50 border-blue-200">
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h5 className="font-medium text-blue-900 text-sm truncate">{zone.zone_name}</h5>
                              {zone.description && (
                                <p className="text-xs text-blue-700 mt-1 line-clamp-2">{zone.description}</p>
                              )}
                              {zone.landmarks.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {zone.landmarks.slice(0, 2).map((landmark, idx) => (
                                    <Badge key={idx} variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                                      {landmark}
                                    </Badge>
                                  ))}
                                  {zone.landmarks.length > 2 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{zone.landmarks.length - 2}
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                            <CheckCircle className="h-4 w-4 text-blue-600 mt-1 flex-shrink-0" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Route Information - Only in overview */}
                {selectedRoute && currentView === 'overview' && (
                  <Card className="border border-orange-200 bg-orange-50">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Route className="h-4 w-4 text-orange-600" />
                        <h4 className="font-medium text-orange-900 text-sm">Selected Route</h4>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs text-orange-800">
                        <div className="text-center">
                          <div className="font-medium">{selectedRoute.distance_km.toFixed(1)} km</div>
                          <div className="opacity-75">Distance</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium">{Math.round(selectedRoute.duration_minutes / 60)}h {selectedRoute.duration_minutes % 60}m</div>
                          <div className="opacity-75">Duration</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium capitalize">{selectedRoute.route_type}</div>
                          <div className="opacity-75">Type</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>

          {/* Continue Button - More compact on mobile */}
          {onContinue && hasSelectedZones && (
            <div className="p-2 lg:p-4 border-t border-gray-200 bg-white flex-shrink-0">
              <Alert className="mb-2 lg:mb-3 border-green-200 bg-green-50">
                <CheckCircle className="h-3 w-3 lg:h-4 lg:w-4 text-green-600" />
                <AlertDescription className="text-green-800 text-xs lg:text-sm">
                  Route corridors configured successfully.
                </AlertDescription>
              </Alert>
              
              <Button onClick={onContinue} className="w-full h-8 lg:h-10 text-sm">
                Continue to Seat Pricing
              </Button>
            </div>
          )}
        </div>

        {/* Map Container - Takes remaining space properly */}
        <div className="flex-1 relative min-h-96 lg:min-h-0">
          <div className="absolute inset-0">
            <BaseMapComponent
              ref={mapRef}
              center={mapCenter}
              zoom={currentView === 'overview' ? 10 : 12}
              height="100%"
              onMapReady={handleMapReady}
              enableLocationButton={false}
              enableZoomControls={true}
              className="w-full h-full"
            >
              {isMapReady && (
                <>
                  {/* Show selected zones based on current view */}
                  {(currentView === 'pickup' || currentView === 'overview') && (
                    <ZoneOverlay
                      zones={pickupZones}
                      selectedZoneId={undefined} // No selection needed in visualization mode
                      onZoneClick={undefined} // Read-only
                      mapInstance={mapRef.current?.nativeInstance}
                      zoneType="pickup"
                      showLabels={true}
                    />
                  )}
                  
                  {(currentView === 'dropoff' || currentView === 'overview') && (
                    <ZoneOverlay
                      zones={dropoffZones}
                      selectedZoneId={undefined}
                      onZoneClick={undefined}
                      mapInstance={mapRef.current?.nativeInstance}
                      zoneType="dropoff"
                      showLabels={true}
                    />
                  )}
                  
                  {/* TODO: Add route polyline overlay if selectedRoute is provided */}
                </>
              )}
            </BaseMapComponent>
          </div>

          {/* Floating Map Indicators */}
          <div className="absolute top-2 lg:top-4 left-2 lg:left-4 right-2 lg:right-4 z-10 flex justify-between items-start gap-2">
            <Card className="bg-white/95 backdrop-blur flex-shrink-0">
              <CardContent className="p-2 lg:p-3">
                <div className="flex items-center gap-2">
                  <Navigation className="h-3 w-3 lg:h-4 lg:w-4 text-green-600" />
                  <span className="font-medium text-xs lg:text-sm">
                    {currentView === 'overview' 
                      ? 'Route Corridor Overview' 
                      : currentView === 'pickup'
                      ? `${fromCity} Pickup Points`
                      : `${toCity} Dropoff Points`
                    }
                  </span>
                </div>
              </CardContent>
            </Card>

            <Badge variant="secondary" className="bg-white/95 backdrop-blur text-xs flex-shrink-0">
              {currentZones.length} zones
            </Badge>
          </div>

          {/* Mobile: Bottom summary - only show when not enough space in sidebar */}
          <div className="absolute bottom-2 left-2 right-2 z-10 lg:hidden">
            {currentView === 'overview' && hasSelectedZones && (
              <Card className="bg-white/95 backdrop-blur border border-gray-200">
                <CardContent className="p-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-gray-900">Total Zones</span>
                    <Badge variant="secondary" className="text-xs">
                      {pickupZones.length + dropoffZones.length}
                    </Badge>
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    {pickupZones.length} pickup • {dropoffZones.length} dropoff
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PickupDropPointsMap;