import React from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Plus,
  Car,
  Calendar,
  Users,
  MapPin,
  Clock,
  Edit,
  Trash2,
  ArrowRight,
  IndianRupee,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Ride {
  id: string;
  from_city: string;
  to_city: string;
  departure_date: string;
  departure_time: string;
  price_per_seat: number;
  available_seats: number;
  pickup_point?: string;
  vehicles?: {
    car_model: string;
    car_type: string;
    color?: string;
    license_plate: string;
  };
}

interface DriverDashboardProps {
  myRides: Ride[];
  loading: boolean;
  onPostNewRide: () => void;
  onRideClick: (ride: Ride) => void;
  onEditRide: (ride: Ride) => void;
  onCancelRide: (rideId: string) => void;
}

export const DriverDashboard: React.FC<DriverDashboardProps> = ({
  myRides,
  loading,
  onPostNewRide,
  onRideClick,
  onEditRide,
  onCancelRide,
}) => {
  return (
    <div className="space-y-6">
      {/* Main Rides Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            My Rides
            <Button
              variant="outline"
              size="sm"
              onClick={onPostNewRide}
              className="flex items-center gap-1"
            >
              <Plus className="h-3 w-3" />
              New Ride
            </Button>
          </CardTitle>
          <CardDescription>
            {myRides.length > 0
              ? `${myRides.length} active ride(s) - Click on any ride to view details and bookings`
              : "Manage your posted rides"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p>Loading your rides...</p>
            </div>
          ) : myRides.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {myRides.map((ride) => (
                <Card
                  key={ride.id}
                  className="p-4 cursor-pointer hover:shadow-md transition-shadow group border-l-4 border-l-primary/30 hover:border-l-primary"
                  onClick={() => onRideClick(ride)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                        {ride.from_city} → {ride.to_city}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {ride.vehicles?.car_model} ({ride.vehicles?.car_type})
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-primary">
                        ₹{ride.price_per_seat}
                      </p>
                      <p className="text-sm text-muted-foreground">per seat</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                      {new Date(ride.departure_date).toLocaleDateString()}
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                      {ride.departure_time}
                    </div>
                    <div className="flex items-center">
                      <Users className="h-4 w-4 mr-2 text-muted-foreground" />
                      {ride.available_seats} seats
                    </div>
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                      {ride.pickup_point}
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditRide(ride);
                        }}
                        className="hover:bg-primary/10"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCancelRide(ride.id);
                        }}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                    </div>

                    <div className="flex items-center text-sm text-muted-foreground group-hover:text-primary transition-colors">
                      <span>View Details</span>
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Car className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No rides posted yet</p>
              <Button variant="outline" onClick={onPostNewRide} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Post Your First Ride
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};