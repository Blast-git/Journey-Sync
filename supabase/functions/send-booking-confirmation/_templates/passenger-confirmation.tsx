import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
  Section,
  Row,
  Column,
  Hr,
  Button,
  Img,
} from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';

interface BookingData {
  id: string;
  booking_reference: string;
  passenger_name: string;
  passenger_email: string;
  driver_name: string;
  driver_phone: string;
  driver_rating: number;
  driver_photo?: string;
  vehicle_details: {
    make: string;
    model: string;
    color: string;
    license_plate: string;
    type: string;
  };
  trip_details: {
    from_city: string;
    to_city: string;
    pickup_location: string;
    departure_date: string;
    departure_time: string;
    estimated_duration: string;
    fare_breakdown: {
      base_fare: number;
      taxes: number;
      total: number;
    };
  };
  seats_booked: number;
}

interface PassengerConfirmationEmailProps {
  booking: BookingData;
}

export const PassengerConfirmationEmail = ({ booking }: PassengerConfirmationEmailProps) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const renderStars = (rating: number) => {
    return '★'.repeat(Math.floor(rating)) + '☆'.repeat(5 - Math.floor(rating));
  };

  return (
    <Html>
      <Head />
      <Preview>Your ride from {booking.trip_details.from_city} to {booking.trip_details.to_city} is confirmed!</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={h1}>🚗 RideShare</Heading>
            <Text style={confirmationText}>Your ride has been successfully booked!</Text>
          </Section>

          {/* Booking Reference */}
          <Section style={referenceSection}>
            <Text style={referenceLabel}>Booking Reference</Text>
            <Text style={referenceNumber}>{booking.booking_reference}</Text>
          </Section>

          <Hr style={divider} />

          {/* Trip Details */}
          <Section>
            <Heading style={sectionTitle}>Trip Details</Heading>
            <Row style={tripDetailRow}>
              <Column>
                <Text style={label}>Booking ID:</Text>
                <Text style={value}>{booking.id.substring(0, 8).toUpperCase()}</Text>
              </Column>
              <Column>
                <Text style={label}>Seats Booked:</Text>
                <Text style={value}>{booking.seats_booked}</Text>
              </Column>
            </Row>
            
            <Row style={tripDetailRow}>
              <Column>
                <Text style={label}>Date & Time:</Text>
                <Text style={value}>{formatDate(booking.trip_details.departure_date)} at {booking.trip_details.departure_time}</Text>
              </Column>
              <Column>
                <Text style={label}>Duration:</Text>
                <Text style={value}>{booking.trip_details.estimated_duration}</Text>
              </Column>
            </Row>

            <Row style={tripDetailRow}>
              <Column>
                <Text style={label}>From:</Text>
                <Text style={value}>{booking.trip_details.from_city}</Text>
              </Column>
              <Column>
                <Text style={label}>To:</Text>
                <Text style={value}>{booking.trip_details.to_city}</Text>
              </Column>
            </Row>

            <Text style={label}>Pickup Location:</Text>
            <Text style={value}>{booking.trip_details.pickup_location}</Text>
          </Section>

          <Hr style={divider} />

          {/* Driver Information */}
          <Section>
            <Heading style={sectionTitle}>Driver Information</Heading>
            <Row>
              <Column style={{ width: '60px' }}>
                <div style={driverAvatar}>
                  {booking.driver_name.charAt(0)}
                </div>
              </Column>
              <Column>
                <Text style={driverName}>{booking.driver_name}</Text>
                <Text style={driverRating}>{renderStars(booking.driver_rating)} ({booking.driver_rating}/5)</Text>
                <Text style={driverPhone}>Phone: {booking.driver_phone}</Text>
              </Column>
            </Row>
          </Section>

          <Hr style={divider} />

          {/* Vehicle Details */}
          <Section>
            <Heading style={sectionTitle}>Vehicle Details</Heading>
            <Row style={tripDetailRow}>
              <Column>
                <Text style={label}>Vehicle:</Text>
                <Text style={value}>{booking.vehicle_details.make} {booking.vehicle_details.model}</Text>
              </Column>
              <Column>
                <Text style={label}>Color:</Text>
                <Text style={value}>{booking.vehicle_details.color}</Text>
              </Column>
            </Row>
            <Row style={tripDetailRow}>
              <Column>
                <Text style={label}>License Plate:</Text>
                <Text style={value}>{booking.vehicle_details.license_plate}</Text>
              </Column>
              <Column>
                <Text style={label}>Type:</Text>
                <Text style={value}>{booking.vehicle_details.type}</Text>
              </Column>
            </Row>
          </Section>

          <Hr style={divider} />

          {/* Fare Breakdown */}
          <Section>
            <Heading style={sectionTitle}>Fare Details</Heading>
            <Row style={fareRow}>
              <Column>
                <Text style={fareLabel}>Base Fare:</Text>
              </Column>
              <Column style={{ textAlign: 'right' }}>
                <Text style={fareValue}>₹{booking.trip_details.fare_breakdown.base_fare}</Text>
              </Column>
            </Row>
            <Row style={fareRow}>
              <Column>
                <Text style={fareLabel}>Taxes & Fees:</Text>
              </Column>
              <Column style={{ textAlign: 'right' }}>
                <Text style={fareValue}>₹{booking.trip_details.fare_breakdown.taxes}</Text>
              </Column>
            </Row>
            <Hr style={minorDivider} />
            <Row style={fareRow}>
              <Column>
                <Text style={fareTotalLabel}>Total Amount:</Text>
              </Column>
              <Column style={{ textAlign: 'right' }}>
                <Text style={fareTotalValue}>₹{booking.trip_details.fare_breakdown.total}</Text>
              </Column>
            </Row>
          </Section>

          <Hr style={divider} />

          {/* Important Information */}
          <Section style={importantSection}>
            <Heading style={sectionTitle}>Important Information</Heading>
            <Text style={importantText}>
              • Please be ready 5 minutes before the scheduled pickup time
            </Text>
            <Text style={importantText}>
              • You can contact your driver directly or reach our support team
            </Text>
            <Text style={importantText}>
              • Free cancellation up to 15 minutes before pickup
            </Text>
            <Text style={importantText}>
              • Track your ride in real-time and share your trip with emergency contacts
            </Text>
          </Section>

          {/* Action Buttons */}
          <Section style={actionSection}>
            <Row>
              <Column style={{ paddingRight: '10px' }}>
                <Button style={primaryButton}>Track Your Ride</Button>
              </Column>
              <Column style={{ paddingLeft: '10px' }}>
                <Button style={secondaryButton}>Contact Driver</Button>
              </Column>
            </Row>
            <Row style={{ marginTop: '16px' }}>
              <Column style={{ paddingRight: '10px' }}>
                <Button style={secondaryButton}>Modify Booking</Button>
              </Column>
              <Column style={{ paddingLeft: '10px' }}>
                <Button style={cancelButton}>Cancel Booking</Button>
              </Column>
            </Row>
          </Section>

          {/* Emergency Information */}
          <Section style={emergencySection}>
            <Text style={emergencyTitle}>Emergency Support</Text>
            <Text style={emergencyText}>24/7 Support: +91-9999-888-777</Text>
            <Text style={emergencyText}>For immediate assistance during your ride</Text>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              Need help? Contact us at support@rideshare.com
            </Text>
            <Text style={footerText}>
              Download our app: 
              <Link href="#" style={footerLink}> iOS </Link> | 
              <Link href="#" style={footerLink}> Android</Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
};

const header = {
  textAlign: 'center' as const,
  padding: '32px 20px',
  backgroundColor: '#2563eb',
  borderRadius: '8px 8px 0 0',
};

const h1 = {
  color: '#ffffff',
  fontSize: '32px',
  fontWeight: 'bold',
  margin: '0 0 16px',
};

const confirmationText = {
  color: '#ffffff',
  fontSize: '18px',
  margin: '0',
};

const referenceSection = {
  textAlign: 'center' as const,
  padding: '24px 20px',
  backgroundColor: '#f8fafc',
};

const referenceLabel = {
  color: '#64748b',
  fontSize: '14px',
  margin: '0 0 8px',
};

const referenceNumber = {
  color: '#1e293b',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0',
  fontFamily: 'monospace',
};

const sectionTitle = {
  color: '#1e293b',
  fontSize: '20px',
  fontWeight: 'bold',
  margin: '0 0 16px',
  padding: '0 20px',
};

const tripDetailRow = {
  margin: '8px 0',
  padding: '0 20px',
};

const label = {
  color: '#64748b',
  fontSize: '14px',
  margin: '0 0 4px',
  fontWeight: '500',
};

const value = {
  color: '#1e293b',
  fontSize: '16px',
  margin: '0 0 16px',
  fontWeight: '600',
};

const driverAvatar = {
  width: '48px',
  height: '48px',
  borderRadius: '50%',
  backgroundColor: '#2563eb',
  color: '#ffffff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '20px',
  fontWeight: 'bold',
  margin: '0 20px 0 20px',
};

const driverName = {
  color: '#1e293b',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 4px',
};

const driverRating = {
  color: '#f59e0b',
  fontSize: '14px',
  margin: '0 0 4px',
};

const driverPhone = {
  color: '#64748b',
  fontSize: '14px',
  margin: '0',
};

const fareRow = {
  margin: '8px 0',
  padding: '0 20px',
};

const fareLabel = {
  color: '#64748b',
  fontSize: '14px',
  margin: '0',
};

const fareValue = {
  color: '#1e293b',
  fontSize: '14px',
  margin: '0',
};

const fareTotalLabel = {
  color: '#1e293b',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0',
};

const fareTotalValue = {
  color: '#2563eb',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0',
};

const importantSection = {
  backgroundColor: '#fef3c7',
  padding: '20px',
  borderRadius: '8px',
  margin: '0 20px',
};

const importantText = {
  color: '#92400e',
  fontSize: '14px',
  margin: '0 0 8px',
};

const actionSection = {
  padding: '24px 20px',
};

const primaryButton = {
  backgroundColor: '#2563eb',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  width: '100%',
  padding: '12px',
  border: 'none',
};

const secondaryButton = {
  backgroundColor: '#f1f5f9',
  borderRadius: '6px',
  color: '#475569',
  fontSize: '14px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  width: '100%',
  padding: '12px',
  border: '1px solid #e2e8f0',
};

const cancelButton = {
  backgroundColor: '#fef2f2',
  borderRadius: '6px',
  color: '#dc2626',
  fontSize: '14px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  width: '100%',
  padding: '12px',
  border: '1px solid #fecaca',
};

const emergencySection = {
  backgroundColor: '#fef2f2',
  padding: '20px',
  borderRadius: '8px',
  margin: '0 20px',
  textAlign: 'center' as const,
};

const emergencyTitle = {
  color: '#dc2626',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 8px',
};

const emergencyText = {
  color: '#991b1b',
  fontSize: '14px',
  margin: '0 0 4px',
};

const footer = {
  textAlign: 'center' as const,
  padding: '24px 20px',
  borderTop: '1px solid #e2e8f0',
  margin: '24px 20px 0',
};

const footerText = {
  color: '#64748b',
  fontSize: '12px',
  margin: '0 0 8px',
};

const footerLink = {
  color: '#2563eb',
  textDecoration: 'underline',
};

const divider = {
  borderColor: '#e2e8f0',
  margin: '24px 20px',
};

const minorDivider = {
  borderColor: '#f1f5f9',
  margin: '8px 0',
};

export default PassengerConfirmationEmail;