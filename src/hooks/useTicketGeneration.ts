// ===========================================
// src/hooks/useTicketGeneration.ts
// QR code and ticket utilities hook for Phase 5
// ===========================================

import { useState, useCallback } from 'react';
import { TicketService, type TicketData, type QRVerificationResult } from '@/services/ticketService';
import { useToast } from '@/hooks/use-toast';

export interface TicketState {
  isGenerating: boolean;
  isVerifying: boolean;
  ticketData: TicketData | null;
  qrCodeUrl: string | null;
  error: string | null;
}

export interface TicketActions {
  generateTicket: (bookingId: string, includeDriverDetails?: boolean) => Promise<boolean>;
  regenerateQR: (bookingId: string) => Promise<boolean>;
  verifyQRCode: (qrContent: string) => Promise<QRVerificationResult>;
  downloadTicket: () => Promise<void>;
  shareTicket: () => Promise<void>;
  clearTicket: () => void;
  clearError: () => void;
}

const initialState: TicketState = {
  isGenerating: false,
  isVerifying: false,
  ticketData: null,
  qrCodeUrl: null,
  error: null,
};

export const useTicketGeneration = (): TicketState & TicketActions => {
  const [state, setState] = useState<TicketState>(initialState);
  const { toast } = useToast();

  // Helper to update state
  const updateState = useCallback((updates: Partial<TicketState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Generate complete ticket with QR code
  const generateTicket = useCallback(async (
    bookingId: string,
    includeDriverDetails: boolean = true
  ): Promise<boolean> => {
    updateState({ isGenerating: true, error: null });

    try {
      console.log('Generating ticket for booking:', bookingId);

      const result = await TicketService.generateTicket(bookingId, includeDriverDetails);

      if (!result.success) {
        updateState({
          error: result.error || 'Failed to generate ticket',
          isGenerating: false
        });
        
        toast({
          title: 'Ticket Generation Failed',
          description: result.error || 'Failed to generate your ticket',
          variant: 'destructive'
        });
        
        return false;
      }

      updateState({
        ticketData: result.ticketData || null,
        qrCodeUrl: result.qrCodeUrl || null,
        isGenerating: false,
        error: null
      });

      toast({
        title: 'Ticket Generated',
        description: 'Your booking ticket has been generated successfully',
      });

      return true;

    } catch (error) {
      console.error('Ticket generation error:', error);
      const errorMessage = 'System error during ticket generation';
      
      updateState({
        error: errorMessage,
        isGenerating: false
      });

      toast({
        title: 'Generation Error',
        description: errorMessage,
        variant: 'destructive'
      });

      return false;
    }
  }, [updateState, toast]);

  // Regenerate QR code if expired or lost
  const regenerateQR = useCallback(async (bookingId: string): Promise<boolean> => {
    updateState({ isGenerating: true, error: null });

    try {
      console.log('Regenerating QR code for booking:', bookingId);

      const result = await TicketService.regenerateQRCode(bookingId);

      if (!result.success) {
        updateState({
          error: result.error || 'Failed to regenerate QR code',
          isGenerating: false
        });

        toast({
          title: 'QR Regeneration Failed',
          description: result.error || 'Failed to regenerate QR code',
          variant: 'destructive'
        });

        return false;
      }

      updateState({
        qrCodeUrl: result.qrCodeUrl || null,
        isGenerating: false,
        error: null
      });

      toast({
        title: 'QR Code Updated',
        description: 'Your QR code has been regenerated successfully',
      });

      return true;

    } catch (error) {
      console.error('QR regeneration error:', error);
      const errorMessage = 'System error during QR regeneration';
      
      updateState({
        error: errorMessage,
        isGenerating: false
      });

      toast({
        title: 'Regeneration Error',
        description: errorMessage,
        variant: 'destructive'
      });

      return false;
    }
  }, [updateState, toast]);

  // Verify QR code (for driver side)
  const verifyQRCode = useCallback(async (qrContent: string): Promise<QRVerificationResult> => {
    updateState({ isVerifying: true, error: null });

    try {
      console.log('Verifying QR code...');

      const result = await TicketService.verifyQRCode(qrContent);

      updateState({ isVerifying: false });

      if (!result.valid) {
        toast({
          title: 'QR Verification Failed',
          description: result.error || 'Invalid QR code',
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'QR Verified',
          description: `Valid booking for ${result.passenger_name || 'passenger'}`,
        });
      }

      return result;

    } catch (error) {
      console.error('QR verification error:', error);
      
      updateState({ isVerifying: false });

      const result: QRVerificationResult = {
        valid: false,
        error: 'System error during QR verification'
      };

      toast({
        title: 'Verification Error',
        description: result.error,
        variant: 'destructive'
      });

      return result;
    }
  }, [updateState, toast]);

  // Download ticket as PDF
  const downloadTicket = useCallback(async (): Promise<void> => {
    if (!state.ticketData) {
      toast({
        title: 'No Ticket Available',
        description: 'Please generate a ticket first',
        variant: 'destructive'
      });
      return;
    }

    try {
      // Check if html2canvas and jsPDF are available (they should be imported in BookingTicket component)
      if (typeof window !== 'undefined' && document) {
        // Trigger the download from the BookingTicket component
        // This is a placeholder - actual implementation would be in the BookingTicket component
        console.log('Triggering ticket download...');
        
        toast({
          title: 'Download Started',
          description: 'Your ticket download will begin shortly',
        });
      } else {
        throw new Error('Download not available on this platform');
      }

    } catch (error) {
      console.error('Ticket download error:', error);
      
      toast({
        title: 'Download Failed',
        description: 'Failed to download ticket. Please try again.',
        variant: 'destructive'
      });
    }
  }, [state.ticketData, toast]);

  // Share ticket
  const shareTicket = useCallback(async (): Promise<void> => {
    if (!state.ticketData) {
      toast({
        title: 'No Ticket Available',
        description: 'Please generate a ticket first',
        variant: 'destructive'
      });
      return;
    }

    try {
      const shareData = {
        title: 'My Ride Booking',
        text: `Booked ride from ${state.ticketData.ride_details.from_city} to ${state.ticketData.ride_details.to_city} on ${new Date(state.ticketData.ride_details.departure_date).toLocaleDateString()}`,
        url: window.location.href,
      };

      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        
        toast({
          title: 'Shared Successfully',
          description: 'Ticket details have been shared',
        });
      } else {
        // Fallback to clipboard
        const shareText = `${shareData.text}\nBooking ID: ${state.ticketData.booking_id}`;
        await navigator.clipboard.writeText(shareText);
        
        toast({
          title: 'Copied to Clipboard',
          description: 'Booking details have been copied to clipboard',
        });
      }

    } catch (error) {
      console.error('Ticket sharing error:', error);
      
      // Try clipboard as fallback
      try {
        const fallbackText = `Booking ID: ${state.ticketData.booking_id}\nRoute: ${state.ticketData.ride_details.from_city} to ${state.ticketData.ride_details.to_city}`;
        await navigator.clipboard.writeText(fallbackText);
        
        toast({
          title: 'Copied to Clipboard',
          description: 'Booking details have been copied to clipboard',
        });
      } catch (clipboardError) {
        toast({
          title: 'Share Failed',
          description: 'Unable to share ticket details',
          variant: 'destructive'
        });
      }
    }
  }, [state.ticketData, toast]);

  // Clear ticket data
  const clearTicket = useCallback(() => {
    setState(initialState);
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    updateState({ error: null });
  }, [updateState]);

  // Utility functions for QR code management
  const isQRExpired = useCallback((qrContent?: string): boolean => {
    if (!qrContent) return false;
    return TicketService.isQRCodeExpired(qrContent);
  }, []);

  const getQRExpiry = useCallback((qrContent?: string) => {
    if (!qrContent) return { isExpired: true };
    return TicketService.getQRCodeExpiry(qrContent);
  }, []);

  // Check if current QR code is expired
  const isCurrentQRExpired = useCallback((): boolean => {
    if (!state.qrCodeUrl) return false;
    
    try {
      // Extract QR data from the data URL if needed
      // For now, assume QR content is stored separately
      return false; // Placeholder - implement based on your QR storage method
    } catch {
      return false;
    }
  }, [state.qrCodeUrl]);

  return {
    // State
    ...state,
    
    // Actions
    generateTicket,
    regenerateQR,
    verifyQRCode,
    downloadTicket,
    shareTicket,
    clearTicket,
    clearError,
    
    // Utility functions
    isQRExpired,
    getQRExpiry,
    isCurrentQRExpired,
  };
};