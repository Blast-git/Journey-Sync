// src/pages/TripHistory.tsx
import React from 'react';
import TripHistory from '@/pages/Driver/DriverTripHistory';

const DriverTripHistoryPage = () => {
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold">Trip History</h1>
      <TripHistory />
    </div>
  );
};

export default DriverTripHistoryPage;