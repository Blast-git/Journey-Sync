// src/pages/Profile.tsx
import React from 'react';
import PassengerProfile from '@/pages/passenger/PassengerProfile';

const Profile = () => {
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold">Profile</h1>
      <PassengerProfile />
    </div>
  );
};

export default Profile;