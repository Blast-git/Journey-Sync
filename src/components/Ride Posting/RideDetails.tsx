import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, Clock, MapPin, Navigation, X, Plus, Route, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { AddVehicleForm } from "./AddVehicleForm";
import { CitySearch } from "@/components/ui/city-search";
import { useCityRouteCorridors } from "@/hooks/useZoneData";
import { RouteCorridorSelector } from "@/components/maps/driver/PostRide/RouteCorridorSelector";

// Updated schema to include multiple zone selection
const rideDetailsSchema = z.object({
  fromCity: z.string().min(1, "From city is required"),
  toCity: z.string().min(1, "To city is required"),
  departureDate: z.date({
    required_error: "Departure date is required",
  }),
  departureTime: z.string().min(1, "Departure time is required"),
  pickupZoneIds: z.array(z.string()).min(1, "Please select at least one pickup zone"),
  dropoffZoneIds: z.array(z.string()).min(1, "Please select at least one dropoff zone"),
  vehicleId: z.string().min(1, "Please select a vehicle"),
  notes: z.string().optional(),
});

export type RideDetailsFormData = z.infer<typeof rideDetailsSchema>;

interface RideDetailsProps {
  onDataChange?: (data: RideDetailsFormData) => void;
  onNext?: (data: RideDetailsFormData) => void;
  initialData?: Partial<RideDetailsFormData>;
  editData?: any;
  readOnly?: boolean;
}

export const RideDetails: React.FC<RideDetailsProps> = ({
  onDataChange,
  onNext,
  initialData,
  editData,
  readOnly = false,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [vehicles, setVehicles] = React.useState<any[]>([]);
  const [selectedVehicle, setSelectedVehicle] = React.useState<any>(null);
  const [isAddVehicleOpen, setIsAddVehicleOpen] = React.useState(false);

  const form = useForm<RideDetailsFormData>({
    resolver: zodResolver(rideDetailsSchema),
    defaultValues: {
      fromCity: editData?.from_city || initialData?.fromCity || "",
      toCity: editData?.to_city || initialData?.toCity || "",
      departureDate: editData?.departure_date
        ? new Date(editData.departure_date)
        : initialData?.departureDate || undefined,
      departureTime:
        editData?.departure_time || initialData?.departureTime || "",
      pickupZoneIds: editData?.pickup_zones || initialData?.pickupZoneIds || [],
      dropoffZoneIds: editData?.dropoff_zones || initialData?.dropoffZoneIds || [],
      vehicleId: editData?.vehicle_id || initialData?.vehicleId || "",
      notes: editData?.notes || initialData?.notes || "",
    },
  });

  // Watch form values for real-time updates
  const watchedValues = form.watch();
  const { fromCity, toCity, pickupZoneIds, dropoffZoneIds } = watchedValues;

  // Check for route corridor support
  const { corridors: pickupCorridors } = useCityRouteCorridors(fromCity);
  const { corridors: dropoffCorridors } = useCityRouteCorridors(toCity);

  // Determine if route corridor selection is available
  const supportsRouteCorridors = React.useMemo(() => {
    return fromCity && toCity && pickupCorridors.length > 0 && dropoffCorridors.length > 0;
  }, [fromCity, toCity, pickupCorridors.length, dropoffCorridors.length]);

  React.useEffect(() => {
    const fetchVehicles = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from("vehicles")
        .select(
          `
          *,
          vehicle_types (
            id,
            name,
            total_seats,
            bookable_seats,
            layout_config
          )
        `
        )
        .eq("driver_id", user.id);

      if (error) {
        console.error("Error fetching vehicles:", error);
        toast({
          title: "Error",
          description: "Failed to load vehicles",
          variant: "destructive",
        });
        return;
      }

      setVehicles(data || []);

      // Set selected vehicle if there's a vehicleId in form
      const currentVehicleId = form.getValues("vehicleId");
      if (currentVehicleId) {
        const vehicle = data?.find((v) => v.id === currentVehicleId);
        setSelectedVehicle(vehicle || null);
      }
    };

    fetchVehicles();
  }, [user, toast]);

  // Update selected vehicle when vehicleId changes
  React.useEffect(() => {
    const vehicleId = watchedValues.vehicleId;
    if (vehicleId && vehicles.length > 0) {
      const vehicle = vehicles.find((v) => v.id === vehicleId);
      setSelectedVehicle(vehicle || null);
    } else {
      setSelectedVehicle(null);
    }
  }, [watchedValues.vehicleId, vehicles]);

  // Call onDataChange whenever form values change
  React.useEffect(() => {
    if (onDataChange && form.formState.isValid) {
      onDataChange(watchedValues);
    }
  }, [watchedValues, onDataChange, form.formState.isValid]);

  // Clear zone selections when cities change
  React.useEffect(() => {
    form.setValue("pickupZoneIds", []);
  }, [fromCity, form]);

  React.useEffect(() => {
    form.setValue("dropoffZoneIds", []);
  }, [toCity, form]);

  // Route corridor zone selection handler
  const handleRouteCorridorSelection = (pickupZoneIds: string[], dropoffZoneIds: string[]) => {
    form.setValue("pickupZoneIds", pickupZoneIds);
    form.setValue("dropoffZoneIds", dropoffZoneIds);
    
    toast({
      title: "Zones Selected",
      description: `${pickupZoneIds.length} pickup zones and ${dropoffZoneIds.length} dropoff zones selected.`,
    });
  };

  const handleVehicleAdded = () => {
    setIsAddVehicleOpen(false);
    // Refetch vehicles
    if (user) {
      supabase
        .from("vehicles")
        .select(
          `
          *,
          vehicle_types (
            id,
            name,
            total_seats,
            bookable_seats,
            layout_config
          )
        `
        )
        .eq("driver_id", user.id)
        .then(({ data }) => {
          setVehicles(data || []);
        });
    }
  };

  const handleNext = () => {
    form.handleSubmit((data) => {
      if (onNext) {
        onNext(data);
      }
    })();
  };

  const isFormValid =
    form.formState.isValid && 
    watchedValues.fromCity && 
    watchedValues.toCity &&
    watchedValues.pickupZoneIds.length > 0 &&
    watchedValues.dropoffZoneIds.length > 0;

  return (
    <div className="w-full space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Ride Details</h2>
        <p className="text-gray-600">
          Enter the basic information about your ride and select pickup/drop zones along route corridors. 
          Choose strategic pickup points along major roads and highways.
        </p>
      </div>

      <Form {...form}>
        <div className="space-y-6">
          {/* Route Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
              Route Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="fromCity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>From City</FormLabel>
                    <FormControl>
                      <CitySearch
                        placeholder="Search departure city..."
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={readOnly}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="toCity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>To City</FormLabel>
                    <FormControl>
                      <CitySearch
                        placeholder="Search destination city..."
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={readOnly}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Zone Selection Section */}
          {fromCity && toCity && fromCity !== toCity && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
                <div className="flex items-center gap-2">
                  <Navigation className="h-5 w-5" />
                  Pickup & Drop Zones
                </div>
              </h3>
              
              {/* Route Corridor Selection */}
              {supportsRouteCorridors ? (
                <div className="space-y-3">
                  <Alert className="border-green-200 bg-green-50">
                    <Route className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      Select route corridors and pickup points for efficient passenger collection. 
                      Perfect for intercity routes like {fromCity} to {toCity}.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="border rounded-lg overflow-hidden">
                    <RouteCorridorSelector
                      fromCity={fromCity}
                      toCity={toCity}
                      onSelectionComplete={handleRouteCorridorSelection}
                      height="600px"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Route corridor selection is not available for the {fromCity} → {toCity} route. 
                      Please contact admin to add route corridors for these cities.
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              {/* Zone Selection Summary */}
              {pickupZoneIds.length > 0 && dropoffZoneIds.length > 0 && (
                <Card className="bg-gradient-to-r from-green-50 to-blue-50 border border-gray-200">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-gray-900">Zone Selection Summary</h4>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {pickupZoneIds.length + dropoffZoneIds.length} zones total
                          </Badge>
                          <Badge variant="outline" className="text-xs flex items-center gap-1">
                            <Route className="h-3 w-3" />
                            Route Corridors
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-3 h-3 rounded-full bg-green-500" />
                            <span className="text-sm font-medium">Pickup Zones ({pickupZoneIds.length})</span>
                          </div>
                          <div className="text-xs text-gray-600">
                            Selected along {fromCity} route corridors
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-3 h-3 rounded-full bg-blue-500" />
                            <span className="text-sm font-medium">Dropoff Zones ({dropoffZoneIds.length})</span>
                          </div>
                          <div className="text-xs text-gray-600">
                            Selected along {toCity} route corridors
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Schedule Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
              Schedule
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="departureDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Departure Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            disabled={readOnly}
                            className={cn(
                              "pl-3 text-left font-normal w-full",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            return date < today;
                          }}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="departureTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Departure Time</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="time"
                          {...field}
                          className="w-full"
                          disabled={readOnly}
                        />
                        <Clock className="absolute right-3 top-3 h-4 w-4 opacity-50" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Vehicle Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
              Vehicle Selection
            </h3>

            <FormField
              control={form.control}
              name="vehicleId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vehicle</FormLabel>
                  <div className="space-y-2">
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={readOnly}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select vehicle" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {vehicles.map((vehicle) => (
                          <SelectItem key={vehicle.id} value={vehicle.id}>
                            <div className="flex items-center justify-between w-full">
                              <div className="flex items-center gap-2">
                                <div className="flex flex-col">
                                  <span className="font-medium">
                                    {vehicle.car_model} {vehicle.car_type}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {vehicle.license_plate} • {vehicle.seat_capacity} seats
                                  </span>
                                </div>
                              </div>
                              {vehicle.is_primary && (
                                <Badge variant="outline" className="text-xs">
                                  Primary
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Add Vehicle Button */}
                    {!readOnly && (
                      <Dialog open={isAddVehicleOpen} onOpenChange={setIsAddVehicleOpen}>
                        <DialogTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full"
                            disabled={readOnly}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add New Vehicle
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px]">
                          <DialogHeader>
                            <DialogTitle>Add New Vehicle</DialogTitle>
                            <DialogDescription>
                              Add a new vehicle to your fleet. It will need to be verified before you can use it for rides.
                            </DialogDescription>
                          </DialogHeader>
                          <AddVehicleForm onSuccess={handleVehicleAdded} />
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Selected Vehicle Display */}
            {selectedVehicle && (
              <Card className="p-4 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium">
                        {selectedVehicle.car_model} {selectedVehicle.car_type}
                      </div>
                      <div className="text-sm text-gray-500">
                        {selectedVehicle.license_plate} • {selectedVehicle.seat_capacity} seats available
                      </div>
                      {selectedVehicle.vehicle_types && (
                        <div className="text-xs text-gray-400">
                          {selectedVehicle.vehicle_types.name} • {selectedVehicle.vehicle_types.bookable_seats} bookable seats
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedVehicle.is_verified ? (
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        Verified
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-orange-600">
                        Pending
                      </Badge>
                    )}
                    {selectedVehicle.is_primary && (
                      <Badge variant="outline">Primary</Badge>
                    )}
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Notes Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
              Additional Information
            </h3>
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any special instructions or notes for passengers (e.g., meeting points, luggage restrictions, etc.)"
                      className="resize-none"
                      rows={4}
                      {...field}
                      disabled={readOnly}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Action Buttons */}
          {!readOnly && onNext && (
            <div className="flex justify-end space-x-4 pt-6 border-t">
              <Button
                type="button"
                onClick={handleNext}
                disabled={!isFormValid}
                className="min-w-[120px]"
              >
                Continue
              </Button>
            </div>
          )}
        </div>
      </Form>
    </div>
  );
};

export default RideDetails;