// ===========================================
// Updated: src/components/maps/driver/PostRide/RouteCorridorSelector.tsx
// Route corridor zone selection interface for intercity cabs
// ===========================================

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { BaseMapComponent, type MapInstance } from '@/components/maps/core/BaseMapComponent';
import { ZoneOverlay } from '@/components/maps/shared/components/ZoneOverlay';
import { 
  useCityRouteCorridors, 
  useCorridorPickupPoints, 
  useRouteCorridorSelection,
  type RouteCorridor,
  type RouteStop 
} from '@/hooks/useZoneData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  MapPin, 
  CheckCircle, 
  AlertTriangle, 
  Route,
  Navigation,
  Loader2,
  ChevronRight,
  Clock,
  Car
} from 'lucide-react';

export interface RouteCorridorSelectorProps {
  fromCity: string;
  toCity: string;
  onSelectionComplete?: (pickupZoneIds: string[], dropoffZoneIds: string[]) => void;
  onBack?: () => void;
  height?: string;
  className?: string;
}

export const RouteCorridorSelector: React.FC<RouteCorridorSelectorProps> = ({
  fromCity,
  toCity,
  onSelectionComplete,
  onBack,
  height = "100vh",
  className = ""
}) => {
  const mapRef = useRef<MapInstance>(null);
  const [currentStep, setCurrentStep] = useState<'pickup' | 'dropoff'>('pickup');
  const [isMapReady, setIsMapReady] = useState(false);

  // Load route corridors for both cities
  const { 
    corridors: pickupCorridors, 
    isLoading: isLoadingPickupCorridors, 
    error: pickupCorridorsError 
  } = useCityRouteCorridors(fromCity);
  
  const { 
    corridors: dropoffCorridors, 
    isLoading: isLoadingDropoffCorridors, 
    error: dropoffCorridorsError 
  } = useCityRouteCorridors(toCity);

  // Zone selection state
  const {
    selectedPickupCorridor,
    selectedDropoffCorridor,
    selectPickupCorridor,
    selectDropoffCorridor,
    selectedPickupPoints,
    selectedDropoffPoints,
    addPickupPoint,
    addDropoffPoint,
    pickupRangeStart,
    pickupRangeEnd,
    dropoffRangeStart,
    dropoffRangeEnd,
    selectPickupPointRange,
    selectDropoffPointRange,
    getSelectedPickupZones,
    getSelectedDropoffZones,
    validateSelection,
    clearSelection
  } = useRouteCorridorSelection();

  // Load pickup points for selected corridors
  const { 
    pickupPoints: pickupPoints, 
    isLoading: isLoadingPickupPoints 
  } = useCorridorPickupPoints(selectedPickupCorridor);
  
  const { 
    pickupPoints: dropoffPoints, 
    isLoading: isLoadingDropoffPoints 
  } = useCorridorPickupPoints(selectedDropoffCorridor);

  // Get current context based on step
  const currentCorridors = currentStep === 'pickup' ? pickupCorridors : dropoffCorridors;
  const currentPoints = currentStep === 'pickup' ? pickupPoints : dropoffPoints;
  const selectedCorridor = currentStep === 'pickup' ? selectedPickupCorridor : selectedDropoffCorridor;
  const isLoadingPoints = currentStep === 'pickup' ? isLoadingPickupPoints : isLoadingDropoffPoints;

  // Calculate map center
  const mapCenter = React.useMemo(() => {
    if (currentPoints.length > 0) {
      const avgLat = currentPoints.reduce((sum, point) => sum + point.zone.center_latitude, 0) / currentPoints.length;
      const avgLng = currentPoints.reduce((sum, point) => sum + point.zone.center_longitude, 0) / currentPoints.length;
      return { latitude: avgLat, longitude: avgLng };
    }
    
    // Default centers for major Indian cities
    const cityCenters: Record<string, {latitude: number, longitude: number}> = {
      'Mumbai': { latitude: 19.0760, longitude: 72.8777 },
      'Delhi': { latitude: 28.6139, longitude: 77.2090 },
      'Bangalore': { latitude: 12.9716, longitude: 77.5946 },
      'Pune': { latitude: 18.5204, longitude: 73.8567 },
      'Aurangabad': { latitude: 19.8762, longitude: 75.3433 }
    };
    
    const currentCity = currentStep === 'pickup' ? fromCity : toCity;
    return cityCenters[currentCity] || { latitude: 20.5937, longitude: 78.9629 };
  }, [currentPoints, currentStep, fromCity, toCity]);

  const handleMapReady = useCallback((mapInstance: MapInstance) => {
    console.log('RouteCorridorSelector map ready');
    setIsMapReady(true);
  }, []);

  const handleCorridorSelect = useCallback((corridorId: string) => {
    if (currentStep === 'pickup') {
      selectPickupCorridor(corridorId);
    } else {
      selectDropoffCorridor(corridorId);
    }
  }, [currentStep, selectPickupCorridor, selectDropoffCorridor]);

  const handlePointClick = useCallback((point: RouteStop) => {
    if (currentStep === 'pickup') {
      addPickupPoint(point.zone_id);
    } else {
      addDropoffPoint(point.zone_id);
    }
  }, [currentStep, addPickupPoint, addDropoffPoint]);

  const handleRangeSelection = useCallback((startOrder: number, endOrder: number) => {
    if (currentStep === 'pickup') {
      selectPickupPointRange(startOrder, endOrder);
    } else {
      selectDropoffPointRange(startOrder, endOrder);
    }
  }, [currentStep, selectPickupPointRange, selectDropoffPointRange]);

  const handleStepComplete = useCallback(() => {
    if (currentStep === 'pickup') {
      setCurrentStep('dropoff');
    } else {
      // Both steps complete - validate and submit
      const validation = validateSelection();
      if (validation.isValid && onSelectionComplete) {
        const pickupZoneIds = getSelectedPickupZones(pickupPoints).map(zone => zone.id);
        const dropoffZoneIds = getSelectedDropoffZones(dropoffPoints).map(zone => zone.id);
        onSelectionComplete(pickupZoneIds, dropoffZoneIds);
      }
    }
  }, [
    currentStep, 
    validateSelection, 
    onSelectionComplete,
    getSelectedPickupZones,
    getSelectedDropoffZones,
    pickupPoints,
    dropoffPoints
  ]);

  const canProceed = () => {
    if (currentStep === 'pickup') {
      return selectedPickupPoints.length > 0 || (pickupRangeStart !== null && pickupRangeEnd !== null);
    } else {
      return selectedDropoffPoints.length > 0 || (dropoffRangeStart !== null && dropoffRangeEnd !== null);
    }
  };

  const isLoading = isLoadingPickupCorridors || isLoadingDropoffCorridors || isLoadingPoints;
  const hasError = pickupCorridorsError || dropoffCorridorsError;

  return (
    <div className={`flex flex-col ${className}`} style={{ height }}>
      {/* Progress Header */}
      <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white p-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Car className="h-6 w-6" />
            <div>
              <h2 className="text-xl font-semibold">
                {currentStep === 'pickup' ? `${fromCity} Pickup Areas` : `${toCity} Dropoff Areas`}
              </h2>
              <p className="text-green-100 text-sm">
                Select route corridor and pickup points for {currentStep} locations
              </p>
            </div>
          </div>
          
          {/* Step Indicator */}
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              currentStep === 'pickup' || selectedPickupPoints.length > 0 ? 'bg-white text-green-600' : 'bg-green-500 text-white'
            }`}>
              1
            </div>
            <ChevronRight className="h-4 w-4 text-green-300" />
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              currentStep === 'dropoff' ? 'bg-white text-blue-600' : 'bg-blue-500/50 text-blue-200'
            }`}>
              2
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        {/* Selection Panel */}
        <div className="w-full lg:w-96 bg-white border-b lg:border-b-0 lg:border-r border-gray-200 flex flex-col max-h-80 lg:max-h-none">
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {isLoading && (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-green-600" />
                    <p className="text-sm text-gray-600">Loading route corridors...</p>
                  </div>
                </div>
              )}

              {hasError && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Failed to load route corridors. Please refresh the page.
                  </AlertDescription>
                </Alert>
              )}

              {!isLoading && !hasError && (
                <>
                  {/* Corridor Selection */}
                  <div className="space-y-3">
                    <h3 className="font-medium text-gray-900 flex items-center gap-2">
                      <Navigation className="h-4 w-4" />
                      Select Route Corridor
                    </h3>
                    
                    {currentCorridors.length === 0 ? (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          No route corridors found for {currentStep === 'pickup' ? fromCity : toCity}. 
                          Contact admin to add route corridors for this city.
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <div className="space-y-2">
                        {currentCorridors.map((corridor) => (
                          <Card 
                            key={corridor.id} 
                            className={`cursor-pointer transition-all ${
                              selectedCorridor === corridor.id 
                                ? 'ring-2 ring-green-500 bg-green-50' 
                                : 'hover:bg-gray-50'
                            }`}
                            onClick={() => handleCorridorSelect(corridor.id)}
                          >
                            <CardContent className="p-3">
                              <div className="flex items-center gap-3">
                                <div 
                                  className="w-4 h-4 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: corridor.line_color }}
                                />
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium text-sm text-gray-900 truncate">
                                    {corridor.line_name}
                                  </h4>
                                  <p className="text-xs text-gray-600 truncate">
                                    {corridor.description}
                                  </p>
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  {corridor.line_code}
                                </Badge>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Pickup Point Selection */}
                  {selectedCorridor && (
                    <>
                      <Separator />
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium text-gray-900 flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            Select Pickup Points
                          </h3>
                          <Badge variant="secondary" className="text-xs">
                            {currentStep === 'pickup' ? selectedPickupPoints.length : selectedDropoffPoints.length} selected
                          </Badge>
                        </div>

                        {isLoadingPoints ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="h-4 w-4 animate-spin text-green-600" />
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {/* Range Selection Helper */}
                            <Alert className="border-green-200 bg-green-50">
                              <AlertDescription className="text-green-800 text-xs">
                                💡 Tip: Click individual points or select a range for continuous coverage along the route
                              </AlertDescription>
                            </Alert>

                            {/* Pickup Points List */}
                            {currentPoints.map((point, index) => {
                              const isSelected = currentStep === 'pickup' 
                                ? selectedPickupPoints.includes(point.zone_id)
                                : selectedDropoffPoints.includes(point.zone_id);
                              
                              const inRange = currentStep === 'pickup'
                                ? (pickupRangeStart !== null && pickupRangeEnd !== null &&
                                   point.station_order >= pickupRangeStart && 
                                   point.station_order <= pickupRangeEnd)
                                : (dropoffRangeStart !== null && dropoffRangeEnd !== null &&
                                   point.station_order >= dropoffRangeStart && 
                                   point.station_order <= dropoffRangeEnd);

                              return (
                                <Card 
                                  key={point.id}
                                  className={`cursor-pointer transition-all ${
                                    isSelected || inRange
                                      ? 'ring-2 ring-green-500 bg-green-50'
                                      : 'hover:bg-gray-50'
                                  }`}
                                  onClick={() => handlePointClick(point)}
                                >
                                  <CardContent className="p-3">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                          <div 
                                            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium text-white flex-shrink-0"
                                            style={{ backgroundColor: point.line.line_color }}
                                          >
                                            {point.station_order}
                                          </div>
                                          {point.is_terminal && (
                                            <Badge variant="outline" className="text-xs">Terminal</Badge>
                                          )}
                                          {point.is_interchange && (
                                            <Badge variant="secondary" className="text-xs">Junction</Badge>
                                          )}
                                        </div>
                                        
                                        <div className="flex-1 min-w-0">
                                          <h4 className="font-medium text-sm text-gray-900 truncate">
                                            {point.zone.zone_name}
                                          </h4>
                                          {point.zone.description && (
                                            <p className="text-xs text-gray-600 truncate">
                                              {point.zone.description}
                                            </p>
                                          )}
                                          {point.travel_time_to_next && index < currentPoints.length - 1 && (
                                            <div className="flex items-center gap-1 mt-1">
                                              <Clock className="h-3 w-3 text-gray-400" />
                                              <span className="text-xs text-gray-500">
                                                {point.travel_time_to_next}min to next
                                              </span>
                                            </div>
                                          )}
                                          {point.zone.landmarks.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-1">
                                              {point.zone.landmarks.slice(0, 2).map((landmark, idx) => (
                                                <Badge key={idx} variant="outline" className="text-[10px] px-1 py-0">
                                                  {landmark}
                                                </Badge>
                                              ))}
                                              {point.zone.landmarks.length > 2 && (
                                                <Badge variant="outline" className="text-[10px] px-1 py-0">
                                                  +{point.zone.landmarks.length - 2}
                                                </Badge>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      
                                      {(isSelected || inRange) && (
                                        <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                                      )}
                                    </div>
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </ScrollArea>

          {/* Action Buttons */}
          <div className="p-4 border-t border-gray-200 bg-white flex-shrink-0">
            <div className="flex gap-2">
              {onBack && (
                <Button variant="outline" onClick={onBack} className="flex-1">
                  Back
                </Button>
              )}
              
              <Button 
                onClick={handleStepComplete}
                disabled={!canProceed()}
                className="flex-1"
                variant={currentStep === 'pickup' ? 'default' : 'default'}
              >
                {currentStep === 'pickup' ? 'Next: Dropoff' : 'Complete Selection'}
                {currentStep === 'dropoff' && <CheckCircle className="h-4 w-4 ml-2" />}
              </Button>
            </div>
            
            {currentStep === 'dropoff' && !validateSelection().isValid && (
              <Alert variant="destructive" className="mt-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Please select at least one dropoff point to continue.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>

        {/* Map Container */}
        <div className="flex-1 relative min-h-96 lg:min-h-0">
          <div className="absolute inset-0">
            <BaseMapComponent
              ref={mapRef}
              center={mapCenter}
              zoom={12}
              height="100%"
              onMapReady={handleMapReady}
              enableLocationButton={false}
              enableZoomControls={true}
              className="w-full h-full"
            >
              {isMapReady && currentPoints.length > 0 && (
                <ZoneOverlay
                  zones={currentPoints.map(point => point.zone)}
                  selectedZoneId={undefined}
                  onZoneClick={(zone) => {
                    const point = currentPoints.find(p => p.zone_id === zone.id);
                    if (point) handlePointClick(point);
                  }}
                  mapInstance={mapRef.current?.nativeInstance}
                  zoneType={currentStep}
                  showLabels={true}
                />
              )}
            </BaseMapComponent>
          </div>

          {/* Floating Info */}
          <div className="absolute top-4 left-4 right-4 z-10">
            <Card className="bg-white/95 backdrop-blur">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Route className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-sm">
                      {currentStep === 'pickup' ? fromCity : toCity} Route Corridors
                    </span>
                  </div>
                  
                  {selectedCorridor && (
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ 
                          backgroundColor: currentCorridors.find(c => c.id === selectedCorridor)?.line_color 
                        }}
                      />
                      <span className="text-sm font-medium">
                        {currentCorridors.find(c => c.id === selectedCorridor)?.line_name}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Selection Summary */}
          {canProceed() && (
            <div className="absolute bottom-4 left-4 right-4 z-10">
              <Card className="bg-white/95 backdrop-blur border-green-200">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-900">
                        {currentStep === 'pickup' 
                          ? `${selectedPickupPoints.length} pickup points selected`
                          : `${selectedDropoffPoints.length} dropoff points selected`
                        }
                      </span>
                    </div>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      Ready
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};