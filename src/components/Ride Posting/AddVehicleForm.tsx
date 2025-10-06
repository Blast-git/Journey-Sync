import React from 'react'; // Added missing React import
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { getPredefinedLayouts } from '@/utils/seatLayoutUtils';

const addVehicleSchema = z.object({
  carType: z.string().min(1, 'Car type is required'),
  carModel: z.string().min(1, 'Car model is required'),
  licensePlate: z.string().min(1, 'License plate is required'),
  seatCapacity: z.coerce.number().min(4, 'Must have at least 4 seats').max(8, 'Maximum 8 seats'),
  color: z.string().optional(),
});

type AddVehicleFormData = z.infer<typeof addVehicleSchema>;

interface AddVehicleFormProps {
  onSuccess: () => void;
}

export const AddVehicleForm: React.FC<AddVehicleFormProps> = ({ onSuccess }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);

  const form = useForm<AddVehicleFormData>({
    resolver: zodResolver(addVehicleSchema),
    defaultValues: {
      carType: '',
      carModel: '',
      licensePlate: '',
      seatCapacity: 5,
      color: '',
    },
  });

  // Function to ensure vehicle type exists in database
  const ensureVehicleTypeExists = async (seatCapacity: number) => {
    try {
      // First, check if vehicle type already exists
      const { data: existingType, error: checkError } = await supabase
        .from('vehicle_types')
        .select('id, name')
        .eq('total_seats', seatCapacity)
        .single();

      if (existingType && !checkError) {
        console.log(`Found existing vehicle type: ${existingType.name}`);
        return existingType.id;
      }

      console.log(`No vehicle type found for ${seatCapacity} seats, creating new one...`);

      // Get predefined layout for this seat capacity
      const predefinedLayouts = getPredefinedLayouts(seatCapacity);
      
      if (predefinedLayouts.length === 0) {
        throw new Error(`No predefined layout available for ${seatCapacity}-seater vehicle`);
      }

      // Use the first layout option (you can enhance this to let user choose)
      const layout = predefinedLayouts[0];

      // Create new vehicle type
      const { data: newVehicleType, error: insertError } = await supabase
        .from('vehicle_types')
        .insert({
          name: layout.vehicleType,
          total_seats: layout.totalSeats,
          bookable_seats: layout.bookableSeats,
          layout_config: layout
        })
        .select('id, name')
        .single();

      if (insertError) {
        throw insertError;
      }

      console.log(`Created new vehicle type: ${newVehicleType.name}`);
      return newVehicleType.id;

    } catch (error) {
      console.error('Error ensuring vehicle type exists:', error);
      throw error;
    }
  };

  const onSubmit = async (data: AddVehicleFormData) => {
    if (!user) return;
    
    setLoading(true);
    
    try {
      // Step 1: Ensure vehicle type exists (create if necessary)
      const vehicleTypeId = await ensureVehicleTypeExists(data.seatCapacity);

      // Step 2: Insert the vehicle with proper vehicle_type_id
      const { error: vehicleError } = await supabase
        .from('vehicles')
        .insert({
          driver_id: user.id,
          car_type: data.carType,
          car_model: data.carModel,
          license_plate: data.licensePlate,
          seat_capacity: data.seatCapacity,
          vehicle_type_id: vehicleTypeId, // This is the key addition!
          color: data.color || null,
          is_verified: false, // Assuming vehicles need verification
        });

      if (vehicleError) {
        throw vehicleError;
      }

      toast({
        title: 'Success',
        description: `Vehicle added successfully! Seat layout for ${data.seatCapacity}-seater has been configured.`,
      });
      
      form.reset();
      onSuccess();

    } catch (error) {
      console.error('Error adding vehicle:', error);
      
      let errorMessage = 'Failed to add vehicle. Please try again.';
      
      if (error instanceof Error) {
        if (error.message.includes('No predefined layout')) {
          errorMessage = `Sorry, ${data.seatCapacity}-seater vehicles are not supported yet. Please choose 5, 6, 7, or 8 seats.`;
        } else if (error.message.includes('license_plate')) {
          errorMessage = 'This license plate is already registered. Please use a different one.';
        }
      }

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Available seat capacity options (based on your predefined layouts)
  const seatCapacityOptions = [
    { value: 5, label: '5 Seats (1 Driver + 4 Passenger)', layout: '2+3 layout' },
    { value: 6, label: '6 Seats (1 Driver + 5 Passenger)', layout: '2+2+2 layout' },
    { value: 7, label: '7 Seats (1 Driver + 6 Passenger)', layout: '2+2+3 or 2+3+2 layout' },
    { value: 8, label: '8 Seats (1 Driver + 7 Passenger)', layout: '2+3+2+2 layout' },
  ];

  return (
    <div className="space-y-6">
      {/* Information Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">Vehicle Registration Info</h3>
        <p className="text-sm text-blue-700">
          When you add a vehicle, we automatically configure the seat layout based on capacity. 
          This enables dynamic pricing for individual seats when posting rides.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Vehicle Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Vehicle Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="carType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Car Type</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select car type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Sedan">Sedan</SelectItem>
                          <SelectItem value="SUV">SUV</SelectItem>
                          <SelectItem value="Hatchback">Hatchback</SelectItem>
                          <SelectItem value="MPV">MPV (Multi-Purpose Vehicle)</SelectItem>
                          <SelectItem value="Crossover">Crossover</SelectItem>
                          <SelectItem value="Wagon">Wagon</SelectItem>
                          <SelectItem value="Van">Van</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="carModel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Car Model</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Toyota Camry, Honda Civic" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="licensePlate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>License Plate</FormLabel>
                    <FormControl>
                      <Input placeholder="ABC-123" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. White, Black, Red" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Seat Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Seat Configuration</h3>
            <p className="text-sm text-gray-600">
              Select your vehicle's total seat capacity. We'll automatically configure the optimal seat layout for ride pricing.
            </p>

            <FormField
              control={form.control}
              name="seatCapacity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Seat Capacity</FormLabel>
                  <FormControl>
                    <Select 
                      onValueChange={(value) => field.onChange(parseInt(value))} 
                      defaultValue={field.value?.toString()}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select seat capacity" />
                      </SelectTrigger>
                      <SelectContent>
                        {seatCapacityOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value.toString()}>
                            <div className="flex flex-col">
                              <span className="font-medium">{option.label}</span>
                              <span className="text-xs text-gray-500">{option.layout}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => form.reset()}
              disabled={loading}
            >
              Reset Form
            </Button>
            <Button type="submit" disabled={loading} className="min-w-[120px]">
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Adding...
                </div>
              ) : (
                'Add Vehicle'
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};