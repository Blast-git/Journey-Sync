    import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Download,
  Share2,
  MapPin,
  Calendar,
  Clock,
  Users,
  Car,
  Phone,
  Star,
  QrCode,
  CheckCircle,
  AlertCircle,
  Home,
  MessageCircle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import QRCode from 'qrcode';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface BookingTicketData {
  booking_id: string;
  ride_id: string;
  selected_seats: string[];
  total_price: number;
  pickup_zone: {
    id: string;
    zone_name: string;
    city_name: string;
    landmarks: string[];
  };
  dropoff_zone: {
    id: string;
    zone_name: string;
    city_name: string;
    landmarks: string[];
  };
  passenger_details: Array<{
    name: string;
    phone: string;
    gender: string;
    age: string;
  }>;
  ride_details: {
    from_city: string;
    to_city: string;
    departure_date: string;
    departure_time: string;
    driver: {
      full_name: string;
      phone: string;
      average_rating: number;
    };
    vehicle: {
      car_model: string;
      car_type: string;
      license_plate: string;
      color: string;
    };
  };
}

const BookingTicket: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const ticketRef = useRef<HTMLDivElement>(null);
  
  const [bookingData, setBookingData] = useState<BookingTicketData | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (location.state?.bookingData) {
      const data = location.state.bookingData as BookingTicketData;
      setBookingData(data);
      generateQRCode(data);
    } else {
      toast({
        title: 'No Booking Data',
        description: 'Booking information not found. Redirecting to search.',
        variant: 'destructive',
      });
      navigate('/passenger/list-rides');
    }
  }, [location.state, navigate, toast]);

  const generateQRCode = async (data: BookingTicketData) => {
    try {
      // Create QR code data with booking verification info
      const qrData = {
        booking_id: data.booking_id,
        ride_id: data.ride_id,
        seats: data.selected_seats,
        passenger_count: data.passenger_details.length,
        pickup_zone: data.pickup_zone.zone_name,
        dropoff_zone: data.dropoff_zone.zone_name,
        verification_hash: btoa(`${data.booking_id}-${data.ride_id}-${Date.now()}`), // Simple hash for verification
      };

      const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify(qrData), {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });

      setQrCodeUrl(qrCodeDataUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast({
        title: 'QR Code Error',
        description: 'Failed to generate QR code for ticket.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const downloadTicket = async () => {
    if (!ticketRef.current) return;

    try {
      const canvas = await html2canvas(ticketRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 190;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
      pdf.save(`ticket-${bookingData?.booking_id}.pdf`);

      toast({
        title: 'Ticket Downloaded',
        description: 'Your ticket has been saved as a PDF.',
      });
    } catch (error) {
      console.error('Error downloading ticket:', error);
      toast({
        title: 'Download Error',
        description: 'Failed to download ticket. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const shareTicket = async () => {
    if (!bookingData) return;

    const shareData = {
      title: 'My Ride Booking',
      text: `Booked ride from ${bookingData.ride_details.from_city} to ${bookingData.ride_details.to_city} on ${formatDate(bookingData.ride_details.departure_date)}`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(
          `${shareData.text}\nBooking ID: ${bookingData.booking_id}`
        );
        toast({
          title: 'Link Copied',
          description: 'Booking details copied to clipboard.',
        });
      }
    } catch (error) {
      console.error('Error sharing ticket:', error);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-3 w-3 ${
              star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
        <span className="text-xs text-gray-600 ml-1">{rating.toFixed(1)}</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
        <div className="max-w-md mx-auto text-center py-8">
          <div className="animate-spin h-8 w-8 border-4 border-green-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Generating your ticket...</p>
        </div>
      </div>
    );
  }

  if (!bookingData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 p-4">
        <div className="max-w-md mx-auto text-center py-8">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Booking Not Found</h1>
          <p className="text-gray-600 mb-4">Unable to load booking details.</p>
          <Button onClick={() => navigate('/passenger/list-rides')}>
            Back to Search
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="max-w-md mx-auto">
        {/* Action Buttons */}
        <div className="flex gap-2 mb-4">
          <Button
            variant="outline"
            onClick={() => navigate('/passenger/dashboard')}
            className="flex items-center gap-2"
          >
            <Home className="h-4 w-4" />
            Home
          </Button>
          <Button
            variant="outline"
            onClick={downloadTicket}
            className="flex items-center gap-2 flex-1"
          >
            <Download className="h-4 w-4" />
            Download
          </Button>
          <Button
            variant="outline"
            onClick={shareTicket}
            className="flex items-center gap-2"
          >
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        </div>

        {/* Ticket */}
        <div ref={ticketRef} className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white p-6 text-center">
            <CheckCircle className="w-12 h-12 mx-auto mb-3" />
            <h1 className="text-xl font-bold mb-2">Booking Confirmed</h1>
            <div className="bg-white/20 rounded-lg px-4 py-2">
              <p className="text-sm font-mono font-bold">
                {bookingData.booking_id}
              </p>
            </div>
          </div>

          {/* Route Info */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">
                  {bookingData.ride_details.from_city}
                </p>
                <p className="text-sm text-gray-500">FROM</p>
              </div>
              <div className="flex-1 px-4">
                <div className="border-t-2 border-dashed border-gray-300 relative">
                  <Car className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white text-blue-600 h-6 w-6" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">
                  {bookingData.ride_details.to_city}
                </p>
                <p className="text-sm text-gray-500">TO</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="bg-blue-50 rounded-lg p-3">
                <Calendar className="h-5 w-5 text-blue-600 mx-auto mb-1" />
                <p className="font-semibold text-blue-900">
                  {formatDate(bookingData.ride_details.departure_date)}
                </p>
                <p className="text-xs text-blue-700">Departure Date</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-3">
                <Clock className="h-5 w-5 text-purple-600 mx-auto mb-1" />
                <p className="font-semibold text-purple-900">
                  {formatTime(bookingData.ride_details.departure_time)}
                </p>
                <p className="text-xs text-purple-700">Departure Time</p>
              </div>
            </div>
          </div>

          {/* Zones Info */}
          <div className="p-6 border-b border-gray-200">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-blue-600" />
              Pickup & Drop Zones
            </h3>
            <div className="space-y-3">
              <div className="bg-green-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="font-medium text-green-900">Pickup Zone</span>
                </div>
                <p className="text-green-800 font-semibold">
                  {bookingData.pickup_zone.zone_name}
                </p>
                {bookingData.pickup_zone.landmarks?.length > 0 && (
                  <p className="text-xs text-green-700 mt-1">
                    Near: {bookingData.pickup_zone.landmarks.join(', ')}
                  </p>
                )}
              </div>
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="font-medium text-blue-900">Drop Zone</span>
                </div>
                <p className="text-blue-800 font-semibold">
                  {bookingData.dropoff_zone.zone_name}
                </p>
                {bookingData.dropoff_zone.landmarks?.length > 0 && (
                  <p className="text-xs text-blue-700 mt-1">
                    Near: {bookingData.dropoff_zone.landmarks.join(', ')}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Passenger & Seat Details */}
          <div className="p-6 border-b border-gray-200">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Users className="h-4 w-4 text-orange-600" />
              Passenger & Seat Details
            </h3>
            <div className="space-y-3">
              {bookingData.passenger_details.map((passenger, index) => (
                <div key={index} className="bg-orange-50 rounded-lg p-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-orange-900">
                      {passenger.name}
                    </span>
                    <Badge className="bg-orange-600 text-white">
                      Seat {bookingData.selected_seats[index]}
                    </Badge>
                  </div>
                  <div className="text-xs text-orange-800 space-y-1">
                    <p>Phone: {passenger.phone}</p>
                    <p>Age: {passenger.age} • Gender: {passenger.gender}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Driver & Vehicle Info */}
          <div className="p-6 border-b border-gray-200">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Car className="h-4 w-4 text-gray-600" />
              Driver & Vehicle
            </h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-semibold text-gray-900">
                    {bookingData.ride_details.driver.full_name}
                  </p>
                  {renderStars(bookingData.ride_details.driver.average_rating)}
                </div>
                <div className="text-right">
                  <a
                    href={`tel:${bookingData.ride_details.driver.phone}`}
                    className="inline-flex items-center gap-1 bg-green-600 text-white px-3 py-1 rounded-full text-xs"
                  >
                    <Phone className="h-3 w-3" />
                    Call
                  </a>
                </div>
              </div>
              <div className="text-sm text-gray-700 space-y-1">
                <p>
                  <strong>Vehicle:</strong> {bookingData.ride_details.vehicle.car_model} {bookingData.ride_details.vehicle.car_type}
                </p>
                <p>
                  <strong>Color:</strong> {bookingData.ride_details.vehicle.color}
                </p>
                <p>
                  <strong>Plate:</strong> {bookingData.ride_details.vehicle.license_plate}
                </p>
              </div>
            </div>
          </div>

          {/* QR Code */}
          <div className="p-6 border-b border-gray-200 text-center">
            <h3 className="font-semibold mb-4 flex items-center justify-center gap-2">
              <QrCode className="h-4 w-4 text-purple-600" />
              Boarding Pass
            </h3>
            <div className="bg-purple-50 rounded-lg p-4">
              <img
                src={qrCodeUrl}
                alt="Booking QR Code"
                className="mx-auto mb-3 border rounded"
                style={{ width: '120px', height: '120px' }}
              />
              <p className="text-xs text-purple-800 mb-2">
                Show this QR code to the driver when boarding
              </p>
              <p className="text-xs text-purple-700 font-mono">
                ID: {bookingData.booking_id.split('-')[0]}
              </p>
            </div>
          </div>

          {/* Pricing */}
          <div className="p-6 border-b border-gray-200">
            <h3 className="font-semibold mb-4">Pricing Details</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Seats ({bookingData.selected_seats.length})</span>
                <span>{bookingData.selected_seats.join(', ')}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total Amount</span>
                <span className="text-green-600">₹{bookingData.total_price}</span>
              </div>
              <p className="text-xs text-gray-600 text-center mt-2">
                Payment to be made during the ride
              </p>
            </div>
          </div>

          {/* Important Notes */}
          <div className="p-6">
            <h3 className="font-semibold mb-3 text-red-600">Important Instructions</h3>
            <div className="space-y-2 text-xs text-gray-700">
              <div className="flex items-start gap-2">
                <div className="w-1 h-1 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                <p>Arrive at pickup zone 15 minutes before departure time</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1 h-1 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                <p>Keep this ticket and a valid ID ready for verification</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1 h-1 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                <p>Contact driver if you're running late or need assistance</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1 h-1 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                <p>Payment will be collected during the journey</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-100 p-4 text-center">
            <p className="text-xs text-gray-600 mb-2">
              Safe travels! Have a pleasant journey.
            </p>
            <p className="text-xs text-gray-500 font-mono">
              Generated on {new Date().toLocaleString('en-IN')}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 space-y-3">
          <Button
            onClick={() => navigate('/passenger/support', { 
              state: { 
                bookingId: bookingData.booking_id,
                rideId: bookingData.ride_id 
              } 
            })}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-5 h-5" />
            Need Help? Contact Support
          </Button>

          <Button
            onClick={() => navigate('/passenger/dashboard')}
            className="w-full bg-gray-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-gray-700 transition-colors"
          >
            Go to Dashboard
          </Button>
        </div>

        {/* Emergency Contact Info */}
        <Card className="mt-4 bg-red-50 border-red-200">
          <CardContent className="p-4 text-center">
            <AlertCircle className="w-5 h-5 text-red-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-red-800 mb-1">Emergency Support</p>
            <p className="text-xs text-red-700">
              24/7 helpline: <a href="tel:+911234567890" className="font-semibold">+91 12345 67890</a>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BookingTicket;