import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Search,
  Shield,
  MapPin,
  Calendar as CalendarIconLucide,
  Users,
  Clock,
  Phone,
  Mail,
  Car,
  Calendar,
  IndianRupee,
  Navigation,
  CheckCircle,
  RefreshCw,
  MessageSquare,
  Star,
  Download,
  Share2,
  Eye,
  X,
  Info,
  CloudRain,
  ThermometerSun,
  ArrowRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { CitySearch } from "@/components/ui/city-search";
import { validateSearchParams } from "@/utils/fetchRides";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from '@/integrations/supabase/types';

interface SearchForm {
  from_city: string;
  to_city: string;
  date: string;
}

// Simplified type definitions to match actual database structure
interface BookingWithDetails {
  id: string;
  ride_id: string;
  passenger_id: string;
  seats_booked: number;
  total_price: number;
  status: string;
  created_at: string;
  selected_seats?: string[];
  rides?: {
    id: string;
    from_city: string;
    to_city: string;
    departure_date: string;
    departure_time: string;
    pickup_point: string;
    price_per_seat: number;
    route_distance_km?: number;
    route_duration_minutes?: number;
    status: string;
    driver_id: string;
    vehicle_id: string;
  };
  driver?: {
    id: string;
    full_name: string;
    phone: string;
    email?: string;
    avatar_url?: string;
    average_rating?: number;
    total_ratings?: number;
  };
  vehicle?: {
    car_model: string;
    car_type: string;
    license_plate: string;
    color?: string;
    seat_capacity: number;
  };
}

interface TripDetails {
  estimatedDuration: string;
  distance: string;
  weatherCondition: string;
  temperature: number;
}

const RideSearchBooking: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [searchForm, setSearchForm] = useState<SearchForm>({
    from_city: "",
    to_city: "",
    date: "",
  });

  // Booking management state
  const [upcomingBookings, setUpcomingBookings] = useState<BookingWithDetails[]>([]);
  const [pastBookings, setPastBookings] = useState<BookingWithDetails[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<BookingWithDetails | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [tripDetails, setTripDetails] = useState<Record<string, TripDetails>>({});

  useEffect(() => {
    if (profile?.id) {
      fetchMyBookings();
      const interval = setInterval(fetchMyBookings, 60000); // Refresh every minute
      return () => clearInterval(interval);
    }
  }, [profile?.id]);

  const fetchMyBookings = async () => {
    if (!profile?.id) return;

    try {
      setRefreshing(true);
      
      // First, fetch bookings with rides data only
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          *,
          rides:ride_id (
            id,
            from_city,
            to_city,
            departure_date,
            departure_time,
            pickup_point,
            price_per_seat,
            route_distance_km,
            route_duration_minutes,
            status,
            driver_id,
            vehicle_id
          )
        `)
        .eq('passenger_id', profile.id)
        .in('status', ['confirmed', 'completed', 'cancelled'])
        .order('created_at', { ascending: false });

      if (bookingsError) {
        console.error('Bookings fetch error:', bookingsError);
        throw bookingsError;
      }

      const bookings = bookingsData || [];
      console.log('Fetched bookings:', bookings);

      // Fetch driver and vehicle details separately for each booking
      const enrichedBookings = await Promise.all(
        bookings.map(async (booking) => {
          const ride = booking.rides;
          if (!ride) return booking;

          let driver = null;
          let vehicle = null;

          try {
            // Fetch driver details
            if (ride.driver_id) {
              const { data: driverData, error: driverError } = await supabase
                .from('profiles')
                .select('id, full_name, phone, email, avatar_url, average_rating, total_ratings')
                .eq('id', ride.driver_id)
                .single();

              if (!driverError && driverData) {
                driver = driverData;
              }
            }

            // Fetch vehicle details
            if (ride.vehicle_id) {
              const { data: vehicleData, error: vehicleError } = await supabase
                .from('vehicles')
                .select('car_model, car_type, license_plate, color, seat_capacity')
                .eq('id', ride.vehicle_id)
                .single();

              if (!vehicleError && vehicleData) {
                vehicle = vehicleData;
              }
            }
          } catch (error) {
            console.error('Error fetching driver/vehicle details:', error);
          }

          return {
            ...booking,
            driver,
            vehicle
          };
        })
      );

      console.log('Enriched bookings:', enrichedBookings);
      
      // Separate upcoming and past bookings
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const upcoming = enrichedBookings.filter(booking => {
        const departureDate = new Date(booking.rides?.departure_date || '');
        return departureDate >= today && booking.status === 'confirmed';
      });
      
      const past = enrichedBookings.filter(booking => {
        const departureDate = new Date(booking.rides?.departure_date || '');
        return departureDate < today || booking.status === 'completed' || booking.status === 'cancelled';
      });

      setUpcomingBookings(upcoming);
      setPastBookings(past);

      // Fetch additional trip details for upcoming bookings
      await fetchTripDetails(upcoming);

    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch your bookings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setBookingsLoading(false);
      setRefreshing(false);
    }
  };

  const fetchTripDetails = async (bookings: BookingWithDetails[]) => {
    const details: Record<string, TripDetails> = {};
    
    for (const booking of bookings) {
      const ride = booking.rides;
      if (!ride) continue;

      // Mock trip details - replace with actual API calls
      details[booking.id] = {
        estimatedDuration: ride.route_duration_minutes ? 
          `${Math.floor(ride.route_duration_minutes / 60)}h ${ride.route_duration_minutes % 60}m` : 
          'Calculating...',
        distance: ride.route_distance_km ? `${ride.route_distance_km} km` : 'Calculating...',
        weatherCondition: ['Sunny', 'Cloudy', 'Rainy', 'Partly Cloudy'][Math.floor(Math.random() * 4)],
        temperature: Math.floor(Math.random() * 15) + 20, // 20-35°C
      };
    }
    
    setTripDetails(details);
  };

  const cancelBooking = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId)
        .eq('passenger_id', profile?.id);

      if (error) throw error;

      toast({
        title: 'Booking Cancelled',
        description: 'Your booking has been cancelled successfully',
      });

      // Refresh bookings
      fetchMyBookings();

    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast({
        title: 'Error',
        description: 'Failed to cancel booking',
        variant: 'destructive',
      });
    }
  };

  const contactDriver = async (phone: string) => {
    window.open(`tel:${phone}`, '_self');
  };

  const shareBooking = async (booking: BookingWithDetails) => {
    const ride = booking.rides;
    const shareText = `My ride booking: ${ride?.from_city} to ${ride?.to_city} on ${ride?.departure_date} at ${ride?.departure_time}. Driver: ${booking.driver?.full_name}`;
    
    if (navigator.share) {
      await navigator.share({
        title: 'Ride Booking',
        text: shareText,
      });
    } else {
      await navigator.clipboard.writeText(shareText);
      toast({
        title: 'Copied',
        description: 'Booking details copied to clipboard',
      });
    }
  };

  const handleSearch = async () => {
    // Validate that we have at least one city
    if (!searchForm.from_city && !searchForm.to_city) {
      toast({
        title: "Search Required",
        description: "Please enter at least departure or destination city to search for rides",
        variant: "destructive",
      });
      return;
    }

    // Validate search parameters using the utility function
    const validationErrors = validateSearchParams({
      from_city: searchForm.from_city || undefined,
      to_city: searchForm.to_city || undefined,
      departure_date: searchForm.date || undefined,
    });

    if (validationErrors.length > 0) {
      toast({
        title: "Invalid Search Parameters",
        description: validationErrors[0],
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      // Create URL parameters for the search
      const searchParams = new URLSearchParams();
      
      if (searchForm.from_city) {
        searchParams.append('from_city', searchForm.from_city);
      }
      if (searchForm.to_city) {
        searchParams.append('to_city', searchForm.to_city);
      }
      if (searchForm.date) {
        searchParams.append('date', searchForm.date);
      }

      // Navigate to list rides with search parameters
      navigate(`/passenger/list-rides?${searchParams.toString()}`);
      
    } catch (error) {
      console.error("Error preparing search:", error);
      toast({
        title: "Search Error",
        description: "Failed to prepare search. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSearch = (fromCity: string, toCity: string) => {
    setSearchForm(prev => ({
      ...prev,
      from_city: fromCity,
      to_city: toCity,
    }));
  };

  const popularRoutes = [
    { from: "Mumbai", to: "Pune" },
    { from: "Delhi", to: "Gurgaon" },
    { from: "Bangalore", to: "Chennai" },
    { from: "Hyderabad", to: "Vijayawada" },
    { from: "Kolkata", to: "Durgapur" },
    { from: "Ahmedabad", to: "Vadodara" },
  ];

  const renderBookingCard = (booking: BookingWithDetails, isUpcoming: boolean = true) => {
    const ride = booking.rides;
    const driver = booking.driver;
    const vehicle = booking.vehicle;
    const details = tripDetails[booking.id];

    return (
      <Card key={booking.id} className={`${isUpcoming ? 'border-l-4 border-l-primary' : ''} hover:shadow-md transition-shadow`}>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <CardTitle className="text-lg flex items-center gap-2">
                <Car className="h-5 w-5" />
                {ride?.from_city} → {ride?.to_city}
                {isUpcoming && <Badge variant="secondary" className="bg-green-100 text-green-800">Confirmed</Badge>}
                {booking.status === 'cancelled' && <Badge variant="destructive">Cancelled</Badge>}
                {booking.status === 'completed' && <Badge variant="secondary">Completed</Badge>}
              </CardTitle>
              <CardDescription className="mt-1">
                {ride?.departure_date} at {ride?.departure_time}
              </CardDescription>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-primary">₹{booking.total_price}</p>
              <p className="text-sm text-muted-foreground">{booking.seats_booked} seat(s)</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Driver Info */}
          {driver && (
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Avatar className="h-12 w-12">
                <AvatarImage src={driver?.avatar_url} alt={driver?.full_name} />
                <AvatarFallback>{driver?.full_name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h4 className="font-semibold">{driver?.full_name}</h4>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <span>{driver?.average_rating ? Number(driver.average_rating).toFixed(1) : '0.0'}</span>
                    <span>({driver?.total_ratings || 0})</span>
                  </div>
                  {vehicle && (
                    <div className="flex items-center gap-1">
                      <Car className="h-3 w-3" />
                      {vehicle?.car_model} ({vehicle?.car_type})
                    </div>
                  )}
                </div>
              </div>
              {isUpcoming && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => contactDriver(driver?.phone || '')}>
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => shareBooking(booking)}>
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Trip Details */}
          {details && isUpcoming && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{details.estimatedDuration}</span>
              </div>
              <div className="flex items-center gap-2">
                <Navigation className="h-4 w-4 text-muted-foreground" />
                <span>{details.distance}</span>
              </div>
              <div className="flex items-center gap-2">
                {details.weatherCondition === 'Rainy' ? 
                  <CloudRain className="h-4 w-4 text-muted-foreground" /> : 
                  <ThermometerSun className="h-4 w-4 text-muted-foreground" />
                }
                <span>{details.weatherCondition}, {details.temperature}°C</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{ride?.pickup_point}</span>
              </div>
            </div>
          )}

          {/* Seat Details */}
          {booking.selected_seats && booking.selected_seats.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Seats:</span>
              {booking.selected_seats.map(seatId => (
                <Badge key={seatId} variant="outline" className="text-xs">
                  {seatId}
                </Badge>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          {isUpcoming && (
            <div className="flex gap-2 pt-2">
              <Button 
                onClick={() => navigate(`/passenger/live-tracking?booking=${booking.id}`)}
                className="flex-1"
              >
                <Navigation className="h-4 w-4 mr-2" />
                Track Live
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="flex-1">
                    <Eye className="h-4 w-4 mr-2" />
                    Details
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Booking Details</DialogTitle>
                    <DialogDescription>
                      Complete information about your ride
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Booking ID:</span>
                        <p className="text-muted-foreground font-mono">{booking.id.slice(0, 8)}...</p>
                      </div>
                      <div>
                        <span className="font-medium">Total Price:</span>
                        <p className="text-muted-foreground">₹{booking.total_price}</p>
                      </div>
                      <div>
                        <span className="font-medium">Driver Phone:</span>
                        <p className="text-muted-foreground">{driver?.phone}</p>
                      </div>
                      <div>
                        <span className="font-medium">Vehicle:</span>
                        <p className="text-muted-foreground">{vehicle?.license_plate}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => cancelBooking(booking.id)}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                      <Button 
                        className="flex-1"
                        onClick={() => contactDriver(driver?.phone || '')}
                      >
                        <Phone className="h-4 w-4 mr-2" />
                        Call Driver
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background">
        <div className="container mx-auto px-4 py-12">
          {/* Main Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">Find Your Perfect Ride</h1>
            <p className="text-lg text-muted-foreground mb-2">
              Safe, affordable, and convenient ridesharing
            </p>
            <p className="text-sm text-muted-foreground">
              Connect with verified drivers and travel with confidence
            </p>
          </div>

          {/* Search Card */}
          <Card className="max-w-4xl mx-auto shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center text-2xl">
                <Search className="mr-3 h-6 w-6" /> Search Rides
              </CardTitle>
              <p className="text-muted-foreground">
                Enter your travel details to find available rides
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                {/* From City */}
                <div className="space-y-2">
                  <Label htmlFor="from_city" className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    From
                  </Label>
                  <CitySearch
                    placeholder="Departure city"
                    value={searchForm.from_city}
                    onValueChange={(value) =>
                      setSearchForm((prev) => ({
                        ...prev,
                        from_city: value,
                      }))
                    }
                  />
                </div>

                {/* To City */}
                <div className="space-y-2">
                  <Label htmlFor="to_city" className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    To
                  </Label>
                  <CitySearch
                    placeholder="Destination city"
                    value={searchForm.to_city}
                    onValueChange={(value) =>
                      setSearchForm((prev) => ({
                        ...prev,
                        to_city: value,
                      }))
                    }
                  />
                </div>

                {/* Date */}
                <div className="space-y-2">
                  <Label htmlFor="date" className="flex items-center gap-2">
                    <CalendarIconLucide className="h-4 w-4" />
                    Date
                  </Label>
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
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Search Button */}
              <div className="mt-8">
                <Button
                  onClick={handleSearch}
                  disabled={loading}
                  className="w-full md:w-auto text-lg px-8 py-6"
                  size="lg"
                >
                  <Search className="mr-2 h-5 w-5" />
                  {loading ? "Searching..." : "Search Rides"}
                </Button>
              </div>

              {/* Search Tips */}
              <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                <h4 className="font-semibold mb-2">Search Tips:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Enter at least departure OR destination city</li>
                  <li>• Select a date for more accurate results</li>
                  <li>• Try nearby cities if no rides are found</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* My Bookings Section - Only show if user is logged in */}
      {profile?.id && (
        <div className="container mx-auto px-4 py-12">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-6 w-6" />
                    My Bookings
                  </CardTitle>
                  <p className="text-muted-foreground">
                    Manage your upcoming and past rides
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={fetchMyBookings}
                  disabled={refreshing}
                  size="sm"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {bookingsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mr-4"></div>
                  <p>Loading your bookings...</p>
                </div>
              ) : (
                <Tabs defaultValue="upcoming" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="upcoming" className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Upcoming ({upcomingBookings.length})
                    </TabsTrigger>
                    <TabsTrigger value="past" className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Past Rides ({pastBookings.length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="upcoming" className="mt-6">
                    {upcomingBookings.length > 0 ? (
                      <div className="space-y-4">
                        {upcomingBookings.map(booking => renderBookingCard(booking, true))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Car className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No upcoming rides</h3>
                        <p className="text-muted-foreground mb-4">Search for rides to get started</p>
                        <Button onClick={() => document.querySelector('input')?.focus()}>
                          <Search className="h-4 w-4 mr-2" />
                          Search Rides
                        </Button>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="past" className="mt-6">
                    {pastBookings.length > 0 ? (
                      <div className="space-y-4">
                        {pastBookings.slice(0, 5).map(booking => renderBookingCard(booking, false))}
                        {pastBookings.length > 5 && (
                          <div className="text-center pt-4">
                            <Button 
                              variant="outline" 
                              onClick={() => navigate('/passenger/trip-history')}
                            >
                              View All Past Rides
                              <ArrowRight className="h-4 w-4 ml-2" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No ride history</h3>
                        <p className="text-muted-foreground">Your completed rides will appear here</p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Popular Routes Section */}
      <div className="container mx-auto px-4 py-12">
        <Card>
          <CardHeader>
            <CardTitle>Popular Routes</CardTitle>
            <p className="text-muted-foreground">
              Quick search for frequently traveled routes
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {popularRoutes.map((route, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="justify-between h-auto p-4"
                  onClick={() => handleQuickSearch(route.from, route.to)}
                >
                  <div className="text-left">
                    <p className="font-medium">{route.from} → {route.to}</p>
                    <p className="text-xs text-muted-foreground">Popular route</p>
                  </div>
                  <Search className="h-4 w-4" />
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Features Section */}
      <div className="bg-muted/30">
        <div className="container mx-auto px-4 py-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-4">Why Choose Our Rideshare?</h2>
            <p className="text-muted-foreground">
              Safe, reliable, and affordable travel for everyone
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center">
              <CardContent className="p-6">
                <Shield className="h-12 w-12 mx-auto mb-4 text-primary" />
                <h3 className="text-xl font-semibold mb-2">Safety First</h3>
                <p className="text-muted-foreground">
                  Verified drivers, GPS tracking, and emergency features for your security
                </p>
              </CardContent>
            </Card>
            
            <Card className="text-center">
              <CardContent className="p-6">
                <Users className="h-12 w-12 mx-auto mb-4 text-primary" />
                <h3 className="text-xl font-semibold mb-2">Trusted Community</h3>
                <p className="text-muted-foreground">
                  Join thousands of verified travelers and build lasting connections
                </p>
              </CardContent>
            </Card>
            
            <Card className="text-center">
              <CardContent className="p-6">
                <MapPin className="h-12 w-12 mx-auto mb-4 text-primary" />
                <h3 className="text-xl font-semibold mb-2">Convenient Routes</h3>
                <p className="text-muted-foreground">
                  Find rides to popular destinations with flexible pickup points
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="container mx-auto px-4 py-12 text-center">
        <h2 className="text-2xl font-bold mb-4">Ready to Start Your Journey?</h2>
        <p className="text-muted-foreground mb-6">
          Search for rides now and connect with fellow travelers
        </p>
        <Button 
          onClick={() => document.querySelector('input')?.focus()} 
          size="lg"
          className="px-8"
        >
          Start Searching
        </Button>
      </div>
    </div>
  );
};

export default RideSearchBooking;