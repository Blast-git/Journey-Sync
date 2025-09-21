import {
  Plus,
  History,
  MessageSquare,
  User,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function DriverBottomNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      toast({
        title: "Logged out successfully",
        description: "You have been signed out of your account",
      });

      navigate("/auth");
    } catch (error) {
      console.error("Error logging out:", error);
      toast({
        title: "Logout failed",
        description: "Failed to log out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const isActivePath = (path: string) => {
    return location.pathname === path;
  };

  const driverMenuItems = [
    {
      label: "Post Rides",
      path: "/driver/rides-management",
      emoji: "🚗",
    },
    {
      label: "History",
      path: "/driver/trip-history",
      emoji: "🕘",
    },
    {
      label: "Support",
      path: "/driver/support",
      emoji: "💬",
    },
    {
      label: "Profile",
      path: "/driver/profile",
      emoji: "👤",
    },
  ];

  return (
    <>
      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 px-2 py-2 shadow-lg">
        <div className="flex justify-around items-center max-w-md mx-auto">
          {driverMenuItems.map((item) => (
            <button
              key={item.path}
              onClick={() => handleNavigation(item.path)}
              className={`flex flex-col items-center px-3 py-2 rounded-xl transition-all duration-200 min-w-[65px] ${
                isActivePath(item.path)
                  ? "bg-primary/10 text-primary transform scale-105"
                  : "text-gray-600 hover:text-primary hover:bg-primary/5"
              }`}
            >
              <div className="relative">
                <span className="text-lg mb-1 block">{item.emoji}</span>
                {isActivePath(item.path) && (
                  <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary rounded-full"></div>
                )}
              </div>
              <span className="text-xs font-medium text-center leading-tight">
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Logout Button - Floating */}
      <div className="fixed bottom-20 right-4 z-50">
        <button
          onClick={handleLogout}
          className="bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-all duration-200 rounded-full p-3 shadow-lg"
          title="Logout"
        >
          <span className="text-lg">🚪</span>
        </button>
      </div>

      {/* Add padding to prevent content from being hidden behind nav */}
      <div className="h-16"></div>
    </>
  );
}