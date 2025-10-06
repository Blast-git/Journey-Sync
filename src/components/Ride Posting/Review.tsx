// ===========================================
// FIXED: Complete Review.tsx with zone integration
// The original file was cut off, here's the complete fixed version
// ===========================================

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft,
  CheckCircle,
  FileText,
  Route,
  DollarSign,
  RotateCcw,
  MapPin,
  Clock,
  Users,
  Car,
  AlertTriangle,
  TrendingUp,
  Eye,
  Edit3,
  Navigation,
  Fuel,
  IndianRupee,
  Layers,
} from "lucide-react";
import { format } from "date-fns";
import { mapUtils } from "@/components/maps/core/mapUtils";
import { type RideDetailsFormData } from "./RideDetails";
import {
  type SeatPricing,
  calculateTotalRevenue,
  getPricingStats,
} from "@/utils/seatLayoutUtils";
import type { RouteOption } from "@/types/mapTypes";

interface ReviewProps {
  rideDetails: RideDetailsFormData | null;
  seatPricing: SeatPricing | null;
  returnRide: any | null;
  onSubmit: () => void;
  onBack: () => void;
  onEdit?: (tabId: string) => void;
  selectedRoute?: RouteOption | null;
  loading: boolean;
  editData?: any;       
  isEditMode?: boolean;  
  // Zone array props for the new system
  pickupZoneIds: string[];
  dropoffZoneIds: string[];
  zonesConfigured: boolean;
  vehicleInfo?: {
    car_model: string;
    license_plate: string;
    vehicle_type: string;
  };
}

export const Review: React.FC<ReviewProps> = ({
  rideDetails,
  seatPricing,
  returnRide,
  onSubmit,
  onBack,
  onEdit,
  selectedRoute,
  loading,
  vehicleInfo,
  editData,
  isEditMode = false,
  // Zone arrays
  pickupZoneIds,
  dropoffZoneIds,
  zonesConfigured,
}) => {
  const { toast } = useToast();
  const [vehicleData, setVehicleData] = useState(vehicleInfo);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  // Zone details state
  const [zoneDetails, setZoneDetails] = useState<{
    pickupZones: any[];
    dropoffZones: any[];
    loading: boolean;
  }>({
    pickupZones: [],
    dropoffZones: [],
    loading: false
  });

  // Check if return ride is actually enabled and has data
  const hasReturnRide = returnRide?.enableReturnRide === true && (
    returnRide?.returnRideId || // If return ride was created
    (returnRide?.returnDate && returnRide?.returnTime) // Or if form data exists
  );

  // Route information from selectedRoute or editData
  const routeInfo = selectedRoute || (editData?.route_polyline ? {
    id: `edit_route_${editData.id}`,
    route_type: 'standard',
    polyline: editData.route_polyline,
    distance_km: editData.route_distance_km || 0,
    duration_minutes: editData.route_duration_minutes || 0,
    toll_cost: 0,
    fuel_cost: 0,
    traffic_level: 'medium',
    waypoints: [],
    is_selected: true,
  } as RouteOption : null);

  // Calculate route costs and profits
  const routeDistance = routeInfo?.distance_km || 0;
  const routeDuration = routeInfo?.duration_minutes || 0;
  const routeCost = routeInfo ? (routeInfo.toll_cost + routeInfo.fuel_cost) : 0;

  // Load zone details for display
  useEffect(() => {
    const loadZoneDetails = async () => {
      if (pickupZoneIds.length === 0 && dropoffZoneIds.length === 0) return;

      setZoneDetails(prev => ({ ...prev, loading: true }));

      try {
        const allZoneIds = [...pickupZoneIds, ...dropoffZoneIds];
        
        const { data, error } = await supabase
          .from('city_zones')
          .select('*')
          .in('id', allZoneIds)
          .eq('is_active', true);

        if (error) throw error;

        const pickupZones = data?.filter(zone => 
          pickupZoneIds.includes(zone.id)
        ) || [];
        const dropoffZones = data?.filter(zone => 
          dropoffZoneIds.includes(zone.id)
        ) || [];

        setZoneDetails({
          pickupZones,
          dropoffZones,
          loading: false
        });
      } catch (error) {
        console.error('Failed to load zone details:', error);
        setZoneDetails(prev => ({ ...prev, loading: false }));
      }
    };

    loadZoneDetails();
  }, [pickupZoneIds, dropoffZoneIds]);

  // Fetch vehicle details if not provided
  useEffect(() => {
    const fetchVehicleData = async () => {
      if (!rideDetails?.vehicleId || vehicleData) return;

      try {
        const { data, error } = await supabase
          .from("vehicles")
          .select("car_model, license_plate, vehicle_types(name)")
          .eq("id", rideDetails.vehicleId)
          .single();

        if (error) throw error;

        setVehicleData({
          car_model: data.car_model,
          license_plate: data.license_plate,
          vehicle_type: data.vehicle_types?.name || "Unknown",
        });
      } catch (error) {
        console.error("Error fetching vehicle data:", error);
      }
    };

    fetchVehicleData();
  }, [rideDetails?.vehicleId, vehicleData]);

  // Validate all data including zones
  useEffect(() => {
    const errors: string[] = [];

    if (!rideDetails) {
      errors.push("Ride details are missing");
    } else {
      if (!rideDetails.fromCity || !rideDetails.toCity) {
        errors.push("Route information is incomplete");
      }
      if (!rideDetails.departureDate || !rideDetails.departureTime) {
        errors.push("Schedule information is missing");
      }
      if (!rideDetails.vehicleId) {
        errors.push("Vehicle selection is required");
      }
    }

    if (!seatPricing || Object.keys(seatPricing).length === 0) {
      errors.push("Seat pricing is not configured");
    }

    // Zone validation for new rides
    if (!isEditMode && (!zonesConfigured || pickupZoneIds.length === 0 || dropoffZoneIds.length === 0)) {
      errors.push("Pickup and dropoff zones not configured");
    }

    // Only require route selection for new rides
    if (!isEditMode && !selectedRoute) {
      errors.push("Route not selected");
    }

    // Only validate return ride if it's enabled
    if (returnRide?.enableReturnRide === true) {
      if (!returnRide.returnDate || !returnRide.returnTime) {
        errors.push("Return ride schedule is incomplete");
      }
    }

    setValidationErrors(errors);
  }, [rideDetails, seatPricing, returnRide, selectedRoute, isEditMode, zonesConfigured, pickupZoneIds, dropoffZoneIds]);

  // Calculate pricing statistics
  const pricingStats = seatPricing ? getPricingStats(seatPricing) : null;
  const totalRevenue = seatPricing ? calculateTotalRevenue(seatPricing) : 0;
  const availableSeats = seatPricing ? Object.keys(seatPricing).length : 0;
  const averagePrice = availableSeats > 0 ? Math.round(totalRevenue / availableSeats) : 0;
  
  // Calculate profit metrics
  const netProfit = totalRevenue - routeCost;
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  const handleSubmit = async () => {
    if (validationErrors.length > 0) {
      toast({
        title: "Validation Failed",
        description: "Please fix all errors before submitting",
        variant: "destructive",
      });
      return;
    }

    console.log("Starting Review handleSubmit");
    console.log("Ride Details:", rideDetails);
    console.log("Seat Pricing:", seatPricing);
    console.log("Selected Route:", selectedRoute);
    console.log("Return Ride:", returnRide);
    console.log("Zone Configuration:", { pickupZoneIds, dropoffZoneIds, zonesConfigured });

    // Call the parent's onSubmit function
    onSubmit();
  };

  if (!rideDetails) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No Data to Review
        </h3>
        <p className="text-gray-600 mb-4">
          Please complete the previous steps first.
        </p>
        <Button variant="outline" onClick={onBack}>
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {isEditMode ? "Review Changes" : "Review & Confirm"}
        </h2>
        <p className="text-gray-600">
          {isEditMode 
            ? "Review your changes before updating" 
            : "Please review all details before posting your ride"
          }
        </p>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <div className="font-semibold">
                Please fix the following issues:
              </div>
              <ul className="list-disc list-inside space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index} className="text-sm">
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6">
        {/* Main Ride Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Main Ride Details
              </div>
              {onEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit("rideDetails")}
                  className="flex items-center gap-1"
                >
                  <Edit3 className="h-3 w-3" />
                  Edit
                </Button>
              )}
            </CardTitle>
            <CardDescription>Your primary ride information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Route Information */}
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                <Route className="h-4 w-4" />
                Route
              </h4>
              <div className="flex items-center justify-center p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="text-center">
                    <div className="font-semibold text-blue-900 capitalize">
                      {rideDetails.fromCity}
                    </div>
                    <div className="text-xs text-blue-600">From</div>
                  </div>
                  <Route className="h-5 w-5 text-blue-600" />
                  <div className="text-center">
                    <div className="font-semibold text-blue-900 capitalize">
                      {rideDetails.toCity}
                    </div>
                    <div className="text-xs text-blue-600">To</div>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Schedule & Vehicle */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Schedule
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date:</span>
                    <span className="font-medium">
                      {format(rideDetails.departureDate, "PPP")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Time:</span>
                    <span className="font-medium">
                      {rideDetails.departureTime}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                  <Car className="h-4 w-4" />
                  Vehicle
                </h4>
                {vehicleData ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Model:</span>
                      <span className="font-medium">
                        {vehicleData.car_model}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Plate:</span>
                      <span className="font-medium">
                        {vehicleData.license_plate}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Type:</span>
                      <Badge variant="outline">
                        {vehicleData.vehicle_type}
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">
                    Loading vehicle details...
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Capacity */}
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Capacity
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Available Seats:</span>
                  <Badge variant="default">
                    {availableSeats}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Average Price:</span>
                  <span className="font-medium">
                    ₹{averagePrice}
                  </span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {rideDetails.notes && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="font-semibold text-gray-800">
                    Additional Notes
                  </h4>
                  <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                    {rideDetails.notes}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Zone Configuration Display */}
        {zonesConfigured && (pickupZoneIds.length > 0 || dropoffZoneIds.length > 0) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-green-600" />
                  Zone Configuration
                </div>
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit("rideDetails")}
                    className="flex items-center gap-1"
                  >
                    <Edit3 className="h-3 w-3" />
                    Edit
                  </Button>
                )}
              </CardTitle>
              <CardDescription>
                Configured pickup and dropoff zones along route corridors
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Pickup Zones */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <h4 className="font-semibold text-green-800">
                      Pickup Zones in {rideDetails.fromCity}
                    </h4>
                    <Badge variant="outline" className="text-green-700">
                      {pickupZoneIds.length}
                    </Badge>
                  </div>
                  
                  {zoneDetails.loading ? (
                    <div className="text-sm text-gray-500">Loading zone details...</div>
                  ) : (
                    <div className="space-y-2">
                      {zoneDetails.pickupZones.map((zone) => (
                        <div key={zone.id} className="p-3 bg-green-50 rounded-lg border border-green-200">
                          <div className="font-medium text-green-900 text-sm">
                            {zone.zone_name}
                          </div>
                          {zone.description && (
                            <div className="text-xs text-green-700 mt-1">
                              {zone.description}
                            </div>
                          )}
                          {zone.landmarks && zone.landmarks.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {zone.landmarks.slice(0, 3).map((landmark, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs bg-green-100 text-green-800">
                                  {landmark}
                                </Badge>
                              ))}
                              {zone.landmarks.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{zone.landmarks.length - 3}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Dropoff Zones */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <h4 className="font-semibold text-blue-800">
                      Dropoff Zones in {rideDetails.toCity}
                    </h4>
                    <Badge variant="outline" className="text-blue-700">
                      {dropoffZoneIds.length}
                    </Badge>
                  </div>
                  
                  {zoneDetails.loading ? (
                    <div className="text-sm text-gray-500">Loading zone details...</div>
                  ) : (
                    <div className="space-y-2">
                      {zoneDetails.dropoffZones.map((zone) => (
                        <div key={zone.id} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="font-medium text-blue-900 text-sm">
                            {zone.zone_name}
                          </div>
                          {zone.description && (
                            <div className="text-xs text-blue-700 mt-1">
                              {zone.description}
                            </div>
                          )}
                          {zone.landmarks && zone.landmarks.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {zone.landmarks.slice(0, 3).map((landmark, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                                  {landmark}
                                </Badge>
                              ))}
                              {zone.landmarks.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{zone.landmarks.length - 3}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Zone Summary */}
              <Separator />
              <div className="flex items-center justify-center p-3 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <div className="text-sm text-gray-600">Total Coverage</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {pickupZoneIds.length} pickup + {dropoffZoneIds.length} dropoff zones
                  </div>
                  <Badge variant="outline" className="mt-1">
                    Route Corridor Based
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Route Analysis */}
        {routeInfo && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Navigation className="h-5 w-5 text-purple-600" />
                  Route Analysis
                </div>
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit("routeVisualization")}
                    className="flex items-center gap-1"
                  >
                    <Edit3 className="h-3 w-3" />
                    Edit
                  </Button>
                )}
              </CardTitle>
              <CardDescription>
                Selected route information and cost analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Route Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="text-xl font-bold text-blue-700">
                    {routeDistance.toFixed(1)}
                  </div>
                  <div className="text-xs text-blue-600">Kilometers</div>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="text-xl font-bold text-green-700">
                    {mapUtils.formatDuration(routeDuration)}
                  </div>
                  <div className="text-xs text-green-600">Duration</div>
                </div>
                <div className="p-3 bg-orange-50 rounded-lg">
                  <div className="text-xl font-bold text-orange-700">
                    ₹{routeCost.toFixed(0)}
                  </div>
                  <div className="text-xs text-orange-600">Route Cost</div>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <Badge variant="outline" className="text-sm">
                    {routeInfo.route_type}
                  </Badge>
                  <div className="text-xs text-purple-600 mt-1">Route Type</div>
                </div>
              </div>

              {/* Detailed Route Costs */}
              {selectedRoute && (
                <>
                  <Separator />
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Toll Cost:</span>
                      <span className="font-medium flex items-center gap-1">
                        <IndianRupee className="h-3 w-3" />
                        {selectedRoute.toll_cost.toFixed(0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Fuel Cost:</span>
                      <span className="font-medium flex items-center gap-1">
                        <Fuel className="h-3 w-3" />
                        ₹{selectedRoute.fuel_cost.toFixed(0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Traffic Level:</span>
                      <Badge 
                        variant={
                          selectedRoute.traffic_level === 'low' ? 'default' :
                          selectedRoute.traffic_level === 'medium' ? 'secondary' : 'destructive'
                        }
                      >
                        {selectedRoute.traffic_level}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Cost per KM:</span>
                      <span className="font-medium">
                        ₹{routeDistance > 0 ? (routeCost / routeDistance).toFixed(1) : '0'}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Financial Analysis */}
        {seatPricing && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  Financial Analysis
                </div>
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit("seatPricing")}
                    className="flex items-center gap-1"
                  >
                    <Edit3 className="h-3 w-3" />
                    Edit
                  </Button>
                )}
              </CardTitle>
              <CardDescription>
                Revenue optimization and profit analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Revenue vs Cost Analysis */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-700">
                    ₹{totalRevenue}
                  </div>
                  <div className="text-sm text-green-600">Total Revenue</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-700">
                    ₹{routeCost.toFixed(0)}
                  </div>
                  <div className="text-sm text-red-600">Route Costs</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-700">
                    ₹{netProfit.toFixed(0)}
                  </div>
                  <div className="text-sm text-blue-600">Net Profit</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-700">
                    {profitMargin.toFixed(1)}%
                  </div>
                  <div className="text-sm text-purple-600">Profit Margin</div>
                </div>
              </div>

              <Separator />

              {/* Seat-wise Pricing */}
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-800">
                  Seat-wise Pricing
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.entries(seatPricing).map(([seatId, price]) => (
                    <div
                      key={seatId}
                      className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                    >
                      <span className="font-medium text-gray-800">
                        Seat {seatId}
                      </span>
                      <Badge variant="outline" className="ml-2">
                        ₹{price}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pricing Statistics */}
              {pricingStats && (
                <>
                  <Separator />
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                    <div className="text-center">
                      <div className="font-semibold text-gray-900">
                        ₹{pricingStats.min}
                      </div>
                      <div className="text-gray-600">Lowest Price</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-gray-900">
                        ₹{Math.round(pricingStats.average)}
                      </div>
                      <div className="text-gray-600">Average Price</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-gray-900">
                        ₹{pricingStats.max}
                      </div>
                      <div className="text-gray-600">Highest Price</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-gray-900">
                        {availableSeats}
                      </div>
                      <div className="text-gray-600">Total Seats</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-gray-900">
                        ₹{Math.round(totalRevenue / availableSeats)}
                      </div>
                      <div className="text-gray-600">Per Seat Avg</div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Return Ride Summary */}
        {hasReturnRide && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RotateCcw className="h-5 w-5 text-purple-600" />
                  Return Journey
                </div>
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit("returnRideForm")}
                    className="flex items-center gap-1"
                  >
                    <Edit3 className="h-3 w-3" />
                    Edit
                  </Button>
                )}
              </CardTitle>
              <CardDescription>
                Automatic return ride configuration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <h4 className="font-semibold text-gray-800">Return Route</h4>
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <div className="flex items-center justify-center">
                      <span className="font-medium text-purple-900">
                        {rideDetails.toCity} → {rideDetails.fromCity}
                      </span>
                    </div>
                    <div className="text-xs text-purple-700 text-center mt-1">
                      Zones automatically swapped
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-semibold text-gray-800">Return Schedule</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date:</span>
                      <span className="font-medium">
                        {returnRide.returnDate ? format(new Date(returnRide.returnDate), "PPP") : "Not set"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Time:</span>
                      <span className="font-medium">
                        {returnRide.returnTime || "Not set"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Return Revenue Potential */}
              <Separator />
              <div className="text-center p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
                <div className="text-lg font-bold text-purple-700">
                  ₹{totalRevenue * 2}
                </div>
                <div className="text-sm text-purple-600">
                  Total Revenue Potential (Both Ways)
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  Return ride uses same pricing and swapped zones
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between pt-6 border-t">
        <Button
          variant="outline"
          onClick={onBack}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <Button
          onClick={handleSubmit}
          disabled={loading || validationErrors.length > 0}
          className="flex items-center gap-2 min-w-[180px]"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              {isEditMode ? "Updating..." : "Posting..."}
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4" />
              {isEditMode ? "Update Ride" : "Post Ride"}
            </>
          )}
        </Button>
      </div>
    </div>
  );
};