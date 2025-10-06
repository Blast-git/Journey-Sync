// ===========================================
// src/components/maps/shared/components/RouteInfoPanel.tsx
// Phase 5: Journey timeline and route information display
// ===========================================

import React from 'react';
import { 
  Clock, 
  MapPin, 
  Coffee, 
  Users, 
  IndianRupee, 
  Route, 
  Phone, 
  Star, 
  Navigation, 
  Info,
  Car,
  Shield,
  Fuel,
  AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// Define interfaces based on your database schema
interface RouteInfo {
  id: string;
  route_type?: string;
  distance_km: number;
  duration_minutes: number;
  toll_cost?: number;
  fuel_cost?: number;
  traffic_level?: 'low' | 'medium' | 'high';
  polyline?: string;
}

interface RestStop {
  id: string;
  name: string;
  type: 'rest_stop' | 'toll_booth' | 'fuel_station' | 'landmark';
  estimated_time?: string;
  distance_from_start?: number;
}

interface DriverInfo {
  id: string;
  full_name: string;
  phone?: string;
  avatar_url?: string;
  average_rating: number;
  total_ratings: number;
  vehicle_info: {
    car_model: string;
    car_type: string;
    license_plate: string;
    color: string;
    seat_capacity: number;
    is_verified?: boolean;
  };
}

interface ZoneInfo {
  id: string;
  zone_name: string;
  city_name: string;
  description?: string;
  landmarks: string[];
}

interface RouteInfoPanelProps {
  // Route and journey data
  routeInfo?: RouteInfo;
  departureTime: string;
  departureDate: string;
  fromCity: string;
  toCity: string;
  
  // Zone information (from your Phase 4 implementation)
  pickupZones?: ZoneInfo[];
  dropoffZones?: ZoneInfo[];
  
  // Driver and vehicle info
  driverInfo?: DriverInfo;
  
  // Passenger-specific props
  isPassengerView?: boolean;
  availableSeats?: number;
  pricePerSeat?: number;
  selectedSeats?: string[];
  totalPrice?: number;
  
  // Actions
  showBookingButton?: boolean;
  onBookingClick?: () => void;
  onCallDriver?: () => void;
  
  className?: string;
}

export const RouteInfoPanel: React.FC<RouteInfoPanelProps> = ({
  routeInfo,
  departureTime,
  departureDate,
  fromCity,
  toCity,
  pickupZones = [],
  dropoffZones = [],
  driverInfo,
  isPassengerView = false,
  availableSeats,
  pricePerSeat,
  selectedSeats = [],
  totalPrice,
  showBookingButton = false,
  onBookingClick,
  onCallDriver,
  className = ''
}) => {
  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

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

  const getTotalCost = (): number => {
    if (!routeInfo) return 0;
    return (routeInfo.toll_cost || 0) + (routeInfo.fuel_cost || 0);
  };

  const getTrafficColor = (level?: string): string => {
    switch (level) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const renderStars = (rating: number, totalRatings: number) => {
    if (totalRatings === 0) {
      return <span className="text-xs text-gray-500">No ratings yet</span>;
    }
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-3 w-3 ${
              star <= rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
            }`}
          />
        ))}
        <span className="text-xs text-gray-600 ml-1">
          {rating.toFixed(1)} ({totalRatings})
        </span>
      </div>
    );
  };

  // Calculate estimated arrival time
  const getEstimatedArrival = (): string => {
    if (!routeInfo) return 'N/A';
    
    const departure = new Date(`${departureDate}T${departureTime}`);
    const arrival = new Date(departure.getTime() + routeInfo.duration_minutes * 60000);
    
    return arrival.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Journey Overview Header */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Route className="h-5 w-5 text-blue-600" />
            Journey Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Route Summary */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-lg font-semibold">{fromCity} → {toCity}</div>
              {routeInfo?.route_type && (
                <Badge variant="outline" className="text-xs">
                  {routeInfo.route_type}
                </Badge>
              )}
            </div>
            {isPassengerView && pricePerSeat && (
              <div className="text-right">
                <div className="text-xl font-bold text-green-600 flex items-center">
                  <IndianRupee className="h-4 w-4" />
                  {totalPrice || pricePerSeat}
                </div>
                <div className="text-xs text-gray-500">
                  {selectedSeats.length > 0 ? `${selectedSeats.length} seat(s)` : 'per seat'}
                </div>
              </div>
            )}
          </div>

          {/* Journey Timeline */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="space-y-3">
              {/* Departure */}
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium text-sm">{fromCity} Departure</div>
                      <div className="text-xs text-gray-600">{formatDate(departureDate)}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-700">{formatTime(departureTime)}</div>
                      <div className="text-xs text-gray-500">Departure</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Journey Line */}
              <div className="ml-1.5 flex items-center gap-2">
                <div className="border-l-2 border-gray-300 h-6"></div>
                <div className="flex-1 flex items-center gap-4 text-xs text-gray-600">
                  {routeInfo && (
                    <>
                      <div className="flex items-center gap-1">
                        <Navigation className="h-3 w-3" />
                        {routeInfo.distance_km.toFixed(1)} km
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDuration(routeInfo.duration_minutes)}
                      </div>
                      {routeInfo.traffic_level && (
                        <Badge variant="outline" className={`text-xs ${getTrafficColor(routeInfo.traffic_level)}`}>
                          {routeInfo.traffic_level} traffic
                        </Badge>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Arrival */}
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium text-sm">{toCity} Arrival</div>
                      <div className="text-xs text-gray-600">Estimated</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-blue-700">{getEstimatedArrival()}</div>
                      <div className="text-xs text-gray-500">Arrival</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Route Details */}
          {routeInfo && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <Navigation className="h-4 w-4 text-blue-600 mx-auto mb-1" />
                <div className="font-medium">{routeInfo.distance_km} km</div>
                <div className="text-xs text-blue-700">Distance</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <Clock className="h-4 w-4 text-purple-600 mx-auto mb-1" />
                <div className="font-medium">{formatDuration(routeInfo.duration_minutes)}</div>
                <div className="text-xs text-purple-700">Duration</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pickup and Drop Zones */}
      {(pickupZones.length > 0 || dropoffZones.length > 0) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Pickup & Drop Areas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Pickup Zones */}
            {pickupZones.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-sm font-medium">Pickup in {fromCity}</span>
                  <Badge variant="outline" className="text-xs">{pickupZones.length}</Badge>
                </div>
                <div className="space-y-1 ml-5">
                  {pickupZones.slice(0, 3).map((zone) => (
                    <div key={zone.id} className="text-sm">
                      <div className="font-medium text-green-900">{zone.zone_name}</div>
                      {zone.landmarks.length > 0 && (
                        <div className="text-xs text-green-700">
                          Near: {zone.landmarks.slice(0, 2).join(', ')}
                          {zone.landmarks.length > 2 && ` +${zone.landmarks.length - 2} more`}
                        </div>
                      )}
                    </div>
                  ))}
                  {pickupZones.length > 3 && (
                    <div className="text-xs text-gray-500">+{pickupZones.length - 3} more areas</div>
                  )}
                </div>
              </div>
            )}

            {/* Dropoff Zones */}
            {dropoffZones.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-sm font-medium">Drop in {toCity}</span>
                  <Badge variant="outline" className="text-xs">{dropoffZones.length}</Badge>
                </div>
                <div className="space-y-1 ml-5">
                  {dropoffZones.slice(0, 3).map((zone) => (
                    <div key={zone.id} className="text-sm">
                      <div className="font-medium text-blue-900">{zone.zone_name}</div>
                      {zone.landmarks.length > 0 && (
                        <div className="text-xs text-blue-700">
                          Near: {zone.landmarks.slice(0, 2).join(', ')}
                          {zone.landmarks.length > 2 && ` +${zone.landmarks.length - 2} more`}
                        </div>
                      )}
                    </div>
                  ))}
                  {dropoffZones.length > 3 && (
                    <div className="text-xs text-gray-500">+{dropoffZones.length - 3} more areas</div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Driver Information */}
      {driverInfo && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Driver & Vehicle
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Driver Details */}
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={driverInfo.avatar_url} alt={driverInfo.full_name} />
                <AvatarFallback className="bg-blue-100 text-blue-700">
                  {driverInfo.full_name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="font-medium">{driverInfo.full_name}</div>
                <div className="mt-1">
                  {renderStars(driverInfo.average_rating, driverInfo.total_ratings)}
                </div>
              </div>
              {onCallDriver && driverInfo.phone && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onCallDriver}
                  className="flex items-center gap-2"
                >
                  <Phone className="h-4 w-4" />
                  Call
                </Button>
              )}
            </div>

            {/* Vehicle Details */}
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Car className="h-4 w-4 text-gray-600" />
                  <div>
                    <div className="font-medium text-sm">
                      {driverInfo.vehicle_info.car_model} {driverInfo.vehicle_info.car_type}
                    </div>
                    <div className="text-xs text-gray-600">
                      {driverInfo.vehicle_info.color} • {driverInfo.vehicle_info.license_plate}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {driverInfo.vehicle_info.is_verified && (
                    <Badge variant="outline" className="text-xs bg-green-100 text-green-800">
                      <Shield className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  )}
                  <div className="text-center">
                    <div className="text-sm font-medium">{driverInfo.vehicle_info.seat_capacity}</div>
                    <div className="text-xs text-gray-500">seats</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Availability and Pricing */}
      {isPassengerView && (availableSeats !== undefined || selectedSeats.length > 0) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <IndianRupee className="h-4 w-4" />
              Booking Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Seat Availability */}
            {availableSeats !== undefined && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Available Seats</span>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant="outline" 
                    className={`${
                      availableSeats <= 2 
                        ? 'bg-orange-100 text-orange-800' 
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {availableSeats} left
                  </Badge>
                  {availableSeats <= 2 && (
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                  )}
                </div>
              </div>
            )}

            {/* Selected Seats */}
            {selectedSeats.length > 0 && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Selected Seats</span>
                  <span className="font-medium">{selectedSeats.length}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {selectedSeats.map((seatId) => (
                    <Badge key={seatId} variant="default" className="text-xs">
                      {seatId}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Pricing */}
            <Separator />
            <div className="space-y-2">
              {selectedSeats.length > 0 && pricePerSeat ? (
                <>
                  <div className="flex justify-between text-sm">
                    <span>Price per seat</span>
                    <span>₹{pricePerSeat}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Seats ({selectedSeats.length})</span>
                    <span>₹{pricePerSeat * selectedSeats.length}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center font-medium">
                    <span>Total Amount</span>
                    <span className="text-lg text-green-600">₹{totalPrice || (pricePerSeat * selectedSeats.length)}</span>
                  </div>
                </>
              ) : pricePerSeat && (
                <div className="flex justify-between items-center">
                  <span>Price per seat</span>
                  <span className="text-lg font-medium text-green-600">₹{pricePerSeat}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cost Breakdown (for route costs) */}
      {routeInfo && (routeInfo.toll_cost || routeInfo.fuel_cost) && !isPassengerView && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Fuel className="h-4 w-4" />
              Route Costs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {routeInfo.toll_cost && (
              <div className="flex justify-between text-sm">
                <span>Toll charges</span>
                <span>₹{routeInfo.toll_cost.toFixed(0)}</span>
              </div>
            )}
            {routeInfo.fuel_cost && (
              <div className="flex justify-between text-sm">
                <span>Estimated fuel</span>
                <span>₹{routeInfo.fuel_cost.toFixed(0)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-medium">
              <span>Total estimated cost</span>
              <span>₹{getTotalCost().toFixed(0)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Booking Action */}
      {showBookingButton && onBookingClick && (
        <Card>
          <CardContent className="p-4">
            <Button 
              onClick={onBookingClick} 
              className="w-full h-12 text-lg"
              disabled={availableSeats === 0}
            >
              {availableSeats === 0 ? 'Fully Booked' : 'Book This Ride'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RouteInfoPanel;