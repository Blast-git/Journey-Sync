import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft,
  ArrowRight,
  DollarSign,
  TrendingUp,
  RefreshCw,
  Car,
  Zap,
} from "lucide-react";

// Import seat layout utilities
import {
  VehicleType,
  LayoutConfig,
  SeatPricing as SeatPricingType,
  Seat,
  SeatRow,
  getBookableSeats,
  calculateTotalRevenue,
  getSeatsByType,
  validateSeatPricing,
  getPricingStats,
  getSeatCssClass,
  getSeatTypeColor,
  getPredefinedLayouts,
} from "@/utils/seatLayoutUtils";

interface SeatPricingProps {
  vehicleLayout?: LayoutConfig;
  vehicleId?: string;
  onDataChange?: (pricingData: SeatPricingType) => void;
  onNext?: (pricingData: SeatPricingType) => void;
  onBack?: () => void;
  initialPricing?: SeatPricingType;
  readOnly?: boolean;
}

// Enhanced Seat Layout Component with CORRECT ordering - F1 on LEFT, Driver on RIGHT
const CorrectedSeatLayout: React.FC<{
  layoutConfig: LayoutConfig;
  seatPrices: SeatPricingType;
  onSeatPriceChange: (seatId: string, price: number) => void;
  readOnly?: boolean;
  selectedSeat?: string;
  onSeatSelect?: (seatId: string) => void;
}> = ({
  layoutConfig,
  seatPrices,
  onSeatPriceChange,
  readOnly,
  selectedSeat,
  onSeatSelect,
}) => {
  if (!layoutConfig?.rows) {
    return (
      <div className="text-center p-8 text-gray-500">
        No layout configuration available
      </div>
    );
  }

  // Render individual seat
  const renderSeat = (seat: Seat) => {
    const isSelected = selectedSeat === seat.id;
    const isDriver = seat.type === "driver";
    const hasPrice = seatPrices[seat.id] && seatPrices[seat.id] > 0;

    return (
      <div key={seat.id} className="flex flex-col items-center space-y-1">
        {/* Seat visual */}
        <div
          className={`
            w-16 h-16 rounded-lg border-2 flex flex-col items-center justify-center 
            font-bold text-xs cursor-pointer transition-all
            ${getSeatCssClass(seat)}
            ${isSelected ? "ring-2 ring-blue-500 ring-offset-2 scale-105" : ""}
            ${
              !seat.bookable
                ? "cursor-not-allowed opacity-70"
                : "hover:scale-105 hover:shadow-md"
            }
            ${isDriver ? "bg-gray-600 text-white border-gray-700" : ""}
            ${hasPrice && !isDriver ? "border-green-500 bg-green-50" : ""}
          `}
          onClick={() => seat.bookable && onSeatSelect?.(seat.id)}
          title={`${seat.label} Seat${
            seat.bookable ? " - Bookable" : " - Not Bookable"
          }`}
        >
          <div className="text-xs font-bold">{seat.id}</div>
          {isDriver && <Car className="h-3 w-3 mt-0.5" />}
          {hasPrice && !isDriver && (
            <div className="text-[8px] text-green-700">
              ₹{seatPrices[seat.id]}
            </div>
          )}
        </div>

        {/* Seat type label */}
        <div
          className={`text-xs font-medium px-1 py-0.5 rounded ${getSeatTypeColor(
            seat.type
          )}`}
        >
          {seat.label}
        </div>

        {/* Price input for bookable seats */}
        {seat.bookable && !readOnly && (
          <Input
            type="number"
            value={seatPrices[seat.id] || ""}
            onChange={(e) =>
              onSeatPriceChange(seat.id, parseFloat(e.target.value) || 0)
            }
            className={`w-20 h-7 text-xs text-center border-2 ${
              hasPrice ? "border-green-300 bg-green-50" : "border-gray-300"
            }`}
            min="0"
            step="1"
            placeholder="₹0"
          />
        )}

        {/* Price display for read-only mode */}
        {seat.bookable && readOnly && (
          <div className="text-xs font-bold text-green-700 bg-green-50 px-2 py-1 rounded">
            ₹{seatPrices[seat.id] || 0}
          </div>
        )}
      </div>
    );
  };

  // Process layout to handle ANY configuration and ensure F1 LEFT, Driver RIGHT
  const processLayoutForRendering = () => {
    const processedRows: SeatRow[] = [];
    let frontSeats: Seat[] = [];

    // Step 1: Collect all front-related seats from any row type
    layoutConfig.rows.forEach((row) => {
      if (
        row.type === "front" ||
        row.type === "front-driver" ||
        row.type === "front-passenger"
      ) {
        frontSeats.push(...row.seats);
      } else {
        // Non-front rows go through as-is
        processedRows.push(row);
      }
    });

    // Step 2: If we found front seats, create a proper front row with CORRECT ordering
    if (frontSeats.length > 0) {
      // Sort so F1/front passenger comes first (LEFT), then driver (RIGHT)
      const sortedFrontSeats = frontSeats.sort((a, b) => {
        // F1 or 'front' type seats come first (left side)
        if (a.type === "front" && b.type === "driver") return -1;
        if (a.type === "driver" && b.type === "front") return 1;

        // If both are same type, sort by position or ID
        if (a.position && b.position) {
          if (a.position.includes("left") && b.position.includes("right"))
            return -1;
          if (a.position.includes("right") && b.position.includes("left"))
            return 1;
        }

        // Fallback: F1 before D
        if (a.id === "F1" && b.id === "D") return -1;
        if (a.id === "D" && b.id === "F1") return 1;

        return 0;
      });

      // Insert the front row at the beginning
      processedRows.unshift({
        type: "front",
        seats: sortedFrontSeats,
        rowIndex: 0,
      });
    }

    // Step 3: Renumber row indices
    return processedRows.map((row, index) => ({
      ...row,
      rowIndex: index,
    }));
  };

  // Render row with appropriate spacing
  const renderSeatRow = (row: SeatRow, rowIndex: number) => {
    if (!row.seats || row.seats.length === 0) return null;

    // Determine layout based on row type and seat count
    const getRowLayout = () => {
      // Front row - ALWAYS side by side with proper spacing
      if (row.type === "front") {
        return "flex justify-center items-center gap-8 max-w-md mx-auto";
      }

      // Other rows - adapt to seat count
      const seatCount = row.seats.length;
      if (seatCount === 2) {
        return "flex justify-center gap-12 max-w-sm mx-auto";
      } else if (seatCount === 3) {
        return "flex justify-center gap-6 max-w-md mx-auto";
      } else if (seatCount === 4) {
        return "flex justify-center gap-4 max-w-lg mx-auto";
      }

      // Default spacing
      return "flex justify-center gap-6";
    };

    return (
      <div key={`${row.type}-${rowIndex}`} className="w-full">
        <div className={getRowLayout()}>
          {row.seats.map((seat) => renderSeat(seat))}
        </div>
      </div>
    );
  };

  const processedRows = processLayoutForRendering();

  return (
    <div className="bg-gradient-to-b from-gray-50 to-gray-100 p-8 rounded-xl border-2 border-dashed border-gray-300">
      {/* Vehicle header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-gray-800 text-white px-6 py-3 rounded-t-xl text-sm font-medium shadow-lg">
          <Car className="h-4 w-4" />
          Zone-Based Ride Pricing
        </div>
        <div className="text-xs text-gray-600 mt-2">
          {layoutConfig.vehicleType} • {layoutConfig.totalSeats} Total Seats •{" "}
          {layoutConfig.bookableSeats} Bookable
        </div>
      </div>

      {/* Seat layout */}
      <div className="space-y-8 w-full">
        {processedRows.map((row, rowIndex) => renderSeatRow(row, rowIndex))}
      </div>

      {/* Legend */}
      <div className="mt-10 space-y-4">
        <div className="text-center text-sm font-semibold text-gray-700">
          Seat Types - Set Your Own Prices
        </div>
        <div className="flex flex-wrap justify-center gap-6 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-purple-100 border-2 border-purple-300 rounded flex items-center justify-center">
              <span className="text-purple-800 font-bold text-xs">F</span>
            </div>
            <span className="font-medium">Front Seat</span>
            <Badge variant="outline" className="text-purple-700">
              Premium Position
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-blue-100 border-2 border-blue-300 rounded flex items-center justify-center">
              <span className="text-blue-800 font-bold text-xs">W</span>
            </div>
            <span className="font-medium">Window Seat</span>
            <Badge variant="outline" className="text-blue-700">
              View & Privacy
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-green-100 border-2 border-green-300 rounded flex items-center justify-center">
              <span className="text-green-800 font-bold text-xs">M</span>
            </div>
            <span className="font-medium">Middle Seat</span>
            <Badge variant="outline" className="text-green-700">
              Standard
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-gray-600 rounded flex items-center justify-center">
              <Car className="h-3 w-3 text-white" />
            </div>
            <span className="font-medium">Driver</span>
            <Badge variant="outline" className="text-gray-700">
              Not Bookable
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main SeatPricing Component
export const SeatPricing: React.FC<SeatPricingProps> = ({
  vehicleLayout,
  vehicleId,
  onDataChange,
  onNext,
  onBack,
  initialPricing = {},
  readOnly = false,
}) => {
  const { toast } = useToast();
  const [vehicleType, setVehicleType] = useState<VehicleType | null>(null);
  const [layoutConfig, setLayoutConfig] = useState<LayoutConfig | null>(null);
  const [seatPrices, setSeatPrices] = useState<SeatPricingType>(initialPricing);
  const [loading, setLoading] = useState(false);
  const [selectedSeat, setSelectedSeat] = useState<string>("");
  const [bookableSeats, setBookableSeats] = useState<Seat[]>([]);
  const [layoutOptions, setLayoutOptions] = useState<LayoutConfig[]>([]);

  // Load vehicle data and layout
  useEffect(() => {
    const fetchVehicleData = async () => {
      // Use provided vehicle layout first
      if (vehicleLayout) {
        setLayoutConfig(vehicleLayout);
        const bookable = getBookableSeats(vehicleLayout);
        setBookableSeats(bookable);
        return;
      }

      // Fetch from database using vehicleId
      if (!vehicleId) return;

      try {
        setLoading(true);

        const { data: vehicle, error: vehicleError } = await supabase
          .from("vehicles")
          .select("vehicle_type_id, seat_capacity")
          .eq("id", vehicleId)
          .single();

        if (vehicleError) throw vehicleError;

        const { data: vType, error: typeError } = await supabase
          .from("vehicle_types")
          .select("*")
          .eq("id", vehicle.vehicle_type_id)
          .single();

        if (typeError) throw typeError;

        setVehicleType(vType);

        if (vType.layout_config) {
          setLayoutConfig(vType.layout_config);
        } else {
          const predefinedLayouts = getPredefinedLayouts(vType.total_seats);
          if (predefinedLayouts.length > 0) {
            setLayoutConfig(predefinedLayouts[0]);
            setLayoutOptions(predefinedLayouts);
          }
        }

        const layoutToUse =
          vType.layout_config || getPredefinedLayouts(vType.total_seats)[0];
        if (layoutToUse) {
          const bookable = getBookableSeats(layoutToUse);
          setBookableSeats(bookable);
        }
      } catch (error) {
        console.error("Error fetching vehicle data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchVehicleData();
  }, [vehicleId, vehicleLayout]);

  // Handle initialPricing
  useEffect(() => {
    if (initialPricing && Object.keys(initialPricing).length > 0) {
      setSeatPrices(initialPricing);
    }
  }, []);

  // Handle layout option change
  const handleLayoutChange = (newLayout: LayoutConfig) => {
    setLayoutConfig(newLayout);
    const bookable = getBookableSeats(newLayout);
    setBookableSeats(bookable);

    // Clear existing pricing when layout changes
    setSeatPrices({});
    onDataChange?.({});

    toast({
      title: "Layout Changed",
      description: "Please set prices for the new seat configuration.",
    });
  };

  // Handle seat price changes
  const handleSeatPriceChange = (seatId: string, price: number) => {
    const newPrices = { ...seatPrices, [seatId]: price };
    setSeatPrices(newPrices);
    onDataChange?.(newPrices);
  };

  // Apply price to all seats of the same type
  const applyPriceToType = (
    seatType: "front" | "window" | "middle",
    price: number
  ) => {
    if (!layoutConfig) return;

    const seatsOfType = getSeatsByType(layoutConfig, seatType);
    const newPrices = { ...seatPrices };

    seatsOfType.forEach((seat) => {
      if (seat.bookable) {
        newPrices[seat.id] = price;
      }
    });

    setSeatPrices(newPrices);
    onDataChange?.(newPrices);

    toast({
      title: "Bulk Pricing Applied",
      description: `Updated ${
        seatsOfType.filter((s) => s.bookable).length
      } ${seatType} seats to ₹${price}`,
    });
  };

  // Apply suggested pricing
  const handleApplySuggestedPricing = () => {
    if (!layoutConfig) return;

    const newPrices: SeatPricingType = {};

    // Get all bookable seats and apply suggested prices based on type
    const bookable = getBookableSeats(layoutConfig);

    bookable.forEach((seat) => {
      switch (seat.type) {
        case "front":
          newPrices[seat.id] = 700; // Suggested front seat price
          break;
        case "window":
          newPrices[seat.id] = 600; // Suggested window seat price
          break;
        case "middle":
          newPrices[seat.id] = 500; // Suggested middle seat price
          break;
        default:
          newPrices[seat.id] = 500; // Default price
      }
    });

    setSeatPrices(newPrices);
    onDataChange?.(newPrices);

    toast({
      title: "Suggested Pricing Applied",
      description: `Front: ₹700, Window: ₹600, Middle: ₹500`,
    });
  };

  // Clear all pricing
  const handleClearPricing = () => {
    setSeatPrices({});
    onDataChange?.({});

    toast({
      title: "Pricing Cleared",
      description: "All seat prices have been reset. Set your custom prices.",
    });
  };

  // Calculate revenue insights
  const calculateRevenue = () => {
    const totalRevenue = calculateTotalRevenue(seatPrices);
    const pricedSeats = Object.keys(seatPrices).filter(
      (seatId) => seatPrices[seatId] > 0
    ).length;
    const averagePrice = pricedSeats > 0 ? totalRevenue / pricedSeats : 0;

    return {
      totalRevenue,
      pricedSeats,
      totalBookableSeats: bookableSeats.length,
      averagePrice,
    };
  };

  // Handle next step
  const handleNext = () => {
    if (!layoutConfig) return;

    const validation = validateSeatPricing(seatPrices, layoutConfig);
    if (!validation.isValid) {
      toast({
        title: "Pricing Incomplete",
        description: validation.errors.join(", "),
        variant: "destructive",
      });
      return;
    }

    onNext?.(seatPrices);
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading seat pricing...</div>
      </div>
    );
  }

  // No vehicle data
  if (!vehicleId && !vehicleLayout) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-lg text-gray-600 mb-2">
            No vehicle information available
          </div>
          <div className="text-sm text-gray-500">
            Please select a vehicle or provide layout data
          </div>
        </div>
      </div>
    );
  }

  // No layout config
  if (!layoutConfig) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-lg text-gray-600 mb-2">
            No seat layout available
          </div>
          <div className="text-sm text-gray-500">
            Please configure the vehicle type first
          </div>
        </div>
      </div>
    );
  }

  const revenue = calculateRevenue();
  const pricingStats = getPricingStats(seatPrices);

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Zone-Based Seat Pricing
        </h2>
        <p className="text-gray-600">
          Set individual prices for each seat position to optimize your revenue for zone-based rides
        </p>
        <div className="mt-3 flex items-center gap-3">
          {vehicleType && (
            <Badge variant="outline" className="text-blue-700">
              {vehicleType.name}
            </Badge>
          )}
          <Badge variant="outline" className="text-green-700">
            {bookableSeats.length} bookable seats
          </Badge>
          {layoutConfig && (
            <Badge variant="outline" className="text-purple-700">
              {layoutConfig.vehicleType}
            </Badge>
          )}
          <Badge variant="outline" className="text-orange-700">
            {revenue.pricedSeats}/{revenue.totalBookableSeats} priced
          </Badge>
        </div>
      </div>

      {/* Layout Options */}
      {layoutOptions.length > 1 && !readOnly && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Layout Options</CardTitle>
            <CardDescription>
              Choose your preferred seat arrangement
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              {layoutOptions.map((layout, index) => (
                <Button
                  key={index}
                  variant={
                    layoutConfig?.vehicleType === layout.vehicleType
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  onClick={() => handleLayoutChange(layout)}
                >
                  {layout.vehicleType}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Seat Layout Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">
            Vehicle Layout
          </h3>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Interactive Seat Map</CardTitle>
              <CardDescription>
                {readOnly
                  ? "Current pricing configuration"
                  : "Enter custom price for each seat using inputs below each seat"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CorrectedSeatLayout
                layoutConfig={layoutConfig}
                seatPrices={seatPrices}
                onSeatPriceChange={handleSeatPriceChange}
                readOnly={readOnly}
                selectedSeat={selectedSeat}
                onSeatSelect={setSelectedSeat}
              />
            </CardContent>
          </Card>
        </div>

        {/* Pricing Controls Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">
            Pricing Controls
          </h3>

          {/* Quick Actions */}
          {!readOnly && (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Quick Actions</CardTitle>
                <CardDescription>
                  Helpful tools for setting prices
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={handleApplySuggestedPricing}
                    variant="outline"
                    className="w-full text-sm"
                    size="sm"
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Suggested Prices
                  </Button>

                  <Button
                    onClick={handleClearPricing}
                    variant="outline"
                    className="w-full text-sm"
                    size="sm"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Clear All
                  </Button>
                </div>

                <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
                  <strong>💡 Pricing Tips:</strong> Front seats typically cost
                  20-40% more than middle seats. Window seats usually have
                  10-20% premium over middle seats.
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Price Setting by Type */}
          {!readOnly && (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Bulk Price Setting</CardTitle>
                <CardDescription>
                  Apply prices to all seats of the same type
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs text-purple-700 font-medium">
                      Front Seats
                    </Label>
                    <Input
                      type="number"
                      placeholder="e.g. 700"
                      className="text-sm"
                      onChange={(e) => {
                        const price = parseFloat(e.target.value);
                        if (price > 0) applyPriceToType("front", price);
                      }}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-blue-700 font-medium">
                      Window Seats
                    </Label>
                    <Input
                      type="number"
                      placeholder="e.g. 600"
                      className="text-sm"
                      onChange={(e) => {
                        const price = parseFloat(e.target.value);
                        if (price > 0) applyPriceToType("window", price);
                      }}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-green-700 font-medium">
                      Middle Seats
                    </Label>
                    <Input
                      type="number"
                      placeholder="e.g. 500"
                      className="text-sm"
                      onChange={(e) => {
                        const price = parseFloat(e.target.value);
                        if (price > 0) applyPriceToType("middle", price);
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Revenue Insights */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Revenue Analytics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-2xl font-bold text-green-700">
                    ₹{revenue.totalRevenue}
                  </div>
                  <div className="text-xs text-green-600 font-medium">
                    Total Revenue
                  </div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-2xl font-bold text-blue-700">
                    ₹{Math.round(revenue.averagePrice)}
                  </div>
                  <div className="text-xs text-blue-600 font-medium">
                    Average Price
                  </div>
                </div>
              </div>

              <Separator />

              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <span className="font-semibold">Pricing Progress</span>
                </div>
                <div className="text-lg font-bold text-gray-700">
                  {revenue.pricedSeats} of {revenue.totalBookableSeats} seats
                  priced
                  <Badge
                    variant={
                      revenue.pricedSeats === revenue.totalBookableSeats
                        ? "default"
                        : "secondary"
                    }
                    className="ml-2"
                  >
                    {Math.round(
                      (revenue.pricedSeats / revenue.totalBookableSeats) * 100
                    )}
                    %
                  </Badge>
                </div>
              </div>

              {/* Pricing Statistics */}
              {Object.keys(seatPrices).length > 0 && (
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <div className="font-bold text-gray-700">
                      ₹{pricingStats.min}
                    </div>
                    <div className="text-gray-500">Minimum</div>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <div className="font-bold text-gray-700">
                      ₹{Math.round(pricingStats.average)}
                    </div>
                    <div className="text-gray-500">Average</div>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <div className="font-bold text-gray-700">
                      ₹{pricingStats.max}
                    </div>
                    <div className="text-gray-500">Maximum</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Individual Seat Pricing Summary */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Pricing Summary</CardTitle>
              <CardDescription>All seat prices at a glance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {bookableSeats.map((seat) => (
                  <div
                    key={seat.id}
                    className="flex justify-between items-center text-sm p-3 rounded-lg border hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded text-xs font-bold flex items-center justify-center ${getSeatCssClass(
                          seat
                        )}`}
                      >
                        {seat.id}
                      </div>
                      <div>
                        <span className="font-medium">Seat {seat.id}</span>
                        <Badge
                          variant="outline"
                          className={`ml-2 ${getSeatTypeColor(seat.type)}`}
                        >
                          {seat.type}
                        </Badge>
                      </div>
                    </div>
                    {!readOnly ? (
                      <Input
                        type="number"
                        value={seatPrices[seat.id] || ""}
                        onChange={(e) =>
                          handleSeatPriceChange(
                            seat.id,
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="w-24 h-8 text-xs"
                        min="0"
                        placeholder="₹0"
                      />
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-green-700 font-bold"
                      >
                        ₹{seatPrices[seat.id] || 0}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Navigation Buttons */}
      {!readOnly && (
        <div className="flex justify-between pt-6">
          {onBack && (
            <Button
              variant="outline"
              onClick={onBack}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Zones
            </Button>
          )}

          {onNext && (
            <Button
              onClick={handleNext}
              className="flex items-center gap-2 ml-auto"
            >
              Continue to Return Journey
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default SeatPricing;