import React, { useState, useEffect, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { AuthForm } from "./components/auth/AuthForm";
import { ForgotPassword } from "./components/auth/ForgotPassword";
import { ResetPassword } from "./components/auth/ResetPassword";
import { AppSelection } from "./pages/temp/AppSelection";
import { DriverApp } from "./pages/Driver/DriverApp";
import DriverProfile from "./pages/Driver/DriverProfile";
import PostRides from "./pages/Driver/PostRides";
import RidesManagement from "./pages/temp/RidesManagement";
import NotFound from "./pages/temp/NotFound";
import { MobileLayout } from "./components/ui/mobile-layout";
import PassengerApp from "./pages/passenger/PassengerApp";
import ErrorBoundary from "./components/ErrorBoundary";
import { MapProvider } from "@/components/maps/core/MapProvider";
import { googleMapsService } from "@/services/googleMapsService";
import { mapUtils } from "@/components/maps/core/mapUtils";

// Import VehicleSetup when you create it
// import VehicleSetup from "./components/Ride Posting/VehicleSetup";

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

// FIXED: Remove auto-redirect to /find-rides
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  // CHANGE: Instead of redirecting to /find-rides, redirect to /app-selection
  if (user) {
    return <Navigate to="/app-selection" replace />;
  }

  return <>{children}</>;
};

const App = () => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false, // Optimize for mobile usage
            staleTime: 5 * 60 * 1000, // 5 minutes
          },
        },
      })
  );

  // Initialize Google Maps on app startup (only on web)
  useEffect(() => {
    const initializeGoogleMaps = async () => {
      // Only initialize Google Maps on web platform
      if (!mapUtils.isWeb()) {
        console.log("Skipping Google Maps initialization on native platform");
        return;
      }

      try {
        console.log("Starting Google Maps initialization...");
        await googleMapsService.initialize();
        console.log("Google Maps initialized successfully");
      } catch (error) {
        console.error("Failed to initialize Google Maps:", error);

        // Check for common issues and provide helpful error messages
        if (error.message.includes("API key")) {
          console.error("Google Maps API Key Issue:", {
            message:
              "Please check your .env file contains VITE_GOOGLE_MAPS_WEB_API_KEY",
            currentKey: import.meta.env.VITE_GOOGLE_MAPS_WEB_API_KEY
              ? "Found"
              : "Missing",
          });
        }

        // Don't block app startup if Google Maps fails
        // The route visualization will show fallback data instead
      }
    };

    // Only initialize on web platform and when window is available
    if (typeof window !== "undefined") {
      initializeGoogleMaps();
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <MapProvider>
              <MobileLayout>
                <Suspense
                  fallback={
                    <div className="min-h-screen flex items-center justify-center">
                      Loading...
                    </div>
                  }
                >
                  <ErrorBoundary>
                    <Routes>
                      {/* CHANGE: Redirect to app-selection instead of find-rides */}
                      <Route
                        path="/"
                        element={<Navigate to="/app-selection" replace />}
                      />

                      {/* Authentication Routes */}
                      <Route
                        path="/auth"
                        element={
                          <PublicRoute>
                            <AuthForm />
                          </PublicRoute>
                        }
                      />
                      <Route
                        path="/forgot-password"
                        element={
                          <PublicRoute>
                            <ForgotPassword />
                          </PublicRoute>
                        }
                      />
                      <Route
                        path="/reset-password"
                        element={<ResetPassword />}
                      />

                      {/* App Selection Route */}
                      <Route
                        path="/app-selection"
                        element={
                          <ProtectedRoute>
                            <AppSelection />
                          </ProtectedRoute>
                        }
                      />

                      {/* Driver Routes */}
                      <Route
                        path="/driver"
                        element={
                          <ProtectedRoute>
                            <DriverApp />
                          </ProtectedRoute>
                        }
                      />

                      {/* NEW: PostRides Route */}
                      <Route
                        path="/driver/post-rides"
                        element={
                          <ProtectedRoute>
                            <PostRides />
                          </ProtectedRoute>
                        }
                      />

                      {/* NEW: Vehicle Setup Route (uncomment when VehicleSetup component is ready) */}
                      {/*
                    <Route
                      path="/driver/vehicle-setup"
                      element={
                        <ProtectedRoute>
                          <VehicleSetup />
                        </ProtectedRoute>
                      }
                    />
                    */}

                      <Route
                        path="/rides-management"
                        element={
                          <ProtectedRoute>
                            <RidesManagement />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/driver/profile"
                        element={
                          <ProtectedRoute>
                            <DriverProfile />
                          </ProtectedRoute>
                        }
                      />

                      {/* Driver Dashboard Route (alternative path) */}
                      <Route
                        path="/driver/dashboard"
                        element={
                          <ProtectedRoute>
                            <DriverApp />
                          </ProtectedRoute>
                        }
                      />

                      {/* Passenger Routes */}
                      <Route
                        path="/passenger/*"
                        element={
                          <ProtectedRoute>
                            <PassengerApp />
                          </ProtectedRoute>
                        }
                      />

                      {/* REMOVE OR CHANGE THIS PROBLEMATIC ROUTE */}
                      {/* This route was forcing everyone to passenger app */}
                      <Route
                        path="/find-rides"
                        element={
                          <ProtectedRoute>
                            <Navigate to="/app-selection" replace />
                          </ProtectedRoute>
                        }
                      />

                      {/* Legacy redirects for backward compatibility */}
                      <Route
                        path="/trip-history"
                        element={
                          <Navigate to="/passenger/trip-history" replace />
                        }
                      />
                      <Route
                        path="/live-tracking"
                        element={
                          <Navigate to="/passenger/live-tracking" replace />
                        }
                      />
                      <Route
                        path="/emergency"
                        element={<Navigate to="/passenger/emergency" replace />}
                      />
                      <Route
                        path="/support"
                        element={<Navigate to="/passenger/support" replace />}
                      />
                      <Route
                        path="/profile"
                        element={<Navigate to="/passenger/profile" replace />}
                      />

                      {/* 404 Route */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </ErrorBoundary>
                </Suspense>
              </MobileLayout>
            </MapProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
