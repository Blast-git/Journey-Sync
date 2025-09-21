import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Search,
  MapPin,
  Calendar,
  Clock,
  Users,
  Star,
  Phone,
  Shield,
  Car,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
// import { SafetyTransferNotification } from "@/pages/passenger/safety/SafetyTransferNotification";
import { SeatVisualization } from "@/components/SeatVisualization";
import { RouteVisualization } from "@/components/RouteVisualization";
import { useNavigate } from "react-router-dom";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";

interface Ride {
  id: string;
  from_city: string;
  to_city: string;
  departure_date: string;
  departure_time: string;
  pickup_point: string;
  available_seats: number;
  price_per_seat: number;
  notes?: string;
  vehicles: {
    car_model: string;
    car_type: string;
    color: string;
  } | null;
  profiles: {
    full_name: string;
    phone: string;
    avatar_url?: string;
    average_rating: number;
    total_ratings: number;
  };
}

const RideSearchBooking: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [searchForm, setSearchForm] = useState({
    from_city: "",
    to_city: "",
    date: "",
    min_seats: 1,
  });
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);
  const [bookingForm, setBookingForm] = useState({
    seats_booked: 1,
    passenger_name: "",
    passenger_phone: "",
    passenger_email: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    passenger_notes: "",
    preferred_seat: "",
    gender: "",
    age: "",
  });
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);
  const [userBookings, setUserBookings] = useState([]);
  const [transferRequest, setTransferRequest] = useState<any>(null);
  const [showTransferNotification, setShowTransferNotification] = useState(false);

  useEffect(() => {
    if (profile?.id) {
      fetchUserBookings();
    }
    fetchAllRides();
  }, [profile?.id]);

  const fetchUserBookings = async () => {
    if (!profile?.id) return;
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select("ride_id, status")
        .eq("passenger_id", profile.id)
        .in("status", ["pending", "confirmed"]);
      if (error) throw error;
      setUserBookings(data || []);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      toast({
        title: "Error",
        description: "Failed to fetch your bookings",
        variant: "destructive",
      });
    }
  };

  const fetchAllRides = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("rides")
        .select(
          `
          *,
          vehicles (
            car_model,
            car_type,
            color
          ),
          profiles:driver_id (
            full_name,
            phone,
            avatar_url,
            average_rating,
            total_ratings
          )
        `
        )
        .eq("is_active", true)
        .gt("available_seats", 0)
        .gte("departure_date", new Date().toISOString().split("T")[0])
        .order("departure_date", { ascending: true });
      if (error) throw error;
      setRides(data || []);
    } catch (error) {
      console.error("Error fetching rides:", error);
      toast({
        title: "Error",
        description: "Failed to fetch rides",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("rides")
        .select(
          `
          *,
          vehicles (
            car_model,
            car_type,
            color
          ),
          profiles:driver_id (
            full_name,
            phone,
            avatar_url,
            average_rating,
            total_ratings
          )
        `
        )
        .eq("is_active", true)
        .gt("available_seats", 0)
        .gte("departure_date", new Date().toISOString().split("T")[0]);

      if (searchForm.from_city) {
        query = query.ilike("from_city", `%${searchForm.from_city}%`);
      }
      if (searchForm.to_city) {
        query = query.ilike("to_city", `%${searchForm.to_city}%`);
      }
      if (searchForm.date) {
        query = query.eq("departure_date", searchForm.date);
      }
      if (searchForm.min_seats > 1) {
        query = query.gte("available_seats", searchForm.min_seats);
      }

      const { data, error } = await query.order("departure_date", {
        ascending: true,
      });
      if (error) throw error;
      setRides(data || []);
    } catch (error) {
      console.error("Error searching rides:", error);
      toast({
        title: "Error",
        description: "Failed to search rides",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBookRide = async () => {
    if (!selectedRide || !profile) return;

    setBookingLoading(true);
    try {
      // Validate required fields
      if (
        !bookingForm.gender ||
        !bookingForm.age ||
        !bookingForm.passenger_name ||
        !bookingForm.passenger_phone
      ) {
        toast({
          title: "Missing Information",
          description: "Please fill in all required passenger details",
          variant: "destructive",
        });
        return;
      }

      // Check existing bookings
      const existingBooking = userBookings.find(
        (booking) =>
          booking.ride_id === selectedRide.id &&
          ["pending", "confirmed"].includes(booking.status)
      );
      if (existingBooking) {
        toast({
          title: "Already Booked",
          description:
            "You have an active booking for this ride. Cancel it first.",
          variant: "destructive",
        });
        return;
      }

      if (bookingForm.seats_booked > selectedRide.available_seats) {
        toast({
          title: "Not Enough Seats",
          description: `Only ${selectedRide.available_seats} seat(s) available.`,
          variant: "destructive",
        });
        return;
      }

      const totalPrice = bookingForm.seats_booked * selectedRide.price_per_seat;

      // Update profile with gender and age
      await supabase
        .from("profiles")
        .update({
          gender: bookingForm.gender,
          age: parseInt(bookingForm.age),
        })
        .eq("id", profile.id);

      // Create booking
      const { data: newBooking, error: bookingError } = await supabase
        .from("bookings")
        .insert({
          ride_id: selectedRide.id,
          passenger_id: profile.id,
          seats_booked: bookingForm.seats_booked,
          total_price: totalPrice,
          passenger_notes: bookingForm.passenger_notes,
          preferred_seat: bookingForm.preferred_seat,
          status: "pending",
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // Update available seats
      await supabase
        .from("rides")
        .update({
          available_seats:
            selectedRide.available_seats - bookingForm.seats_booked,
        })
        .eq("id", selectedRide.id);

      // Safety transfer for female passengers
      if (bookingForm.gender === "female") {
        const { data: transferData, error: transferError } =
          await supabase.functions.invoke("safety-transfer", {
            body: {
              bookingId: newBooking.id,
              passengerGender: bookingForm.gender,
              passengerAge: parseInt(bookingForm.age),
              routeFrom: selectedRide.from_city,
              routeTo: selectedRide.to_city,
              departureDate: selectedRide.departure_date,
              departureTime: selectedRide.departure_time,
              preferredSeat: bookingForm.preferred_seat,
              originalVehicleBrand: selectedRide.vehicles?.car_type,
              originalVehicleSegment: selectedRide.vehicles?.car_type,
            },
          });
        if (transferData?.transferRequest) {
          setTransferRequest(transferData.transferRequest);
          setShowTransferNotification(true);
        }
      }

      // Send notifications (simplified for brevity)
      const bookingReference = `RS${newBooking.id
        .substring(0, 8)
        .toUpperCase()}`;
      toast({
        title: "Booking Successful!",
        description: `Your booking for ${bookingForm.seats_booked} seat(s) has been submitted. Ref: ${bookingReference}`,
      });

      // Trigger live tracking (placeholder)
      console.log("Initializing live tracking for booking:", newBooking.id);
      // import { startTracking } from '@/pages/passenger/LiveTracking';
      // startTracking(newBooking.id);

      setIsBookingDialogOpen(false);
      setBookingForm({
        seats_booked: 1,
        passenger_name: "",
        passenger_phone: "",
        passenger_email: "",
        emergency_contact_name: "",
        emergency_contact_phone: "",
        passenger_notes: "",
        preferred_seat: "",
        gender: "",
        age: "",
      });
      fetchUserBookings();
      fetchAllRides();
    } catch (error) {
      console.error("Error booking ride:", error);
      toast({
        title: "Booking Failed",
        description: "Failed to book the ride. Please try again.",
        variant: "destructive",
      });
    } finally {
      setBookingLoading(false);
    }
  };

  const handleTransferResponse = (response: "accepted" | "declined") => {
    setShowTransferNotification(false);
    setTransferRequest(null);
    if (response === "accepted") fetchAllRides();
  };

  const handleTransferExpire = () => {
    setShowTransferNotification(false);
    setTransferRequest(null);
  };

  const renderStars = (rating: number, totalRatings: number) => {
    if (totalRatings === 0)
      return <span className="text-xs text-muted-foreground">No ratings</span>;
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-3 w-3 ${
              star <= rating
                ? "text-yellow-400 fill-yellow-400"
                : "text-gray-300"
            }`}
          />
        ))}
        <span className="text-xs text-muted-foreground ml-1">
          {rating.toFixed(1)} ({totalRatings})
        </span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background p-4">
      {/* SOS Button */}
      <Button
        variant="destructive"
        size="sm"
        className="mb-4 rounded-full"
        onClick={() => navigate("/emergency")}
      >
        <Shield className="h-4 w-4 mr-2" /> Emergency SOS
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Search className="mr-2 h-5 w-5" /> Search Rides
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="from_city">From</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="from_city"
                  placeholder="Departure city"
                  className="pl-10"
                  value={searchForm.from_city}
                  onChange={(e) =>
                    setSearchForm((prev) => ({
                      ...prev,
                      from_city: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="to_city">To</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="to_city"
                  placeholder="Destination city"
                  className="pl-10"
                  value={searchForm.to_city}
                  onChange={(e) =>
                    setSearchForm((prev) => ({
                      ...prev,
                      to_city: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      setSelectedDate(date);
                      setSearchForm((prev) => ({
                        ...prev,
                        date: date ? format(date, "yyyy-MM-dd") : "",
                      }));
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="min_seats">Seats</Label>
              <Input
                id="min_seats"
                type="number"
                min="1"
                max="8"
                value={searchForm.min_seats}
                onChange={(e) =>
                  setSearchForm((prev) => ({
                    ...prev,
                    min_seats: parseInt(e.target.value) || 1,
                  }))
                }
              />
            </div>
          </div>
          <div className="mt-6 flex gap-4">
            <Button
              onClick={handleSearch}
              disabled={loading}
              className="md:w-auto"
            >
              <Search className="mr-2 h-4 w-4" />
              {loading ? "Searching..." : "Search Rides"}
            </Button>
            <Button
              variant="outline"
              onClick={fetchAllRides}
              disabled={loading}
            >
              Show All Rides
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* {showTransferNotification && transferRequest && (
        <SafetyTransferNotification
          transferRequest={transferRequest}
          onResponse={handleTransferResponse}
          onExpire={handleTransferExpire}
        />
      )} */}

      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Available Rides</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <p>Loading rides...</p>
              </div>
            ) : rides.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>No rides found</p>
                <p className="text-sm">Try adjusting your search filters</p>
              </div>
            ) : (
              <div className="space-y-4">
                {rides.map((ride) => (
                  <Card
                    key={ride.id}
                    className="hover:shadow-md transition-shadow"
                  >
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-semibold">
                              {ride.from_city} → {ride.to_city}
                            </h3>
                            <Badge variant="secondary" className="text-xs">
                              {ride.available_seats} seat
                              {ride.available_seats !== 1 ? "s" : ""} left
                            </Badge>
                          </div>
                          <div className="grid md:grid-cols-4 gap-4 text-sm mb-4">
                            <div className="flex items-center gap-2">
                              <Calendar
                                className="h-4 w-4 text-muted-foreground"
                              />
                              {new Date(ride.departure_date).toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock
                                className="h-4 w-4 text-muted-foreground"
                              />
                              {ride.departure_time}
                            </div>
                            <div className="flex items-center gap-2">
                              <Users
                                className="h-4 w-4 text-muted-foreground"
                              />
                              {ride.available_seats} seats
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin
                                className="h-4 w-4 text-muted-foreground"
                              />
                              {ride.pickup_point}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-primary">
                            ₹{ride.price_per_seat}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            per seat
                          </div>
                        </div>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-4 mb-4">
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <Users className="h-4 w-4" /> Driver Information
                        </h4>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="font-semibold text-primary">
                                {ride.profiles.full_name.charAt(0)}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">
                                {ride.profiles.full_name}
                              </p>
                              {renderStars(
                                ride.profiles.average_rating,
                                ride.profiles.total_ratings
                              )}
                            </div>
                          </div>
                          <div className="text-right text-sm">
                            <p>
                              <span className="text-muted-foreground">
                                Vehicle:
                              </span>{" "}
                              {ride.vehicles?.car_type || "N/A"}
                            </p>
                            <p>
                              <span className="text-muted-foreground">
                                Color:
                              </span>{" "}
                              {ride.vehicles?.color || "N/A"}
                            </p>
                          </div>
                        </div>
                      </div>
                      <RouteVisualization
                        fromCity={ride.from_city}
                        toCity={ride.to_city}
                      />{" "}
                      {/* Added */}
                      <SeatVisualization
                        totalSeats={4} // Adjust based on vehicle data if available
                        availableSeats={ride.available_seats}
                        vehicleType={ride.vehicles?.car_type || "car"}
                      />
                      <div className="mt-4 flex gap-2">
                        <Dialog
                          open={
                            isBookingDialogOpen &&
                            selectedRide?.id === ride.id
                          }
                          onOpenChange={(open) => {
                            if (!open) setSelectedRide(null); // Reset selected ride when closing
                            setIsBookingDialogOpen(open);
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button
                              className="flex-1"
                              onClick={() => setSelectedRide(ride)}
                              disabled={ride.available_seats === 0}
                            >
                              {ride.available_seats === 0
                                ? "Fully Booked"
                                : "Book This Ride"}
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Book Your Ride</DialogTitle>
                            </DialogHeader>
                            {selectedRide ? (
                              <div className="space-y-4">
                                <div className="bg-muted/50 rounded-lg p-4 mb-4">
                                  <h4 className="font-semibold mb-2">
                                    {selectedRide.from_city} →{" "}
                                    {selectedRide.to_city}
                                  </h4>
                                  <div className="text-sm space-y-1">
                                    <p>
                                      <span className="text-muted-foreground">
                                        Date:
                                      </span>{" "}
                                      {new Date(
                                        selectedRide.departure_date
                                      ).toLocaleDateString()}
                                    </p>
                                    <p>
                                      <span className="text-muted-foreground">
                                        Time:
                                      </span>{" "}
                                      {selectedRide.departure_time}
                                    </p>
                                    <p>
                                      <span className="text-muted-foreground">
                                        Pickup:
                                      </span>{" "}
                                      {selectedRide.pickup_point}
                                    </p>
                                    <p>
                                      <span className="text-muted-foreground">
                                        Driver:
                                      </span>{" "}
                                      {selectedRide.profiles.full_name}
                                    </p>
                                  </div>
                                </div>

                                <div>
                                  <Label htmlFor="seats_booked">
                                    Number of Seats
                                  </Label>
                                  <Input
                                    id="seats_booked"
                                    type="number"
                                    min="1"
                                    max={selectedRide.available_seats}
                                    value={bookingForm.seats_booked}
                                    onChange={(e) =>
                                      setBookingForm((prev) => ({
                                        ...prev,
                                        seats_booked:
                                          parseInt(e.target.value) || 1,
                                      }))
                                    }
                                  />
                                  <p className="text-sm text-muted-foreground mt-1">
                                    Available: {selectedRide.available_seats}{" "}
                                    seats
                                  </p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label htmlFor="passenger_name">
                                      Full Name *
                                    </Label>
                                    <Input
                                      id="passenger_name"
                                      placeholder="Enter full name"
                                      value={bookingForm.passenger_name}
                                      onChange={(e) =>
                                        setBookingForm((prev) => ({
                                          ...prev,
                                          passenger_name: e.target.value,
                                        }))
                                      }
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="passenger_phone">
                                      Phone Number *
                                    </Label>
                                    <Input
                                      id="passenger_phone"
                                      placeholder="Enter phone number"
                                      value={bookingForm.passenger_phone}
                                      onChange={(e) =>
                                        setBookingForm((prev) => ({
                                          ...prev,
                                          passenger_phone: e.target.value,
                                        }))
                                      }
                                    />
                                  </div>
                                </div>

                                <div>
                                  <Label htmlFor="gender">Gender *</Label>
                                  <Select
                                    value={bookingForm.gender}
                                    onValueChange={(value) =>
                                      setBookingForm((prev) => ({
                                        ...prev,
                                        gender: value,
                                      }))
                                    }
                                  >
                                    <SelectTrigger id="gender">
                                      <SelectValue placeholder="Select gender" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="female">Female</SelectItem>
                                      <SelectItem value="male">Male</SelectItem>
                                      <SelectItem value="other">Other</SelectItem>
                                      <SelectItem value="prefer_not_to_say">
                                        Prefer not to say
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div>
                                  <Label htmlFor="age">Age *</Label>
                                  <Input
                                    id="age"
                                    type="number"
                                    min="18"
                                    max="100"
                                    value={bookingForm.age}
                                    onChange={(e) =>
                                      setBookingForm((prev) => ({
                                        ...prev,
                                        age: e.target.value,
                                      }))
                                    }
                                  />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label htmlFor="emergency_contact_name">
                                      Emergency Contact Name
                                    </Label>
                                    <Input
                                      id="emergency_contact_name"
                                      placeholder="Enter contact name"
                                      value={bookingForm.emergency_contact_name}
                                      onChange={(e) =>
                                        setBookingForm((prev) => ({
                                          ...prev,
                                          emergency_contact_name:
                                            e.target.value,
                                        }))
                                      }
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="emergency_contact_phone">
                                      Emergency Contact Phone
                                    </Label>
                                    <Input
                                      id="emergency_contact_phone"
                                      placeholder="Enter contact phone"
                                      value={bookingForm.emergency_contact_phone}
                                      onChange={(e) =>
                                        setBookingForm((prev) => ({
                                          ...prev,
                                          emergency_contact_phone:
                                            e.target.value,
                                        }))
                                      }
                                    />
                                  </div>
                                </div>

                                <div>
                                  <Label htmlFor="preferred_seat">
                                    Preferred Seat (Optional)
                                  </Label>
                                  <Select
                                    value={bookingForm.preferred_seat}
                                    onValueChange={(value) =>
                                      setBookingForm((prev) => ({
                                        ...prev,
                                        preferred_seat: value,
                                      }))
                                    }
                                  >
                                    <SelectTrigger id="preferred_seat">
                                      <SelectValue placeholder="Select preferred seat" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="front">Front Seat</SelectItem>
                                      <SelectItem value="window">Window Seat</SelectItem>
                                      <SelectItem value="middle">Middle Seat</SelectItem>
                                      <SelectItem value="any">Any Seat</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div>
                                  <Label htmlFor="passenger_notes">
                                    Additional Notes (Optional)
                                  </Label>
                                  <Textarea
                                    id="passenger_notes"
                                    placeholder="Any special requests..."
                                    value={bookingForm.passenger_notes}
                                    onChange={(e) =>
                                      setBookingForm((prev) => ({
                                        ...prev,
                                        passenger_notes: e.target.value,
                                      }))
                                    }
                                  />
                                </div>

                                <div className="bg-primary/10 rounded-lg p-4">
                                  <div className="flex justify-between items-center">
                                    <span className="font-semibold">
                                      Total Price:
                                    </span>
                                    <span className="text-2xl font-bold text-primary">
                                      ₹
                                      {selectedRide
                                        ? (
                                            selectedRide.price_per_seat *
                                            bookingForm.seats_booked
                                          ).toFixed(2)
                                        : "0.00"}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    onClick={() =>
                                      setIsBookingDialogOpen(false)
                                    }
                                    disabled={bookingLoading}
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    onClick={handleBookRide}
                                    disabled={
                                      bookingLoading ||
                                      bookingForm.seats_booked >
                                        selectedRide.available_seats
                                    }
                                  >
                                    {bookingLoading
                                      ? "Booking..."
                                      : "Confirm Booking"}
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-center text-muted-foreground">
                                No ride selected.
                              </p>
                            )}
                          </DialogContent>
                        </Dialog>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            window.open(`tel:${ride.profiles.phone}`)
                          }
                        >
                          <Phone className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RideSearchBooking;