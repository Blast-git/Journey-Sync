import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Camera, Shield, CheckCircle, AlertCircle, Upload, User, Phone, Mail, Edit2, Star, MapPin, LogOut } from 'lucide-react';

const PassengerProfile = () => {
  const { profile, user, refreshProfile, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({
    full_name: profile?.full_name || '',
    phone: profile?.phone || ''
  });

  // Update editData when profile changes
  useEffect(() => {
    if (profile) {
      setEditData({
        full_name: profile.full_name || '',
        phone: profile.phone || ''
      });
    }
  }, [profile]);

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
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

      // Refresh the profile data in the context
      await refreshProfile();

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

      // Refresh the profile data in the context
      await refreshProfile();

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

  const handleLogout = async () => {
    try {
      // Call the signOut function from useAuth
      await signOut();
      // Explicitly clear mobile auth data from localStorage
      localStorage.removeItem('mobile_auth_user');
      // Provide feedback
      toast({
        title: "Success",
        description: "You have been logged out successfully."
      });
      // Navigate to the auth page
      navigate('/auth', { replace: true });
    } catch (error) {
      console.error('Error logging out:', error);
      toast({
        title: "Error",
        description: "Failed to log out. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Header Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>My Profile</span>
          </CardTitle>
          <CardDescription>
            Manage your profile information and travel preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Profile Photo Section */}
          <div className="flex items-center space-x-6">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src={profile?.avatar_url} alt={profile?.full_name} />
                <AvatarFallback className="text-lg">
                  {profile?.full_name?.charAt(0) || 'P'}
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
                <Badge className="bg-blue-100 text-blue-800">
                  <User className="h-3 w-3 mr-1" />
                  Passenger
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
                <Label>Account Type</Label>
                <div className="mt-1 p-3 bg-muted rounded-md flex items-center justify-between">
                  <div className="flex items-center">
                    <Shield className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>Passenger Account</span>
                  </div>
                  <CheckCircle className="h-4 w-4 text-green-600" />
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
              <>
                <Button onClick={() => setEditing(true)}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
                <Button variant="destructive" onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Log Out
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Travel Statistics Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MapPin className="h-5 w-5" />
            <span>Travel Statistics</span>
          </CardTitle>
          <CardDescription>
            Your travel history and preferences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-primary">0</div>
              <div className="text-sm text-muted-foreground">Total Trips</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-primary">0</div>
              <div className="text-sm text-muted-foreground">Cities Visited</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-primary">0</div>
              <div className="text-sm text-muted-foreground">Favorite Routes</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-primary">5.0</div>
              <div className="text-sm text-muted-foreground">Avg. Rating</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PassengerProfile;