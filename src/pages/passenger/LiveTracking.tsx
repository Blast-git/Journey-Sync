// src/pages/LiveTracking.tsx
import React from "react";
import LiveLocationSharing from "@/pages/passenger/safety/LiveLocationSharing";

const LiveTracking = () => {
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold">Live Tracking</h1>
      <LiveLocationSharing />
    </div>
  );
};

export default LiveTracking;
