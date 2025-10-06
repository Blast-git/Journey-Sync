// src/pages/Emergency.tsx
import React from "react";
import { SOSButton } from "@/pages/passenger/safety/SOSButton";
import EmergencyContactsSOS from "@/pages/passenger/safety/EmergencyContactsSOS";
import { useNavigate } from "react-router-dom";

const Emergency = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6 bg-gradient-to-r from-destructive to-destructive/80 bg-clip-text text-transparent">
          Emergency
        </h1>
        <SOSButton className="mb-6" /> {/* Pass className for styling */}
        <EmergencyContactsSOS className="mt-6" />
        <button
          onClick={() => navigate("/profile")}
          className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-primary bg-primary/10 hover:bg-primary/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          Manage More Settings in Profile
        </button>
      </div>
    </div>
  );
};

export default Emergency;
