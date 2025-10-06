import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  MapPin,
  Calendar,
  Clock,
  Users,
  Star,
  Phone,
  Shield,
  ArrowLeft,
  Eye,
  Lock,
  CheckCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  fetchRides,
  searchRidesAdvanced,
  RideSearchParams,
  RideWithDetails,
} from "@/utils/fetchRides";

const ListRides: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [rides, setRides] = useState<RideWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Extract search parameters from URL
  const searchCriteria: RideSearchParams = {
    from_city: searchParams.get("from_city") || undefined,
    to_city: searchParams.get("to_city") || undefined,
    departure_date: searchParams.get("date") || undefined,
    min_seats: searchParams.get("min_seats")
      ? parseInt(searchParams.get("min_seats")!)
      : undefined,
  };

  useEffect(() => {
    handleFetchRides();
  }, []);

  const handleFetchRides = async () => {
    setLoading(true);
    try {
      // Validate that we have at least one search criteria
      if (!searchCriteria.from_city && !searchCriteria.to_city) {
        toast({
          title: "Invalid Search",
          description:
            "No search criteria provided. Redirecting to search page.",
          variant: "destructive",
        });
        navigate("/passenger/rides-search-booking");
        return;
      }

      console.log("🔍 Search criteria:", searchCriteria);
      const result = await fetchRides(searchCriteria, 50, 0);

      if (result.error) {
        throw new Error(result.error);
      }

      console.log("✅ Fetch result:", result);
      setRides(result.rides || []);
      setTotalCount(result.total_count || 0);

      if (!result.rides || result.rides.length === 0) {
        toast({
          title: "No rides found",
          description: "Try adjusting your search criteria or check back later",
        });
      }
    } catch (error) {
      console.error("Error fetching rides:", error);
      toast({
        title: "Search Error",
        description: "Failed to load rides. Please try again.",
        variant: "destructive",
      });
      setRides([]);
    } finally {
      setLoading(false);
    }
  };

  const handleBookRide = (ride: RideWithDetails) => {
    navigate(`/passenger/ride-booking/${ride.id}`);
  };

  const handleBackToSearch = () => {
    navigate("/passenger/rides-search-booking"); // Fixed route name
  };

  const renderStars = (rating: number, totalRatings: number) => {
    if (totalRatings === 0) {
      return (
        <span className="text-xs text-muted-foreground">No ratings yet</span>
      );
    }
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

  const formatSearchSummary = () => {
    const parts = [];
    if (searchCriteria.from_city)
      parts.push(`From: ${searchCriteria.from_city}`);
    if (searchCriteria.to_city) parts.push(`To: ${searchCriteria.to_city}`);
    if (searchCriteria.departure_date)
      parts.push(
        `Date: ${new Date(searchCriteria.departure_date).toLocaleDateString()}`
      );
    if (searchCriteria.min_seats && searchCriteria.min_seats > 1)
      parts.push(`Min Seats: ${searchCriteria.min_seats}`);

    return parts.join(" • ");
  };

  // Helper function to determine if driver info is limited due to security
  const isDriverInfoLimited = (driver: any) => {
    return !driver?.phone || driver.phone === "";
  };

  // Helper function to determine if license plate is hidden
  const isLicensePlateHidden = (vehicle: any) => {
    return (
      vehicle?.license_plate === "Will be shared after confirmation" ||
      !vehicle?.license_plate
    );
  };

  // Render driver verification status
  const renderDriverVerificationStatus = (driver: any) => {
    const status = driver?.kyc_status || "unknown";
    switch (status) {
      case "approved":
        return (
          <div className="flex items-center gap-1 text-green-600">
            <CheckCircle className="h-3 w-3" />
            <span className="text-xs">Verified</span>
          </div>
        );
      case "pending":
        return (
          <div className="flex items-center gap-1 text-yellow-600">
            <Clock className="h-3 w-3" />
            <span className="text-xs">Pending</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1 text-gray-500">
            <Shield className="h-3 w-3" />
            <span className="text-xs">Unverified</span>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Header with back button */}
      <div className="flex justify-start items-center mb-4">
        <Button
          variant="outline"
          onClick={handleBackToSearch}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Search
        </Button>
      </div>

      {/* Search Summary */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold mb-1">Search Results</h2>
              <p className="text-sm text-muted-foreground">
                {formatSearchSummary()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">{totalCount} rides found</p>
              {loading && (
                <p className="text-xs text-muted-foreground">Loading...</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardContent className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p>Loading available rides...</p>
            </div>
          ) : !rides || rides.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="mx-auto h-16 w-16 mb-6 opacity-30" />
              <h3 className="text-lg font-semibold mb-2">No Rides Found</h3>
              <p className="mb-4">
                We couldn't find any rides matching your search criteria
              </p>
              <p className="text-sm mb-6">
                Try adjusting your filters or search for different cities
              </p>
              <Button onClick={handleBackToSearch} variant="outline">
                Modify Search
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {rides.map((ride, index) => (
                <Card
                  key={ride.id || `ride-${index}`}
                  className="hover:shadow-md transition-shadow border"
                >
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-semibold">
                            {ride.from_city || "Unknown"} →{" "}
                            {ride.to_city || "Unknown"}
                          </h3>
                          <Badge variant="secondary" className="text-xs">
                            {ride.available_seats || 0} seat
                            {ride.available_seats !== 1 ? "s" : ""} left
                          </Badge>
                        </div>
                        <div className="grid md:grid-cols-4 gap-4 text-sm mb-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {ride.departure_date
                              ? new Date(
                                  ride.departure_date
                                ).toLocaleDateString()
                              : "No date"}
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            {ride.departure_time || "No time"}
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            {ride.available_seats || 0} seats
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            {ride.pickup_point || "No pickup point"}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">
                          ₹{ride.price_per_seat || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          per seat
                        </div>
                      </div>
                    </div>

                    {/* Driver Information */}
                    <div className="bg-muted/50 rounded-lg p-4 mb-4">
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Users className="h-4 w-4" /> Driver Information
                        {isDriverInfoLimited(ride.driver) && (
                          <Badge variant="outline" className="text-xs">
                            <Lock className="h-3 w-3 mr-1" />
                            Limited Preview
                          </Badge>
                        )}
                      </h4>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            {ride.driver?.avatar_url ? (
                              <img
                                src={ride.driver.avatar_url}
                                alt={ride.driver.full_name || "Driver"}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <span className="font-semibold text-primary">
                                {ride.driver?.full_name?.charAt(0) || "D"}
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="font-medium">
                              {ride.driver?.full_name || "Driver"}
                            </p>
                            <div className="flex items-center gap-2">
                              {renderStars(
                                ride.driver?.average_rating || 0,
                                ride.driver?.total_ratings || 0
                              )}
                              {renderDriverVerificationStatus(ride.driver)}
                            </div>
                            {ride.driver?.gender && (
                              <p className="text-xs text-muted-foreground">
                                {ride.driver.gender}
                                {ride.driver.age
                                  ? `, ${ride.driver.age} years`
                                  : ""}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right text-sm">
                          <p>
                            <span className="text-muted-foreground">
                              Vehicle:
                            </span>{" "}
                            {ride.vehicle?.car_type || "N/A"}
                          </p>
                          <p>
                            <span className="text-muted-foreground">
                              Model:
                            </span>{" "}
                            {ride.vehicle?.car_model || "N/A"}
                          </p>
                          <p>
                            <span className="text-muted-foreground">
                              Color:
                            </span>{" "}
                            {ride.vehicle?.color || "N/A"}
                          </p>
                          <p className="flex items-center gap-1">
                            <span className="text-muted-foreground">
                              Plate:
                            </span>{" "}
                            {isLicensePlateHidden(ride.vehicle) ? (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Lock className="h-3 w-3" />
                                After booking
                              </span>
                            ) : (
                              ride.vehicle?.license_plate || "N/A"
                            )}
                          </p>
                          {ride.vehicle?.is_verified && (
                            <div className="flex items-center gap-1 text-green-600 mt-1">
                              <CheckCircle className="h-3 w-3" />
                              <span className="text-xs">Verified Vehicle</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Security Notice for Limited Info */}
                    {isDriverInfoLimited(ride.driver) && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                        <div className="flex items-start gap-2">
                          <Shield className="h-4 w-4 text-amber-600 mt-0.5" />
                          <div className="text-sm text-amber-800">
                            <p className="font-medium mb-1">
                              Privacy Protection Active
                            </p>
                            <p>
                              Driver contact details and license information
                              will be shared after booking confirmation for your
                              safety and privacy.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Additional Information */}
                    {ride.notes && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                        <p className="text-sm text-blue-800">
                          <strong>Driver's Note:</strong> {ride.notes}
                        </p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Button
                        className="flex-1"
                        onClick={() => handleBookRide(ride)}
                        disabled={
                          !ride.available_seats || ride.available_seats === 0
                        }
                      >
                        {!ride.available_seats || ride.available_seats === 0
                          ? "Fully Booked"
                          : "Book This Ride"}
                      </Button>

                      {/* Contact Button - Only show if phone is available or show limited state */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (ride.driver?.phone && ride.driver.phone !== "") {
                            window.open(`tel:${ride.driver.phone}`);
                          } else {
                            toast({
                              title: "Contact After Booking",
                              description:
                                "Driver contact information will be available after booking confirmation.",
                              variant: "default",
                            });
                          }
                        }}
                        className={
                          !ride.driver?.phone || ride.driver.phone === ""
                            ? "opacity-50"
                            : ""
                        }
                      >
                        <Phone className="h-4 w-4" />
                        {(!ride.driver?.phone || ride.driver.phone === "") && (
                          <Lock className="h-3 w-3 ml-1" />
                        )}
                      </Button>

                      {/* View Details Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigate(`/passenger/route-preview/${ride.id}`);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer Info */}
      {rides.length > 0 && (
        <Card className="mt-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4" />
              <p>
                Your privacy is protected. Driver contact details and license
                information are shared only after booking confirmation.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ListRides;
