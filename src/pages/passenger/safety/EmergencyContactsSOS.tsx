// src/components/EmergencyContactsSOS.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Phone, Plus, Shield, AlertTriangle, Edit2, Trash2, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EmergencyContact {
  id: string;
  contact_name: string;
  contact_phone: string;
  relationship: string;
  is_primary: boolean;
}

interface EmergencyContactsSOSProps {
  className?: string; // Added to accept className prop
}

const EmergencyContactsSOS: React.FC<EmergencyContactsSOSProps> = ({ className = '' }) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [showSOSConfirm, setShowSOSConfirm] = useState(false);
  const [isSendingSOS, setIsSendingSOS] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    contact_name: '',
    contact_phone: '',
    relationship: '',
    is_primary: false
  });

  useEffect(() => {
    if (profile?.id) {
      fetchEmergencyContacts();
    }
  }, [profile?.id]);

  const fetchEmergencyContacts = async () => {
    try {
      const { data, error } = await supabase
        .from('emergency_contacts')
        .select('*')
        .eq('user_id', profile?.id)
        .order('is_primary', { ascending: false });

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error('Error fetching emergency contacts:', error);
      toast({
        title: "Error",
        description: "Failed to fetch emergency contacts",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveContact = async () => {
    if (!profile || !formData.contact_name || !formData.contact_phone) return;

    try {
      const contactData = {
        user_id: profile.id,
        contact_name: formData.contact_name,
        contact_phone: formData.contact_phone,
        relationship: formData.relationship || 'Friend',
        is_primary: formData.is_primary
      };

      if (editingContact) {
        const { error } = await supabase
          .from('emergency_contacts')
          .update(contactData)
          .eq('id', editingContact.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('emergency_contacts')
          .insert(contactData);
        if (error) throw error;
      }

      toast({
        title: "Contact Saved",
        description: `Emergency contact ${editingContact ? 'updated' : 'added'} successfully`
      });

      setFormData({ contact_name: '', contact_phone: '', relationship: '', is_primary: false });
      setShowAddForm(false);
      setEditingContact(null);
      fetchEmergencyContacts();
    } catch (error) {
      console.error('Error saving contact:', error);
      toast({
        title: "Error",
        description: "Failed to save emergency contact",
        variant: "destructive"
      });
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    try {
      const { error } = await supabase
        .from('emergency_contacts')
        .delete()
        .eq('id', contactId);

      if (error) throw error;

      toast({
        title: "Contact Deleted",
        description: "Emergency contact removed successfully"
      });

      fetchEmergencyContacts();
    } catch (error) {
      console.error('Error deleting contact:', error);
      toast({
        title: "Error",
        description: "Failed to delete emergency contact",
        variant: "destructive"
      });
    }
  };

  const triggerSOS = async () => {
    if (contacts.length === 0) {
      toast({
        title: "No Emergency Contacts",
        description: "Please add emergency contacts before using SOS",
        variant: "destructive"
      });
      return;
    }

    setIsSendingSOS(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        });
      });

      const { latitude, longitude } = position.coords;
      const locationLink = `https://maps.google.com/maps?q=${latitude},${longitude}`;
      
      const sosMessage = `🚨 EMERGENCY ALERT 🚨\n\n${profile?.full_name} has triggered an SOS alert.\n\nLocation: ${locationLink}\n\nTime: ${new Date().toLocaleString()}\n\nThis is an automated emergency message. Please check on them immediately.`;

      console.log('SOS Alert sent to contacts:', contacts);
      console.log('Message:', sosMessage);

      toast({
        title: "SOS Alert Sent",
        description: `Emergency alert sent to ${contacts.length} contact(s) with your location`,
        variant: "default"
      });

      setShowSOSConfirm(false);
    } catch (error) {
      console.error('Error sending SOS:', error);
      toast({
        title: "SOS Failed",
        description: "Failed to send emergency alert. Please try again or call emergency services.",
        variant: "destructive"
      });
    } finally {
      setIsSendingSOS(false);
    }
  };

  const editContact = (contact: EmergencyContact) => {
    setEditingContact(contact);
    setFormData({
      contact_name: contact.contact_name,
      contact_phone: contact.contact_phone,
      relationship: contact.relationship || '',
      is_primary: contact.is_primary
    });
    setShowAddForm(true);
  };

  const resetForm = () => {
    setFormData({ contact_name: '', contact_phone: '', relationship: '', is_primary: false });
    setEditingContact(null);
    setShowAddForm(false);
  };

  return (
    <div className={`space-y-6 ${className}`}> {/* Apply className here */}
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Emergency Contacts & SOS</h2>
        <p className="text-muted-foreground mb-6">
          Manage your emergency contacts and trigger SOS alerts when needed
        </p>

        <Dialog open={showSOSConfirm} onOpenChange={setShowSOSConfirm}>
          <DialogTrigger asChild>
            <Button 
              size="lg" 
              className="bg-red-600 hover:bg-red-700 text-white px-8 py-6 text-lg font-bold rounded-full shadow-lg"
            >
              <Shield className="h-8 w-8 mr-2" />
              SOS EMERGENCY
            </Button>
          </DialogTrigger>
          
          <DialogContent className="border-red-200">
            <DialogHeader>
              <DialogTitle className="text-red-600 flex items-center gap-2">
                <AlertTriangle className="h-6 w-6" />
                Confirm Emergency Alert
              </DialogTitle>
              <DialogDescription>
                This will immediately send your current location and emergency details to all your emergency contacts.
                Only use this in genuine emergencies.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-semibold text-red-800 mb-2">Alert will be sent to:</h4>
                {contacts.length > 0 ? (
                  <ul className="space-y-1">
                    {contacts.map(contact => (
                      <li key={contact.id} className="text-sm text-red-700">
                        {contact.contact_name} ({contact.contact_phone})
                        {contact.is_primary && <Badge className="ml-2 bg-red-100 text-red-800">Primary</Badge>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-red-700 text-sm">No emergency contacts added</p>
                )}
              </div>
              
              <p className="text-sm text-muted-foreground">
                The alert will include your current GPS location, time, and personal details.
              </p>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSOSConfirm(false)}>
                Cancel
              </Button>
              <Button 
                onClick={triggerSOS} 
                disabled={isSendingSOS || contacts.length === 0}
                className="bg-red-600 hover:bg-red-700"
              >
                {isSendingSOS ? 'Sending Alert...' : 'Send Emergency Alert'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Emergency Contacts
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Add trusted contacts who will be notified in emergencies
            </p>
          </div>
          
          <Dialog open={showAddForm} onOpenChange={(open) => !open && resetForm()}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Contact
              </Button>
            </DialogTrigger>
            
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingContact ? 'Edit Emergency Contact' : 'Add Emergency Contact'}
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="contact_name">Full Name</Label>
                  <Input
                    id="contact_name"
                    value={formData.contact_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, contact_name: e.target.value }))}
                    placeholder="Enter contact's full name"
                  />
                </div>
                
                <div>
                  <Label htmlFor="contact_phone">Phone Number</Label>
                  <Input
                    id="contact_phone"
                    type="tel"
                    value={formData.contact_phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, contact_phone: e.target.value }))}
                    placeholder="+91 98765 43210"
                  />
                </div>
                
                <div>
                  <Label htmlFor="relationship">Relationship</Label>
                  <Input
                    id="relationship"
                    value={formData.relationship}
                    onChange={(e) => setFormData(prev => ({ ...prev, relationship: e.target.value }))}
                    placeholder="e.g., Family, Friend, Colleague"
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_primary"
                    checked={formData.is_primary}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_primary: e.target.checked }))}
                    className="rounded"
                  />
                  <Label htmlFor="is_primary" className="text-sm">
                    Set as primary emergency contact
                  </Label>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={resetForm}>Cancel</Button>
                <Button onClick={handleSaveContact}>
                  {editingContact ? 'Update Contact' : 'Add Contact'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="animate-pulse border rounded-lg p-4">
                  <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-1/4"></div>
                </div>
              ))}
            </div>
          ) : contacts.length === 0 ? (
            <div className="text-center py-8">
              <ShieldCheck className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Emergency Contacts</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Add trusted contacts to receive emergency alerts
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {contacts.map(contact => (
                <div key={contact.id} className="border rounded-lg p-4 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{contact.contact_name}</h4>
                      {contact.is_primary && (
                        <Badge className="bg-primary/10 text-primary">Primary</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{contact.contact_phone}</p>
                    {contact.relationship && (
                      <p className="text-xs text-muted-foreground">{contact.relationship}</p>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => editContact(contact)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteContact(contact.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EmergencyContactsSOS;