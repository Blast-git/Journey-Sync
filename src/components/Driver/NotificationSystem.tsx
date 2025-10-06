import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Bell, X, Check, Clock, AlertTriangle, CloudRain, MapPin, Settings, Car } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Database } from '@/integrations/supabase/types';

interface Notification {
  id: string;
  title: string;
  message: string;
  notification_type: 'journey_reminder' | 'weather_alert' | 'traffic_update' | 'route_optimization' | 'pickup_approaching' | 'driver_message' | 'booking_confirmed' | 'payment_reminder' | 'safety_check';
  sent_at: string;
  read_at: string | null;
  user_type: 'passenger' | 'driver';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  booking_id?: string;
  action_url?: string;
  metadata?: {
    weather?: {
      condition: string;
      temperature: number;
      warning?: string;
    };
    traffic?: {
      delay: number;
      route: string;
    };
    driver_location?: {
      latitude: number;
      longitude: number;
      eta_minutes: number;
    };
  };
}

interface NotificationSettings {
  journey_reminders: boolean;
  weather_alerts: boolean;
  traffic_updates: boolean;
  driver_updates: boolean;
  promotional: boolean;
  sound_enabled: boolean;
  reminder_24h: boolean;
  reminder_2h: boolean;
  reminder_30min: boolean;
}

interface WeatherAlert {
  city: string;
  condition: string;
  temperature: number;
  warning?: string;
  severity: 'info' | 'warning' | 'danger';
}

export const NotificationSystem = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>({
    journey_reminders: true,
    weather_alerts: true,
    traffic_updates: true,
    driver_updates: true,
    promotional: false,
    sound_enabled: true,
    reminder_24h: true,
    reminder_2h: true,
    reminder_30min: true,
  });
  const [weatherAlerts, setWeatherAlerts] = useState<WeatherAlert[]>([]);
  const [upcomingJourneys, setUpcomingJourneys] = useState<any[]>([]);

  useEffect(() => {
    if (profile) {
      fetchNotifications();
      loadNotificationSettings();
      fetchUpcomingJourneys();
      fetchWeatherAlerts();
      setupNotificationScheduler();
      
      // Set up real-time subscription for new notifications
      const channel = supabase
        .channel('notifications-realtime')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${profile.id}`
          },
          (payload) => {
            const newNotification: Notification = {
              id: payload.new.id,
              title: payload.new.title,
              message: payload.new.message,
              notification_type: payload.new.notification_type,
              sent_at: payload.new.sent_at,
              read_at: payload.new.read_at,
              user_type: payload.new.user_type as 'passenger' | 'driver',
              priority: payload.new.priority || 'normal',
              booking_id: payload.new.booking_id,
              action_url: payload.new.action_url,
              metadata: payload.new.metadata
            };
            
            setNotifications(prev => [newNotification, ...prev]);
            
            // Show toast with enhanced styling based on priority
            const toastVariant = newNotification.priority === 'urgent' ? 'destructive' : 'default';
            
            toast({
              title: newNotification.title,
              description: newNotification.message.substring(0, 100) + (newNotification.message.length > 100 ? '...' : ''),
              variant: toastVariant,
            });

            // Play sound if enabled
            if (settings.sound_enabled) {
              playNotificationSound(newNotification.priority);
            }
          }
        );

      // Listen for booking updates for drivers
      if (profile.role === 'driver') {
        channel.on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'bookings',
          },
          async (payload) => {
            // Check if this booking is for one of the driver's rides
            const { data: ride } = await supabase
              .from('rides')
              .select('*')
              .eq('id', payload.new.ride_id)
              .eq('driver_id', profile.id)
              .single();

            if (ride) {
              createDriverBookingNotification(payload.new, ride);
            }
          }
        );
      }

      channel.subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [profile, settings.sound_enabled]);

  const fetchNotifications = async () => {
    if (!profile) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile.id)
        .order('sent_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      
      const typedNotifications = (data || []).map(item => ({
        id: item.id,
        title: item.title,
        message: item.message,
        notification_type: item.notification_type,
        sent_at: item.sent_at,
        read_at: item.read_at,
        user_type: item.user_type as 'passenger' | 'driver',
        priority: item.priority || 'normal',
        booking_id: item.booking_id,
        action_url: item.action_url,
        metadata: item.metadata
      }));
      
      setNotifications(typedNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast({
        title: "Error",
        description: "Failed to load notifications",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadNotificationSettings = async () => {
    // Load from localStorage or database - implement based on your preference
    const savedSettings = localStorage.getItem(`notification_settings_${profile?.id}`);
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  };

  const saveNotificationSettings = async (newSettings: NotificationSettings) => {
    setSettings(newSettings);
    localStorage.setItem(`notification_settings_${profile?.id}`, JSON.stringify(newSettings));
    
    toast({
      title: "Settings Saved",
      description: "Your notification preferences have been updated",
    });
  };

  const fetchUpcomingJourneys = async () => {
    if (!profile) return;

    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          rides:ride_id (
            id,
            from_city,
            to_city,
            departure_date,
            departure_time,
            driver_id
          )
        `)
        .eq('passenger_id', profile.id)
        .eq('status', 'confirmed')
        .gte('rides.departure_date', new Date().toISOString().split('T')[0])
        .lte('rides.departure_date', tomorrow.toISOString().split('T')[0]);

      if (error) throw error;
      setUpcomingJourneys(data || []);
    } catch (error) {
      console.error('Error fetching upcoming journeys:', error);
    }
  };

  const fetchWeatherAlerts = async () => {
    // Mock weather alerts - replace with actual weather API
    const alerts: WeatherAlert[] = [
      {
        city: 'Mumbai',
        condition: 'Heavy Rain',
        temperature: 24,
        warning: 'Heavy rainfall expected, plan for delays',
        severity: 'warning'
      },
      {
        city: 'Delhi',
        condition: 'Fog',
        temperature: 8,
        warning: 'Dense fog, visibility reduced',
        severity: 'danger'
      }
    ];
    
    setWeatherAlerts(alerts);
  };

  const setupNotificationScheduler = () => {
    // Check for upcoming journeys every minute and send appropriate notifications
    const interval = setInterval(async () => {
      if (!profile || !settings.journey_reminders) return;

      for (const journey of upcomingJourneys) {
        const ride = journey.rides;
        if (!ride) continue;

        const departureTime = new Date(`${ride.departure_date} ${ride.departure_time}`);
        const now = new Date();
        const timeDiff = departureTime.getTime() - now.getTime();
        const hoursDiff = timeDiff / (1000 * 60 * 60);

        // Send 24-hour reminder
        if (settings.reminder_24h && hoursDiff <= 24 && hoursDiff > 23.5) {
          await createPreJourneyNotification(journey, '24_hour');
        }
        
        // Send 2-hour reminder
        if (settings.reminder_2h && hoursDiff <= 2 && hoursDiff > 1.5) {
          await createPreJourneyNotification(journey, '2_hour');
        }
        
        // Send 30-minute reminder
        if (settings.reminder_30min && hoursDiff <= 0.5 && hoursDiff > 0.25) {
          await createPreJourneyNotification(journey, '30_minute');
        }
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  };

  const createPreJourneyNotification = async (journey: any, type: string) => {
    const ride = journey.rides;
    let title = '';
    let message = '';
    let priority: 'low' | 'normal' | 'high' = 'normal';

    switch (type) {
      case '24_hour':
        title = 'Journey Tomorrow';
        message = `Don't forget: Your ride from ${ride.from_city} to ${ride.to_city} is scheduled for tomorrow at ${ride.departure_time}. Check weather and prepare!`;
        priority = 'low';
        break;
      case '2_hour':
        title = 'Journey in 2 Hours';
        message = `Your ride from ${ride.from_city} to ${ride.to_city} starts in 2 hours (${ride.departure_time}). Get ready to leave soon!`;
        priority = 'normal';
        break;
      case '30_minute':
        title = 'Journey Starting Soon!';
        message = `Your ride from ${ride.from_city} to ${ride.to_city} starts in 30 minutes. Head to the pickup point now!`;
        priority = 'high';
        break;
    }

    try {
      await supabase
        .from('notifications')
        .insert({
          user_id: profile.id,
          user_type: profile.role,
          booking_id: journey.id,
          notification_type: 'journey_reminder',
          title,
          message,
          priority,
          sent_at: new Date().toISOString(),
        });
    } catch (error) {
      console.error('Error creating pre-journey notification:', error);
    }
  };

  const createDriverBookingNotification = async (booking: any, ride: any) => {
    const bookingNotification: Notification = {
      id: `booking-${booking.id}`,
      title: 'New Booking!',
      message: `Someone booked ${booking.seats_booked} seat(s) on your ride from ${ride.from_city} to ${ride.to_city}. Remaining seats: ${ride.available_seats - booking.seats_booked}`,
      notification_type: 'booking_confirmed',
      sent_at: new Date().toISOString(),
      read_at: null,
      user_type: 'driver',
      priority: 'normal',
      booking_id: booking.id,
    };

    setNotifications(prev => [bookingNotification, ...prev]);
    
    toast({
      title: "New Booking!",
      description: bookingNotification.message,
    });
  };

  const playNotificationSound = (priority: string) => {
    // Play different sounds based on priority
    const audio = new Audio();
    switch (priority) {
      case 'urgent':
        audio.src = '/sounds/urgent.mp3'; // Add these sound files to your public folder
        break;
      case 'high':
        audio.src = '/sounds/high.mp3';
        break;
      default:
        audio.src = '/sounds/normal.mp3';
        break;
    }
    
    audio.play().catch(console.error);
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(notif =>
          notif.id === notificationId
            ? { ...notif, read_at: new Date().toISOString() }
            : notif
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications
        .filter(n => !n.read_at)
        .map(n => n.id);

      if (unreadIds.length === 0) return;

      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .in('id', unreadIds);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(notif =>
          !notif.read_at
            ? { ...notif, read_at: new Date().toISOString() }
            : notif
        )
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const clearNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'journey_reminder': return <Clock className="h-4 w-4" />;
      case 'weather_alert': return <CloudRain className="h-4 w-4" />;
      case 'traffic_update': return <MapPin className="h-4 w-4" />;
      case 'driver_message': return <Car className="h-4 w-4" />;
      case 'booking_confirmed': return <Check className="h-4 w-4" />;
      case 'safety_check': return <AlertTriangle className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getNotificationColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'normal': return 'bg-blue-500';
      case 'low': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'secondary';
      default: return 'outline';
    }
  };

  const unreadCount = notifications.filter(n => !n.read_at).length;
  const urgentCount = notifications.filter(n => !n.read_at && n.priority === 'urgent').length;

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <Badge 
            variant={urgentCount > 0 ? "destructive" : "default"} 
            className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {showNotifications && (
        <>
          {/* Full screen backdrop */}
          <div 
            className="fixed inset-0 z-40 bg-black/50"
            onClick={() => setShowNotifications(false)}
          />
          
          {/* Centered Mobile Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md max-h-[80vh] bg-white shadow-2xl rounded-xl overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 px-6 pt-6 border-b">
                <div>
                  <CardTitle className="text-lg font-semibold">Notifications</CardTitle>
                  {unreadCount > 0 && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                      {urgentCount > 0 && (
                        <Badge variant="destructive" className="ml-2 text-xs">
                          {urgentCount} urgent
                        </Badge>
                      )}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Notification Settings</DialogTitle>
                        <DialogDescription>
                          Customize your notification preferences
                        </DialogDescription>
                      </DialogHeader>
                      
                      <Tabs defaultValue="preferences" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="preferences">Preferences</TabsTrigger>
                          <TabsTrigger value="timing">Timing</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="preferences" className="space-y-4">
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <Label htmlFor="journey_reminders">Journey Reminders</Label>
                              <Switch
                                id="journey_reminders"
                                checked={settings.journey_reminders}
                                onCheckedChange={(checked) =>
                                  saveNotificationSettings({ ...settings, journey_reminders: checked })
                                }
                              />
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <Label htmlFor="weather_alerts">Weather Alerts</Label>
                              <Switch
                                id="weather_alerts"
                                checked={settings.weather_alerts}
                                onCheckedChange={(checked) =>
                                  saveNotificationSettings({ ...settings, weather_alerts: checked })
                                }
                              />
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <Label htmlFor="traffic_updates">Traffic Updates</Label>
                              <Switch
                                id="traffic_updates"
                                checked={settings.traffic_updates}
                                onCheckedChange={(checked) =>
                                  saveNotificationSettings({ ...settings, traffic_updates: checked })
                                }
                              />
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <Label htmlFor="driver_updates">Driver Updates</Label>
                              <Switch
                                id="driver_updates"
                                checked={settings.driver_updates}
                                onCheckedChange={(checked) =>
                                  saveNotificationSettings({ ...settings, driver_updates: checked })
                                }
                              />
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <Label htmlFor="sound_enabled">Sound Notifications</Label>
                              <Switch
                                id="sound_enabled"
                                checked={settings.sound_enabled}
                                onCheckedChange={(checked) =>
                                  saveNotificationSettings({ ...settings, sound_enabled: checked })
                                }
                              />
                            </div>
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="timing" className="space-y-4">
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <Label htmlFor="reminder_24h">24 Hour Reminder</Label>
                              <Switch
                                id="reminder_24h"
                                checked={settings.reminder_24h}
                                onCheckedChange={(checked) =>
                                  saveNotificationSettings({ ...settings, reminder_24h: checked })
                                }
                              />
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <Label htmlFor="reminder_2h">2 Hour Reminder</Label>
                              <Switch
                                id="reminder_2h"
                                checked={settings.reminder_2h}
                                onCheckedChange={(checked) =>
                                  saveNotificationSettings({ ...settings, reminder_2h: checked })
                                }
                              />
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <Label htmlFor="reminder_30min">30 Minute Reminder</Label>
                              <Switch
                                id="reminder_30min"
                                checked={settings.reminder_30min}
                                onCheckedChange={(checked) =>
                                  saveNotificationSettings({ ...settings, reminder_30min: checked })
                                }
                              />
                            </div>
                          </div>
                        </TabsContent>
                      </Tabs>
                    </DialogContent>
                  </Dialog>
                  
                  {unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={markAllAsRead}
                      className="text-xs h-8 px-3 text-primary hover:bg-primary/10"
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Mark all read
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowNotifications(false)}
                    className="h-8 w-8 p-0 hover:bg-gray-100"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </CardHeader>

              {/* Weather Alerts Section */}
              {weatherAlerts.length > 0 && settings.weather_alerts && (
                <div className="px-6 py-3 border-b bg-orange-50">
                  <h4 className="text-sm font-semibold text-orange-800 mb-2 flex items-center gap-2">
                    <CloudRain className="h-4 w-4" />
                    Active Weather Alerts
                  </h4>
                  {weatherAlerts.map((alert, index) => (
                    <Alert key={index} className="mb-2 border-orange-200">
                      <AlertDescription className="text-sm">
                        <strong>{alert.city}:</strong> {alert.condition} ({alert.temperature}°C)
                        {alert.warning && (
                          <div className="text-orange-700 mt-1">{alert.warning}</div>
                        )}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}
              
              <CardContent className="p-0">
                <ScrollArea className="h-[50vh] min-h-[300px]">
                  {loading ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                      <p>Loading notifications...</p>
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <Bell className="h-12 w-12 mx-auto mb-4 opacity-30" />
                      <p className="text-lg font-medium mb-2">No notifications</p>
                      <p className="text-sm">You're all caught up!</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                            !notification.read_at ? 'bg-blue-50/50' : ''
                          } ${notification.priority === 'urgent' ? 'border-l-4 border-l-red-500' : ''}`}
                          onClick={() => markAsRead(notification.id)}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 mt-1">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${getNotificationColor(
                                  notification.priority
                                )}`}
                              >
                                {getNotificationIcon(notification.notification_type)}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="text-sm font-semibold text-gray-900 leading-tight">
                                      {notification.title}
                                    </p>
                                    {notification.priority !== 'normal' && (
                                      <Badge variant={getPriorityBadgeVariant(notification.priority)} className="text-xs">
                                        {notification.priority}
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-600 leading-relaxed mb-2">
                                    {notification.message}
                                  </p>
                                  <p className="text-xs text-gray-400">
                                    {new Date(notification.sent_at).toLocaleString('en-IN', {
                                      day: 'numeric',
                                      month: 'short',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  {!notification.read_at && (
                                    <div className="w-2 h-2 bg-primary rounded-full" />
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      clearNotification(notification.id);
                                    }}
                                    className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600 rounded-full"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
              
              {/* Footer with action buttons */}
              <div className="border-t bg-gray-50 px-6 py-4">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowNotifications(false)}
                >
                  Close
                </Button>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};