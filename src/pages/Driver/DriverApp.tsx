import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Car,
  MapPin,
  TrendingUp,
  Star,
  Navigation,
  Shield,
  Users,
} from "lucide-react";

// Import the extracted components
import { DriverHeader } from "@/components/Driver/DriverHeader";
import { DriverStatsCards } from "@/components/Driver/DriverStatsCards";
import { DriverDashboard } from "@/components/Driver/DriverDashboard";

// Import existing components for other tabs
import KYCDocumentUpload from "@/components/Driver/DailyEarnings";
import TripManagement from "@/components/Driver/TripManagement";
import DailyEarnings from "@/components/Driver/DailyEarnings";
import DriverRatingFeedback from "@/components/Driver/DriverRatingFeedback";
import LiveLocationSharing from "@/pages/passenger/safety/LiveLocationSharing";
import DriverProfile from "@/pages/Driver/DriverProfile";

// Import the ride details dialog
import { RideDetailsDialog } from "@/components/Driver/RideDetailsDialog";

interface Ride {
  id: string;
  driver_id: string;
  vehicle_id: string;
  from_city: string;
  to_city: string;
  departure_date: string;
  departure_time: string;
  price_per_seat: number;
  available_seats: number;
  pickup_point?: string;
  status: string;
  vehicles?: {
    car_model: string;
    car_type: string;
    color?: string;
    license_plate: string;
    seat_capacity: number;
  };
}

interface Vehicle {
  id: string;
  car_model: string;
  car_type: string;
  license_plate: string;
  seat_capacity: number;
  color?: string;
  is_verified: boolean;
}

interface Stats {
  activeRides: number;
  upcomingRides: number;
  totalEarnings: number;
}

export const DriverApp = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // State management
  const [myRides, setMyRides] = useState<Ride[]>([]);
  const [myVehicles, setMyVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);
  const [rideDetailsOpen, setRideDetailsOpen] = useState(false);
  const [stats, setStats] = useState<Stats>({
    activeRides: 0,
    upcomingRides: 0,
    totalEarnings: 0,
  });

  // Load data on component mount
  useEffect(() => {
    if (profile?.id) {
      fetchMyRides();
      fetchMyVehicles();
      fetchEarningsStats();
    }
  }, [profile?.id]);

  // Data fetching functions
  const fetchEarningsStats = async () => {
    if (!profile?.id) return;

    try {
      const { data, error } = await supabase
        .from("bookings")
        .select(
          `
          total_price,
          rides!inner (
            driver_id
          )
        `
        )
        .eq("rides.driver_id", profile.id)
        .eq("status", "confirmed");

      if (error) throw error;

      const totalEarnings =
        data?.reduce((sum, booking) => sum + (booking.total_price || 0), 0) || 0;

      setStats((prev) => ({
        ...prev,
        totalEarnings,
      }));
    } catch (error) {
      console.error("Error fetching earnings:", error);
    }
  };

  const fetchMyVehicles = async () => {
    if (!profile?.id) return;

    try {
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .eq("driver_id", profile.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMyVehicles(data || []);
    } catch (error) {
      console.error("Error fetching vehicles:", error);
      toast({
        title: "Error",
        description: "Failed to fetch your vehicles",
        variant: "destructive",
      });
    }
  };

  const fetchMyRides = async () => {
    if (!profile?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("rides")
        .select(
          `
          *,
          vehicles!rides_vehicle_id_fkey (
            car_model,
            car_type,
            color,
            license_plate,
            seat_capacity
          )
        `
        )
        .eq("driver_id", profile.id)
        .neq("status", "cancelled")
        .order("departure_date", { ascending: true });

      if (error) {
        // Fallback to separate queries if join fails
        return await fetchRidesWithSeparateQueries();
      }

      setMyRides(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error("Error fetching rides:", error);
      await fetchRidesWithSeparateQueries();
    } finally {
      setLoading(false);
    }
  };

  const fetchRidesWithSeparateQueries = async () => {
    try {
      const { data: ridesData, error: ridesError } = await supabase
        .from("rides")
        .select("*")
        .eq("driver_id", profile.id)
        .neq("status", "cancelled")
        .order("departure_date", { ascending: true });

      if (ridesError) throw ridesError;

      const ridesWithVehicles = await Promise.all(
        (ridesData || []).map(async (ride) => {
          if (!ride.vehicle_id) {
            return { ...ride, vehicles: null };
          }

          const { data: vehicle, error: vehicleError } = await supabase
            .from("vehicles")
            .select(
              `
              car_model,
              car_type,
              color,
              license_plate,
              seat_capacity
            `
            )
            .eq("id", ride.vehicle_id)
            .single();

          if (vehicleError) {
            return { ...ride, vehicles: null };
          }

          return { ...ride, vehicles: vehicle };
        })
      );

      setMyRides(ridesWithVehicles);
      calculateStats(ridesWithVehicles);
    } catch (error) {
      console.error("Error in separate queries fallback:", error);
      toast({
        title: "Error",
        description: `Failed to fetch your rides: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const calculateStats = (ridesData: Ride[]) => {
    const now = new Date();
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const activeRides = ridesData?.length || 0;
    const upcomingRides =
      ridesData?.filter((ride) => {
        const rideDate = new Date(ride.departure_date);
        return rideDate >= now && rideDate <= oneWeekFromNow;
      }).length || 0;

    setStats((prev) => ({
      ...prev,
      activeRides,
      upcomingRides,
    }));
  };

  // Event handlers
  const handleCancelRide = async (rideId: string) => {
    if (!profile?.id) {
      toast({
        title: "Error",
        description: "User not authenticated",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from("rides")
        .update({ status: "cancelled" })
        .eq("id", rideId)
        .eq("driver_id", profile.id)
        .select()
        .single();

      if (error) throw error;
      if (!data) {
        throw new Error("Ride not found or you do not have permission to cancel this ride");
      }

      toast({
        title: "Success",
        description: "Ride cancelled successfully",
      });

      fetchMyRides();
      setRideDetailsOpen(false);
    } catch (error) {
      console.error("Error cancelling ride:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to cancel ride. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEditRide = (ride: Ride) => {
    navigate("/driver/post-rides", {
      state: {
        editData: ride,
        mode: "edit",
      },
    });
  };

  const handlePostNewRide = () => {
    navigate("/driver/post-rides");
  };

  const handleRideClick = (ride: Ride) => {
    setSelectedRide(ride);
    setRideDetailsOpen(true);
  };

  const handleVehicleAdded = () => {
    fetchMyVehicles();
    toast({
      title: "Success",
      description: "Vehicle added successfully!",
    });
  };

  const handleDeleteVehicle = async (vehicleId: string) => {
    try {
      const { error } = await supabase
        .from("vehicles")
        .delete()
        .eq("id", vehicleId)
        .eq("driver_id", profile.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Vehicle deleted successfully",
      });

      fetchMyVehicles();
    } catch (error) {
      console.error("Error deleting vehicle:", error);
      toast({
        title: "Error",
        description: "Failed to delete vehicle. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      toast({
        title: "Logged out successfully",
        description: "You have been logged out of your account",
      });
      navigate("/");
    } catch (error) {
      console.error("Error logging out:", error);
      toast({
        title: "Error",
        description: "Failed to logout. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4">
        <div className="max-w-6xl mx-auto">
          {/* Header Section */}
          <DriverHeader
            profile={profile}
            myVehicles={myVehicles}
            onPostNewRide={handlePostNewRide}
            onVehicleAdded={handleVehicleAdded}
            onDeleteVehicle={handleDeleteVehicle}
          />

          {/* Stats Cards */}
          <DriverStatsCards stats={stats} />

          {/* Navigation Tabs */}
          <Tabs defaultValue="dashboard" className="w-full">
            <TabsList className="grid w-full grid-cols-7 h-12 p-1 bg-muted rounded-lg">
              <TabsTrigger
                value="dashboard"
                className="flex items-center space-x-2"
              >
                <Car className="h-4 w-4" />
                <span>Dashboard</span>
              </TabsTrigger>
              <TabsTrigger
                value="trips"
                className="flex items-center space-x-2"
              >
                <MapPin className="h-4 w-4" />
                <span>Trips</span>
              </TabsTrigger>
              <TabsTrigger
                value="earnings"
                className="flex items-center space-x-2"
              >
                <TrendingUp className="h-4 w-4" />
                <span>Earnings</span>
              </TabsTrigger>
              <TabsTrigger
                value="ratings"
                className="flex items-center space-x-2"
              >
                <Star className="h-4 w-4" />
                <span>Ratings</span>
              </TabsTrigger>
              <TabsTrigger
                value="location"
                className="flex items-center space-x-2"
              >
                <Navigation className="h-4 w-4" />
                <span>Live Track</span>
              </TabsTrigger>
              <TabsTrigger value="kyc" className="flex items-center space-x-2">
                <Shield className="h-4 w-4" />
                <span>KYC</span>
              </TabsTrigger>
              <TabsTrigger
                value="profile"
                className="flex items-center space-x-2"
              >
                <Users className="h-4 w-4" />
                <span>Profile</span>
              </TabsTrigger>
            </TabsList>

            {/* Tab Contents */}
            <TabsContent value="dashboard" className="space-y-6">
              <DriverDashboard
                myRides={myRides}
                loading={loading}
                onPostNewRide={handlePostNewRide}
                onRideClick={handleRideClick}
                onEditRide={handleEditRide}
                onCancelRide={handleCancelRide}
              />

              {/* Logout Button */}
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={handleLogout}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="trips" className="space-y-6">
              <TripManagement />
            </TabsContent>

            <TabsContent value="earnings" className="space-y-6">
              <DailyEarnings />
            </TabsContent>

            <TabsContent value="ratings" className="space-y-6">
              <DriverRatingFeedback />
            </TabsContent>

            <TabsContent value="location" className="space-y-6">
              <LiveLocationSharing />
            </TabsContent>

            <TabsContent value="kyc" className="space-y-6">
              <KYCDocumentUpload />
            </TabsContent>

            <TabsContent value="profile" className="space-y-6">
              <DriverProfile />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Ride Details Dialog */}
      <RideDetailsDialog
        ride={selectedRide}
        isOpen={rideDetailsOpen}
        onClose={() => setRideDetailsOpen(false)}
      />
    </div>
  );
};