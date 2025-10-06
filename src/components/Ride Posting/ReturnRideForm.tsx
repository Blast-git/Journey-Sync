import React, { useState, useEffect } from "react";
import {
  ArrowLeftRight,
  ArrowLeft,
  ArrowRight,
  MapPin,
  Calendar,
  Clock,
  Car,
  Users,
  DollarSign,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  TrendingUp,
  Copy,
  RotateCcw,
  Shield,
  FileText,
} from "lucide-react";

interface ReturnRideFormProps {
  outboundRide: {
    id?: string;
    driver_id: string;
    vehicle_id: string;
    vehicle_type_id?: string;
    from_city: string;
    to_city: string;
    departure_date: string;
    departure_time: string;
    pickup_point?: string; // Legacy field - may not be present
    available_seats: number;
    price_per_seat: number;
    seat_layout?: any;
    seat_pricing?: any;
    notes?: string;
  };
  // NEW: Zone arrays from the outbound ride
  pickupZoneIds: string[];
  dropoffZoneIds: string[];
  onNext?: (data: any) => void;
  onBack?: () => void;
  onDataChange?: (data: any) => void;
  initialData?: any;
}

export const ReturnRideForm: React.FC<ReturnRideFormProps> = ({
  outboundRide,
  pickupZoneIds,
  dropoffZoneIds,
  onNext,
  onBack,
  onDataChange,
  initialData,
}) => {
  // State for vehicle data fetched from API
  const [vehicleData, setVehicleData] = useState<{
    car_model: string;
    car_type: string;
    license_plate: string;
  } | null>(null);

  const [enableReturnRide, setEnableReturnRide] = useState(
    initialData?.enableReturnRide || false
  );

  // Auto-populate return ride details based on outbound ride
  const [returnDate, setReturnDate] = useState(() => {
    if (initialData?.returnDate) return initialData.returnDate;

    // Default to next day
    const baseDate = new Date(outboundRide.departure_date);
    const nextDay = new Date(baseDate);
    nextDay.setDate(nextDay.getDate() + 1);
    return nextDay.toISOString().split("T")[0];
  });

  const [returnTime, setReturnTime] = useState(
    initialData?.returnTime || outboundRide.departure_time || "18:00"
  );
  const [returnNotes, setReturnNotes] = useState(
    initialData?.returnNotes || ""
  );
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch real vehicle data
  useEffect(() => {
    const fetchVehicleData = async () => {
      if (!outboundRide.vehicle_id) return;

      try {
        // FIXED: Real Supabase call instead of placeholder
        const { data, error } = await supabase
          .from("vehicles")
          .select(
            `
          car_model,
          car_type,
          license_plate,
          vehicle_types(name)
        `
          )
          .eq("id", outboundRide.vehicle_id)
          .single();

        if (error) {
          console.error("Error fetching vehicle data:", error);
          return;
        }

        if (data) {
          setVehicleData({
            car_model: data.car_model,
            car_type: data.car_type,
            license_plate: data.license_plate,
          });
        }
      } catch (error) {
        console.error("Error fetching vehicle data:", error);
      }
    };

    fetchVehicleData();
  }, [outboundRide.vehicle_id]);

  // Notify parent of form changes - UPDATED for zone-based system
  useEffect(() => {
    if (onDataChange) {
      onDataChange({
        enableReturnRide,
        returnDate: enableReturnRide ? returnDate : undefined,
        returnTime: enableReturnRide ? returnTime : undefined,
        returnNotes: enableReturnRide ? returnNotes : undefined,
        // NEW: Return ride details with swapped zones
        returnRideDetails: enableReturnRide
          ? {
              fromCity: outboundRide.to_city, // Swapped
              toCity: outboundRide.from_city, // Swapped
              departureDate: returnDate,
              departureTime: returnTime,
              // UPDATED: Zone arrays (swapped for return journey)
              pickupZoneIds: dropoffZoneIds, // What was dropoff becomes pickup
              dropoffZoneIds: pickupZoneIds, // What was pickup becomes dropoff
              vehicleId: outboundRide.vehicle_id,
              vehicleTypeId: outboundRide.vehicle_type_id,
              availableSeats: outboundRide.available_seats,
              seatLayout: outboundRide.seat_layout,
              seatPricing: outboundRide.seat_pricing, // Same pricing strategy
              notes: returnNotes,
            }
          : undefined,
      });
    }
  }, [
    enableReturnRide,
    returnDate,
    returnTime,
    returnNotes,
    onDataChange,
    outboundRide,
    pickupZoneIds,
    dropoffZoneIds,
  ]);

  const templates = [
    {
      id: "same-day",
      title: "Same Day Return",
      description: "Return on the same day",
      suggestedTime: "18:00",
      dateOffset: 0,
      tag: "Popular",
      color: "bg-blue-50 border-blue-200 text-blue-800",
    },
    {
      id: "next-day",
      title: "Next Day Return",
      description: "Return the following day",
      suggestedTime: "10:00",
      dateOffset: 1,
      tag: "Recommended",
      color: "bg-green-50 border-green-200 text-green-800",
    },
    {
      id: "weekend",
      title: "Weekend Return",
      description: "Return on weekend",
      suggestedTime: "16:00",
      dateOffset: 2,
      tag: "Weekend",
      color: "bg-purple-50 border-purple-200 text-purple-800",
    },
  ];

  const benefits = [
    {
      icon: DollarSign,
      text: "Maximize trip revenue",
      color: "text-green-600",
    },
    {
      icon: Users,
      text: "Guaranteed return passengers",
      color: "text-blue-600",
    },
    { icon: Car, text: "Same vehicle efficiency", color: "text-orange-600" },
    { icon: Shield, text: "Verified driver trust", color: "text-purple-600" },
  ];

  const applyTemplate = (template) => {
    setSelectedTemplate(template.id);
    setReturnTime(template.suggestedTime);

    const baseDate = new Date(outboundRide.departure_date);
    const returnDate = new Date(baseDate);
    returnDate.setDate(returnDate.getDate() + template.dateOffset);
    setReturnDate(returnDate.toISOString().split("T")[0]);
  };

  const handleSubmit = async () => {
    if (!enableReturnRide) {
      onNext?.({ enableReturnRide: false });
      return;
    }

    if (!returnDate || !returnTime) {
      alert("Please fill in all required fields");
      return;
    }

    setLoading(true);

    try {
      // Return ride data that will automatically create the return ride
      const returnRideData = {
        enableReturnRide: true,
        returnDate: returnDate,
        returnTime: returnTime,
        returnNotes: returnNotes,
        // Complete return ride details (auto-populated from outbound ride)
        returnRideDetails: {
          driver_id: outboundRide.driver_id,
          vehicle_id: outboundRide.vehicle_id,
          vehicle_type_id: outboundRide.vehicle_type_id,
          from_city: outboundRide.to_city, // Swapped
          to_city: outboundRide.from_city, // Swapped
          departure_date: returnDate,
          departure_time: returnTime,
          // REMOVED: pickup_point (old field)
          // NEW: Zone arrays for return ride (swapped)
          pickupZoneIds: dropoffZoneIds, // Swap zones for return
          dropoffZoneIds: pickupZoneIds,
          available_seats: outboundRide.available_seats,
          price_per_seat: outboundRide.price_per_seat,
          seat_layout: outboundRide.seat_layout,
          seat_pricing: outboundRide.seat_pricing, // Same pricing strategy
          notes: returnNotes,
          is_active: true,
        },
      };

      console.log("Complete return ride data being sent:", returnRideData);
      onNext?.(returnRideData);
    } catch (error) {
      console.error("Error preparing return ride:", error);
      alert("Failed to prepare return ride. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    onNext?.({ enableReturnRide: false });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };
  const vehicleDisplayData = vehicleData || {
    car_model: "Loading...",
    car_type: "Loading...",
    license_plate: "Loading...",
  };
  // Get total number of bookable seats
  const getTotalBookableSeats = () => {
    if (outboundRide.seat_pricing) {
      return Object.keys(outboundRide.seat_pricing).length;
    }
    return outboundRide.available_seats;
  };

  // Calculate potential revenue using all bookable seats
  const calculateTotalRevenue = () => {
    if (outboundRide.seat_pricing) {
      const outboundRevenue = Object.values(outboundRide.seat_pricing).reduce(
        (sum, price) => sum + price,
        0
      );
      return outboundRevenue * 2; // Double for return trip
    }
    return outboundRide.price_per_seat * getTotalBookableSeats() * 2;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold text-gray-900">Return Journey</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Add a return journey with the same vehicle and pricing. Zones will
            be automatically swapped for the return trip.
          </p>
        </div>

        {/* Original Trip Summary - UPDATED to show zone information */}
        <div className="border-2 border-blue-100 bg-blue-50/30 rounded-lg">
          <div className="p-6 pb-4">
            <h3 className="flex items-center gap-2 text-blue-900 text-lg font-semibold mb-4">
              <Car className="h-5 w-5" />
              Your Outbound Journey
            </h3>
          </div>
          <div className="px-6 pb-6">
            <div className="grid md:grid-cols-4 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <MapPin className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    {outboundRide.from_city} → {outboundRide.to_city}
                  </p>
                  <p className="text-sm text-gray-600">
                    {pickupZoneIds.length} pickup + {dropoffZoneIds.length}{" "}
                    dropoff zones
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    {formatDate(outboundRide.departure_date)}
                  </p>
                  <p className="text-sm text-gray-600">
                    {outboundRide.departure_time}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Users className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    {getTotalBookableSeats()} seats
                  </p>
                  <p className="text-sm text-gray-600">
                    ₹{outboundRide.price_per_seat}/seat avg
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Car className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    {vehicleDisplayData.car_model}
                  </p>
                  <p className="text-sm text-gray-600">
                    {vehicleDisplayData.car_type}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Return Trip Toggle */}
        <div className="relative overflow-hidden bg-white border rounded-lg shadow-sm">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full -mr-16 -mt-16 opacity-50"></div>

          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="flex items-center gap-2 text-lg font-semibold">
                <RotateCcw className="h-5 w-5 text-purple-600" />
                Add Return Journey
              </h3>
              <div className="flex items-center gap-4">
                <button
                  onClick={handleSkip}
                  className="text-sm text-gray-600 hover:text-gray-800 px-3 py-1 hover:bg-gray-50 rounded transition-colors"
                >
                  Skip
                </button>
                <button
                  onClick={() => setEnableReturnRide(!enableReturnRide)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    enableReturnRide ? "bg-purple-600" : "bg-gray-200"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      enableReturnRide ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>

            {!enableReturnRide && (
              <div className="text-center py-8 space-y-4">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
                  <ArrowLeftRight className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Why add a return journey?
                </h3>
                <div className="grid md:grid-cols-2 gap-4 mt-6">
                  {benefits.map((benefit, index) => {
                    const Icon = benefit.icon;
                    return (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 bg-white rounded-lg border"
                      >
                        <Icon className={`h-5 w-5 ${benefit.color}`} />
                        <span className="text-sm font-medium text-gray-700">
                          {benefit.text}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <button
                  onClick={() => setEnableReturnRide(true)}
                  className="mt-6 bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 mx-auto transition-colors"
                >
                  <Sparkles className="h-4 w-4" />
                  Add Return Journey
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Return Journey Configuration */}
        {enableReturnRide && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            {/* Auto-Generated Return Ride Details - UPDATED for zones */}
            <div className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200 border rounded-lg">
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="h-5 w-5 text-green-600" />
                  <h3 className="text-lg font-semibold text-green-800">
                    Auto-Generated Return Ride
                  </h3>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-center p-4 bg-white rounded-lg border border-green-200">
                      <div className="flex items-center gap-6 text-lg font-semibold">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span className="text-green-700">
                            {outboundRide.to_city}
                          </span>
                        </div>
                        <ArrowLeftRight className="h-6 w-6 text-gray-500" />
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                          <span className="text-blue-700">
                            {outboundRide.from_city}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="bg-white p-3 rounded-lg border border-green-200">
                      <p>
                        <strong>Vehicle:</strong> {vehicleDisplayData.car_model}{" "}
                        ({vehicleDisplayData.license_plate})
                      </p>
                      <p>
                        <strong>Seats:</strong> {getTotalBookableSeats()} seats
                        (same layout & pricing)
                      </p>
                      <p>
                        <strong>Zones:</strong> Pickup/dropoff zones
                        automatically swapped
                      </p>
                      <p>
                        <strong>Configuration:</strong> {dropoffZoneIds.length}{" "}
                        pickup + {pickupZoneIds.length} dropoff zones
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Templates */}
            <div className="bg-white border rounded-lg shadow-sm">
              <div className="p-6 border-b">
                <h3 className="flex items-center gap-2 text-lg font-semibold">
                  <Sparkles className="h-5 w-5 text-yellow-600" />
                  Quick Setup Templates
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Choose a preset or set custom return schedule
                </p>
              </div>
              <div className="p-6">
                <div className="grid md:grid-cols-3 gap-4">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedTemplate === template.id
                          ? "border-purple-500 bg-purple-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => applyTemplate(template)}
                    >
                      <span
                        className={`absolute top-2 right-2 px-2 py-1 text-xs rounded-full ${template.color}`}
                      >
                        {template.tag}
                      </span>
                      <h4 className="font-semibold text-gray-900 mb-1">
                        {template.title}
                      </h4>
                      <p className="text-sm text-gray-600 mb-2">
                        {template.description}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        Suggested: {template.suggestedTime}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Return Schedule & Notes - SIMPLIFIED since zones are auto-configured */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Date & Time */}
              <div className="bg-white border rounded-lg shadow-sm">
                <div className="p-6 border-b">
                  <h3 className="text-lg font-semibold">Return Schedule</h3>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Return Date
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        value={returnDate}
                        onChange={(e) => setReturnDate(e.target.value)}
                        min={new Date().toISOString().split("T")[0]}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                      <Calendar className="absolute right-3 top-3 h-5 w-5 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Return Time
                    </label>
                    <div className="relative">
                      <input
                        type="time"
                        value={returnTime}
                        onChange={(e) => setReturnTime(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                      <Clock className="absolute right-3 top-3 h-5 w-5 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes Only - Zones are auto-configured */}
              <div className="bg-white border rounded-lg shadow-sm">
                <div className="p-6 border-b">
                  <h3 className="text-lg font-semibold">
                    Return Journey Notes
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Pickup/dropoff zones are automatically configured
                  </p>
                </div>
                <div className="p-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Additional Notes (Optional)
                    </label>
                    <textarea
                      value={returnNotes}
                      onChange={(e) => setReturnNotes(e.target.value)}
                      placeholder="Any special instructions for return passengers..."
                      rows={6}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                    />
                  </div>

                  {/* Zone Configuration Info */}
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 text-blue-800 text-sm">
                      <CheckCircle className="h-4 w-4" />
                      <span className="font-medium">
                        Zone Configuration Automatic
                      </span>
                    </div>
                    <div className="text-blue-700 text-xs mt-1">
                      • Return pickup: {dropoffZoneIds.length} zones in{" "}
                      {outboundRide.to_city}
                      <br />• Return dropoff: {pickupZoneIds.length} zones in{" "}
                      {outboundRide.from_city}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Revenue Summary */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 border rounded-lg">
              <div className="p-6 border-b border-green-200">
                <h3 className="flex items-center gap-2 text-green-800 text-lg font-semibold">
                  <TrendingUp className="h-5 w-5" />
                  Total Trip Revenue Potential
                </h3>
              </div>
              <div className="p-6">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-white rounded-lg border border-green-200">
                    <p className="text-2xl font-bold text-green-700">
                      ₹{outboundRide.price_per_seat}
                    </p>
                    <p className="text-sm text-gray-600">Avg Price/Seat</p>
                  </div>
                  <div className="text-center p-4 bg-white rounded-lg border border-green-200">
                    <p className="text-2xl font-bold text-green-700">
                      {getTotalBookableSeats()}
                    </p>
                    <p className="text-sm text-gray-600">Seats Available</p>
                  </div>
                  <div className="text-center p-4 bg-green-100 rounded-lg border border-green-300">
                    <p className="text-2xl font-bold text-green-800">
                      ₹{calculateTotalRevenue()}
                    </p>
                    <p className="text-sm text-green-700 font-medium">
                      Total Both Ways
                    </p>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-800">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      Return ride will use the same vehicle, seat layout,
                      pricing, and swapped zone configuration.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="bg-white border rounded-lg shadow-sm">
              <div className="p-6">
                <div className="flex justify-end">
                  <button
                    onClick={handleSubmit}
                    disabled={loading || !returnDate || !returnTime}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium min-w-[180px]"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Preparing...
                      </>
                    ) : (
                      <>
                        Continue to Review
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
