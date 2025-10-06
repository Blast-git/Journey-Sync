import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Car,
  Calendar,
  Users,
  MapPin,
  Clock,
  Phone,
  IndianRupee,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Ride {
  id: string;
  from_city: string;
  to_city: string;
  departure_date: string;
  departure_time: string;
  price_per_seat: number;
  available_seats: number;
  pickup_point?: string;
  seat_layout?: any;
  vehicles?: {
    car_model: string;
    car_type: string;
    color?: string;
    license_plate: string;
  };
}

interface Booking {
  id: string;
  passenger_id: string;
  seats_booked: number;
  total_price: number;
  status: string;
  passenger_notes?: string;
  selected_seats?: string[];
  profiles?: {
    full_name: string;
    phone?: string;
    email?: string;
    avatar_url?: string;
  };
}

interface RideDetailsDialogProps {
  ride: Ride | null;
  isOpen: boolean;
  onClose: () => void;
}

export const RideDetailsDialog: React.FC<RideDetailsDialogProps> = ({
  ride,
  isOpen,
  onClose,
}) => {
  const [rideBookings, setRideBookings] = useState<Booking[]>([]);
  const [seatLayout, setSeatLayout] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && ride) {
      fetchRideDetails();
      fetchSeatLayout();
    }
  }, [isOpen, ride]);

  const fetchRideDetails = async () => {
    if (!ride?.id) return;

    setLoading(true);
    try {
      const { data: bookingsData, error: bookingsError } = await supabase
        .from("bookings")
        .select(
          `
          *,
          profiles:passenger_id (
            full_name,
            phone,
            email,
            avatar_url
          )
        `
        )
        .eq("ride_id", ride.id)
        .order("created_at", { ascending: false });

      if (bookingsError) throw bookingsError;

      setRideBookings(bookingsData || []);
    } catch (error) {
      console.error("Error fetching ride details:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSeatLayout = async () => {
    if (!ride?.id) return;

    try {
      // First get the ride with vehicle information
      const { data: rideData, error: rideError } = await supabase
        .from("rides")
        .select(
          `
          *,
          vehicles!rides_vehicle_id_fkey (
            *,
            vehicle_types!vehicles_vehicle_type_id_fkey (
              id,
              name,
              total_seats,
              bookable_seats,
              layout_config
            )
          )
        `
        )
        .eq("id", ride.id)
        .single();

      if (rideError) throw rideError;

      // Extract layout from vehicle type
      const layoutConfig = rideData?.vehicles?.vehicle_types?.layout_config;
      if (layoutConfig) {
        setSeatLayout(layoutConfig);
      } else {
        console.warn("No seat layout found for this ride");
      }
    } catch (error) {
      console.error("Error fetching seat layout:", error);
    }
  };

  const getSeatLayout = () => {
    if (seatLayout) {
      return seatLayout;
    }
    
    // Fallback to ride.seat_layout for backward compatibility
    try {
      if (ride?.seat_layout) {
        return typeof ride.seat_layout === "string"
          ? JSON.parse(ride.seat_layout)
          : ride.seat_layout;
      }
      return null;
    } catch (error) {
      console.error("Error parsing seat layout:", error);
      return null;
    }
  };

  const getAllBookedSeats = () => {
    const bookedSeats = new Set<string>();
    rideBookings.forEach((booking) => {
      if (booking.selected_seats && Array.isArray(booking.selected_seats)) {
        booking.selected_seats.forEach((seatId) => bookedSeats.add(seatId));
      }
    });
    return bookedSeats;
  };

  const getSeatBookingInfo = (seatId: string) => {
    for (const booking of rideBookings) {
      if (booking.selected_seats && booking.selected_seats.includes(seatId)) {
        return {
          booking: booking,
          passenger: booking.profiles?.full_name || "Unknown",
          status: booking.status,
        };
      }
    }
    return null;
  };

  const getSeatStatus = (seatId: string) => {
    const bookingInfo = getSeatBookingInfo(seatId);
    if (!bookingInfo) return "available";
    return bookingInfo.status;
  };

  const renderSeatMap = () => {
    const seatLayoutConfig = getSeatLayout();
    if (!seatLayoutConfig || !seatLayoutConfig.rows) return null;

    return (
      <div className="mt-4">
        <h4 className="font-medium mb-3">Seat Layout with Passenger Details</h4>

        <div className="bg-gray-50 p-4 rounded-lg border-2 border-gray-200 max-w-md">
          <div className="space-y-3">
            {seatLayoutConfig.rows.map((row: any, rowIndex: number) => (
              <div key={rowIndex} className="flex justify-center gap-2">
                {row.seats.map((seat: any) => {
                  const status = getSeatStatus(seat.id);
                  const bookingInfo = getSeatBookingInfo(seat.id);
                  const isDriver = seat.type === "driver";
                  const isPending = status === "pending";
                  const isConfirmed = status === "confirmed";
                  const isBooked = isPending || isConfirmed;

                  return (
                    <div
                      key={seat.id}
                      className={`
                        relative w-12 h-12 rounded-lg border-2 flex items-center justify-center text-xs font-bold transition-all cursor-pointer
                        ${
                          isDriver
                            ? "bg-gray-800 border-gray-900 text-white cursor-not-allowed"
                            : isConfirmed
                            ? "bg-red-500 border-red-600 text-white shadow-md"
                            : isPending
                            ? "bg-amber-400 border-amber-500 text-white shadow-md"
                            : "bg-green-400 border-green-500 text-white shadow-sm hover:shadow-md"
                        }
                      `}
                      title={
                        isDriver
                          ? "Driver Seat"
                          : bookingInfo
                          ? `${seat.id} - ${bookingInfo.passenger} (${status})`
                          : `${seat.id} - Available ${seat.type} seat`
                      }
                    >
                      {/* Seat ID */}
                      <span className="text-xs font-bold">{seat.id}</span>
                      
                      {/* Passenger Avatar for booked seats */}
                      {isBooked && bookingInfo && (
                        <div className="absolute -top-1 -right-1">
                          <Avatar className="h-6 w-6 border-2 border-white">
                            <AvatarImage
                              src={bookingInfo.booking.profiles?.avatar_url}
                              alt={bookingInfo.passenger}
                            />
                            <AvatarFallback className="text-xs bg-white text-gray-800">
                              {bookingInfo.passenger.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Enhanced Legend */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-green-400 border border-green-500 rounded"></div>
                <span className="text-gray-700">Available</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-amber-400 border border-amber-500 rounded"></div>
                <span className="text-gray-700">Pending</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-red-500 border border-red-600 rounded"></div>
                <span className="text-gray-700">Confirmed</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-gray-800 border border-gray-900 rounded"></div>
                <span className="text-gray-700">Driver</span>
              </div>
            </div>
            
            {/* Seat Type Legend */}
            <div className="text-xs text-center text-gray-600">
              <p>Seat Types: F = Front, W = Window, M = Middle, D = Driver</p>
            </div>
          </div>
        </div>

        {/* Enhanced Seat Summary */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-blue-800">Total Seats:</span>
              <span className="ml-1">{seatLayoutConfig.totalSeats || 0}</span>
            </div>
            <div>
              <span className="font-medium text-blue-800">Bookable:</span>
              <span className="ml-1">{seatLayoutConfig.bookableSeats || 0}</span>
            </div>
            <div>
              <span className="font-medium text-blue-800">Booked:</span>
              <span className="ml-1">{getAllBookedSeats().size}</span>
            </div>
            <div>
              <span className="font-medium text-blue-800">Available:</span>
              <span className="ml-1">
                {(seatLayoutConfig.bookableSeats || 0) - getAllBookedSeats().size}
              </span>
            </div>
          </div>
          
          {/* Revenue Information */}
          {rideBookings.length > 0 && (
            <div className="mt-3 pt-3 border-t border-blue-200">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-blue-800">Total Revenue:</span>
                <span className="font-bold text-blue-900">
                  ₹{rideBookings.reduce((sum, booking) => sum + (booking.total_price || 0), 0)}
                </span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="font-medium text-blue-800">Passengers:</span>
                <span className="text-blue-800">{rideBookings.length}</span>
              </div>
            </div>
          )}
        </div>

        {/* Seat-wise Passenger Mapping */}
        {rideBookings.length > 0 && (
          <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
            <h5 className="font-medium text-green-800 mb-2">Seat Assignments</h5>
            <div className="space-y-2">
              {rideBookings.map((booking) => 
                booking.selected_seats?.map((seatId) => {
                  const seatInfo = getSeatById(seatLayoutConfig, seatId);
                  return (
                    <div key={`${booking.id}-${seatId}`} className="flex items-center justify-between text-sm bg-white px-2 py-1 rounded">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage
                            src={booking.profiles?.avatar_url}
                            alt={booking.profiles?.full_name}
                          />
                          <AvatarFallback className="text-xs">
                            {booking.profiles?.full_name?.charAt(0) || "P"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{booking.profiles?.full_name || "Unknown"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="text-xs font-mono"
                        >
                          {seatId}
                        </Badge>
                        {seatInfo && (
                          <span className="text-xs text-gray-500">
                            ({seatInfo.type})
                          </span>
                        )}
                        <Badge
                          variant={booking.status === "confirmed" ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {booking.status}
                        </Badge>
                      </div>
                    </div>
                  );
                }) || []
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Helper function to get seat by ID from layout
  const getSeatById = (layoutConfig: any, seatId: string) => {
    if (!layoutConfig?.rows) return null;
    
    for (const row of layoutConfig.rows) {
      for (const seat of row.seats || []) {
        if (seat.id === seatId) {
          return seat;
        }
      }
    }
    return null;
  };

  if (!ride) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            Ride Details: {ride.from_city} → {ride.to_city}
          </DialogTitle>
          <DialogDescription>
            Manage your ride and view passenger bookings
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Ride Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Ride Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <MapPin className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">
                          {ride.from_city} → {ride.to_city}
                        </p>
                        <p className="text-sm text-muted-foreground">Route</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">
                          {new Date(ride.departure_date).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Departure Date
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{ride.departure_time}</p>
                        <p className="text-sm text-muted-foreground">
                          Departure Time
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <IndianRupee className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">₹{ride.price_per_seat}</p>
                        <p className="text-sm text-muted-foreground">
                          Price per seat
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Users className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">
                          {ride.available_seats} available
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Available seats
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Car className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">
                          {ride.vehicles?.car_model} ({ride.vehicles?.car_type})
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {ride.vehicles?.color} • {ride.vehicles?.license_plate}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {ride.pickup_point && (
                  <div className="mt-4 p-3 bg-muted rounded-lg">
                    <p className="text-sm">
                      <span className="font-medium">Pickup Point:</span>{" "}
                      {ride.pickup_point}
                    </p>
                  </div>
                )}

                {/* Seat Map */}
                {renderSeatMap()}
              </CardContent>
            </Card>

            {/* Passenger Bookings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Passenger Bookings ({rideBookings.length})
                  </span>
                  <Badge variant="outline">
                    Total: ₹
                    {rideBookings.reduce(
                      (sum, booking) => sum + (booking.total_price || 0),
                      0
                    )}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {rideBookings.length > 0 ? (
                  <div className="space-y-4">
                    {rideBookings.map((booking) => (
                      <Card key={booking.id} className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage
                                src={booking.profiles?.avatar_url}
                                alt={booking.profiles?.full_name}
                              />
                              <AvatarFallback>
                                {booking.profiles?.full_name?.charAt(0) || "P"}
                              </AvatarFallback>
                            </Avatar>

                            <div className="flex-1">
                              <h4 className="font-semibold">
                                {booking.profiles?.full_name || "Unknown Passenger"}
                              </h4>

                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mt-2 text-sm text-muted-foreground">
                                {booking.profiles?.phone && (
                                  <div className="flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    {booking.profiles.phone}
                                  </div>
                                )}

                                <div className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {booking.seats_booked || 1} seat(s)
                                </div>

                                <div className="flex items-center gap-1">
                                  <IndianRupee className="h-3 w-3" />₹
                                  {booking.total_price}
                                </div>

                                {/* Booked Seats Display */}
                                {booking.selected_seats &&
                                  booking.selected_seats.length > 0 && (
                                    <div className="flex items-center gap-1">
                                      <Car className="h-3 w-3" />
                                      <div className="flex flex-wrap gap-1">
                                        {booking.selected_seats.map(
                                          (seatId) => (
                                            <Badge
                                              key={seatId}
                                              variant="outline"
                                              className={`text-xs px-1 py-0.5 ${
                                                booking.status === "confirmed"
                                                  ? "border-red-300 text-red-700 bg-red-50"
                                                  : booking.status === "pending"
                                                  ? "border-amber-300 text-amber-700 bg-amber-50"
                                                  : "border-gray-300 text-gray-700 bg-gray-50"
                                              }`}
                                            >
                                              {seatId}
                                            </Badge>
                                          )
                                        )}
                                      </div>
                                    </div>
                                  )}
                              </div>
                            </div>
                          </div>

                          <Badge
                            variant={
                              booking.status === "confirmed"
                                ? "default"
                                : booking.status === "pending"
                                ? "secondary"
                                : "destructive"
                            }
                            className={
                              booking.status === "confirmed"
                                ? "bg-red-100 text-red-800"
                                : booking.status === "pending"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-gray-100 text-gray-800"
                            }
                          >
                            {booking.status}
                          </Badge>
                        </div>

                        {/* Passenger Notes */}
                        {booking.passenger_notes && (
                          <div className="mt-3 p-2 bg-muted rounded text-sm">
                            <span className="font-medium">Note:</span>{" "}
                            {booking.passenger_notes}
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>No bookings yet</p>
                    <p className="text-sm">
                      Passengers will appear here once they book
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};