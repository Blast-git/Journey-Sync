import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { MapPin, Navigation, Clock, Share2, Users, Route, AlertCircle, Phone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TripTracking {
  id: string;
  booking_id: string;
  trip_status: string;
  current_latitude: number | null;
  current_longitude: number | null;
  estimated_arrival: string | null;
  shared_with_emergency_contacts: boolean;
  last_updated: string;
  bookings: {
    rides: {
      from_city: string;
      to_city: string;
      departure_date: string;
      departure_time: string;
      profiles: {
        full_name: string;
        phone: string;
      };
    };
  };
}

const LiveLocationSharing: React.FC = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [activeTrip, setActiveTrip] = useState<TripTracking | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{lat: number; lng: number} | null>(null);
  const [locationSharing, setLocationSharing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [watchId, setWatchId] = useState<number | null>(null);

  useEffect(() => {
    if (profile?.id) {
      fetchActiveTrip();
    }
    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [profile?.id]);

  const fetchActiveTrip = async () => {
    try {
      const { data, error } = await supabase
        .from('trip_tracking')
        .select(`
          *,
          bookings (
            rides (
              from_city,
              to_city,
              departure_date,
              departure_time,
              profiles:driver_id (
                full_name,
                phone
              )
            )
          )
        `)
        .eq('passenger_id', profile?.id)
        .in('trip_status', ['started', 'in_progress'])
        .order('last_updated', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setActiveTrip(data as any);
        setLocationSharing(data.shared_with_emergency_contacts);
        
        if (data.trip_status === 'started' || data.trip_status === 'in_progress') {
          startLocationTracking();
        }
      }
    } catch (error) {
      console.error('Error fetching active trip:', error);
      toast({
        title: "Error",
        description: "Failed to fetch trip information",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const startLocationTracking = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Location Not Supported",
        description: "Your device doesn't support location tracking",
        variant: "destructive"
      });
      return;
    }

    const id = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentLocation({ lat: latitude, lng: longitude });
        
        if (activeTrip && locationSharing) {
          updateTripLocation(latitude, longitude);
        }
      },
      (error) => {
        console.error('Location error:', error);
        toast({
          title: "Location Error",
          description: "Unable to track your location",
          variant: "destructive"
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000
      }
    );

    setWatchId(id);
  };

  const updateTripLocation = async (latitude: number, longitude: number) => {
    if (!activeTrip) return;

    try {
      const { error } = await supabase
        .from('trip_tracking')
        .update({
          current_latitude: latitude,
          current_longitude: longitude,
          last_updated: new Date().toISOString()
        })
        .eq('id', activeTrip.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating location:', error);
    }
  };

  const toggleLocationSharing = async (enabled: boolean) => {
    if (!activeTrip) return;

    try {
      const { error } = await supabase
        .from('trip_tracking')
        .update({
          shared_with_emergency_contacts: enabled
        })
        .eq('id', activeTrip.id);

      if (error) throw error;

      setLocationSharing(enabled);
      
      if (enabled && !watchId) {
        startLocationTracking();
      } else if (!enabled && watchId) {
        navigator.geolocation.clearWatch(watchId);
        setWatchId(null);
      }

      toast({
        title: enabled ? "Location Sharing Enabled" : "Location Sharing Disabled",
        description: enabled 
          ? "Your location is now being shared with emergency contacts"
          : "Location sharing has been stopped"
      });
    } catch (error) {
      console.error('Error toggling location sharing:', error);
      toast({
        title: "Error",
        description: "Failed to update location sharing settings",
        variant: "destructive"
      });
    }
  };

  const shareLocationLink = () => {
    if (!currentLocation) {
      toast({
        title: "Location Not Available",
        description: "Current location is not available",
        variant: "destructive"
      });
      return;
    }

    const locationUrl = `https://maps.google.com/maps?q=${currentLocation.lat},${currentLocation.lng}`;
    
    if (navigator.share) {
      navigator.share({
        title: 'My Current Location',
        text: 'Here is my current location',
        url: locationUrl
      });
    } else {
      navigator.clipboard.writeText(locationUrl);
      toast({
        title: "Location Copied",
        description: "Location link copied to clipboard"
      });
    }
  };

  const getTripStatusBadge = (status: string) => {
    switch (status) {
      case 'started':
        return <Badge className="bg-blue-100 text-blue-800">Started</Badge>;
      case 'in_progress':
        return <Badge className="bg-green-100 text-green-800">In Progress</Badge>;
      case 'completed':
        return <Badge className="bg-gray-100 text-gray-800">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="h-4 bg-muted rounded w-3/4 mb-4"></div>
            <div className="h-20 bg-muted rounded"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Live Location & Trip Tracking</h2>
        <p className="text-muted-foreground">
          Track your current trip and share your location with emergency contacts
        </p>
      </div>

      {!activeTrip ? (
        <Card>
          <CardContent className="text-center py-12">
            <Navigation className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Active Trip</h3>
            <p className="text-muted-foreground">
              Start a trip to enable live location tracking and sharing
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Active Trip Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Route className="h-5 w-5" />
                Active Trip
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">
                      {activeTrip.bookings.rides.from_city} → {activeTrip.bookings.rides.to_city}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Driver: {activeTrip.bookings.rides.profiles.full_name}
                    </p>
                  </div>
                  {getTripStatusBadge(activeTrip.trip_status)}
                </div>
                
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    Departure: {activeTrip.bookings.rides.departure_time}
                  </div>
                  {activeTrip.estimated_arrival && (
                    <div className="flex items-center gap-2">
                      <Navigation className="h-4 w-4 text-muted-foreground" />
                      ETA: {activeTrip.estimated_arrival}
                    </div>
                  )}
                </div>
                
                {currentLocation && (
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">Current Location</span>
                      </div>
                      <Button size="sm" variant="outline" onClick={shareLocationLink}>
                        <Share2 className="h-4 w-4 mr-2" />
                        Share
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Lat: {currentLocation.lat.toFixed(6)}, Lng: {currentLocation.lng.toFixed(6)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Last updated: {new Date(activeTrip.last_updated).toLocaleTimeString()}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Location Sharing Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Emergency Contact Sharing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="location-sharing" className="text-sm font-medium">
                      Share location with emergency contacts
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Allow your emergency contacts to track your trip in real-time
                    </p>
                  </div>
                  <Switch
                    id="location-sharing"
                    checked={locationSharing}
                    onCheckedChange={toggleLocationSharing}
                  />
                </div>
                
                {locationSharing && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium text-green-800">
                        Location sharing is active
                      </span>
                    </div>
                    <p className="text-xs text-green-700">
                      Your emergency contacts can now see your live location during this trip
                    </p>
                  </div>
                )}
                
                {!locationSharing && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      <span className="text-sm font-medium text-amber-800">
                        Location sharing is disabled
                      </span>
                    </div>
                    <p className="text-xs text-amber-700">
                      Enable sharing to let emergency contacts track your trip for safety
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-3">
                <Button variant="outline" onClick={shareLocationLink} disabled={!currentLocation}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share Current Location
                </Button>
                <Button variant="outline" onClick={() => window.open(`tel:${activeTrip.bookings.rides.profiles.phone}`)}>
                  <Phone className="h-4 w-4 mr-2" />
                  Call Driver
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Safety Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Location Sharing Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>• Location is only shared during active trips</p>
            <p>• Only your emergency contacts can see your location</p>
            <p>• Location data is automatically deleted after trip completion</p>
            <p>• You can disable sharing at any time during the trip</p>
            <p>• Battery usage may increase with continuous location tracking</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LiveLocationSharing;