import React, { useState, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { AuthForm } from "./components/auth/AuthForm";
import { ForgotPassword } from "./components/auth/ForgotPassword";
import { ResetPassword } from "./components/auth/ResetPassword";
import { AppSelection } from "./pages/AppSelection";    
import { DriverApp } from "./pages/Driver/DriverApp";
import RidesManagement from "./pages/RidesManagement";
import NotFound from "./pages/NotFound";
import { MobileLayout } from "./components/ui/mobile-layout";
import PassengerApp from "./pages/passenger/PassengerApp";
import ErrorBoundary from "./components/ErrorBoundary";

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

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  if (user) {
    return <Navigate to="/find-rides" replace />;
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

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
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
                    {/* Root redirect to find-rides (main landing page) */}
                    <Route
                      path="/"
                      element={<Navigate to="/find-rides" replace />}
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
                    <Route path="/reset-password" element={<ResetPassword />} />

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
                    <Route
                      path="/rides-management"
                      element={
                        <ProtectedRoute>
                          <RidesManagement />
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
                    <Route
                      path="/find-rides"
                      element={
                        <ProtectedRoute>
                          <Navigate to="/passenger/rides-search-booking" replace />
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
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;