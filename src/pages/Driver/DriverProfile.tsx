import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate, useLocation } from "react-router-dom";
import { Camera, Shield, CheckCircle, AlertCircle, Upload, User, Phone, Mail, Edit2, ArrowLeft } from 'lucide-react';

// Bottom Navigation Component (same as in DriverApp)
const DriverBottomNavigation = () => {
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

  const handleNavigation = (path) => {
    navigate(path);
  };

  const isActivePath = (path) => {
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
};

const DriverProfile = () => {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({
    full_name: profile?.full_name || '',
    phone: profile?.phone || ''
  });

  const uploadAvatar = async (event) => {
    try {
      setUploading(true);
      
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}-${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload image to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('driver-documents')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('driver-documents')
        .getPublicUrl(filePath);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user?.id);

      if (updateError) {
        throw updateError;
      }

      toast({
        title: "Success",
        description: "Profile photo updated successfully!"
      });

    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: "Error",
        description: "Failed to upload profile photo",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const updateProfile = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editData.full_name,
          phone: editData.phone
        })
        .eq('id', user?.id);

      if (error) throw error;

      setEditing(false);
      toast({
        title: "Success",
        description: "Profile updated successfully!"
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive"
      });
    }
  };

  const getVerificationStatus = () => {
    // @ts-ignore - kyc_status exists in database but not in generated types yet
    if (profile?.kyc_status === 'approved') {
      return {
        icon: <CheckCircle className="h-4 w-4" />,
        text: 'Verified Driver',
        variant: 'default',
        bgColor: 'bg-green-100 text-green-800'
      };
    // @ts-ignore - kyc_status exists in database but not in generated types yet
    } else if (profile?.kyc_status === 'pending') {
      return {
        icon: <AlertCircle className="h-4 w-4" />,
        text: 'Verification Pending',
        variant: 'secondary',
        bgColor: 'bg-yellow-100 text-yellow-800'
      };
    } else {
      return {
        icon: <AlertCircle className="h-4 w-4" />,
        text: 'Not Verified',
        variant: 'destructive',
        bgColor: 'bg-red-100 text-red-800'
      };
    }
  };

  const verificationStatus = getVerificationStatus();

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="p-4">
        <div className="max-w-4xl mx-auto">
          {/* Header with Back Button */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm" onClick={() => navigate("/driver")}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Driver Profile</h1>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Profile Header Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>Driver Profile</span>
                </CardTitle>
                <CardDescription>
                  Manage your profile information and verification status
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Profile Photo Section */}
                <div className="flex items-center space-x-6">
                  <div className="relative">
                    <Avatar className="h-24 w-24">
                      <AvatarImage src={profile?.avatar_url} alt={profile?.full_name} />
                      <AvatarFallback className="text-lg">
                        {profile?.full_name?.charAt(0) || 'D'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-2 -right-2">
                      <label htmlFor="avatar-upload" className="cursor-pointer">
                        <div className="p-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors">
                          <Camera className="h-4 w-4" />
                        </div>
                        <input
                          id="avatar-upload"
                          type="file"
                          accept="image/*"
                          onChange={uploadAvatar}
                          disabled={uploading}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xl font-semibold">{profile?.full_name}</h3>
                      <Badge className={verificationStatus.bgColor}>
                        {verificationStatus.icon}
                        <span className="ml-1">{verificationStatus.text}</span>
                      </Badge>
                    </div>
                    
                    {/* @ts-ignore - rating fields exist in database but not in generated types yet */}
                    {profile?.average_rating && (
                      <div className="flex items-center space-x-2 text-muted-foreground">
                        <div className="flex items-center">
                          <span className="text-lg font-semibold text-foreground mr-1">
                            {/* @ts-ignore */}
                            {Number(profile.average_rating).toFixed(1)}
                          </span>
                          <span className="text-yellow-500">★</span>
                        </div>
                        <span>•</span>
                        {/* @ts-ignore */}
                        <span>{profile.total_ratings} reviews</span>
                      </div>
                    )}
                    
                    {uploading && (
                      <div className="flex items-center space-x-2 mt-2">
                        <Upload className="h-4 w-4 animate-spin" />
                        <span className="text-sm text-muted-foreground">Uploading...</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Profile Information */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="full_name">Full Name</Label>
                      {editing ? (
                        <Input
                          id="full_name"
                          value={editData.full_name}
                          onChange={(e) => setEditData(prev => ({ ...prev, full_name: e.target.value }))}
                          className="mt-1"
                        />
                      ) : (
                        <div className="mt-1 p-3 bg-muted rounded-md flex items-center">
                          <User className="h-4 w-4 mr-2 text-muted-foreground" />
                          {profile?.full_name || 'Not provided'}
                        </div>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="email">Email</Label>
                      <div className="mt-1 p-3 bg-muted rounded-md flex items-center">
                        <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                        {profile?.email}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="phone">Phone Number</Label>
                      {editing ? (
                        <Input
                          id="phone"
                          value={editData.phone}
                          onChange={(e) => setEditData(prev => ({ ...prev, phone: e.target.value }))}
                          className="mt-1"
                          placeholder="Enter your phone number"
                        />
                      ) : (
                        <div className="mt-1 p-3 bg-muted rounded-md flex items-center">
                          <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                          {profile?.phone || 'Not provided'}
                        </div>
                      )}
                    </div>

                    <div>
                      <Label>Account Status</Label>
                      <div className="mt-1 p-3 bg-muted rounded-md flex items-center justify-between">
                        <div className="flex items-center">
                          <Shield className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span>{profile?.role === 'driver' ? 'Driver Account' : 'Standard Account'}</span>
                        </div>
                        {/* @ts-ignore */}
                        {profile?.kyc_status === 'approved' && (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-4">
                  {editing ? (
                    <>
                      <Button variant="outline" onClick={() => setEditing(false)}>
                        Cancel
                      </Button>
                      <Button onClick={updateProfile}>
                        Save Changes
                      </Button>
                    </>
                  ) : (
                    <Button onClick={() => setEditing(true)}>
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Verification Status Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5" />
                  <span>Verification Status</span>
                </CardTitle>
                <CardDescription>
                  Your account verification and KYC status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-full ${
                        /* @ts-ignore */
                        profile?.kyc_status === 'approved' ? 'bg-green-100' :
                        /* @ts-ignore */
                        profile?.kyc_status === 'pending' ? 'bg-yellow-100' : 'bg-red-100'
                      }`}>
                        {/* @ts-ignore */}
                        {profile?.kyc_status === 'approved' ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-yellow-600" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium">KYC Verification</h4>
                        <p className="text-sm text-muted-foreground">
                          {/* @ts-ignore - kyc_status exists in database but not in generated types yet */}
                          {profile?.kyc_status === 'approved' 
                            ? 'Your documents have been verified successfully'
                            /* @ts-ignore */
                            : profile?.kyc_status === 'pending'
                            ? 'Your documents are under review'
                            : 'Please complete your KYC verification'
                          }
                        </p>
                      </div>
                    </div>
                    <Badge className={verificationStatus.bgColor}>
                      {verificationStatus.text}
                    </Badge>
                  </div>

                  {/* @ts-ignore - kyc_completed_at exists in database but not in generated types yet */}
                  {profile?.kyc_completed_at && (
                    <div className="text-sm text-muted-foreground">
                      {/* @ts-ignore */}
                      Verified on: {new Date(profile.kyc_completed_at).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Bottom Navigation Component */}
      <DriverBottomNavigation />
    </div>
  );
};

export default DriverProfile;