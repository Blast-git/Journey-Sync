import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock, MapPin, User, Phone, Car, AlertTriangle, Shield, MessageCircle, Calendar, Navigation, CreditCard } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const PassengerBookingConfirmation = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showSafetyTips, setShowSafetyTips] = useState(false);
  const [emergencyContactSynced, setEmergencyContactSynced] = useState(false);
  const [bookingData, setBookingData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useAuth();

  // Get booking data from navigation state
  useEffect(() => {
    const fetchBookingData = async () => {
      try {
        // Check if we have booking data from navigation state
        if (location.state?.bookingData) {
          const stateData = location.state.bookingData;
          console.log('Received booking data:', stateData);
          
          setBookingData({
            bookingId: stateData.booking_id || `BK-${Date.now()}`,
            rideId: stateData.ride_id,
            status: "CONFIRMED",
            pickupLocation: stateData.pickup_point || stateData.from_city,
            destination: stateData.to_city,
            pickupTime: new Date(`${stateData.departure_date} ${stateData.departure_time}`),
            estimatedDuration: stateData.estimated_duration || "45 mins",
            fare: `₹${stateData.total_price || stateData.price_per_seat}`,
            seatsBooked: stateData.selected_seats?.length || stateData.seats_booked || 1,
            selectedSeats: stateData.selected_seats || [],
            driver: {
              id: stateData.driver?.id,
              name: stateData.driver?.full_name || "Driver",
              rating: stateData.driver?.average_rating || 4.5,
              phone: stateData.driver?.phone || "",
              vehicleNumber: stateData.vehicle?.license_plate || "N/A",
              vehicleModel: stateData.vehicle?.car_model || "Vehicle",
              photo: stateData.driver?.avatar_url || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face"
            },
            passengerDetails: stateData.passenger_details,
            weather: {
              condition: "Partly Cloudy",
              temperature: "28°C",
              alert: null
            },
            traffic: {
              status: "Moderate",
              delay: null
            }
          });
        } else {
          console.log('No booking data found in navigation state');
          // If no state data, redirect back to search
          navigate('/passenger/rides-search-booking');
          return;
        }
      } catch (error) {
        console.error('Error loading booking data:', error);
        navigate('/passenger/rides-search-booking');
      } finally {
        setLoading(false);
      }
    };

    fetchBookingData();
  }, [location.state, navigate]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Simulate emergency contact sync
    const syncTimer = setTimeout(() => {
      setEmergencyContactSynced(true);
    }, 2000);

    return () => {
      clearInterval(timer);
      clearTimeout(syncTimer);
    };
  }, []);

  // Send notifications after booking confirmation
  useEffect(() => {
    const sendBookingNotifications = async () => {
      if (bookingData && profile) {
        try {
          // Send booking confirmation notification
          await supabase.functions.invoke('send-booking-confirmation', {
            body: {
              booking_id: bookingData.bookingId,
              passenger_id: profile.id,
              ride_details: bookingData
            }
          });
          console.log('Booking confirmation notification sent');
        } catch (error) {
          console.error('Error sending notifications:', error);
        }
      }
    };

    if (bookingData && !loading) {
      sendBookingNotifications();
    }
  }, [bookingData, profile, loading]);

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-IN', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-IN', { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getTimeUntilPickup = () => {
    if (!bookingData?.pickupTime) return "N/A";
    const diff = bookingData.pickupTime.getTime() - currentTime.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
        <div className="max-w-md mx-auto text-center py-8">
          <div className="animate-spin h-8 w-8 border-4 border-green-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Loading booking confirmation...</p>
        </div>
      </div>
    );
  }

  if (!bookingData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 p-4">
        <div className="max-w-md mx-auto text-center py-8">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Booking Not Found</h1>
          <p className="text-gray-600 mb-4">Unable to load booking details.</p>
          <Button onClick={() => navigate('/passenger/rides-search-booking')}>
            Back to Search
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="max-w-md mx-auto">
        
        {/* Success Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-4">
          <div className="text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Booking Confirmed!</h1>
            <p className="text-gray-600">Your ride has been successfully booked</p>
            <div className="mt-4 p-3 bg-green-50 rounded-lg">
              <p className="text-sm font-medium text-green-800">Booking ID: {bookingData.bookingId}</p>
            </div>
          </div>
        </div>

        {/* Journey Details */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <MapPin className="w-5 h-5 mr-2 text-blue-500" />
            Journey Details
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-3 h-3 bg-green-500 rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="text-sm text-gray-500">Pickup Location</p>
                <p className="font-medium text-gray-900">{bookingData.pickupLocation}</p>
              </div>
            </div>
            
            <div className="ml-1.5 border-l-2 border-gray-200 h-8"></div>
            
            <div className="flex items-start space-x-3">
              <div className="w-3 h-3 bg-red-500 rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="text-sm text-gray-500">Destination</p>
                <p className="font-medium text-gray-900">{bookingData.destination}</p>
              </div>
            </div>
          </div>
          
          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Pickup Time</span>
              </div>
              <p className="text-lg font-bold text-blue-900 mt-1">
                {formatTime(bookingData.pickupTime)}
              </p>
              <p className="text-xs text-blue-700">{formatDate(bookingData.pickupTime)}</p>
            </div>
            
            <div className="p-3 bg-purple-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <Navigation className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-800">Duration</span>
              </div>
              <p className="text-lg font-bold text-purple-900 mt-1">
                {bookingData.estimatedDuration}
              </p>
              <p className="text-xs text-purple-700">Estimated</p>
            </div>
          </div>
        </div>

        {/* Countdown Timer */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl shadow-lg p-6 mb-4 text-white">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">Time Until Pickup</h3>
            <div className="text-3xl font-bold mb-1">{getTimeUntilPickup()}</div>
            <p className="text-blue-100 text-sm">Stay ready! Driver will notify you when approaching</p>
          </div>
        </div>

        {/* Driver Information */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <User className="w-5 h-5 mr-2 text-green-500" />
            Your Driver
          </h2>
          
          <div className="flex items-center space-x-4 mb-4">
            <img 
              src={bookingData.driver.photo} 
              alt="Driver" 
              className="w-16 h-16 rounded-full object-cover"
            />
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">{bookingData.driver.name}</h3>
              <div className="flex items-center space-x-1 mt-1">
                <div className="flex text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="text-sm">
                      {i < Math.floor(bookingData.driver.rating) ? '★' : '☆'}
                    </span>
                  ))}
                </div>
                <span className="text-sm text-gray-600">({bookingData.driver.rating})</span>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2 mb-1">
                <Car className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-800">Vehicle</span>
              </div>
              <p className="text-sm text-gray-900">{bookingData.driver.vehicleModel}</p>
              <p className="text-xs text-gray-600">{bookingData.driver.vehicleNumber}</p>
            </div>
            
            <button 
              onClick={() => bookingData.driver.phone && window.open(`tel:${bookingData.driver.phone}`)}
              className="p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
            >
              <div className="flex items-center space-x-2 mb-1">
                <Phone className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">Contact</span>
              </div>
              <p className="text-sm text-green-900">Call Driver</p>
              <p className="text-xs text-green-700">Tap to call</p>
            </button>
          </div>
        </div>

        {/* Booking Summary */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <CreditCard className="w-5 h-5 mr-2 text-orange-500" />
            Booking Summary
          </h2>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Seats Booked</span>
              <div className="text-center">
                <div className="font-medium text-gray-900 mb-1">{bookingData.seatsBooked}</div>
                {bookingData.selectedSeats && bookingData.selectedSeats.length > 0 && (
                  <div className="text-xs text-gray-600">
                    Seats: {bookingData.selectedSeats.join(", ")}
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Fare</span>
              <span className="font-bold text-green-600 text-lg">{bookingData.fare}</span>
            </div>
            {bookingData.selectedSeats && bookingData.selectedSeats.length > 0 && (
              <div className="mt-2">
                <div className="text-sm text-gray-600 mb-2">Selected Seats:</div>
                <div className="flex flex-wrap gap-2">
                  {bookingData.selectedSeats.map((seatId) => (
                    <Badge key={seatId} variant="outline" className="bg-blue-50 text-blue-700">
                      {seatId}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            <div className="pt-3 border-t border-gray-200">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Shield className="w-4 h-4" />
                <span>Payment will be collected during the ride</span>
              </div>
            </div>
          </div>
        </div>

        {/* Weather & Traffic Alerts */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2 text-yellow-500" />
            Conditions Update
          </h2>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Weather</span>
              <span className="font-medium text-gray-900">
                {bookingData.weather.condition} • {bookingData.weather.temperature}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Traffic</span>
              <span className={`font-medium ${
                bookingData.traffic.status === 'Moderate' ? 'text-yellow-600' : 
                bookingData.traffic.status === 'Heavy' ? 'text-red-600' : 'text-green-600'
              }`}>
                {bookingData.traffic.status}
              </span>
            </div>
            
            {!bookingData.weather.alert && !bookingData.traffic.delay && (
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-green-800 flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  All conditions are favorable for your journey
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Safety Features */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Shield className="w-5 h-5 mr-2 text-blue-500" />
            Safety Features
          </h2>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${emergencyContactSynced ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                <span className="text-gray-700">Emergency Contacts</span>
              </div>
              <span className={`text-sm font-medium ${emergencyContactSynced ? 'text-green-600' : 'text-yellow-600'}`}>
                {emergencyContactSynced ? 'Synced' : 'Syncing...'}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-gray-700">Live Tracking</span>
              </div>
              <span className="text-sm font-medium text-green-600">Active</span>
            </div>
            
            <button 
              onClick={() => setShowSafetyTips(!showSafetyTips)}
              className="w-full mt-3 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors text-left"
            >
              <div className="flex items-center justify-between">
                <span className="text-blue-800 font-medium">View Safety Guidelines</span>
                <span className="text-blue-600">{showSafetyTips ? '−' : '+'}</span>
              </div>
            </button>
            
            {showSafetyTips && (
              <div className="mt-3 p-4 bg-blue-50 rounded-lg space-y-2">
                <div className="text-sm text-blue-800">
                  <p>• Verify driver and vehicle details before boarding</p>
                  <p>• Share your live location with trusted contacts</p>
                  <p>• Keep emergency numbers handy</p>
                  <p>• Trust your instincts - report any concerns</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 mb-8">
          <Button 
            onClick={() => navigate('/passenger/support', { state: { driverId: bookingData.driver.id, rideId: bookingData.rideId } })}
            className="w-full bg-green-600 text-white py-4 px-6 rounded-2xl font-semibold hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
          >
            <MessageCircle className="w-5 h-5" />
            <span>Chat with Driver</span>
          </Button>
          
          <Button 
            onClick={() => navigate('/passenger/live-tracking', { state: { rideId: bookingData.rideId } })}
            className="w-full bg-blue-600 text-white py-4 px-6 rounded-2xl font-semibold hover:bg-blue-700 transition-colors"
          >
            Track Live Location
          </Button>
          
          <Button 
            onClick={() => navigate('/passenger/trip-history')}
            className="w-full bg-gray-600 text-white py-4 px-6 rounded-2xl font-semibold hover:bg-gray-700 transition-colors"
          >
            View My Bookings
          </Button>
          
          <Button 
            onClick={() => {
              if (confirm('Are you sure you want to cancel this booking?')) {
                // Handle cancellation logic here
                console.log('Cancel booking:', bookingData.bookingId);
                // You can add actual cancellation logic here
              }
            }}
            variant="outline"
            className="w-full border-2 border-red-200 text-red-600 py-3 px-6 rounded-2xl font-medium hover:bg-red-50 transition-colors"
          >
            Cancel Booking
          </Button>
        </div>
        
      </div>
    </div>
  );
};

export default PassengerBookingConfirmation;