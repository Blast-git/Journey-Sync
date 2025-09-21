import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Initialize Supabase client with service role for admin operations
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface BookingWithRideDetails {
  id: string;
  passenger_id: string;
  status: string;
  notif_1hr_sent: boolean;
  notif_30min_sent: boolean;
  notif_15min_sent: boolean;
  ride: {
    id: string;
    driver_id: string;
    departure_date: string;
    departure_time: string;
    from_city: string;
    to_city: string;
    pickup_point: string;
    vehicle: {
      brand: string;
      car_model: string;
      license_plate: string;
      color: string;
    };
    driver_profile: {
      full_name: string;
      phone: string;
    };
  };
  passenger_profile: {
    full_name: string;
    phone: string;
  };
}

interface NotificationContent {
  title: string;
  message: string;
}

// Utility function to calculate estimated arrival time
const calculateEstimatedArrival = (departureTime: string, departureDate: string): string => {
  // Simple estimation: assume 2-hour journey (in a real app, this would be calculated based on distance/route)
  const departure = new Date(`${departureDate}T${departureTime}`);
  const arrival = new Date(departure.getTime() + 2 * 60 * 60 * 1000); // Add 2 hours
  return arrival.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  });
};

// Utility function to format date
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    weekday: 'long',
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
};

// Utility function to format time
const formatTime = (timeString: string): string => {
  const [hours, minutes] = timeString.split(':');
  const date = new Date();
  date.setHours(parseInt(hours), parseInt(minutes));
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  });
};

const generatePassengerNotification = (
  booking: BookingWithRideDetails,
  type: '1_hour' | '30_minutes' | '15_minutes'
): NotificationContent => {
  const { ride, passenger_profile } = booking;
  const driverName = ride.driver_profile.full_name;
  const driverPhone = ride.driver_profile.phone;
  const carModel = `${ride.vehicle.brand} ${ride.vehicle.car_model}`;
  const licensePlate = ride.vehicle.license_plate;
  const carColor = ride.vehicle.color;
  const departureDate = formatDate(ride.departure_date);
  const departureTime = formatTime(ride.departure_time);
  const estimatedArrival = calculateEstimatedArrival(ride.departure_time, ride.departure_date);
  const boardingPoint = ride.pickup_point;

  switch (type) {
    case '1_hour':
      return {
        title: `Your Upcoming Ride Details (Booking ID: ${booking.id.slice(0, 8)})`,
        message: `Hi ${passenger_profile.full_name},

Here are the details for your upcoming ride from ${ride.from_city} to ${ride.to_city}:

Driver Information:
• Driver Name: ${driverName}
• Phone Number: ${driverPhone}

Vehicle Information:
• Car Model: ${carModel}
• License Plate: ${licensePlate}
• Color: ${carColor}

Journey Details:
• Date: ${departureDate}
• Departure Time: ${departureTime}
• Estimated Arrival Time: ${estimatedArrival}
• Boarding Point: ${boardingPoint}

Important Notes:
• Please arrive at the boarding point at least 10 minutes before the departure time.
• You can contact your driver directly at the phone number provided above.
• You can track your ride in real-time through the app.

We wish you a safe and pleasant journey!`
      };
    case '30_minutes':
      return {
        title: `Your ride is 30 minutes away! (${booking.id.slice(0, 8)})`,
        message: `${passenger_profile.full_name}, your ride with ${driverName} is now 30 minutes away. Please ensure you are ready for pickup at ${boardingPoint}. Driver contact: ${driverPhone}`
      };
    case '15_minutes':
      return {
        title: `Driver arriving soon! (${booking.id.slice(0, 8)})`,
        message: `Your driver, ${driverName}, is approximately 15 minutes away from ${boardingPoint}. Please be at the pickup point. Contact driver: ${driverPhone}`
      };
  }
};

const generateDriverNotification = (
  booking: BookingWithRideDetails,
  type: '1_hour' | '30_minutes' | '15_minutes'
): NotificationContent => {
  const { ride, passenger_profile } = booking;
  const passengerName = passenger_profile.full_name;
  const pickupLocation = ride.pickup_point;
  const dropoffLocation = ride.to_city;
  const passengerPhone = passenger_profile.phone;

  switch (type) {
    case '1_hour':
      return {
        title: `Upcoming Trip in 1 Hour (${booking.id.slice(0, 8)})`,
        message: `Hi, you have an upcoming trip with ${passengerName} in approximately 1 hour. Pickup at ${pickupLocation}, Drop-off at ${dropoffLocation}. Please ensure your vehicle is ready.`
      };
    case '30_minutes':
      return {
        title: `Trip Reminder: 30 Minutes to Pickup (${booking.id.slice(0, 8)})`,
        message: `Your trip with ${passengerName} is 30 minutes away. Head towards ${pickupLocation}. Passenger contact: ${passengerPhone}`
      };
    case '15_minutes':
      return {
        title: `Passenger Pickup Soon! (${booking.id.slice(0, 8)})`,
        message: `You are approximately 15 minutes from ${passengerName}'s pickup location at ${pickupLocation}. Please confirm your arrival once you reach the pickup point.`
      };
  }
};

const sendNotification = async (
  userId: string,
  userType: 'passenger' | 'driver',
  bookingId: string,
  notificationType: '1_hour' | '30_minutes' | '15_minutes',
  content: NotificationContent
) => {
  // Store notification in database
  const { error } = await supabase
    .from('notifications')
    .insert({
      booking_id: bookingId,
      user_id: userId,
      user_type: userType,
      notification_type: notificationType,
      title: content.title,
      message: content.message
    });

  if (error) {
    console.error(`Error storing notification for ${userType} ${userId}:`, error);
    return false;
  }

  // Here you would integrate with push notification service
  // For now, we'll just log the notification
  console.log(`📱 ${userType.toUpperCase()} Notification:`, {
    userId,
    title: content.title,
    message: content.message
  });

  return true;
};

const processNotifications = async () => {
  console.log('🔄 Starting notification processing...');

  // Get current time
  const now = new Date();
  
  // Query bookings that need notifications
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select(`
      id,
      passenger_id,
      status,
      notif_1hr_sent,
      notif_30min_sent,
      notif_15min_sent,
      ride:rides (
        id,
        driver_id,
        departure_date,
        departure_time,
        from_city,
        to_city,
        pickup_point,
        vehicle:vehicles (
          brand,
          car_model,
          license_plate,
          color
        ),
        driver_profile:profiles!rides_driver_id_fkey (
          full_name,
          phone
        )
      ),
      passenger_profile:profiles!bookings_passenger_id_fkey (
        full_name,
        phone
      )
    `)
    .in('status', ['confirmed', 'pending'])
    .eq('ride.is_active', true) as { data: BookingWithRideDetails[], error: any };

  if (error) {
    console.error('Error fetching bookings:', error);
    return;
  }

  if (!bookings || bookings.length === 0) {
    console.log('No active bookings found');
    return;
  }

  console.log(`Found ${bookings.length} active bookings to check`);

  for (const booking of bookings) {
    if (!booking.ride) continue;

    // Calculate scheduled pickup time
    const scheduledPickupTime = new Date(`${booking.ride.departure_date}T${booking.ride.departure_time}`);
    const timeDiffMinutes = Math.floor((scheduledPickupTime.getTime() - now.getTime()) / (1000 * 60));

    console.log(`Booking ${booking.id.slice(0, 8)}: ${timeDiffMinutes} minutes until pickup`);

    // Check and send notifications based on time remaining
    if (timeDiffMinutes >= 55 && timeDiffMinutes <= 65 && !booking.notif_1hr_sent) {
      console.log(`Sending 1-hour notifications for booking ${booking.id.slice(0, 8)}`);
      
      // Send passenger notification
      const passengerContent = generatePassengerNotification(booking, '1_hour');
      await sendNotification(booking.passenger_id, 'passenger', booking.id, '1_hour', passengerContent);
      
      // Send driver notification
      const driverContent = generateDriverNotification(booking, '1_hour');
      await sendNotification(booking.ride.driver_id, 'driver', booking.id, '1_hour', driverContent);
      
      // Update booking
      await supabase
        .from('bookings')
        .update({ 
          notif_1hr_sent: true, 
          notif_1hr_sent_at: now.toISOString() 
        })
        .eq('id', booking.id);
    
    } else if (timeDiffMinutes >= 25 && timeDiffMinutes <= 35 && !booking.notif_30min_sent) {
      console.log(`Sending 30-minute notifications for booking ${booking.id.slice(0, 8)}`);
      
      // Send passenger notification
      const passengerContent = generatePassengerNotification(booking, '30_minutes');
      await sendNotification(booking.passenger_id, 'passenger', booking.id, '30_minutes', passengerContent);
      
      // Send driver notification
      const driverContent = generateDriverNotification(booking, '30_minutes');
      await sendNotification(booking.ride.driver_id, 'driver', booking.id, '30_minutes', driverContent);
      
      // Update booking
      await supabase
        .from('bookings')
        .update({ 
          notif_30min_sent: true, 
          notif_30min_sent_at: now.toISOString() 
        })
        .eq('id', booking.id);
    
    } else if (timeDiffMinutes >= 10 && timeDiffMinutes <= 20 && !booking.notif_15min_sent) {
      console.log(`Sending 15-minute notifications for booking ${booking.id.slice(0, 8)}`);
      
      // Send passenger notification
      const passengerContent = generatePassengerNotification(booking, '15_minutes');
      await sendNotification(booking.passenger_id, 'passenger', booking.id, '15_minutes', passengerContent);
      
      // Send driver notification
      const driverContent = generateDriverNotification(booking, '15_minutes');
      await sendNotification(booking.ride.driver_id, 'driver', booking.id, '15_minutes', driverContent);
      
      // Update booking
      await supabase
        .from('bookings')
        .update({ 
          notif_15min_sent: true, 
          notif_15min_sent_at: now.toISOString() 
        })
        .eq('id', booking.id);
    }
  }

  console.log('✅ Notification processing completed');
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    await processNotifications();
    
    return new Response(
      JSON.stringify({ success: true, message: 'Notifications processed successfully' }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in notification processor:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);