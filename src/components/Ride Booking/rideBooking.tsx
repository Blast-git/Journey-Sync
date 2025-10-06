// import React, { useState, useEffect } from "react";
// import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Badge } from "@/components/ui/badge";
// import { Label } from "@/components/ui/label";
// import { Textarea } from "@/components/ui/textarea";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import { useAuth } from "@/contexts/AuthContext";
// import { supabase } from "@/integrations/supabase/client";
// import {
//   MapPin,
//   Calendar,
//   Clock,
//   Users,
//   Star,
//   Phone,
//   Shield,
//   ArrowLeft,
//   Car,
//   CheckCircle,
//   AlertCircle,
//   Loader2,
//   Plus,
//   Minus,
// } from "lucide-react";
// import { useToast } from "@/hooks/use-toast";
// import { PassengerRoutePreview } from "@/components/maps/passenger/Booking/PassengerRoutePreview";
// import { useNavigate, useParams } from "react-router-dom";
// import { fetchRideById, RideWithDetails } from "@/utils/fetchRides";
// import type { CityZone } from "@/types/mapTypes";
// import { debugBookingData } from "@/utils/bookingDebug";
// // Import seat layout types
// import type {
//   LayoutConfig,
//   Seat,
//   SeatRow,
//   SeatPricing,
// } from "@/utils/seatLayoutUtils";

// interface PassengerDetails {
//   name: string;
//   phone: string;
//   email: string;
//   gender: string;
//   age: string;
//   emergency_contact_name: string;
//   emergency_contact_phone: string;
//   notes: string;
// }

// interface BookingForm {
//   seats_booked: number;
//   selected_seats: string[];
//   passenger_details: PassengerDetails[];
//   pickup_zone: CityZone | null;
//   dropoff_zone: CityZone | null;
// }

// interface SeatAvailability {
//   ride_id: string;
//   total_seats: number;
//   seats_booked: number;
//   available_seats: number;
//   booked_seat_ids: string[];
//   seat_layout: LayoutConfig;
//   seat_pricing: SeatPricing;
// }

// // Passenger Seat Visualization Component (same as before but with multi-passenger support)
// const PassengerSeatVisualization: React.FC<{
//   layoutConfig: LayoutConfig;
//   seatPricing: SeatPricing;
//   bookedSeats: string[];
//   selectedSeats: string[];
//   onSeatSelect: (seatId: string) => void;
//   maxSelectable?: number;
// }> = ({
//   layoutConfig,
//   seatPricing,
//   bookedSeats,
//   selectedSeats,
//   onSeatSelect,
//   maxSelectable = 4,
// }) => {
//   if (!layoutConfig?.rows) {
//     return (
//       <div className="text-center p-8 text-gray-500">
//         No seat layout available
//       </div>
//     );
//   }

//   // Process layout to ensure correct front seat ordering
//   const processedRows = () => {
//     const processed: SeatRow[] = [];
//     let frontSeats: Seat[] = [];

//     layoutConfig.rows.forEach((row) => {
//       if (row.type === "front") {
//         frontSeats.push(...row.seats);
//       } else {
//         processed.push(row);
//       }
//     });

//     if (frontSeats.length > 0) {
//       const sortedFrontSeats = frontSeats.sort((a, b) => {
//         if (a.type === "front" && b.type === "driver") return -1;
//         if (a.type === "driver" && b.type === "front") return 1;
//         if (a.id === "F1" && b.id === "D") return -1;
//         if (a.id === "D" && b.id === "F1") return 1;
//         return 0;
//       });

//       processed.unshift({
//         type: "front",
//         seats: sortedFrontSeats,
//         rowIndex: 0,
//       });
//     }

//     return processed.map((row, index) => ({ ...row, rowIndex: index }));
//   };

//   const renderSeat = (seat: Seat) => {
//     const isBooked = bookedSeats.includes(seat.id);
//     const isSelected = selectedSeats.includes(seat.id);
//     const isDriver = seat.type === "driver";
//     const isBookable = seat.bookable && !isBooked && !isDriver;
//     const seatPrice = seatPricing[seat.id] || 0;

//     const handleSeatClick = () => {
//       if (isBookable) {
//         if (!isSelected && selectedSeats.length >= maxSelectable) {
//           return;
//         }
//         onSeatSelect(seat.id);
//       }
//     };

//     const getSeatStyle = () => {
//       if (isDriver) {
//         return "bg-gray-600 text-white border-gray-700 cursor-not-allowed";
//       }
//       if (isBooked) {
//         return "bg-red-500 text-white border-red-600 cursor-not-allowed";
//       }
//       if (isSelected) {
//         return "bg-blue-500 text-white border-blue-600 ring-2 ring-blue-300 scale-105";
//       }
//       if (isBookable) {
//         return "bg-green-100 text-green-800 border-green-300 hover:bg-green-200 hover:scale-105 cursor-pointer";
//       }
//       return "bg-gray-300 text-gray-600 border-gray-400 cursor-not-allowed";
//     };

//     return (
//       <div key={seat.id} className="flex flex-col items-center space-y-2">
//         <div
//           className={`
//             w-16 h-16 rounded-lg border-2 flex flex-col items-center justify-center 
//             font-bold text-xs transition-all duration-200
//             ${getSeatStyle()}
//             ${
//               isBookable && selectedSeats.length < maxSelectable
//                 ? "shadow-md"
//                 : ""
//             }
//           `}
//           onClick={handleSeatClick}
//           title={`
//             ${seat.label} Seat (${seat.id})
//             ${
//               isDriver
//                 ? " - Driver Seat"
//                 : isBooked
//                 ? " - Already Booked"
//                 : isSelected
//                 ? ` - Selected (₹${seatPrice})`
//                 : isBookable
//                 ? ` - Available (₹${seatPrice})`
//                 : " - Not Available"
//             }
//           `}
//         >
//           <div className="text-xs font-bold">{seat.id}</div>
//           {isDriver && <Car className="h-3 w-3 mt-0.5" />}
//           {isBookable && <div className="text-[8px] mt-0.5">₹{seatPrice}</div>}
//         </div>

//         <div className="text-center">
//           <div
//             className={`
//             text-xs font-medium px-2 py-1 rounded text-center min-w-[60px]
//             ${
//               isDriver
//                 ? "bg-gray-200 text-gray-700"
//                 : isBooked
//                 ? "bg-red-100 text-red-700"
//                 : isSelected
//                 ? "bg-blue-100 text-blue-700"
//                 : isBookable
//                 ? "bg-green-100 text-green-700"
//                 : "bg-gray-100 text-gray-600"
//             }
//           `}
//           >
//             {isDriver
//               ? "Driver"
//               : isBooked
//               ? "Booked"
//               : isSelected
//               ? "Selected"
//               : isBookable
//               ? `₹${seatPrice}`
//               : "N/A"}
//           </div>
//         </div>
//       </div>
//     );
//   };

//   const renderSeatRow = (row: SeatRow, rowIndex: number) => {
//     if (!row.seats || row.seats.length === 0) return null;

//     const getRowLayout = () => {
//       if (row.type === "front") {
//         return "flex justify-center items-center gap-8 max-w-md mx-auto";
//       }

//       const seatCount = row.seats.length;
//       if (seatCount === 2) {
//         return "flex justify-center gap-12 max-w-sm mx-auto";
//       } else if (seatCount === 3) {
//         return "flex justify-center gap-6 max-w-md mx-auto";
//       } else if (seatCount === 4) {
//         return "flex justify-center gap-4 max-w-lg mx-auto";
//       }

//       return "flex justify-center gap-6";
//     };

//     return (
//       <div key={`${row.type}-${rowIndex}`} className="w-full">
//         <div className={getRowLayout()}>
//           {row.seats.map((seat) => renderSeat(seat))}
//         </div>
//       </div>
//     );
//   };

//   const processedLayoutRows = processedRows();

//   return (
//     <div className="bg-gradient-to-b from-blue-50 to-blue-100 p-8 rounded-xl border-2 border-blue-200">
//       <div className="text-center mb-8">
//         <div className="inline-flex items-center gap-2 bg-blue-800 text-white px-6 py-3 rounded-t-xl text-sm font-medium shadow-lg">
//           <Car className="h-4 w-4" />
//           Select Your Seats
//         </div>
//         <div className="text-xs text-blue-700 mt-2 font-medium">
//           {layoutConfig.vehicleType} • {layoutConfig.totalSeats} Total Seats •
//           Choose up to {maxSelectable} seats
//         </div>
//       </div>

//       <div className="space-y-8 w-full">
//         {processedLayoutRows.map((row, rowIndex) =>
//           renderSeatRow(row, rowIndex)
//         )}
//       </div>

//       {selectedSeats.length > 0 && (
//         <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
//           <div className="text-center">
//             <div className="text-sm font-semibold text-blue-900 mb-2">
//               Selected Seats ({selectedSeats.length}/{maxSelectable})
//             </div>
//             <div className="flex justify-center gap-2 mb-3">
//               {selectedSeats.map((seatId) => (
//                 <Badge key={seatId} variant="default" className="bg-blue-600">
//                   {seatId}: ₹{seatPricing[seatId] || 0}
//                 </Badge>
//               ))}
//             </div>
//             <div className="text-lg font-bold text-blue-900">
//               Total: ₹
//               {selectedSeats.reduce(
//                 (sum, seatId) => sum + (seatPricing[seatId] || 0),
//                 0
//               )}
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Legend */}
//       <div className="mt-8 space-y-4">
//         <div className="text-center text-sm font-semibold text-blue-800">
//           Seat Status Legend
//         </div>
//         <div className="flex flex-wrap justify-center gap-6 text-xs">
//           <div className="flex items-center gap-2">
//             <div className="w-5 h-5 bg-green-100 border-2 border-green-300 rounded"></div>
//             <span className="font-medium">Available</span>
//           </div>
//           <div className="flex items-center gap-2">
//             <div className="w-5 h-5 bg-blue-500 border-2 border-blue-600 rounded"></div>
//             <span className="font-medium">Selected</span>
//           </div>
//           <div className="flex items-center gap-2">
//             <div className="w-5 h-5 bg-red-500 border-2 border-red-600 rounded"></div>
//             <span className="font-medium">Booked</span>
//           </div>
//           <div className="flex items-center gap-2">
//             <div className="w-5 h-5 bg-gray-600 rounded flex items-center justify-center">
//               <Car className="h-3 w-3 text-white" />
//             </div>
//             <span className="font-medium">Driver</span>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// const RideBooking: React.FC = () => {
//   const { rideId } = useParams<{ rideId: string }>();
//   const { profile } = useAuth();
//   const navigate = useNavigate();
//   const { toast } = useToast();

//   const [ride, setRide] = useState<RideWithDetails | null>(null);
//   const [seatAvailability, setSeatAvailability] =
//     useState<SeatAvailability | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [bookingLoading, setBookingLoading] = useState(false);
//   const [userBookings, setUserBookings] = useState<any[]>([]);

//   const [bookingStep, setBookingStep] = useState<"zones" | "seats" | "details">(
//     "zones"
//   );
//   const [bookingForm, setBookingForm] = useState<BookingForm>({
//     seats_booked: 0,
//     selected_seats: [],
//     passenger_details: [],
//     pickup_zone: null,
//     dropoff_zone: null,
//   });

//   // Fetch ride details and seat availability
//   useEffect(() => {
//     if (rideId) {
//       fetchRideAndSeatData();
//     } else {
//       toast({
//         title: "Invalid Ride",
//         description: "No ride specified. Redirecting to search.",
//         variant: "destructive",
//       });
//       navigate("/passenger/list-rides");
//     }
//   }, [rideId]);

//   useEffect(() => {
//     if (profile?.id) {
//       fetchUserBookings();
//     }
//   }, [profile?.id]);

//   // Initialize passenger details when seats are selected
//   useEffect(() => {
//     const seatCount = bookingForm.selected_seats.length;
//     const currentDetailsCount = bookingForm.passenger_details.length;

//     if (seatCount > currentDetailsCount) {
//       // Add new passenger details forms
//       const newDetails = Array(seatCount - currentDetailsCount)
//         .fill(null)
//         .map((_, index) => ({
//           name: index === 0 ? profile?.full_name || "" : "",
//           phone: index === 0 ? profile?.phone || "" : "",
//           email: index === 0 ? profile?.email || "" : "",
//           gender: index === 0 ? profile?.gender || "" : "",
//           age: index === 0 ? profile?.age?.toString() || "" : "",
//           emergency_contact_name: "",
//           emergency_contact_phone: "",
//           notes: "",
//         }));

//       setBookingForm((prev) => ({
//         ...prev,
//         passenger_details: [...prev.passenger_details, ...newDetails],
//       }));
//     } else if (seatCount < currentDetailsCount) {
//       // Remove excess passenger details
//       setBookingForm((prev) => ({
//         ...prev,
//         passenger_details: prev.passenger_details.slice(0, seatCount),
//       }));
//     }
//   }, [bookingForm.selected_seats.length, profile]);

//   const fetchRideAndSeatData = async () => {
//     if (!rideId) return;

//     setLoading(true);
//     try {
//       const rideData = await fetchRideById(rideId);
//       if (!rideData) {
//         toast({
//           title: "Ride Not Found",
//           description: "The requested ride could not be found.",
//           variant: "destructive",
//         });
//         navigate("/passenger/list-rides");
//         return;
//       }
//       setRide(rideData);

//       // Fetch seat availability
//       const { data: seatData, error: seatError } = await supabase.rpc(
//         "get_seat_availability",
//         { ride_uuid: rideId }
//       );

//       if (seatError) {
//         console.error("Seat availability error:", seatError);
//         toast({
//           title: "Error",
//           description: "Failed to load seat availability.",
//           variant: "destructive",
//         });
//         return;
//       }

//       if (!seatData.success) {
//         toast({
//           title: "Error",
//           description: seatData.error || "Failed to load seat availability.",
//           variant: "destructive",
//         });
//         return;
//       }

//       setSeatAvailability({
//         ride_id: seatData.ride_id,
//         total_seats: seatData.total_seats,
//         seats_booked: seatData.seats_booked,
//         available_seats: seatData.available_seats,
//         booked_seat_ids: seatData.booked_seat_ids || [],
//         seat_layout: seatData.seat_layout || rideData.seat_layout,
//         seat_pricing: seatData.seat_pricing || rideData.seat_pricing,
//       });
//     } catch (error) {
//       console.error("Error fetching ride and seat data:", error);
//       toast({
//         title: "Error",
//         description: "Failed to load ride details. Please try again.",
//         variant: "destructive",
//       });
//       navigate("/passenger/list-rides");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const fetchUserBookings = async () => {
//     if (!profile?.id) return;
//     try {
//       const { data, error } = await supabase
//         .from("bookings")
//         .select("ride_id, status")
//         .eq("passenger_id", profile.id)
//         .in("status", ["pending", "confirmed"]);

//       if (error) throw error;
//       setUserBookings(data || []);
//     } catch (error) {
//       console.error("Error fetching bookings:", error);
//     }
//   };

//   // Handle zone selection completion
//   const handleZoneSelectionComplete = (
//     pickupZone: CityZone,
//     dropoffZone: CityZone
//   ) => {
//     setBookingForm((prev) => ({
//       ...prev,
//       pickup_zone: pickupZone,
//       dropoff_zone: dropoffZone,
//     }));
//     setBookingStep("seats");
//   };

//   // Handle seat selection
//   const handleSeatSelect = (seatId: string) => {
//     setBookingForm((prev) => {
//       const currentSelection = prev.selected_seats;
//       const isSelected = currentSelection.includes(seatId);

//       let newSelection;
//       if (isSelected) {
//         newSelection = currentSelection.filter((id) => id !== seatId);
//       } else {
//         if (currentSelection.length < 4) {
//           newSelection = [...currentSelection, seatId];
//         } else {
//           toast({
//             title: "Maximum Seats Selected",
//             description: "You can select up to 4 seats maximum.",
//             variant: "destructive",
//           });
//           return prev;
//         }
//       }

//       return {
//         ...prev,
//         selected_seats: newSelection,
//         seats_booked: newSelection.length,
//       };
//     });
//   };

//   // Update passenger details
//   const updatePassengerDetails = (
//     index: number,
//     field: keyof PassengerDetails,
//     value: string
//   ) => {
//     setBookingForm((prev) => ({
//       ...prev,
//       passenger_details: prev.passenger_details.map((details, i) =>
//         i === index ? { ...details, [field]: value } : details
//       ),
//     }));
//   };

//   // Proceed to details step
//   const proceedToDetails = () => {
//     if (bookingForm.selected_seats.length === 0) {
//       toast({
//         title: "No Seats Selected",
//         description: "Please select at least one seat.",
//         variant: "destructive",
//       });
//       return;
//     }
//     setBookingStep("details");
//   };

//   // Handle ride booking
//   // Handle ride booking
//   const handleBookRide = async () => {
//     if (!ride || !profile || !seatAvailability) {
//       toast({
//         title: "Authentication Required",
//         description: "Please log in to book a ride.",
//         variant: "destructive",
//       });
//       return;
//     }

//     // Validation
//     if (!bookingForm.pickup_zone || !bookingForm.dropoff_zone) {
//       toast({
//         title: "Zones Not Selected",
//         description: "Please select pickup and drop zones.",
//         variant: "destructive",
//       });
//       setBookingStep("zones");
//       return;
//     }

//     if (bookingForm.selected_seats.length === 0) {
//       toast({
//         title: "No Seats Selected",
//         description: "Please select at least one seat.",
//         variant: "destructive",
//       });
//       setBookingStep("seats");
//       return;
//     }

//     // Validate passenger details
//     const invalidPassenger = bookingForm.passenger_details.findIndex(
//       (details) =>
//         !details.name || !details.phone || !details.gender || !details.age
//     );

//     if (invalidPassenger !== -1) {
//       toast({
//         title: "Missing Passenger Information",
//         description: `Please complete details for passenger ${
//           invalidPassenger + 1
//         }.`,
//         variant: "destructive",
//       });
//       return;
//     }

//     setBookingLoading(true);

//     try {
//       // Calculate total price
//       const totalPrice = bookingForm.selected_seats.reduce((sum, seatId) => {
//         return sum + (seatAvailability.seat_pricing[seatId] || 0);
//       }, 0);

//       console.log("=== BOOKING DEBUG START ===");
//       debugBookingData(
//         ride.id,
//         profile.id,
//         bookingForm.selected_seats,
//         bookingForm.pickup_zone,
//         bookingForm.dropoff_zone,
//         bookingForm.passenger_details,
//         getTotalPrice()
//       );
//       console.log("=== BOOKING DEBUG END ===");

//       // Call the database function
//       const { data: bookingResult, error: bookingError } = await supabase.rpc(
//         "book_seats_with_zones",
//         {
//           ride_uuid: ride.id,
//           passenger_uuid: profile.id,
//           seat_ids: bookingForm.selected_seats,
//           pickup_zone_uuid: bookingForm.pickup_zone.id,
//           dropoff_zone_uuid: bookingForm.dropoff_zone.id,
//           passenger_details_json: bookingForm.passenger_details,
//           total_price: totalPrice,
//         }
//       );

//       console.log("RPC Response:", { bookingResult, bookingError });

//       if (bookingError) {
//         console.error("RPC Error Details:", bookingError);
//         throw new Error(`Database error: ${bookingError.message}`);
//       }

//       if (!bookingResult) {
//         throw new Error("No response from booking function");
//       }

//       if (!bookingResult.success) {
//         console.error("Booking function returned error:", bookingResult.error);

//         // Parse the error message to show appropriate toast
//         let errorMessage = "Booking failed";
//         let errorTitle = "Booking Failed";

//         if (bookingResult.error) {
//           const error = Array.isArray(bookingResult.error)
//             ? bookingResult.error[0]
//             : bookingResult.error;

//           if (error.includes("already have a booking")) {
//             errorTitle = "Duplicate Booking";
//             errorMessage =
//               "You already have a booking for this ride. Check your bookings or contact support if this is incorrect.";
//           } else if (error.includes("seats are no longer available")) {
//             errorTitle = "Seats Unavailable";
//             errorMessage =
//               "The selected seats are no longer available. Please select different seats.";
//           } else if (error.includes("ride is full")) {
//             errorTitle = "Ride Full";
//             errorMessage =
//               "This ride is now full. Please search for other available rides.";
//           } else if (error.includes("booking window closed")) {
//             errorTitle = "Booking Closed";
//             errorMessage = "The booking window for this ride has closed.";
//           } else {
//             errorMessage = error;
//           }
//         }

//         toast({
//           title: errorTitle,
//           description: errorMessage,
//           variant: "destructive",
//         });
//         return; // Exit early, don't throw error to avoid generic error handling
//       }

//       // SUCCESS HANDLING - Add error clearing here
//       console.log("Booking successful:", bookingResult.booking_id);

//       // Clear any previous errors (add this line)
//       // If you have error state management, clear it here:
//       // setError(null); // Uncomment if you have error state

//       // Show success toast
//       toast({
//         title: "Booking Successful!",
//         description: `Successfully booked ${bookingForm.selected_seats.length} seat(s)`,
//       });

//       // Navigate to ticket page
//       navigate("/passenger/booking-ticket", {
//         state: {
//           bookingData: {
//             booking_id: bookingResult.booking_id,
//             ride_id: ride.id,
//             selected_seats: bookingForm.selected_seats,
//             total_price: totalPrice,
//             pickup_zone: bookingForm.pickup_zone,
//             dropoff_zone: bookingForm.dropoff_zone,
//             passenger_details: bookingForm.passenger_details,
//             ride_details: ride,
//           },
//         },
//       });

//       // Exit function early on success
//       return;
//     } catch (error) {
//       console.error("Error booking ride:", error);
//       toast({
//         title: "Booking Failed",
//         description: "Failed to book the ride. Please try again.",
//         variant: "destructive",
//       });
//     } finally {
//       setBookingLoading(false);
//     }
//   };

//   const handleBackToResults = () => {
//     navigate(-1);
//   };

//   const renderStars = (rating: number, totalRatings: number) => {
//     if (totalRatings === 0)
//       return <span className="text-xs text-muted-foreground">No ratings</span>;
//     return (
//       <div className="flex items-center gap-1">
//         {[1, 2, 3, 4, 5].map((star) => (
//           <Star
//             key={star}
//             className={`h-3 w-3 ${
//               star <= rating
//                 ? "text-yellow-400 fill-yellow-400"
//                 : "text-gray-300"
//             }`}
//           />
//         ))}
//         <span className="text-xs text-muted-foreground ml-1">
//           {rating.toFixed(1)} ({totalRatings})
//         </span>
//       </div>
//     );
//   };

//   const getTotalPrice = () => {
//     return bookingForm.selected_seats.reduce((sum, seatId) => {
//       return sum + (seatAvailability?.seat_pricing[seatId] || 0);
//     }, 0);
//   };

//   if (loading) {
//     return (
//       <div className="min-h-screen bg-background p-4">
//         <div className="text-center py-8">
//           <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
//           <p>Loading ride details...</p>
//         </div>
//       </div>
//     );
//   }

//   if (!ride) {
//     return (
//       <div className="min-h-screen bg-background p-4">
//         <div className="text-center py-8">
//           <p>Ride not found</p>
//           <Button
//             onClick={() => navigate("/passenger/list-rides")}
//             className="mt-4"
//           >
//             Back to Search
//           </Button>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-background p-4">
//       {/* Header */}
//       <div className="flex justify-between items-center mb-6">
//         <Button
//           variant="outline"
//           onClick={handleBackToResults}
//           className="flex items-center gap-2"
//         >
//           <ArrowLeft className="h-4 w-4" />
//           Back to Results
//         </Button>

//         {/* Progress Indicators */}
//         <div className="flex items-center gap-4">
//           <div
//             className={`flex items-center gap-2 ${
//               bookingStep === "zones" || bookingForm.pickup_zone
//                 ? "text-green-600"
//                 : "text-gray-400"
//             }`}
//           >
//             <div
//               className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
//                 bookingForm.pickup_zone && bookingForm.dropoff_zone
//                   ? "bg-green-500 text-white"
//                   : bookingStep === "zones"
//                   ? "bg-blue-500 text-white"
//                   : "bg-gray-200"
//               }`}
//             >
//               {bookingForm.pickup_zone && bookingForm.dropoff_zone ? "✓" : "1"}
//             </div>
//             <span className="text-sm font-medium">Areas</span>
//           </div>

//           <div
//             className={`flex items-center gap-2 ${
//               bookingStep === "seats" || bookingForm.selected_seats.length > 0
//                 ? "text-green-600"
//                 : "text-gray-400"
//             }`}
//           >
//             <div
//               className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
//                 bookingForm.selected_seats.length > 0
//                   ? "bg-green-500 text-white"
//                   : bookingStep === "seats"
//                   ? "bg-blue-500 text-white"
//                   : "bg-gray-200"
//               }`}
//             >
//               {bookingForm.selected_seats.length > 0 ? "✓" : "2"}
//             </div>
//             <span className="text-sm font-medium">Seats</span>
//           </div>

//           <div
//             className={`flex items-center gap-2 ${
//               bookingStep === "details" ? "text-blue-600" : "text-gray-400"
//             }`}
//           >
//             <div
//               className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
//                 bookingStep === "details"
//                   ? "bg-blue-500 text-white"
//                   : "bg-gray-200"
//               }`}
//             >
//               3
//             </div>
//             <span className="text-sm font-medium">Details</span>
//           </div>
//         </div>
//       </div>

//       <div className="max-w-6xl mx-auto space-y-6">
//         {/* Ride Summary Card */}
//         <Card>
//           <CardContent className="p-6">
//             <div className="flex justify-between items-start mb-4">
//               <div className="flex-1">
//                 <h3 className="text-xl font-semibold mb-2">
//                   {ride.from_city} → {ride.to_city}
//                 </h3>
//                 <div className="grid md:grid-cols-4 gap-4 text-sm">
//                   <div className="flex items-center gap-2">
//                     <Calendar className="h-4 w-4 text-muted-foreground" />
//                     {new Date(ride.departure_date).toLocaleDateString()}
//                   </div>
//                   <div className="flex items-center gap-2">
//                     <Clock className="h-4 w-4 text-muted-foreground" />
//                     {ride.departure_time}
//                   </div>
//                   <div className="flex items-center gap-2">
//                     <MapPin className="h-4 w-4 text-muted-foreground" />
//                     {ride.pickup_point}
//                   </div>
//                   <div className="flex items-center gap-2">
//                     <Users className="h-4 w-4 text-muted-foreground" />
//                     {seatAvailability?.available_seats ||
//                       ride.available_seats}{" "}
//                     seats available
//                   </div>
//                 </div>
//               </div>
//               <div className="text-right">
//                 <div className="text-2xl font-bold text-primary">
//                   {bookingForm.selected_seats.length > 0
//                     ? `₹${getTotalPrice()}`
//                     : `₹${ride.price_per_seat}`}
//                 </div>
//                 <div className="text-sm text-muted-foreground">
//                   {bookingForm.selected_seats.length > 0
//                     ? `${bookingForm.selected_seats.length} seat${
//                         bookingForm.selected_seats.length > 1 ? "s" : ""
//                       } selected`
//                     : "per seat"}
//                 </div>
//               </div>
//             </div>

//             {/* Selection Summary */}
//             {(bookingForm.pickup_zone ||
//               bookingForm.dropoff_zone ||
//               bookingForm.selected_seats.length > 0) && (
//               <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
//                 <h4 className="font-semibold text-blue-900 mb-3">
//                   Your Selections
//                 </h4>
//                 <div className="grid md:grid-cols-3 gap-4 text-sm">
//                   <div>
//                     <span className="text-blue-700 font-medium">Pickup:</span>
//                     <p className="text-blue-800 mt-1">
//                       {bookingForm.pickup_zone
//                         ? bookingForm.pickup_zone.zone_name
//                         : "Not selected"}
//                     </p>
//                   </div>
//                   <div>
//                     <span className="text-blue-700 font-medium">Drop:</span>
//                     <p className="text-blue-800 mt-1">
//                       {bookingForm.dropoff_zone
//                         ? bookingForm.dropoff_zone.zone_name
//                         : "Not selected"}
//                     </p>
//                   </div>
//                   <div>
//                     <span className="text-blue-700 font-medium">Seats:</span>
//                     <div className="flex flex-wrap gap-1 mt-1">
//                       {bookingForm.selected_seats.length > 0 ? (
//                         bookingForm.selected_seats.map((seatId) => (
//                           <Badge
//                             key={seatId}
//                             variant="outline"
//                             className="bg-blue-100 text-blue-800"
//                           >
//                             {seatId}
//                           </Badge>
//                         ))
//                       ) : (
//                         <span className="text-blue-800">None selected</span>
//                       )}
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             )}
//           </CardContent>
//         </Card>

//         {/* Step 1: Zone Selection */}
//         {bookingStep === "zones" && (
//           <Card>
//             <CardHeader>
//               <CardTitle className="flex items-center gap-2">
//                 <MapPin className="h-5 w-5" />
//                 Step 1: Select Pickup & Drop Areas
//               </CardTitle>
//               <p className="text-muted-foreground">
//                 Choose your preferred pickup and drop-off areas from the zones
//                 selected by the driver
//               </p>
//             </CardHeader>
//             <CardContent>
//               <PassengerRoutePreview
//                 rideId={ride.id}
//                 mode="booking"
//                 onZoneSelectionComplete={handleZoneSelectionComplete}
//                 showBookingButton={false}
//                 height="600px"
//               />
//             </CardContent>
//           </Card>
//         )}

//         {/* Step 2: Seat Selection */}
//         {bookingStep === "seats" && seatAvailability && (
//           <Card>
//             <CardHeader>
//               <CardTitle className="flex items-center gap-2">
//                 <Users className="h-5 w-5" />
//                 Step 2: Select Seats
//               </CardTitle>
//               <p className="text-muted-foreground">
//                 Choose your preferred seats from the available options
//               </p>
//             </CardHeader>
//             <CardContent>
//               <PassengerSeatVisualization
//                 layoutConfig={seatAvailability.seat_layout}
//                 seatPricing={seatAvailability.seat_pricing}
//                 bookedSeats={seatAvailability.booked_seat_ids}
//                 selectedSeats={bookingForm.selected_seats}
//                 onSeatSelect={handleSeatSelect}
//                 maxSelectable={4}
//               />

//               <div className="mt-6 flex gap-4">
//                 <Button
//                   variant="outline"
//                   onClick={() => setBookingStep("zones")}
//                 >
//                   Back to Areas
//                 </Button>
//                 <Button
//                   onClick={proceedToDetails}
//                   disabled={bookingForm.selected_seats.length === 0}
//                   className="flex-1"
//                 >
//                   Continue to Details →
//                 </Button>
//               </div>
//             </CardContent>
//           </Card>
//         )}

//         {/* Step 3: Passenger Details */}
//         {bookingStep === "details" && (
//           <Card>
//             <CardHeader>
//               <CardTitle className="flex items-center gap-2">
//                 <Users className="h-5 w-5" />
//                 Step 3: Passenger Details
//               </CardTitle>
//               <p className="text-muted-foreground">
//                 Fill in details for each selected seat
//               </p>
//             </CardHeader>
//             <CardContent>
//               <div className="space-y-6">
//                 {bookingForm.passenger_details.map((passenger, index) => (
//                   <div key={index} className="border rounded-lg p-4">
//                     <h4 className="font-semibold mb-4 flex items-center gap-2">
//                       <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm">
//                         {index + 1}
//                       </div>
//                       Passenger {index + 1} - Seat{" "}
//                       {bookingForm.selected_seats[index]}
//                     </h4>

//                     <div className="grid md:grid-cols-2 gap-4">
//                       <div>
//                         <Label>Full Name *</Label>
//                         <Input
//                           value={passenger.name}
//                           onChange={(e) =>
//                             updatePassengerDetails(
//                               index,
//                               "name",
//                               e.target.value
//                             )
//                           }
//                           placeholder="Enter full name"
//                         />
//                       </div>
//                       <div>
//                         <Label>Phone Number *</Label>
//                         <Input
//                           value={passenger.phone}
//                           onChange={(e) =>
//                             updatePassengerDetails(
//                               index,
//                               "phone",
//                               e.target.value
//                             )
//                           }
//                           placeholder="Enter phone number"
//                         />
//                       </div>
//                       <div>
//                         <Label>Email</Label>
//                         <Input
//                           value={passenger.email}
//                           onChange={(e) =>
//                             updatePassengerDetails(
//                               index,
//                               "email",
//                               e.target.value
//                             )
//                           }
//                           placeholder="Enter email address"
//                           type="email"
//                         />
//                       </div>
//                       <div>
//                         <Label>Gender *</Label>
//                         <Select
//                           value={passenger.gender}
//                           onValueChange={(value) =>
//                             updatePassengerDetails(index, "gender", value)
//                           }
//                         >
//                           <SelectTrigger>
//                             <SelectValue placeholder="Select gender" />
//                           </SelectTrigger>
//                           <SelectContent>
//                             <SelectItem value="female">Female</SelectItem>
//                             <SelectItem value="male">Male</SelectItem>
//                             <SelectItem value="other">Other</SelectItem>
//                             <SelectItem value="prefer_not_to_say">
//                               Prefer not to say
//                             </SelectItem>
//                           </SelectContent>
//                         </Select>
//                       </div>
//                       <div>
//                         <Label>Age *</Label>
//                         <Input
//                           type="number"
//                           min="18"
//                           max="100"
//                           value={passenger.age}
//                           onChange={(e) =>
//                             updatePassengerDetails(index, "age", e.target.value)
//                           }
//                           placeholder="Enter age"
//                         />
//                       </div>
//                       <div>
//                         <Label>Emergency Contact Name</Label>
//                         <Input
//                           value={passenger.emergency_contact_name}
//                           onChange={(e) =>
//                             updatePassengerDetails(
//                               index,
//                               "emergency_contact_name",
//                               e.target.value
//                             )
//                           }
//                           placeholder="Enter contact name"
//                         />
//                       </div>
//                       <div>
//                         <Label>Emergency Contact Phone</Label>
//                         <Input
//                           value={passenger.emergency_contact_phone}
//                           onChange={(e) =>
//                             updatePassengerDetails(
//                               index,
//                               "emergency_contact_phone",
//                               e.target.value
//                             )
//                           }
//                           placeholder="Enter contact phone"
//                         />
//                       </div>
//                       <div className="md:col-span-2">
//                         <Label>Special Notes</Label>
//                         <Textarea
//                           value={passenger.notes}
//                           onChange={(e) =>
//                             updatePassengerDetails(
//                               index,
//                               "notes",
//                               e.target.value
//                             )
//                           }
//                           placeholder="Any special requests or notes..."
//                         />
//                       </div>
//                     </div>
//                   </div>
//                 ))}

//                 {/* Booking Summary */}
//                 <div className="bg-primary/10 rounded-lg p-4">
//                   <h4 className="font-semibold mb-3">Booking Summary</h4>
//                   <div className="space-y-2">
//                     <div className="flex justify-between">
//                       <span>Pickup Zone:</span>
//                       <span className="font-medium">
//                         {bookingForm.pickup_zone?.zone_name}
//                       </span>
//                     </div>
//                     <div className="flex justify-between">
//                       <span>Drop Zone:</span>
//                       <span className="font-medium">
//                         {bookingForm.dropoff_zone?.zone_name}
//                       </span>
//                     </div>
//                     <div className="flex justify-between">
//                       <span>Selected Seats:</span>
//                       <span className="font-medium">
//                         {bookingForm.selected_seats.join(", ")}
//                       </span>
//                     </div>
//                     {bookingForm.selected_seats.map((seatId) => (
//                       <div
//                         key={seatId}
//                         className="flex justify-between text-sm"
//                       >
//                         <span>Seat {seatId}:</span>
//                         <span>
//                           ₹{seatAvailability?.seat_pricing[seatId] || 0}
//                         </span>
//                       </div>
//                     ))}
//                     <div className="border-t pt-2 flex justify-between font-bold">
//                       <span>Total Amount:</span>
//                       <span className="text-primary">₹{getTotalPrice()}</span>
//                     </div>
//                   </div>
//                 </div>

//                 {/* Action Buttons */}
//                 <div className="flex gap-4">
//                   <Button
//                     variant="outline"
//                     onClick={() => setBookingStep("seats")}
//                   >
//                     Back to Seats
//                   </Button>
//                   <Button
//                     onClick={handleBookRide}
//                     disabled={
//                       bookingLoading ||
//                       bookingForm.passenger_details.some(
//                         (p) => !p.name || !p.phone || !p.gender || !p.age
//                       )
//                     }
//                     className="flex-1"
//                   >
//                     {bookingLoading ? (
//                       <>
//                         <Loader2 className="h-4 w-4 mr-2 animate-spin" />
//                         Booking...
//                       </>
//                     ) : (
//                       <>
//                         <CheckCircle className="h-4 w-4 mr-2" />
//                         Complete Booking (₹{getTotalPrice()})
//                       </>
//                     )}
//                   </Button>
//                 </div>
//               </div>
//             </CardContent>
//           </Card>
//         )}

//         {/* Driver Info Card */}
//         <Card>
//           <CardHeader>
//             <CardTitle className="flex items-center gap-2">
//               <Car className="h-5 w-5" />
//               Driver Information
//             </CardTitle>
//           </CardHeader>
//           <CardContent>
//             <div className="flex items-center justify-between">
//               <div className="flex items-center gap-3">
//                 <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
//                   <span className="font-semibold text-primary">
//                     {ride.driver?.full_name?.charAt(0) || "D"}
//                   </span>
//                 </div>
//                 <div>
//                   <p className="font-medium">
//                     {ride.driver?.full_name || "Driver"}
//                   </p>
//                   {renderStars(
//                     ride.driver?.average_rating || 0,
//                     ride.driver?.total_ratings || 0
//                   )}
//                   <div className="text-sm text-muted-foreground mt-1">
//                     {ride.vehicle?.car_model} {ride.vehicle?.car_type} •{" "}
//                     {ride.vehicle?.color}
//                   </div>
//                 </div>
//               </div>
//               <Button
//                 variant="outline"
//                 onClick={() => {
//                   if (ride.driver?.phone) {
//                     window.open(`tel:${ride.driver.phone}`);
//                   } else {
//                     toast({
//                       title: "Contact Unavailable",
//                       description:
//                         "Driver contact information is not available.",
//                       variant: "destructive",
//                     });
//                   }
//                 }}
//               >
//                 <Phone className="h-4 w-4 mr-2" />
//                 Call Driver
//               </Button>
//             </div>

//             {ride.notes && (
//               <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
//                 <h4 className="font-medium text-blue-900 mb-1">
//                   Driver's Note:
//                 </h4>
//                 <p className="text-sm text-blue-800">{ride.notes}</p>
//               </div>
//             )}
//           </CardContent>
//         </Card>
//       </div>
//     </div>
//   );
// };

// export default RideBooking;

import React, { useState, useEffect, useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  MapPin,
  Calendar,
  Clock,
  Users,
  Star,
  Phone,
  Shield,
  ArrowLeft,
  Car,
  CheckCircle,
  AlertCircle,
  Loader2,
  Plus,
  Minus,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PassengerRoutePreview } from "@/components/maps/passenger/Booking/PassengerRoutePreview";
import { useNavigate, useParams } from "react-router-dom";
import { fetchRideById, RideWithDetails } from "@/utils/fetchRides";
import type { CityZone } from "@/types/mapTypes";
import { debugBookingData } from "@/utils/bookingDebug";
// Import seat layout types
import type {
  LayoutConfig,
  Seat,
  SeatRow,
  SeatPricing,
} from "@/utils/seatLayoutUtils";

interface PassengerDetails {
  name: string;
  phone: string;
  email: string;
  gender: string;
  age: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  notes: string;
}

interface BookingForm {
  seats_booked: number;
  selected_seats: string[];
  passenger_details: PassengerDetails[];
  pickup_zone: CityZone | null;
  dropoff_zone: CityZone | null;
}

interface SeatAvailability {
  ride_id: string;
  total_seats: number;
  seats_booked: number;
  available_seats: number;
  booked_seat_ids: string[];
  seat_layout: LayoutConfig;
  seat_pricing: SeatPricing;
}

// Updated Passenger Seat Visualization Component (removed restrictions)
const PassengerSeatVisualization: React.FC<{
  layoutConfig: LayoutConfig;
  seatPricing: SeatPricing;
  bookedSeats: string[];
  selectedSeats: string[];
  onSeatSelect: (seatId: string) => void;
  availableSeats?: number;
}> = ({
  layoutConfig,
  seatPricing,
  bookedSeats,
  selectedSeats,
  onSeatSelect,
  availableSeats = 999,
}) => {
  if (!layoutConfig?.rows) {
    return (
      <div className="text-center p-8 text-gray-500">
        No seat layout available
      </div>
    );
  }

  // Process layout to ensure correct front seat ordering
  const processedRows = () => {
    const processed: SeatRow[] = [];
    let frontSeats: Seat[] = [];

    layoutConfig.rows.forEach((row) => {
      if (row.type === "front") {
        frontSeats.push(...row.seats);
      } else {
        processed.push(row);
      }
    });

    if (frontSeats.length > 0) {
      const sortedFrontSeats = frontSeats.sort((a, b) => {
        if (a.type === "front" && b.type === "driver") return -1;
        if (a.type === "driver" && b.type === "front") return 1;
        if (a.id === "F1" && b.id === "D") return -1;
        if (a.id === "D" && b.id === "F1") return 1;
        return 0;
      });

      processed.unshift({
        type: "front",
        seats: sortedFrontSeats,
        rowIndex: 0,
      });
    }

    return processed.map((row, index) => ({ ...row, rowIndex: index }));
  };

  const renderSeat = (seat: Seat) => {
    const isBooked = bookedSeats.includes(seat.id);
    const isSelected = selectedSeats.includes(seat.id);
    const isDriver = seat.type === "driver";
    const isBookable = seat.bookable && !isBooked && !isDriver;
    const seatPrice = seatPricing[seat.id] || 0;

    const handleSeatClick = () => {
      if (isBookable) {
        onSeatSelect(seat.id);
      }
    };

    const getSeatStyle = () => {
      if (isDriver) {
        return "bg-gray-600 text-white border-gray-700 cursor-not-allowed";
      }
      if (isBooked) {
        return "bg-red-500 text-white border-red-600 cursor-not-allowed";
      }
      if (isSelected) {
        return "bg-blue-500 text-white border-blue-600 ring-2 ring-blue-300 scale-105";
      }
      if (isBookable) {
        return "bg-green-100 text-green-800 border-green-300 hover:bg-green-200 hover:scale-105 cursor-pointer";
      }
      return "bg-gray-300 text-gray-600 border-gray-400 cursor-not-allowed";
    };

    return (
      <div key={seat.id} className="flex flex-col items-center space-y-2">
        <div
          className={`
            w-16 h-16 rounded-lg border-2 flex flex-col items-center justify-center 
            font-bold text-xs transition-all duration-200
            ${getSeatStyle()}
            ${isBookable ? "shadow-md" : ""}
          `}
          onClick={handleSeatClick}
          title={`
            ${seat.label} Seat (${seat.id})
            ${
              isDriver
                ? " - Driver Seat"
                : isBooked
                ? " - Already Booked"
                : isSelected
                ? ` - Selected (₹${seatPrice})`
                : isBookable
                ? ` - Available (₹${seatPrice})`
                : " - Not Available"
            }
          `}
        >
          <div className="text-xs font-bold">{seat.id}</div>
          {isDriver && <Car className="h-3 w-3 mt-0.5" />}
          {isBookable && <div className="text-[8px] mt-0.5">₹{seatPrice}</div>}
        </div>

        <div className="text-center">
          <div
            className={`
            text-xs font-medium px-2 py-1 rounded text-center min-w-[60px]
            ${
              isDriver
                ? "bg-gray-200 text-gray-700"
                : isBooked
                ? "bg-red-100 text-red-700"
                : isSelected
                ? "bg-blue-100 text-blue-700"
                : isBookable
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-600"
            }
          `}
          >
            {isDriver
              ? "Driver"
              : isBooked
              ? "Booked"
              : isSelected
              ? "Selected"
              : isBookable
              ? `₹${seatPrice}`
              : "N/A"}
          </div>
        </div>
      </div>
    );
  };

  const renderSeatRow = (row: SeatRow, rowIndex: number) => {
    if (!row.seats || row.seats.length === 0) return null;

    const getRowLayout = () => {
      if (row.type === "front") {
        return "flex justify-center items-center gap-8 max-w-md mx-auto";
      }

      const seatCount = row.seats.length;
      if (seatCount === 2) {
        return "flex justify-center gap-12 max-w-sm mx-auto";
      } else if (seatCount === 3) {
        return "flex justify-center gap-6 max-w-md mx-auto";
      } else if (seatCount === 4) {
        return "flex justify-center gap-4 max-w-lg mx-auto";
      }

      return "flex justify-center gap-6";
    };

    return (
      <div key={`${row.type}-${rowIndex}`} className="w-full">
        <div className={getRowLayout()}>
          {row.seats.map((seat) => renderSeat(seat))}
        </div>
      </div>
    );
  };

  const processedLayoutRows = processedRows();

  return (
    <div className="bg-gradient-to-b from-blue-50 to-blue-100 p-8 rounded-xl border-2 border-blue-200">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-blue-800 text-white px-6 py-3 rounded-t-xl text-sm font-medium shadow-lg">
          <Car className="h-4 w-4" />
          Select Your Seats
        </div>
        <div className="text-xs text-blue-700 mt-2 font-medium">
          {layoutConfig.vehicleType} • {layoutConfig.totalSeats} Total Seats •
          Select as many seats as needed ({availableSeats} available)
        </div>
      </div>

      <div className="space-y-8 w-full">
        {processedLayoutRows.map((row, rowIndex) =>
          renderSeatRow(row, rowIndex)
        )}
      </div>

      {selectedSeats.length > 0 && (
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-center">
            <div className="text-sm font-semibold text-blue-900 mb-2">
              Selected Seats ({selectedSeats.length})
            </div>
            <div className="flex justify-center gap-2 mb-3 flex-wrap">
              {selectedSeats.map((seatId) => (
                <Badge key={seatId} variant="default" className="bg-blue-600">
                  {seatId}: ₹{seatPricing[seatId] || 0}
                </Badge>
              ))}
            </div>
            <div className="text-lg font-bold text-blue-900">
              Total: ₹
              {selectedSeats.reduce(
                (sum, seatId) => sum + (seatPricing[seatId] || 0),
                0
              )}
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-8 space-y-4">
        <div className="text-center text-sm font-semibold text-blue-800">
          Seat Status Legend
        </div>
        <div className="flex flex-wrap justify-center gap-6 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-green-100 border-2 border-green-300 rounded"></div>
            <span className="font-medium">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-blue-500 border-2 border-blue-600 rounded"></div>
            <span className="font-medium">Selected</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-red-500 border-2 border-red-600 rounded"></div>
            <span className="font-medium">Booked</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-gray-600 rounded flex items-center justify-center">
              <Car className="h-3 w-3 text-white" />
            </div>
            <span className="font-medium">Driver</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const RideBooking: React.FC = () => {
  const { rideId } = useParams<{ rideId: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [ride, setRide] = useState<RideWithDetails | null>(null);
  const [seatAvailability, setSeatAvailability] =
    useState<SeatAvailability | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);

  const [bookingStep, setBookingStep] = useState<"zones" | "seats" | "details">(
    "zones"
  );
  const [bookingForm, setBookingForm] = useState<BookingForm>({
    seats_booked: 0,
    selected_seats: [],
    passenger_details: [],
    pickup_zone: null,
    dropoff_zone: null,
  });

  // Fetch ride details and seat availability
  useEffect(() => {
    if (rideId) {
      fetchRideAndSeatData();
    } else {
      toast({
        title: "Invalid Ride",
        description: "No ride specified. Redirecting to search.",
        variant: "destructive",
      });
      navigate("/passenger/list-rides");
    }
  }, [rideId]);

  // Initialize passenger details when seats are selected
  useEffect(() => {
    const seatCount = bookingForm.selected_seats.length;
    const currentDetailsCount = bookingForm.passenger_details.length;

    if (seatCount > currentDetailsCount) {
      // Add new passenger details forms
      const newDetails = Array(seatCount - currentDetailsCount)
        .fill(null)
        .map((_, index) => ({
          name: index === 0 ? profile?.full_name || "" : "",
          phone: index === 0 ? profile?.phone || "" : "",
          email: index === 0 ? profile?.email || "" : "",
          gender: index === 0 ? profile?.gender || "" : "",
          age: index === 0 ? profile?.age?.toString() || "" : "",
          emergency_contact_name: "",
          emergency_contact_phone: "",
          notes: "",
        }));

      setBookingForm((prev) => ({
        ...prev,
        passenger_details: [...prev.passenger_details, ...newDetails],
      }));
    } else if (seatCount < currentDetailsCount) {
      // Remove excess passenger details
      setBookingForm((prev) => ({
        ...prev,
        passenger_details: prev.passenger_details.slice(0, seatCount),
      }));
    }
  }, [bookingForm.selected_seats.length, profile]);

  const fetchRideAndSeatData = async () => {
    if (!rideId) return;

    setLoading(true);
    try {
      const rideData = await fetchRideById(rideId);
      if (!rideData) {
        toast({
          title: "Ride Not Found",
          description: "The requested ride could not be found.",
          variant: "destructive",
        });
        navigate("/passenger/list-rides");
        return;
      }
      setRide(rideData);

      // Fetch seat availability
      const { data: seatData, error: seatError } = await supabase.rpc(
        "get_seat_availability",
        { ride_uuid: rideId }
      );

      if (seatError) {
        console.error("Seat availability error:", seatError);
        toast({
          title: "Error",
          description: "Failed to load seat availability.",
          variant: "destructive",
        });
        return;
      }

      if (!seatData.success) {
        toast({
          title: "Error",
          description: seatData.error || "Failed to load seat availability.",
          variant: "destructive",
        });
        return;
      }

      setSeatAvailability({
        ride_id: seatData.ride_id,
        total_seats: seatData.total_seats,
        seats_booked: seatData.seats_booked,
        available_seats: seatData.available_seats,
        booked_seat_ids: seatData.booked_seat_ids || [],
        seat_layout: seatData.seat_layout || rideData.seat_layout,
        seat_pricing: seatData.seat_pricing || rideData.seat_pricing,
      });
    } catch (error) {
      console.error("Error fetching ride and seat data:", error);
      toast({
        title: "Error",
        description: "Failed to load ride details. Please try again.",
        variant: "destructive",
      });
      navigate("/passenger/list-rides");
    } finally {
      setLoading(false);
    }
  };

  // Handle zone selection completion
  const handleZoneSelectionComplete = (
    pickupZone: CityZone,
    dropoffZone: CityZone
  ) => {
    setBookingForm((prev) => ({
      ...prev,
      pickup_zone: pickupZone,
      dropoff_zone: dropoffZone,
    }));
    setBookingStep("seats");
  };

  // Updated seat selection (removed 4-seat limit)
  const handleSeatSelect = (seatId: string) => {
    setBookingForm((prev) => {
      const currentSelection = prev.selected_seats;
      const isSelected = currentSelection.includes(seatId);

      let newSelection;
      if (isSelected) {
        newSelection = currentSelection.filter((id) => id !== seatId);
      } else {
        // No seat limit - can select as many as available
        newSelection = [...currentSelection, seatId];
      }

      return {
        ...prev,
        selected_seats: newSelection,
        seats_booked: newSelection.length,
      };
    });
  };

  // Update passenger details
  const updatePassengerDetails = (
    index: number,
    field: keyof PassengerDetails,
    value: string
  ) => {
    setBookingForm((prev) => ({
      ...prev,
      passenger_details: prev.passenger_details.map((details, i) =>
        i === index ? { ...details, [field]: value } : details
      ),
    }));
  };

  // Proceed to details step
  const proceedToDetails = () => {
    if (bookingForm.selected_seats.length === 0) {
      toast({
        title: "No Seats Selected",
        description: "Please select at least one seat.",
        variant: "destructive",
      });
      return;
    }
    setBookingStep("details");
  };

  // Updated booking handler (removed duplicate booking check)
  const handleBookRide = async () => {
    if (!ride || !profile || !seatAvailability) {
      toast({
        title: "Authentication Required",
        description: "Please log in to book a ride.",
        variant: "destructive",
      });
      return;
    }

    // Validation
    if (!bookingForm.pickup_zone || !bookingForm.dropoff_zone) {
      toast({
        title: "Zones Not Selected",
        description: "Please select pickup and drop zones.",
        variant: "destructive",
      });
      setBookingStep("zones");
      return;
    }

    if (bookingForm.selected_seats.length === 0) {
      toast({
        title: "No Seats Selected",
        description: "Please select at least one seat.",
        variant: "destructive",
      });
      setBookingStep("seats");
      return;
    }

    // Validate passenger details
    const invalidPassenger = bookingForm.passenger_details.findIndex(
      (details) =>
        !details.name || !details.phone || !details.gender || !details.age
    );

    if (invalidPassenger !== -1) {
      toast({
        title: "Missing Passenger Information",
        description: `Please complete details for passenger ${
          invalidPassenger + 1
        }.`,
        variant: "destructive",
      });
      return;
    }

    setBookingLoading(true);

    try {
      // Calculate total price
      const totalPrice = bookingForm.selected_seats.reduce((sum, seatId) => {
        return sum + (seatAvailability.seat_pricing[seatId] || 0);
      }, 0);

      console.log("=== BOOKING DEBUG START ===");
      debugBookingData(
        ride.id,
        profile.id,
        bookingForm.selected_seats,
        bookingForm.pickup_zone,
        bookingForm.dropoff_zone,
        bookingForm.passenger_details,
        getTotalPrice()
      );
      console.log("=== BOOKING DEBUG END ===");

      // Call the database function
      const { data: bookingResult, error: bookingError } = await supabase.rpc(
        "book_seats_with_zones",
        {
          ride_uuid: ride.id,
          passenger_uuid: profile.id,
          seat_ids: bookingForm.selected_seats,
          pickup_zone_uuid: bookingForm.pickup_zone.id,
          dropoff_zone_uuid: bookingForm.dropoff_zone.id,
          passenger_details_json: bookingForm.passenger_details,
          total_price: totalPrice,
        }
      );

      console.log("RPC Response:", { bookingResult, bookingError });

      if (bookingError) {
        console.error("RPC Error Details:", bookingError);
        throw new Error(`Database error: ${bookingError.message}`);
      }

      if (!bookingResult) {
        throw new Error("No response from booking function");
      }

      if (!bookingResult.success) {
        console.error("Booking function returned error:", bookingResult.error);

        // Parse the error message to show appropriate toast
        let errorMessage = "Booking failed";
        let errorTitle = "Booking Failed";

        if (bookingResult.error) {
          const error = Array.isArray(bookingResult.error)
            ? bookingResult.error[0]
            : bookingResult.error;

          if (error.includes("seats are no longer available")) {
            errorTitle = "Seats Unavailable";
            errorMessage =
              "The selected seats are no longer available. Please select different seats.";
          } else if (error.includes("ride is full")) {
            errorTitle = "Ride Full";
            errorMessage =
              "This ride is now full. Please search for other available rides.";
          } else if (error.includes("booking window closed")) {
            errorTitle = "Booking Closed";
            errorMessage = "The booking window for this ride has closed.";
          } else {
            errorMessage = error;
          }
        }

        toast({
          title: errorTitle,
          description: errorMessage,
          variant: "destructive",
        });
        return; // Exit early, don't throw error to avoid generic error handling
      }

      // SUCCESS HANDLING
      console.log("Booking successful:", bookingResult.booking_id);

      // Show success toast
      toast({
        title: "Booking Successful!",
        description: `Successfully booked ${bookingForm.selected_seats.length} seat(s)`,
      });

      // Navigate to ticket page
      navigate("/passenger/booking-ticket", {
        state: {
          bookingData: {
            booking_id: bookingResult.booking_id,
            ride_id: ride.id,
            selected_seats: bookingForm.selected_seats,
            total_price: totalPrice,
            pickup_zone: bookingForm.pickup_zone,
            dropoff_zone: bookingForm.dropoff_zone,
            passenger_details: bookingForm.passenger_details,
            ride_details: ride,
          },
        },
      });

      // Exit function early on success
      return;
    } catch (error) {
      console.error("Error booking ride:", error);
      toast({
        title: "Booking Failed",
        description: "Failed to book the ride. Please try again.",
        variant: "destructive",
      });
    } finally {
      setBookingLoading(false);
    }
  };

  const handleBackToResults = () => {
    navigate(-1);
  };

  const renderStars = (rating: number, totalRatings: number) => {
    if (totalRatings === 0)
      return <span className="text-xs text-muted-foreground">No ratings</span>;
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-3 w-3 ${
              star <= rating
                ? "text-yellow-400 fill-yellow-400"
                : "text-gray-300"
            }`}
          />
        ))}
        <span className="text-xs text-muted-foreground ml-1">
          {rating.toFixed(1)} ({totalRatings})
        </span>
      </div>
    );
  };

  const getTotalPrice = () => {
    return bookingForm.selected_seats.reduce((sum, seatId) => {
      return sum + (seatAvailability?.seat_pricing[seatId] || 0);
    }, 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="text-center py-8">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Loading ride details...</p>
        </div>
      </div>
    );
  }

  if (!ride) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="text-center py-8">
          <p>Ride not found</p>
          <Button
            onClick={() => navigate("/passenger/list-rides")}
            className="mt-4"
          >
            Back to Search
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <Button
          variant="outline"
          onClick={handleBackToResults}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Results
        </Button>

        {/* Progress Indicators */}
        <div className="flex items-center gap-4">
          <div
            className={`flex items-center gap-2 ${
              bookingStep === "zones" || bookingForm.pickup_zone
                ? "text-green-600"
                : "text-gray-400"
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                bookingForm.pickup_zone && bookingForm.dropoff_zone
                  ? "bg-green-500 text-white"
                  : bookingStep === "zones"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200"
              }`}
            >
              {bookingForm.pickup_zone && bookingForm.dropoff_zone ? "✓" : "1"}
            </div>
            <span className="text-sm font-medium">Areas</span>
          </div>

          <div
            className={`flex items-center gap-2 ${
              bookingStep === "seats" || bookingForm.selected_seats.length > 0
                ? "text-green-600"
                : "text-gray-400"
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                bookingForm.selected_seats.length > 0
                  ? "bg-green-500 text-white"
                  : bookingStep === "seats"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200"
              }`}
            >
              {bookingForm.selected_seats.length > 0 ? "✓" : "2"}
            </div>
            <span className="text-sm font-medium">Seats</span>
          </div>

          <div
            className={`flex items-center gap-2 ${
              bookingStep === "details" ? "text-blue-600" : "text-gray-400"
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                bookingStep === "details"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200"
              }`}
            >
              3
            </div>
            <span className="text-sm font-medium">Details</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto space-y-6">
        {/* Ride Summary Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-2">
                  {ride.from_city} → {ride.to_city}
                </h3>
                <div className="grid md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    {new Date(ride.departure_date).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    {ride.departure_time}
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    {ride.pickup_point}
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    {seatAvailability?.available_seats ||
                      ride.available_seats}{" "}
                    seats available
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary">
                  {bookingForm.selected_seats.length > 0
                    ? `₹${getTotalPrice()}`
                    : `₹${ride.price_per_seat}`}
                </div>
                <div className="text-sm text-muted-foreground">
                  {bookingForm.selected_seats.length > 0
                    ? `${bookingForm.selected_seats.length} seat${
                        bookingForm.selected_seats.length > 1 ? "s" : ""
                      } selected`
                    : "per seat"}
                </div>
              </div>
            </div>

            {/* Selection Summary */}
            {(bookingForm.pickup_zone ||
              bookingForm.dropoff_zone ||
              bookingForm.selected_seats.length > 0) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-3">
                  Your Selections
                </h4>
                <div className="grid md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-blue-700 font-medium">Pickup:</span>
                    <p className="text-blue-800 mt-1">
                      {bookingForm.pickup_zone
                        ? bookingForm.pickup_zone.zone_name
                        : "Not selected"}
                    </p>
                  </div>
                  <div>
                    <span className="text-blue-700 font-medium">Drop:</span>
                    <p className="text-blue-800 mt-1">
                      {bookingForm.dropoff_zone
                        ? bookingForm.dropoff_zone.zone_name
                        : "Not selected"}
                    </p>
                  </div>
                  <div>
                    <span className="text-blue-700 font-medium">Seats:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {bookingForm.selected_seats.length > 0 ? (
                        bookingForm.selected_seats.map((seatId) => (
                          <Badge
                            key={seatId}
                            variant="outline"
                            className="bg-blue-100 text-blue-800"
                          >
                            {seatId}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-blue-800">None selected</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 1: Zone Selection */}
        {bookingStep === "zones" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Step 1: Select Pickup & Drop Areas
              </CardTitle>
              <p className="text-muted-foreground">
                Choose your preferred pickup and drop-off areas from the zones
                selected by the driver
              </p>
            </CardHeader>
            <CardContent>
              <PassengerRoutePreview
                rideId={ride.id}
                mode="booking"
                onZoneSelectionComplete={handleZoneSelectionComplete}
                showBookingButton={false}
                height="600px"
              />
            </CardContent>
          </Card>
        )}

        {/* Step 2: Seat Selection */}
        {bookingStep === "seats" && seatAvailability && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Step 2: Select Seats
              </CardTitle>
              <p className="text-muted-foreground">
                Choose your preferred seats from the available options
              </p>
            </CardHeader>
            <CardContent>
              <PassengerSeatVisualization
                layoutConfig={seatAvailability.seat_layout}
                seatPricing={seatAvailability.seat_pricing}
                bookedSeats={seatAvailability.booked_seat_ids}
                selectedSeats={bookingForm.selected_seats}
                onSeatSelect={handleSeatSelect}
                availableSeats={seatAvailability.available_seats}
              />

              <div className="mt-6 flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => setBookingStep("zones")}
                >
                  Back to Areas
                </Button>
                <Button
                  onClick={proceedToDetails}
                  disabled={bookingForm.selected_seats.length === 0}
                  className="flex-1"
                >
                  Continue to Details →
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Passenger Details */}
        {bookingStep === "details" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Step 3: Passenger Details
              </CardTitle>
              <p className="text-muted-foreground">
                Fill in details for each selected seat
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {bookingForm.passenger_details.map((passenger, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-4 flex items-center gap-2">
                      <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm">
                        {index + 1}
                      </div>
                      Passenger {index + 1} - Seat{" "}
                      {bookingForm.selected_seats[index]}
                    </h4>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label>Full Name *</Label>
                        <Input
                          value={passenger.name}
                          onChange={(e) =>
                            updatePassengerDetails(
                              index,
                              "name",
                              e.target.value
                            )
                          }
                          placeholder="Enter full name"
                        />
                      </div>
                      <div>
                        <Label>Phone Number *</Label>
                        <Input
                          value={passenger.phone}
                          onChange={(e) =>
                            updatePassengerDetails(
                              index,
                              "phone",
                              e.target.value
                            )
                          }
                          placeholder="Enter phone number"
                        />
                      </div>
                      <div>
                        <Label>Email</Label>
                        <Input
                          value={passenger.email}
                          onChange={(e) =>
                            updatePassengerDetails(
                              index,
                              "email",
                              e.target.value
                            )
                          }
                          placeholder="Enter email address"
                          type="email"
                        />
                      </div>
                      <div>
                        <Label>Gender *</Label>
                        <Select
                          value={passenger.gender}
                          onValueChange={(value) =>
                            updatePassengerDetails(index, "gender", value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="female">Female</SelectItem>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                            <SelectItem value="prefer_not_to_say">
                              Prefer not to say
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Age *</Label>
                        <Input
                          type="number"
                          min="18"
                          max="100"
                          value={passenger.age}
                          onChange={(e) =>
                            updatePassengerDetails(index, "age", e.target.value)
                          }
                          placeholder="Enter age"
                        />
                      </div>
                      <div>
                        <Label>Emergency Contact Name</Label>
                        <Input
                          value={passenger.emergency_contact_name}
                          onChange={(e) =>
                            updatePassengerDetails(
                              index,
                              "emergency_contact_name",
                              e.target.value
                            )
                          }
                          placeholder="Enter contact name"
                        />
                      </div>
                      <div>
                        <Label>Emergency Contact Phone</Label>
                        <Input
                          value={passenger.emergency_contact_phone}
                          onChange={(e) =>
                            updatePassengerDetails(
                              index,
                              "emergency_contact_phone",
                              e.target.value
                            )
                          }
                          placeholder="Enter contact phone"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label>Special Notes</Label>
                        <Textarea
                          value={passenger.notes}
                          onChange={(e) =>
                            updatePassengerDetails(
                              index,
                              "notes",
                              e.target.value
                            )
                          }
                          placeholder="Any special requests or notes..."
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {/* Booking Summary */}
                <div className="bg-primary/10 rounded-lg p-4">
                  <h4 className="font-semibold mb-3">Booking Summary</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Pickup Zone:</span>
                      <span className="font-medium">
                        {bookingForm.pickup_zone?.zone_name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Drop Zone:</span>
                      <span className="font-medium">
                        {bookingForm.dropoff_zone?.zone_name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Selected Seats:</span>
                      <span className="font-medium">
                        {bookingForm.selected_seats.join(", ")}
                      </span>
                    </div>
                    {bookingForm.selected_seats.map((seatId) => (
                      <div
                        key={seatId}
                        className="flex justify-between text-sm"
                      >
                        <span>Seat {seatId}:</span>
                        <span>
                          ₹{seatAvailability?.seat_pricing[seatId] || 0}
                        </span>
                      </div>
                    ))}
                    <div className="border-t pt-2 flex justify-between font-bold">
                      <span>Total Amount:</span>
                      <span className="text-primary">₹{getTotalPrice()}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4">
                  <Button
                    variant="outline"
                    onClick={() => setBookingStep("seats")}
                  >
                    Back to Seats
                  </Button>
                  <Button
                    onClick={handleBookRide}
                    disabled={
                      bookingLoading ||
                      bookingForm.passenger_details.some(
                        (p) => !p.name || !p.phone || !p.gender || !p.age
                      )
                    }
                    className="flex-1"
                  >
                    {bookingLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Booking...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Complete Booking (₹{getTotalPrice()})
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Driver Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              Driver Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="font-semibold text-primary">
                    {ride.driver?.full_name?.charAt(0) || "D"}
                  </span>
                </div>
                <div>
                  <p className="font-medium">
                    {ride.driver?.full_name || "Driver"}
                  </p>
                  {renderStars(
                    ride.driver?.average_rating || 0,
                    ride.driver?.total_ratings || 0
                  )}
                  <div className="text-sm text-muted-foreground mt-1">
                    {ride.vehicle?.car_model} {ride.vehicle?.car_type} •{" "}
                    {ride.vehicle?.color}
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  if (ride.driver?.phone) {
                    window.open(`tel:${ride.driver.phone}`);
                  } else {
                    toast({
                      title: "Contact Unavailable",
                      description:
                        "Driver contact information is not available.",
                      variant: "destructive",
                    });
                  }
                }}
              >
                <Phone className="h-4 w-4 mr-2" />
                Call Driver
              </Button>
            </div>

            {ride.notes && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-1">
                  Driver's Note:
                </h4>
                <p className="text-sm text-blue-800">{ride.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RideBooking;