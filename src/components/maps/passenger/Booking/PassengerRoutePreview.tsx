// ===========================================
// src/components/maps/passenger/Booking/PassengerRoutePreview.tsx
// Simplified Phase 5 - RedBus style dropdown zone selection
// ===========================================

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  MapPin, 
  Clock, 
  Route,
  Star,
  Phone,
  Car,
  Users,
  IndianRupee,
  Info,
  CheckCircle,
  ArrowRight,
  Loader2,
  ChevronDown
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { CityZone } from '@/types/mapTypes';
import { fetchRideById } from '@/utils/fetchRides';

// Types based on your schema
interface RideData {
  id: string;
  driver_id: string;
  from_city: string;
  to_city: string;
  departure_date: string;
  departure_time: string;
  available_seats: number;
  price_per_seat: number;
  notes?: string;
  route_polyline?: string;
  route_distance_km?: number;
  route_duration_minutes?: number;
  vehicle_id: string;
  status: string;
}

interface DriverInfo {
  id: string;
  full_name: string;
  phone: string;
  avatar_url?: string;
  average_rating: number;
  total_ratings: number;
}

interface VehicleInfo {
  id: string;
  car_model: string;
  car_type: string;
  license_plate: string;
  color: string;
  seat_capacity: number;
}

export interface PassengerRoutePreviewProps {
  rideId?: string;
  onZoneSelectionComplete?: (pickupZone: CityZone, dropoffZone: CityZone) => void;
  showBookingButton?: boolean;
  height?: string;
  className?: string;
  mode?: 'preview' | 'booking';
  initialStep?: 'pickup' | 'dropoff';
}

export const PassengerRoutePreview: React.FC<PassengerRoutePreviewProps> = ({
  rideId: propRideId,
  onZoneSelectionComplete,
  showBookingButton = true,
  height = "auto",
  className = "",
  mode = 'preview',
  initialStep = 'pickup'
}) => {
  const { rideId: paramRideId } = useParams<{ rideId: string }>();
  const rideId = propRideId || paramRideId;
  
  // Data states
  const [rideData, setRideData] = useState<RideData | null>(null);
  const [driverInfo, setDriverInfo] = useState<DriverInfo | null>(null);
  const [vehicleInfo, setVehicleInfo] = useState<VehicleInfo | null>(null);
  const [pickupZones, setPickupZones] = useState<CityZone[]>([]);
  const [dropoffZones, setDropoffZones] = useState<CityZone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Selection states for booking mode
  const [selectedPickupZone, setSelectedPickupZone] = useState<CityZone | null>(null);
  const [selectedDropoffZone, setSelectedDropoffZone] = useState<CityZone | null>(null);
  const [selectionStep, setSelectionStep] = useState<'pickup' | 'dropoff' | 'complete'>('pickup');

  // Load ride data with all related information
  const loadRideData = useCallback(async () => {
    if (!rideId) return;

    setIsLoading(true);
    setError(null);

    try {
      // Load main ride data using your existing utility
      const ride = await fetchRideById(rideId);

      if (!ride) {
        throw new Error('Ride not found');
      }
      setRideData(ride);

      // Load driver information
      const { data: driver, error: driverError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', ride.driver_id)
        .single();

      if (driverError) throw driverError;
      setDriverInfo(driver);

      // Load vehicle information
      const { data: vehicle, error: vehicleError } = await supabase
        .from('vehicles')
        .select('*')
        .eq('id', ride.vehicle_id)
        .single();

      if (vehicleError) throw vehicleError;
      setVehicleInfo(vehicle);

      // Load pickup and dropoff zones from ride_zones
      const { data: rideZones, error: zonesError } = await supabase
        .from('ride_zones')
        .select(`
          zone_type,
          city_zones (
            id,
            city_name,
            zone_name,
            zone_type,
            center_latitude,
            center_longitude,
            radius_meters,
            description,
            landmarks,
            is_active
          )
        `)
        .eq('ride_id', rideId);

      if (zonesError) throw zonesError;

      const pickup = rideZones
        ?.filter(rz => rz.zone_type === 'pickup')
        ?.map(rz => rz.city_zones)
        ?.filter(zone => zone) || [];
      const dropoff = rideZones
        ?.filter(rz => rz.zone_type === 'dropoff')
        ?.map(rz => rz.city_zones)
        ?.filter(zone => zone) || [];

      setPickupZones(pickup);
      setDropoffZones(dropoff);

      // For booking mode, initialize based on initialStep
      if (mode === 'booking') {
        setSelectionStep(initialStep);
      }

    } catch (err) {
      console.error('Failed to load ride data:', err);
      setError('Failed to load ride information');
    } finally {
      setIsLoading(false);
    }
  }, [rideId, mode, initialStep]);

  useEffect(() => {
    loadRideData();
  }, [loadRideData]);

  // Handle zone selection with simplified validation
  const handlePickupZoneSelect = useCallback((zoneId: string) => {
    const zone = pickupZones.find(z => z.id === zoneId);
    if (!zone) return;

    setSelectedPickupZone(zone);
    console.log('Pickup zone selected:', zone.zone_name);

    if (mode === 'booking') {
      if (selectedDropoffZone) {
        // Both zones selected, complete the selection
        setSelectionStep('complete');
        onZoneSelectionComplete?.(zone, selectedDropoffZone);
      } else {
        // Move to dropoff selection
        setSelectionStep('dropoff');
      }
    }
  }, [pickupZones, selectedDropoffZone, mode, onZoneSelectionComplete]);

  const handleDropoffZoneSelect = useCallback((zoneId: string) => {
    const zone = dropoffZones.find(z => z.id === zoneId);
    if (!zone) return;

    setSelectedDropoffZone(zone);
    console.log('Dropoff zone selected:', zone.zone_name);

    if (mode === 'booking' && selectedPickupZone) {
      // Both zones selected, complete the selection
      setSelectionStep('complete');
      onZoneSelectionComplete?.(selectedPickupZone, zone);
    }
  }, [dropoffZones, selectedPickupZone, mode, onZoneSelectionComplete]);

  const formatTime = (time: string): string => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (date: string): string => {
    return new Date(date).toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // Reset selection function
  const resetSelection = () => {
    setSelectedPickupZone(null);
    setSelectedDropoffZone(null);
    setSelectionStep('pickup');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading ride details...</p>
        </div>
      </div>
    );
  }

  if (error || !rideData) {
    return (
      <Alert variant="destructive">
        <Info className="h-4 w-4" />
        <AlertDescription>
          {error || 'Ride not found'}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Route Header */}
      <Card className="bg-gradient-to-r from-blue-600 to-green-600 text-white border-0">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold mb-2">
                {rideData.from_city} → {rideData.to_city}
              </h2>
              <p className="text-blue-100">
                {formatDate(rideData.departure_date)} at {formatTime(rideData.departure_time)}
              </p>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold">{rideData.available_seats}</div>
                <div className="text-sm text-blue-200">Seats Available</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold flex items-center">
                  <IndianRupee className="h-5 w-5" />
                  {rideData.price_per_seat}
                </div>
                <div className="text-sm text-blue-200">Per Seat</div>
              </div>
            </div>
          </div>

          {/* Progress Indicator for Booking Mode */}
          {mode === 'booking' && (
            <div className="mt-6 p-4 bg-white/10 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <div className={`flex items-center gap-2 ${selectionStep === 'pickup' || selectedPickupZone ? 'text-white' : 'text-blue-200'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    selectedPickupZone ? 'bg-green-500' : selectionStep === 'pickup' ? 'bg-white text-blue-600' : 'bg-white/30'
                  }`}>
                    {selectedPickupZone ? '✓' : '1'}
                  </div>
                  <span className="font-medium">Select Pickup</span>
                </div>
                
                <ArrowRight className="h-5 w-5 text-blue-200" />
                
                <div className={`flex items-center gap-2 ${selectionStep === 'dropoff' || selectedDropoffZone ? 'text-white' : 'text-blue-200'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    selectedDropoffZone ? 'bg-green-500' : selectionStep === 'dropoff' ? 'bg-white text-blue-600' : 'bg-white/30'
                  }`}>
                    {selectedDropoffZone ? '✓' : '2'}
                  </div>
                  <span className="font-medium">Select Drop</span>
                </div>
                
                <ArrowRight className="h-5 w-5 text-blue-200" />
                
                <div className={`flex items-center gap-2 ${selectionStep === 'complete' ? 'text-white' : 'text-blue-200'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    selectionStep === 'complete' ? 'bg-green-500' : 'bg-white/30'
                  }`}>
                    {selectionStep === 'complete' ? '✓' : '3'}
                  </div>
                  <span className="font-medium">Complete</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Zone Selection - RedBus Style */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-600" />
            {mode === 'booking' ? 'Select Pickup & Drop Points' : 'Available Pickup & Drop Points'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Pickup Zone Selection */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                Pickup in {rideData.from_city}
              </label>
              
              {mode === 'booking' ? (
                <Select 
                  value={selectedPickupZone?.id || ""} 
                  onValueChange={handlePickupZoneSelect}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={`Choose pickup point in ${rideData.from_city}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {pickupZones.map((zone) => (
                      <SelectItem key={zone.id} value={zone.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{zone.zone_name}</span>
                          {zone.landmarks && zone.landmarks.length > 0 && (
                            <span className="text-xs text-gray-500">
                              Near: {zone.landmarks.slice(0, 2).join(', ')}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="space-y-2">
                  {pickupZones.map((zone) => (
                    <Card key={zone.id} className="p-3 bg-green-50 border-green-200">
                      <div className="font-medium text-green-900">{zone.zone_name}</div>
                      {zone.landmarks && zone.landmarks.length > 0 && (
                        <div className="text-xs text-green-700 mt-1">
                          Near: {zone.landmarks.slice(0, 3).join(', ')}
                          {zone.landmarks.length > 3 && ` +${zone.landmarks.length - 3} more`}
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Dropoff Zone Selection */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                Drop in {rideData.to_city}
              </label>
              
              {mode === 'booking' ? (
                <Select 
                  value={selectedDropoffZone?.id || ""} 
                  onValueChange={handleDropoffZoneSelect}
                  disabled={mode === 'booking' && !selectedPickupZone}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={
                      mode === 'booking' && !selectedPickupZone 
                        ? "Select pickup first" 
                        : `Choose drop point in ${rideData.to_city}`
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {dropoffZones.map((zone) => (
                      <SelectItem key={zone.id} value={zone.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{zone.zone_name}</span>
                          {zone.landmarks && zone.landmarks.length > 0 && (
                            <span className="text-xs text-gray-500">
                              Near: {zone.landmarks.slice(0, 2).join(', ')}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="space-y-2">
                  {dropoffZones.map((zone) => (
                    <Card key={zone.id} className="p-3 bg-blue-50 border-blue-200">
                      <div className="font-medium text-blue-900">{zone.zone_name}</div>
                      {zone.landmarks && zone.landmarks.length > 0 && (
                        <div className="text-xs text-blue-700 mt-1">
                          Near: {zone.landmarks.slice(0, 3).join(', ')}
                          {zone.landmarks.length > 3 && ` +${zone.landmarks.length - 3} more`}
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Selection Status for Booking Mode */}
          {mode === 'booking' && (selectedPickupZone || selectedDropoffZone) && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-blue-900 mb-2">Your Selection</h4>
                    <div className="space-y-1 text-sm">
                      {selectedPickupZone && (
                        <div className="flex items-center gap-2 text-green-700">
                          <CheckCircle className="h-4 w-4" />
                          <span>Pickup: {selectedPickupZone.zone_name}</span>
                        </div>
                      )}
                      {selectedDropoffZone && (
                        <div className="flex items-center gap-2 text-blue-700">
                          <CheckCircle className="h-4 w-4" />
                          <span>Drop: {selectedDropoffZone.zone_name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetSelection}
                    className="text-blue-700 border-blue-300 hover:bg-blue-100"
                  >
                    Reset
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Driver & Vehicle Info */}
      {driverInfo && vehicleInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5 text-gray-600" />
              Driver & Vehicle Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="font-semibold text-blue-700">
                    {driverInfo.full_name.charAt(0)}
                  </span>
                </div>
                <div>
                  <div className="font-semibold">{driverInfo.full_name}</div>
                  {driverInfo.average_rating > 0 && (
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <span>{driverInfo.average_rating.toFixed(1)}</span>
                      <span>({driverInfo.total_ratings} reviews)</span>
                    </div>
                  )}
                  <div className="text-sm text-gray-600 mt-1">
                    {vehicleInfo.car_model} {vehicleInfo.car_type} • {vehicleInfo.color}
                  </div>
                  <div className="text-xs text-gray-500">
                    {vehicleInfo.license_plate} • {vehicleInfo.seat_capacity} seats
                  </div>
                </div>
              </div>
              
              {driverInfo.phone && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`tel:${driverInfo.phone}`)}
                  className="flex items-center gap-2"
                >
                  <Phone className="h-4 w-4" />
                  Call
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Route Details */}
      {(rideData.route_distance_km || rideData.route_duration_minutes) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Route className="h-5 w-5 text-purple-600" />
              Journey Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-center">
              {rideData.route_distance_km && (
                <div className="p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-900">{rideData.route_distance_km} km</div>
                  <div className="text-sm text-purple-700">Distance</div>
                </div>
              )}
              {rideData.route_duration_minutes && (
                <div className="p-4 bg-indigo-50 rounded-lg">
                  <div className="text-2xl font-bold text-indigo-900">
                    {Math.floor(rideData.route_duration_minutes / 60)}h {rideData.route_duration_minutes % 60}m
                  </div>
                  <div className="text-sm text-indigo-700">Duration</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Driver Notes */}
      {rideData.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-amber-600" />
              Driver's Note
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-amber-800">{rideData.notes}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PassengerRoutePreview;