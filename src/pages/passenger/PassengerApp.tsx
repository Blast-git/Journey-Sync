import React, { useEffect, Suspense } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Outlet, useLocation, Routes, Route, Navigate } from "react-router-dom";
import { BottomNavigation } from "@/components/ui/PassengerBottomNavigation";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RideSearchBooking from "@/pages/passenger/RideSearchBooking";
import LiveTracking from "@/pages/passenger/LiveTracking";
import TripHistory from "@/pages/passenger/TripHistory";
import PassengerProfile from "@/pages/passenger/PassengerProfile";
import SupportChat from "@/pages/passenger/SupportChat";
import Emergency from "@/pages/passenger/safety/Emergency";
import EmergencyContactsSOS from "@/pages/passenger/safety/EmergencyContactsSOS";
import LiveLocationSharing from "@/pages/passenger/safety/LiveLocationSharing";
import ErrorBoundary from "@/components/ErrorBoundary";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

const PassengerApp = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false, // Optimize for mobile usage
        staleTime: 5 * 60 * 1000, // 5 minutes
      },
    },
  });

  useEffect(() => {
    // Auto-redirect to ride search when passenger app loads
    // Only redirect if we're on the base passenger route
    if (profile?.id && location.pathname === '/passenger') {
      navigate('/passenger/rides-search-booking', { replace: true });
    }
  }, [profile?.id, navigate, location.pathname]);

  // Show loading only when on the base passenger route without profile
  if (!profile?.id && location.pathname === '/passenger') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <div className="min-h-screen bg-background">
          <Suspense
            fallback={
              <div className="min-h-screen flex items-center justify-center">
                Loading...
              </div>
            }
          >
            <ErrorBoundary>
              <Routes>
                {/* Main Passenger Landing Page */}
                <Route
                  path="/rides-search-booking"
                  element={
                    <ProtectedRoute>
                      <RideSearchBooking />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/live-tracking"
                  element={
                    <ProtectedRoute>
                      <LiveTracking />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/trip-history"
                  element={
                    <ProtectedRoute>
                      <TripHistory />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <PassengerProfile />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/support"
                  element={
                    <ProtectedRoute>
                      <SupportChat />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/emergency"
                  element={
                    <ProtectedRoute>
                      <Emergency />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/emergency-contacts"
                  element={
                    <ProtectedRoute>
                      <EmergencyContactsSOS />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/live-location"
                  element={
                    <ProtectedRoute>
                      <LiveLocationSharing />
                    </ProtectedRoute>
                  }
                />
                {/* Redirect base passenger route to rides-search-booking */}
                <Route
                  path="/"
                  element={<Navigate to="/passenger/rides-search-booking" replace />}
                />
              </Routes>
            </ErrorBoundary>
          </Suspense>
          {/* Main content area with bottom padding to account for fixed navigation */}
          <main className="pb-16">
            <Outlet />
          </main>
          {/* Bottom Navigation - Fixed at bottom and visible throughout */}
          <BottomNavigation />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default PassengerApp;