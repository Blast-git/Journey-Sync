import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Plus,
  Car,
  Settings,
  CheckCircle,
  Star,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { NotificationSystem } from "./NotificationSystem";
import { AddVehicleForm } from "@/components/Ride Posting/AddVehicleForm";

interface Vehicle {
  id: string;
  car_model: string;
  car_type: string;
  license_plate: string;
  seat_capacity: number;
  color?: string;
  is_verified: boolean;
}

interface Profile {
  id: string;
  full_name: string;
  avatar_url?: string;
  role: string;
  kyc_status: string;
  average_rating?: number;
  total_ratings?: number;
}

interface DriverHeaderProps {
  profile: Profile;
  myVehicles: Vehicle[];
  onPostNewRide: () => void;
  onVehicleAdded: () => void;
  onDeleteVehicle: (vehicleId: string) => void;
}

export const DriverHeader: React.FC<DriverHeaderProps> = ({
  profile,
  myVehicles,
  onPostNewRide,
  onVehicleAdded,
  onDeleteVehicle,
}) => {
  const navigate = useNavigate();
  const [vehicleDialogOpen, setVehicleDialogOpen] = useState(false);

  const handleVehicleAdded = () => {
    onVehicleAdded();
    setVehicleDialogOpen(false);
  };

  return (
    <div className="bg-white rounded-lg border p-4 mb-8 shadow-sm">
      {/* Top Row - Back button and Actions */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/")}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Button>

        <div className="flex items-center gap-2">
          <NotificationSystem />

          {/* Vehicle Management Button with Dialog */}
          <Dialog
            open={vehicleDialogOpen}
            onOpenChange={setVehicleDialogOpen}
          >
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                Manage Vehicles
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Car className="h-5 w-5" />
                  Vehicle Management
                </DialogTitle>
                <DialogDescription>
                  Add and manage your vehicles for posting rides
                </DialogDescription>
              </DialogHeader>

              <Tabs defaultValue="add" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="add">Add Vehicle</TabsTrigger>
                  <TabsTrigger value="manage">
                    My Vehicles ({myVehicles.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="add" className="space-y-4">
                  <AddVehicleForm onSuccess={handleVehicleAdded} />
                </TabsContent>

                <TabsContent value="manage" className="space-y-4">
                  {myVehicles.length > 0 ? (
                    <div className="space-y-4">
                      {myVehicles.map((vehicle) => (
                        <Card key={vehicle.id} className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="space-y-2">
                              <h3 className="font-semibold text-lg">
                                {vehicle.car_model} ({vehicle.car_type})
                              </h3>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                                <div>
                                  <span className="font-medium">License:</span>{" "}
                                  {vehicle.license_plate}
                                </div>
                                <div>
                                  <span className="font-medium">Seats:</span>{" "}
                                  {vehicle.seat_capacity}
                                </div>
                                <div>
                                  <span className="font-medium">Color:</span>{" "}
                                  {vehicle.color || "Not specified"}
                                </div>
                                <div>
                                  <Badge
                                    variant={
                                      vehicle.is_verified
                                        ? "default"
                                        : "secondary"
                                    }
                                  >
                                    {vehicle.is_verified
                                      ? "Verified"
                                      : "Pending"}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onDeleteVehicle(vehicle.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Car className="mx-auto h-12 w-12 mb-4 opacity-50" />
                      <p>No vehicles added yet</p>
                      <p className="text-sm">
                        Add your first vehicle to start posting rides
                      </p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>

          {/* Post Ride Button */}
          <Button
            onClick={onPostNewRide}
            className="bg-primary hover:bg-primary/90 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Post New Ride
          </Button>
        </div>
      </div>

      {/* Profile Section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Left Side - Profile Info */}
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={profile?.avatar_url} alt={profile?.full_name} />
            <AvatarFallback className="text-lg">
              {profile?.full_name?.charAt(0)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
              <h1 className="text-3xl font-bold">Driver Dashboard</h1>
              {profile?.role === "driver" && profile?.kyc_status === "approved" && (
                <Badge
                  variant="secondary"
                  className="bg-green-100 text-green-800 hover:bg-green-100 w-fit"
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Verified
                </Badge>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-muted-foreground">
              <span className="text-base">
                Welcome back, {profile?.full_name}
              </span>
              {profile?.role === "driver" && (
                <div className="flex items-center gap-1 text-sm">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">
                    {profile.average_rating
                      ? Number(profile.average_rating).toFixed(1)
                      : "0.0"}
                  </span>
                  <span>({profile.total_ratings || 0} reviews)</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};