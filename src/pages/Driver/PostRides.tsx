import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  FileText,
  Route,
  DollarSign,
  RotateCcw,
  CheckCircle,
  ArrowLeft,
  MapPin,
  Clock,
  AlertCircle,
  Eye,
} from "lucide-react";

// Import your actual tab components
import RideDetails, {
  type RideDetailsFormData,
} from "@/components/Ride Posting/RideDetails";
import { RouteVisualizationMap } from "@/components/maps/driver/PostRide/RouteVisualizationMap";
import { PickupDropPointsMap } from "@/components/maps/driver/PostRide/PickupDropPointMap";
import SeatPricing from "@/components/Ride Posting/seatPricing";
import { ReturnRideForm } from "@/components/Ride Posting/ReturnRideForm";
import { Review } from "@/components/Ride Posting/Review";
import type { RouteOption } from "@/types/mapTypes";

// Define types
type SeatPricingData = { [seatId: string]: number };

// Updated Tab configuration - zone configuration is now visualization only
const TABS = [
  {
    id: "rideDetails",
    label: "Ride Details",
    shortLabel: "Details",
    icon: FileText,
    description: "Enter ride info & select zones",
  },
  {
    id: "routeVisualization",
    label: "Route Preview",
    shortLabel: "Route",
    icon: Route,
    description: "Visualize your journey",
  },
  {
    id: "zoneConfiguration",
    label: "Zone Review",
    shortLabel: "Review",
    icon: Eye,
    description: "Review zone configuration",
  },
  {
    id: "seatPricing",
    label: "Seat Pricing",
    shortLabel: "Pricing",
    icon: DollarSign,
    description: "Set individual seat prices",
  },
  {
    id: "returnRideForm",
    label: "Return Journey",
    shortLabel: "Return",
    icon: RotateCcw,
    description: "Optional return trip",
  },
  {
    id: "review",
    label: "Review & Post",
    shortLabel: "Review",
    icon: CheckCircle,
    description: "Final confirmation",
  },
] as const;

type TabId = (typeof TABS)[number]["id"];

// Updated interface to support zone arrays
interface PostRidesState {
  rideDetails: RideDetailsFormData | null;
  seatPricing: SeatPricingData | null;
  returnRide: any | null;
  vehicleTypeId: string | null;
  seatLayout: any | null;
  selectedRoute: RouteOption | null;
  // Updated zone configuration for arrays
  pickupZoneIds: string[];
  dropoffZoneIds: string[];
  zonesConfigured: boolean;
}

export const PostRides: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // Get edit data from router state
  const editData = location.state?.editData;
  const mode = location.state?.mode;
  const isEditMode = mode === "edit" && editData;

  // State management
  const [currentTab, setCurrentTab] = useState<TabId>("rideDetails");
  const [loading, setLoading] = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  // Updated initial state for zone arrays
  const [formData, setFormData] = useState<PostRidesState>({
    rideDetails: null,
    seatPricing: null,
    returnRide: null,
    vehicleTypeId: null,
    seatLayout: null,
    selectedRoute: null,
    pickupZoneIds: [],
    dropoffZoneIds: [],
    zonesConfigured: false,
  });

  // Tab completion tracking
  const [completedTabs, setCompletedTabs] = useState<Set<TabId>>(new Set());

  // Initialize form data with edit data if available
  useEffect(() => {
    const loadEditData = async () => {
      if (isEditMode && editData) {
        const initialRideDetails: RideDetailsFormData = {
          fromCity: editData.from_city || "",
          toCity: editData.to_city || "",
          departureDate: editData.departure_date
            ? new Date(editData.departure_date)
            : new Date(),
          departureTime: editData.departure_time || "",
          pickupZoneIds: [], // Will be loaded from ride_zones
          dropoffZoneIds: [], // Will be loaded from ride_zones
          vehicleId: editData.vehicle_id || "",
          notes: editData.notes || "",
        };

        // Load existing zone selections for edit mode
        let pickupZoneIds: string[] = [];
        let dropoffZoneIds: string[] = [];
        let zonesConfigured = false;

        if (editData.id) {
          try {
            const { data: rideZones, error } = await supabase
              .from("ride_zones")
              .select("zone_id, zone_type")
              .eq("ride_id", editData.id);

            if (!error && rideZones) {
              pickupZoneIds = rideZones
                .filter((rz) => rz.zone_type === "pickup")
                .map((rz) => rz.zone_id);
              dropoffZoneIds = rideZones
                .filter((rz) => rz.zone_type === "dropoff")
                .map((rz) => rz.zone_id);
              zonesConfigured =
                pickupZoneIds.length > 0 && dropoffZoneIds.length > 0;

              // Update the ride details with loaded zones
              initialRideDetails.pickupZoneIds = pickupZoneIds;
              initialRideDetails.dropoffZoneIds = dropoffZoneIds;
            }
          } catch (error) {
            console.error("Failed to load existing zones:", error);
          }
        }

        setFormData((prev) => ({
          ...prev,
          rideDetails: initialRideDetails,
          vehicleTypeId: editData.vehicle_type_id || null,
          seatLayout: editData.seat_layout || null,
          seatPricing: editData.seat_pricing || null,
          pickupZoneIds,
          dropoffZoneIds,
          zonesConfigured,
          // Reconstruct route from edit data if available
          selectedRoute: editData.route_polyline
            ? ({
                id: `edit_route_${editData.id}`,
                route_type: "fastest",
                polyline: editData.route_polyline,
                distance_km: editData.route_distance_km || 0,
                duration_minutes: editData.route_duration_minutes || 0,
                toll_cost: 0,
                fuel_cost: 0,
                traffic_level: "medium",
                waypoints: [],
                is_selected: true,
              } as RouteOption)
            : null,
        }));

        // Mark tabs as completed if we have data
        const completed = new Set<TabId>(["rideDetails"]);
        if (editData.from_city && editData.to_city) {
          completed.add("routeVisualization");
        }
        if (zonesConfigured) {
          completed.add("zoneConfiguration");
        }
        if (editData.seat_pricing) {
          completed.add("seatPricing");
        }
        setCompletedTabs(completed);
      }
    };

    loadEditData();
  }, [isEditMode, editData]);

  // Calculate progress
  const calculateProgress = () => {
    const currentIndex = TABS.findIndex((tab) => tab.id === currentTab);
    return ((currentIndex + 1) / TABS.length) * 100;
  };

  // Updated tab accessibility logic
  const getTabAccessibility = (tabId: TabId): boolean => {
    switch (tabId) {
      case "rideDetails":
        return true;
      case "routeVisualization":
        return (
          !!(
            formData.rideDetails?.fromCity &&
            formData.rideDetails?.toCity &&
            formData.rideDetails?.pickupZoneIds?.length > 0 &&
            formData.rideDetails?.dropoffZoneIds?.length > 0
          ) || !!(isEditMode && editData?.from_city && editData?.to_city)
        );
      case "zoneConfiguration":
        return (
          !!(
            formData.rideDetails?.fromCity &&
            formData.rideDetails?.toCity &&
            formData.rideDetails?.pickupZoneIds?.length > 0 &&
            formData.rideDetails?.dropoffZoneIds?.length > 0 &&
            formData.selectedRoute
          ) || !!(isEditMode && editData?.from_city && editData?.to_city)
        );
      case "seatPricing":
        return (
          !!(
            formData.rideDetails?.vehicleId &&
            formData.selectedRoute &&
            formData.zonesConfigured
          ) || !!(isEditMode && editData?.vehicle_id)
        );
      case "returnRideForm":
        return !!formData.seatPricing || !!(isEditMode && editData);
      case "review":
        return (
          !!(
            formData.rideDetails &&
            formData.seatPricing &&
            formData.selectedRoute &&
            formData.zonesConfigured
          ) || !!(isEditMode && editData)
        );
      default:
        return false;
    }
  };

  // Fetch vehicle type information when ride details change
  useEffect(() => {
    const fetchVehicleType = async () => {
      if (!formData.rideDetails?.vehicleId) return;

      try {
        const { data: vehicle, error: vehicleError } = await supabase
          .from("vehicles")
          .select("vehicle_type_id, seat_capacity")
          .eq("id", formData.rideDetails.vehicleId)
          .single();

        if (vehicleError) {
          console.error("Vehicle fetch error:", vehicleError);
          return;
        }

        if (vehicle?.vehicle_type_id) {
          const { data: vehicleType, error: typeError } = await supabase
            .from("vehicle_types")
            .select("*")
            .eq("id", vehicle.vehicle_type_id)
            .single();

          if (typeError) {
            console.error("Vehicle type fetch error:", typeError);
            return;
          }

          if (vehicleType) {
            setFormData((prev) => ({
              ...prev,
              vehicleTypeId: vehicle.vehicle_type_id,
              seatLayout: vehicleType.layout_config,
            }));
          }
        }
      } catch (error) {
        console.error("Error in fetchVehicleType:", error);
      }
    };

    fetchVehicleType();
  }, [formData.rideDetails?.vehicleId]);

  // Handle tab navigation
  const handleTabChange = (tabId: TabId) => {
    if (getTabAccessibility(tabId)) {
      setCurrentTab(tabId);
    }
  };

  // Updated handleNext with zone array support
  const handleNext = (tabId: TabId, data?: any) => {
    // Mark current tab as completed
    setCompletedTabs((prev) => new Set([...prev, currentTab]));

    // Update form data if provided
    if (data) {
      if (tabId === "rideDetails") {
        // Extract zone arrays from ride details
        const rideDetailsData = data as RideDetailsFormData;
        setFormData((prev) => ({
          ...prev,
          rideDetails: rideDetailsData,
          pickupZoneIds: rideDetailsData.pickupZoneIds || [],
          dropoffZoneIds: rideDetailsData.dropoffZoneIds || [],
          zonesConfigured:
            (rideDetailsData.pickupZoneIds?.length > 0 &&
              rideDetailsData.dropoffZoneIds?.length > 0) ||
            false,
        }));
      } else {
        setFormData((prev) => ({
          ...prev,
          [tabId === "seatPricing"
            ? "seatPricing"
            : tabId === "returnRideForm"
            ? "returnRide"
            : tabId]: data,
        }));
      }
    }

    // Navigate to next tab - skip zoneConfiguration if zones are already configured in RideDetails
    const currentIndex = TABS.findIndex((tab) => tab.id === currentTab);
    if (currentIndex < TABS.length - 1) {
      let nextTab = TABS[currentIndex + 1].id;

      // Skip zone configuration if zones are already set and route is selected
      if (
        nextTab === "zoneConfiguration" &&
        formData.zonesConfigured &&
        formData.selectedRoute
      ) {
        nextTab = TABS[currentIndex + 2]?.id || nextTab;
      }

      setCurrentTab(nextTab);
    }
  };

  // Handle back navigation
  const handleBack = () => {
    const currentIndex = TABS.findIndex((tab) => tab.id === currentTab);
    if (currentIndex > 0) {
      const prevTab = TABS[currentIndex - 1].id;
      setCurrentTab(prevTab);
    }
  };

  // Handle route selection from RouteVisualizationMap
  const handleRouteSelected = (route: RouteOption) => {
    setFormData((prev) => ({
      ...prev,
      selectedRoute: route,
    }));

    setRouteError(null);

    toast({
      title: "Route Selected",
      description: `${
        route.route_type
      } route selected - ${route.distance_km.toFixed(1)} km, ₹${(
        route.toll_cost + route.fuel_cost
      ).toFixed(0)} total cost`,
    });
  };

  // Handle route save (optional - for future use)
  const handleRouteSaved = (routeId: string) => {
    console.log("Route saved with ID:", routeId);
    toast({
      title: "Route Saved",
      description: "Route has been saved successfully",
    });
  };

  // Handle continuing from route visualization
  const handleContinueFromRoute = () => {
    if (!formData.selectedRoute) {
      setRouteError("Please select a route before continuing");
      return;
    }

    setCompletedTabs((prev) => new Set([...prev, "routeVisualization"]));
    setCurrentTab("zoneConfiguration");
    setRouteError(null);
  };

  // Handle continuing from zone configuration (visualization)
  const handleContinueFromZones = () => {
    if (
      !formData.zonesConfigured ||
      formData.pickupZoneIds.length === 0 ||
      formData.dropoffZoneIds.length === 0
    ) {
      toast({
        title: "Error",
        description:
          "Please configure pickup and dropoff zones in the ride details first",
        variant: "destructive",
      });
      return;
    }

    setCompletedTabs((prev) => new Set([...prev, "zoneConfiguration"]));
    setCurrentTab("seatPricing");
  };

  // Validate route selection
  const validateRouteSelection = (): boolean => {
    const fromCity = formData.rideDetails?.fromCity || editData?.from_city;
    const toCity = formData.rideDetails?.toCity || editData?.to_city;

    if (!fromCity || !toCity) {
      setRouteError("Please complete ride details first");
      return false;
    }

    if (!formData.selectedRoute) {
      setRouteError("Please select a route to continue");
      return false;
    }

    return true;
  };

  // Updated form submission with zone arrays
  const handleSubmit = async () => {
    console.log("🔍 DEBUG: Starting handleSubmit");
    console.log("🔍 DEBUG: User ID:", user?.id);
    console.log("🔍 DEBUG: Form data:", JSON.stringify(formData, null, 2));

    if (!user || !formData.rideDetails) {
      console.log("❌ DEBUG: Missing user or ride details");
      toast({
        title: "Error",
        description: "Missing required data. Please complete all steps.",
        variant: "destructive",
      });
      return;
    }

    // Validate route selection for new rides
    if (!isEditMode && !formData.selectedRoute) {
      toast({
        title: "Error",
        description: "Please select a route before submitting.",
        variant: "destructive",
      });
      return;
    }

    // Validate zone configuration for new rides
    if (
      !isEditMode &&
      (!formData.zonesConfigured ||
        formData.pickupZoneIds.length === 0 ||
        formData.dropoffZoneIds.length === 0)
    ) {
      toast({
        title: "Error",
        description:
          "Please configure pickup and dropoff zones before submitting.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Enhanced validation based on your table structure
      const validationErrors = [];

      if (!user.id) {
        validationErrors.push("User ID is missing");
      }
      if (!formData.rideDetails.vehicleId) {
        validationErrors.push("Vehicle ID is missing");
      }
      if (!formData.rideDetails.fromCity || !formData.rideDetails.toCity) {
        validationErrors.push("Cities are missing");
      }
      if (!formData.rideDetails.departureDate) {
        validationErrors.push("Departure date is missing");
      }
      if (!formData.rideDetails.departureTime) {
        validationErrors.push("Departure time is missing");
      }
      if (
        !formData.seatPricing ||
        Object.keys(formData.seatPricing).length === 0
      ) {
        validationErrors.push("Seat pricing is missing");
      }

      if (validationErrors.length > 0) {
        console.log("❌ DEBUG: Validation errors:", validationErrors);
        toast({
          title: "Validation Error",
          description: validationErrors.join(", "),
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Calculate available seats from seat pricing
      const availableSeats = formData.seatPricing
        ? Object.keys(formData.seatPricing).length
        : 1;

      const totalRevenue = formData.seatPricing
        ? Object.values(formData.seatPricing).reduce(
            (sum, price) => sum + price,
            0
          )
        : 0;
      const pricePerSeat =
        availableSeats > 0 ? Math.round(totalRevenue / availableSeats) : 0;

      // Create departure timestamp by combining date and time
      const departureDateTime = new Date(formData.rideDetails.departureDate);
      const [hours, minutes] = formData.rideDetails.departureTime.split(":");
      departureDateTime.setHours(parseInt(hours, 10));
      departureDateTime.setMinutes(parseInt(minutes, 10));
      departureDateTime.setSeconds(0);
      departureDateTime.setMilliseconds(0);

      // Prepare main ride data - includes route information
      const mainRideData = {
        driver_id: user.id,
        vehicle_id: formData.rideDetails.vehicleId,
        vehicle_type_id: formData.vehicleTypeId || null,
        from_city: formData.rideDetails.fromCity,
        to_city: formData.rideDetails.toCity,
        departure_date: formData.rideDetails.departureDate
          .toISOString()
          .split("T")[0], // Date only (YYYY-MM-DD)
        departure_time: formData.rideDetails.departureTime, // Time only (HH:MM)
        departure_timestamp: departureDateTime.toISOString(), // Full timestamp (ISO format)
        pickup_point: "Multiple Zones", // Updated for zone-based rides
        available_seats: availableSeats,
        price_per_seat: pricePerSeat,
        seat_layout: formData.seatLayout || null,
        seat_pricing: formData.seatPricing || null,
        notes: formData.rideDetails.notes || null,
        status: "active",
        // Include route information if available
        route_polyline: formData.selectedRoute?.polyline || null,
        route_distance_km: formData.selectedRoute?.distance_km || null,
        route_duration_minutes:
          formData.selectedRoute?.duration_minutes || null,
      };

      console.log(
        "🚀 DEBUG: Main ride data to insert:",
        JSON.stringify(mainRideData, null, 2)
      );

      let result;
      if (isEditMode && editData) {
        console.log("📝 DEBUG: Updating existing ride:", editData.id);
        const { data: updatedRide, error: updateError } = await supabase
          .from("rides")
          .update(mainRideData)
          .eq("id", editData.id)
          .select()
          .single();

        if (updateError) {
          console.log(
            "❌ DEBUG: Update error:",
            JSON.stringify(updateError, null, 2)
          );
          throw updateError;
        }
        result = updatedRide;

        // Update ride zones for edit mode
        if (
          formData.pickupZoneIds.length > 0 &&
          formData.dropoffZoneIds.length > 0
        ) {
          // Delete existing zones
          await supabase.from("ride_zones").delete().eq("ride_id", editData.id);

          // Insert new zones
          const zoneInserts = [
            ...formData.pickupZoneIds.map((zoneId) => ({
              ride_id: editData.id,
              zone_id: zoneId,
              zone_type: "pickup",
            })),
            ...formData.dropoffZoneIds.map((zoneId) => ({
              ride_id: editData.id,
              zone_id: zoneId,
              zone_type: "dropoff",
            })),
          ];

          const { error: zoneError } = await supabase
            .from("ride_zones")
            .insert(zoneInserts);

          if (zoneError) {
            console.error("Failed to update ride zones:", zoneError);
          }
        }

        console.log("✅ DEBUG: Ride updated successfully");
      } else {
        console.log("➕ DEBUG: Inserting new ride");

        const { data: newRide, error: insertError } = await supabase
          .from("rides")
          .insert(mainRideData)
          .select()
          .single();

        if (insertError) {
          console.log(
            "❌ DEBUG: Insert error:",
            JSON.stringify(insertError, null, 2)
          );

          // Handle specific error types
          if (insertError.code === "42501") {
            toast({
              title: "Permission Denied",
              description:
                "You don't have permission to create rides. Please contact support.",
              variant: "destructive",
            });
            setLoading(false);
            return;
          }

          if (insertError.code === "23503") {
            toast({
              title: "Invalid Reference",
              description:
                "Vehicle or user reference is invalid. Please refresh and try again.",
              variant: "destructive",
            });
            setLoading(false);
            return;
          }

          if (insertError.code === "23505") {
            toast({
              title: "Duplicate Entry",
              description: "A ride with these details already exists.",
              variant: "destructive",
            });
            setLoading(false);
            return;
          }

          throw insertError;
        }
        result = newRide;

        // Save ride zones for new rides
        if (
          formData.pickupZoneIds.length > 0 &&
          formData.dropoffZoneIds.length > 0 &&
          result.id
        ) {
          const zoneInserts = [
            ...formData.pickupZoneIds.map((zoneId) => ({
              ride_id: result.id,
              zone_id: zoneId,
              zone_type: "pickup",
            })),
            ...formData.dropoffZoneIds.map((zoneId) => ({
              ride_id: result.id,
              zone_id: zoneId,
              zone_type: "dropoff",
            })),
          ];

          const { error: zoneError } = await supabase
            .from("ride_zones")
            .insert(zoneInserts);

          if (zoneError) {
            console.error("Failed to save ride zones:", zoneError);
            toast({
              title: "Warning",
              description:
                "Ride created but zone configuration failed. You can edit the ride to set zones.",
            });
          }
        }

        console.log(
          "✅ DEBUG: Ride inserted successfully:",
          JSON.stringify(result, null, 2)
        );
      }

      // Handle return ride creation if enabled
      if (
        !isEditMode &&
        formData.returnRide?.enableReturnRide === true &&
        formData.returnRide?.returnDate &&
        formData.returnRide?.returnTime
      ) {
        console.log("🔄 DEBUG: Creating return ride");

        try {
          // Create return departure timestamp
          const returnDateTime = new Date(formData.returnRide.returnDate);
          const [returnHours, returnMinutes] =
            formData.returnRide.returnTime.split(":");
          returnDateTime.setHours(parseInt(returnHours, 10));
          returnDateTime.setMinutes(parseInt(returnMinutes, 10));
          returnDateTime.setSeconds(0);
          returnDateTime.setMilliseconds(0);

          const returnRideData = {
            driver_id: user.id,
            vehicle_id: formData.rideDetails.vehicleId,
            vehicle_type_id: formData.vehicleTypeId || null,
            from_city: formData.rideDetails.toCity, // Swapped
            to_city: formData.rideDetails.fromCity, // Swapped
            departure_date: formData.returnRide.returnDate, // Date only
            departure_time: formData.returnRide.returnTime, // Time only
            departure_timestamp: returnDateTime.toISOString(), // Full timestamp
            pickup_point: "Multiple Zones", // Updated for zone-based rides
            available_seats: availableSeats,
            price_per_seat: pricePerSeat,
            seat_layout: formData.seatLayout || null,
            seat_pricing: formData.seatPricing || null,
            notes: formData.returnRide.returnNotes || null,
            status: "active",
            // Include reverse route information if available
            route_polyline: formData.selectedRoute?.polyline || null, // Same route but reverse direction
            route_distance_km: formData.selectedRoute?.distance_km || null,
            route_duration_minutes:
              formData.selectedRoute?.duration_minutes || null,
          };

          console.log(
            "🔄 DEBUG: Return ride data:",
            JSON.stringify(returnRideData, null, 2)
          );

          const { data: returnRide, error: returnError } = await supabase
            .from("rides")
            .insert(returnRideData)
            .select()
            .single();

          if (returnError) {
            console.log(
              "❌ DEBUG: Return ride error:",
              JSON.stringify(returnError, null, 2)
            );
            throw returnError;
          }

          // Save zones for return ride (swapped)
          if (
            formData.pickupZoneIds.length > 0 &&
            formData.dropoffZoneIds.length > 0 &&
            returnRide.id
          ) {
            const returnZoneInserts = [
              ...formData.dropoffZoneIds.map((zoneId) => ({
                // Swapped for return
                ride_id: returnRide.id,
                zone_id: zoneId,
                zone_type: "pickup",
              })),
              ...formData.pickupZoneIds.map((zoneId) => ({
                // Swapped for return
                ride_id: returnRide.id,
                zone_id: zoneId,
                zone_type: "dropoff",
              })),
            ];

            await supabase.from("ride_zones").insert(returnZoneInserts);
          }

          console.log("✅ DEBUG: Return ride created successfully");
          toast({
            title: "Success!",
            description: "Both outbound and return rides posted successfully!",
          });
        } catch (returnRideError) {
          console.log(
            "⚠️ DEBUG: Return ride failed:",
            JSON.stringify(returnRideError, null, 2)
          );
          toast({
            title: "Partial Success",
            description:
              "Main ride posted successfully, but return ride failed.",
          });
        }
      } else {
        console.log("✅ DEBUG: Single ride posted successfully");
        toast({
          title: "Success!",
          description: isEditMode
            ? "Ride updated successfully!"
            : "Ride posted successfully!",
        });
      }

      // Navigate back to dashboard
      navigate("/driver/dashboard");
    } catch (error) {
      console.log("❌ DEBUG: Main error:", JSON.stringify(error, null, 2));
      console.log("❌ DEBUG: Error message:", error?.message);

      toast({
        title: "Error",
        description: `Failed to ${isEditMode ? "update" : "post"} ride: ${
          error?.message || "Unknown error"
        }`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {isEditMode ? "Edit Ride" : "Post New Ride"}
              </h1>
              <p className="text-gray-600 mt-1">
                {isEditMode
                  ? "Update your ride details"
                  : "Create a new ride posting for passengers"}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => navigate("/driver/dashboard")}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Progress</span>
              <span>{Math.round(calculateProgress())}% Complete</span>
            </div>
            <Progress value={calculateProgress()} className="h-2" />
          </div>
        </div>

        {/* Main Content */}
        <Tabs
          value={currentTab}
          onValueChange={handleTabChange}
          className="w-full"
        >
          {/* Tab Navigation */}
          <TabsList className="grid w-full grid-cols-6 mb-8 h-auto p-1">
            {TABS.map((tab, index) => {
              const Icon = tab.icon;
              const isAccessible = getTabAccessibility(tab.id);
              const isCompleted = completedTabs.has(tab.id);
              const isCurrent = currentTab === tab.id;

              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  disabled={!isAccessible}
                  className={`
                    flex flex-col items-center space-y-2 p-4 h-auto relative
                    ${
                      !isAccessible
                        ? "opacity-50 cursor-not-allowed"
                        : "cursor-pointer hover:bg-accent"
                    }
                    ${
                      isCurrent
                        ? "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                        : ""
                    }
                  `}
                >
                  <div className="relative">
                    <Icon className="h-5 w-5" />
                    {isCompleted && !isCurrent && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full flex items-center justify-center">
                        <CheckCircle className="h-2 w-2 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="text-center">
                    <div className="text-xs font-medium hidden sm:block">
                      {tab.label}
                    </div>
                    <div className="text-xs font-medium sm:hidden">
                      {tab.shortLabel}
                    </div>
                  </div>
                  <div className="text-[10px] text-muted-foreground hidden md:block text-center">
                    {tab.description}
                    {!isAccessible && (
                      <span className="block text-red-500">
                        Complete previous steps
                      </span>
                    )}
                  </div>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* Tab Content */}
          <div className="mt-8">
            <TabsContent value="rideDetails" className="space-y-0">
              <RideDetails
                onNext={(data) => handleNext("rideDetails", data)}
                onDataChange={(data) =>
                  setFormData((prev) => ({ ...prev, rideDetails: data }))
                }
                initialData={formData.rideDetails || undefined}
                editData={editData}
              />
            </TabsContent>

            <TabsContent value="routeVisualization" className="space-y-0">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">Route Visualization</h2>
                    <p className="text-muted-foreground">
                      Select the best route from{" "}
                      {formData.rideDetails?.fromCity || editData?.from_city} to{" "}
                      {formData.rideDetails?.toCity || editData?.to_city}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={handleBack}>
                      Back
                    </Button>
                    <Button
                      onClick={handleContinueFromRoute}
                      disabled={!formData.selectedRoute}
                    >
                      Continue
                    </Button>
                  </div>
                </div>

                {/* Route Error Display */}
                {routeError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{routeError}</AlertDescription>
                  </Alert>
                )}

                {/* Route Map Component */}
                <RouteVisualizationMap
                  fromCity={
                    formData.rideDetails?.fromCity || editData?.from_city || ""
                  }
                  toCity={
                    formData.rideDetails?.toCity || editData?.to_city || ""
                  }
                  onRouteSelected={handleRouteSelected}
                  onRouteSaved={handleRouteSaved}
                  height="70vh"
                  className="rounded-lg border"
                  showSaveButton={false}
                />

                {/* Selected Route Summary */}
                {formData.selectedRoute && (
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      <div className="flex items-center gap-4 flex-wrap">
                        <span className="font-medium">Route Selected:</span>
                        <span>{formData.selectedRoute.route_type}</span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {formData.selectedRoute.distance_km.toFixed(1)} km
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {Math.round(
                            formData.selectedRoute.duration_minutes / 60
                          )}
                          h {formData.selectedRoute.duration_minutes % 60}m
                        </span>
                        <span>
                          ₹
                          {(
                            formData.selectedRoute.toll_cost +
                            formData.selectedRoute.fuel_cost
                          ).toFixed(0)}{" "}
                          total cost
                        </span>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </TabsContent>

            <TabsContent value="zoneConfiguration" className="space-y-0">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">
                      Review Zone Configuration
                    </h2>
                    <p className="text-muted-foreground">
                      Verify your selected zones and route visualization
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={handleBack}>
                      Back
                    </Button>
                    <Button
                      onClick={handleContinueFromZones}
                      disabled={!formData.zonesConfigured}
                    >
                      Continue
                    </Button>
                  </div>
                </div>

                {/* Zone Configuration Status */}
                {formData.zonesConfigured && (
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      <div className="flex items-center gap-4 flex-wrap">
                        <span className="font-medium">Zones Configured:</span>
                        <span>
                          {formData.pickupZoneIds.length} pickup zones
                        </span>
                        <span>
                          {formData.dropoffZoneIds.length} dropoff zones
                        </span>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Zone Visualization Map */}
                <PickupDropPointsMap
                  fromCity={
                    formData.rideDetails?.fromCity || editData?.from_city || ""
                  }
                  toCity={
                    formData.rideDetails?.toCity || editData?.to_city || ""
                  }
                  selectedPickupZoneIds={formData.pickupZoneIds}
                  selectedDropoffZoneIds={formData.dropoffZoneIds}
                  selectedRoute={formData.selectedRoute}
                  onContinue={handleContinueFromZones}
                  height="70vh"
                  className="rounded-lg border"
                  readOnly={true}
                />
              </div>
            </TabsContent>

            <TabsContent value="seatPricing" className="space-y-0">
              <SeatPricing
                vehicleLayout={formData.seatLayout || editData?.seat_layout}
                vehicleId={
                  formData.rideDetails?.vehicleId || editData?.vehicle_id
                }
                initialPricing={formData.seatPricing || editData?.seat_pricing}
                onNext={(data) => handleNext("seatPricing", data)}
                onBack={handleBack}
                onDataChange={(data) =>
                  setFormData((prev) => ({ ...prev, seatPricing: data }))
                }
              />
            </TabsContent>

            <TabsContent value="returnRideForm" className="space-y-0">
              <ReturnRideForm
                outboundRide={{
                  id: editData?.id,
                  driver_id: user?.id || "",
                  vehicle_id:
                    formData.rideDetails?.vehicleId ||
                    editData?.vehicle_id ||
                    "",
                  vehicle_type_id:
                    formData.vehicleTypeId || editData?.vehicle_type_id,
                  from_city:
                    formData.rideDetails?.fromCity || editData?.from_city || "",
                  to_city:
                    formData.rideDetails?.toCity || editData?.to_city || "",
                  departure_date: formData.rideDetails?.departureDate
                    ? formData.rideDetails.departureDate
                        .toISOString()
                        .split("T")[0]
                    : editData?.departure_date || "",
                  departure_time:
                    formData.rideDetails?.departureTime ||
                    editData?.departure_time ||
                    "",
                  pickup_point: "Multiple Zones", // Updated for zone-based rides
                  available_seats: formData.seatPricing
                    ? Object.keys(formData.seatPricing).length
                    : editData?.available_seats || 1,
                  price_per_seat: formData.seatPricing
                    ? Math.round(
                        Object.values(formData.seatPricing).reduce(
                          (sum, price) => sum + price,
                          0
                        ) / Object.keys(formData.seatPricing).length
                      )
                    : editData?.price_per_seat || 0,
                  seat_layout: formData.seatLayout || editData?.seat_layout,
                  seat_pricing: formData.seatPricing || editData?.seat_pricing,
                  notes: formData.rideDetails?.notes || editData?.notes,
                }}
                // FIXED: Add the missing zone props
                pickupZoneIds={formData.pickupZoneIds}
                dropoffZoneIds={formData.dropoffZoneIds}
                onNext={(data) => handleNext("returnRideForm", data)}
                onBack={handleBack}
                initialData={formData.returnRide}
                onDataChange={(data) =>
                  setFormData((prev) => ({ ...prev, returnRide: data }))
                }
              />
            </TabsContent>

            <TabsContent value="review" className="space-y-0">
              <Review
                rideDetails={formData.rideDetails}
                seatPricing={formData.seatPricing}
                returnRide={formData.returnRide}
                selectedRoute={formData.selectedRoute}
                onSubmit={handleSubmit}
                onBack={handleBack}
                onEdit={(tabId) => setCurrentTab(tabId as TabId)}
                loading={loading}
                editData={editData}
                isEditMode={isEditMode}
                // Pass zone arrays to review component
                pickupZoneIds={formData.pickupZoneIds}
                dropoffZoneIds={formData.dropoffZoneIds}
                zonesConfigured={formData.zonesConfigured}
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default PostRides;
