// utils/seatLayoutUtils.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Type Definitions
export interface Seat {
  id: string;
  type: 'driver' | 'front' | 'window' | 'middle';
  bookable: boolean;
  position: string;
  label: string;
  row?: number;
  column?: number;
}

export interface SeatRow {
  type: string;
  seats: Seat[];
  rowIndex?: number;
}

export interface LayoutConfig {
  rows: SeatRow[];
  vehicleType: string;
  totalSeats: number;
  bookableSeats: number;
}

export interface VehicleType {
  id: string;
  name: string;
  total_seats: number;
  bookable_seats: number;
  layout_config: LayoutConfig;
  created_at?: string;
}

export interface SeatPricing {
  [seatId: string]: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface SeatLayoutHookReturn {
  seatCount: number;
  setSeatCount: (count: number) => void;
  layoutConfig: LayoutConfig | null;
  vehicleType: VehicleType | null;
  loading: boolean;
  error: string | null;
  reloadLayout: () => void;
}

// CORRECTED Predefined seat layouts - F1 on LEFT, Driver on RIGHT
const PREDEFINED_LAYOUTS: Record<number, LayoutConfig[]> = {
  4: [
    {
      vehicleType: '4-seater',
      totalSeats: 4,
      bookableSeats: 3,
      rows: [
        {
          type: 'front',
          seats: [
            { id: 'F1', type: 'front', bookable: true, position: 'front-left', label: 'Front', row: 0, column: 0 },
            { id: 'D', type: 'driver', bookable: false, position: 'front-right', label: 'Driver', row: 0, column: 1 }
          ]
        },
        {
          type: 'back',
          seats: [
            { id: 'W1', type: 'window', bookable: true, position: 'back-left', label: 'Window', row: 1, column: 0 },
            { id: 'W2', type: 'window', bookable: true, position: 'back-right', label: 'Window', row: 1, column: 1 }
          ]
        }
      ]
    }
  ],
  5: [
    {
      vehicleType: '5-seater',
      totalSeats: 5,
      bookableSeats: 4,
      rows: [
        {
          type: 'front',
          seats: [
            { id: 'F1', type: 'front', bookable: true, position: 'front-left', label: 'Front', row: 0, column: 0 },
            { id: 'D', type: 'driver', bookable: false, position: 'front-right', label: 'Driver', row: 0, column: 1 }
          ]
        },
        {
          type: 'back',
          seats: [
            { id: 'W1', type: 'window', bookable: true, position: 'back-left', label: 'Window', row: 1, column: 0 },
            { id: 'M1', type: 'middle', bookable: true, position: 'back-center', label: 'Middle', row: 1, column: 1 },
            { id: 'W2', type: 'window', bookable: true, position: 'back-right', label: 'Window', row: 1, column: 2 }
          ]
        }
      ]
    }
  ],
  6: [
    {
      vehicleType: '6-seater',
      totalSeats: 6,
      bookableSeats: 5,
      rows: [
        {
          type: 'front',
          seats: [
            { id: 'F1', type: 'front', bookable: true, position: 'front-left', label: 'Front', row: 0, column: 0 },
            { id: 'D', type: 'driver', bookable: false, position: 'front-right', label: 'Driver', row: 0, column: 1 }
          ]
        },
        {
          type: 'middle',
          seats: [
            { id: 'W1', type: 'window', bookable: true, position: 'middle-left', label: 'Window', row: 1, column: 0 },
            { id: 'W2', type: 'window', bookable: true, position: 'middle-right', label: 'Window', row: 1, column: 1 }
          ]
        },
        {
          type: 'back',
          seats: [
            { id: 'W3', type: 'window', bookable: true, position: 'back-left', label: 'Window', row: 2, column: 0 },
            { id: 'W4', type: 'window', bookable: true, position: 'back-right', label: 'Window', row: 2, column: 1 }
          ]
        }
      ]
    }
  ],
  7: [
    // Layout Option 1: 2-2-3 configuration
    {
      vehicleType: '7-seater-option-1',
      totalSeats: 7,
      bookableSeats: 6,
      rows: [
        {
          type: 'front',
          seats: [
            { id: 'F1', type: 'front', bookable: true, position: 'front-left', label: 'Front', row: 0, column: 0 },
            { id: 'D', type: 'driver', bookable: false, position: 'front-right', label: 'Driver', row: 0, column: 1 }
          ]
        },
        {
          type: 'middle',
          seats: [
            { id: 'W1', type: 'window', bookable: true, position: 'middle-left', label: 'Window', row: 1, column: 0 },
            { id: 'W2', type: 'window', bookable: true, position: 'middle-right', label: 'Window', row: 1, column: 1 }
          ]
        },
        {
          type: 'back',
          seats: [
            { id: 'W3', type: 'window', bookable: true, position: 'back-left', label: 'Window', row: 2, column: 0 },
            { id: 'M1', type: 'middle', bookable: true, position: 'back-center', label: 'Middle', row: 2, column: 1 },
            { id: 'W4', type: 'window', bookable: true, position: 'back-right', label: 'Window', row: 2, column: 2 }
          ]
        }
      ]
    },
    // Layout Option 2: 2-3-2 configuration
    {
      vehicleType: '7-seater-option-2',
      totalSeats: 7,
      bookableSeats: 6,
      rows: [
        {
          type: 'front',
          seats: [
            { id: 'F1', type: 'front', bookable: true, position: 'front-left', label: 'Front', row: 0, column: 0 },
            { id: 'D', type: 'driver', bookable: false, position: 'front-right', label: 'Driver', row: 0, column: 1 }
          ]
        },
        {
          type: 'middle',
          seats: [
            { id: 'W1', type: 'window', bookable: true, position: 'middle-left', label: 'Window', row: 1, column: 0 },
            { id: 'M1', type: 'middle', bookable: true, position: 'middle-center', label: 'Middle', row: 1, column: 1 },
            { id: 'W2', type: 'window', bookable: true, position: 'middle-right', label: 'Window', row: 1, column: 2 }
          ]
        },
        {
          type: 'back',
          seats: [
            { id: 'W3', type: 'window', bookable: true, position: 'back-left', label: 'Window', row: 2, column: 0 },
            { id: 'W4', type: 'window', bookable: true, position: 'back-right', label: 'Window', row: 2, column: 1 }
          ]
        }
      ]
    }
  ],
  8: [
    {
      vehicleType: '8-seater',
      totalSeats: 8,
      bookableSeats: 7,
      rows: [
        {
          type: 'front',
          seats: [
            { id: 'F1', type: 'front', bookable: true, position: 'front-left', label: 'Front', row: 0, column: 0 },
            { id: 'D', type: 'driver', bookable: false, position: 'front-right', label: 'Driver', row: 0, column: 1 }
          ]
        },
        {
          type: 'middle-front',
          seats: [
            { id: 'W1', type: 'window', bookable: true, position: 'middle-front-left', label: 'Window', row: 1, column: 0 },
            { id: 'M1', type: 'middle', bookable: true, position: 'middle-front-center', label: 'Middle', row: 1, column: 1 },
            { id: 'W2', type: 'window', bookable: true, position: 'middle-front-right', label: 'Window', row: 1, column: 2 }
          ]
        },
        {
          type: 'middle-back',
          seats: [
            { id: 'W3', type: 'window', bookable: true, position: 'middle-back-left', label: 'Window', row: 2, column: 0 },
            { id: 'W4', type: 'window', bookable: true, position: 'middle-back-right', label: 'Window', row: 2, column: 1 }
          ]
        },
        {
          type: 'back',
          seats: [
            { id: 'W5', type: 'window', bookable: true, position: 'back-left', label: 'Window', row: 3, column: 0 },
            { id: 'M2', type: 'middle', bookable: true, position: 'back-center', label: 'Middle', row: 3, column: 1 }
          ]
        }
      ]
    }
  ],
  9: [
    {
      vehicleType: '9-seater',
      totalSeats: 9,
      bookableSeats: 8,
      rows: [
        {
          type: 'front',
          seats: [
            { id: 'F1', type: 'front', bookable: true, position: 'front-left', label: 'Front', row: 0, column: 0 },
            { id: 'D', type: 'driver', bookable: false, position: 'front-right', label: 'Driver', row: 0, column: 1 }
          ]
        },
        {
          type: 'middle-front',
          seats: [
            { id: 'W1', type: 'window', bookable: true, position: 'middle-front-left', label: 'Window', row: 1, column: 0 },
            { id: 'M1', type: 'middle', bookable: true, position: 'middle-front-center', label: 'Middle', row: 1, column: 1 },
            { id: 'W2', type: 'window', bookable: true, position: 'middle-front-right', label: 'Window', row: 1, column: 2 }
          ]
        },
        {
          type: 'middle-back',
          seats: [
            { id: 'W3', type: 'window', bookable: true, position: 'middle-back-left', label: 'Window', row: 2, column: 0 },
            { id: 'M2', type: 'middle', bookable: true, position: 'middle-back-center', label: 'Middle', row: 2, column: 1 },
            { id: 'W4', type: 'window', bookable: true, position: 'middle-back-right', label: 'Window', row: 2, column: 2 }
          ]
        },
        {
          type: 'back',
          seats: [
            { id: 'W5', type: 'window', bookable: true, position: 'back-left', label: 'Window', row: 3, column: 0 },
            { id: 'M3', type: 'middle', bookable: true, position: 'back-center', label: 'Middle', row: 3, column: 1 },
            { id: 'W6', type: 'window', bookable: true, position: 'back-right', label: 'Window', row: 3, column: 2 }
          ]
        }
      ]
    }
  ],
  10: [
    {
      vehicleType: '10-seater',
      totalSeats: 10,
      bookableSeats: 9,
      rows: [
        {
          type: 'front',
          seats: [
            { id: 'F1', type: 'front', bookable: true, position: 'front-left', label: 'Front', row: 0, column: 0 },
            { id: 'D', type: 'driver', bookable: false, position: 'front-right', label: 'Driver', row: 0, column: 1 }
          ]
        },
        {
          type: 'middle-1',
          seats: [
            { id: 'W1', type: 'window', bookable: true, position: 'middle-1-left', label: 'Window', row: 1, column: 0 },
            { id: 'M1', type: 'middle', bookable: true, position: 'middle-1-center', label: 'Middle', row: 1, column: 1 },
            { id: 'W2', type: 'window', bookable: true, position: 'middle-1-right', label: 'Window', row: 1, column: 2 }
          ]
        },
        {
          type: 'middle-2',
          seats: [
            { id: 'W3', type: 'window', bookable: true, position: 'middle-2-left', label: 'Window', row: 2, column: 0 },
            { id: 'M2', type: 'middle', bookable: true, position: 'middle-2-center', label: 'Middle', row: 2, column: 1 },
            { id: 'W4', type: 'window', bookable: true, position: 'middle-2-right', label: 'Window', row: 2, column: 2 }
          ]
        },
        {
          type: 'back',
          seats: [
            { id: 'W5', type: 'window', bookable: true, position: 'back-left', label: 'Window', row: 3, column: 0 },
            { id: 'M3', type: 'middle', bookable: true, position: 'back-center', label: 'Middle', row: 3, column: 1 },
            { id: 'W6', type: 'window', bookable: true, position: 'back-right', label: 'Window', row: 3, column: 2 }
          ]
        }
      ]
    }
  ]
};

/**
 * Get predefined seat layouts by seat count
 */
export const getPredefinedLayouts = (seatCount: number): LayoutConfig[] => {
  return PREDEFINED_LAYOUTS[seatCount] || [];
};

/**
 * Fetch seat layout from database by number of seats
 */
export const fetchSeatLayoutBySeats = async (seatCount: number): Promise<VehicleType | null> => {
  try {
    const { data, error } = await supabase
      .from('vehicle_types')
      .select('*')
      .eq('total_seats', seatCount)
      .single();

    if (error) {
      console.error('Error fetching seat layout:', error);
      return null;
    }

    return data as VehicleType;
  } catch (error) {
    console.error('Error in fetchSeatLayoutBySeats:', error);
    return null;
  }
};

/**
 * Fetch all available vehicle types with their layouts
 */
export const fetchAllVehicleTypes = async (): Promise<VehicleType[]> => {
  try {
    const { data, error } = await supabase
      .from('vehicle_types')
      .select('*')
      .order('total_seats', { ascending: true });

    if (error) {
      console.error('Error fetching vehicle types:', error);
      return [];
    }

    return (data as VehicleType[]) || [];
  } catch (error) {
    console.error('Error in fetchAllVehicleTypes:', error);
    return [];
  }
};

/**
 * Get seat layout by vehicle type name
 */
export const fetchSeatLayoutByName = async (vehicleTypeName: string): Promise<VehicleType | null> => {
  try {
    const { data, error } = await supabase
      .from('vehicle_types')
      .select('*')
      .eq('name', vehicleTypeName)
      .single();

    if (error) {
      console.error('Error fetching seat layout by name:', error);
      return null;
    }

    return data as VehicleType;
  } catch (error) {
    console.error('Error in fetchSeatLayoutByName:', error);
    return null;
  }
};

/**
 * Extract bookable seats from layout configuration
 */
export const getBookableSeats = (layoutConfig: LayoutConfig): Seat[] => {
  if (!layoutConfig || !layoutConfig.rows) return [];

  const bookableSeats: Seat[] = [];
  
  layoutConfig.rows.forEach(row => {
    if (row.seats) {
      row.seats.forEach(seat => {
        if (seat.bookable) {
          bookableSeats.push(seat);
        }
      });
    }
  });

  return bookableSeats;
};

/**
 * Get all seats (bookable and non-bookable) from layout
 */
export const getAllSeats = (layoutConfig: LayoutConfig): Seat[] => {
  if (!layoutConfig || !layoutConfig.rows) return [];

  const allSeats: Seat[] = [];
  
  layoutConfig.rows.forEach(row => {
    if (row.seats) {
      row.seats.forEach(seat => {
        allSeats.push(seat);
      });
    }
  });

  return allSeats;
};

/**
 * Initialize default pricing for all bookable seats
 */
export const initializeSeatPricing = (layoutConfig: LayoutConfig, defaultPrice: number = 500): SeatPricing => {
  const bookableSeats = getBookableSeats(layoutConfig);
  const pricing: SeatPricing = {};

  bookableSeats.forEach(seat => {
    pricing[seat.id] = defaultPrice;
  });

  return pricing;
};

/**
 * Apply smart pricing based on seat type
 */
export const applySmartPricing = (layoutConfig: LayoutConfig, basePrice: number = 500): SeatPricing => {
  const bookableSeats = getBookableSeats(layoutConfig);
  const pricing: SeatPricing = {};

  bookableSeats.forEach(seat => {
    switch (seat.type) {
      case 'front':
        pricing[seat.id] = basePrice + 100; // Front seat premium
        break;
      case 'window':
        pricing[seat.id] = basePrice + 50;  // Window seat premium
        break;
      case 'middle':
        pricing[seat.id] = basePrice;       // Base price
        break;
      default:
        pricing[seat.id] = basePrice;
    }
  });

  return pricing;
};

/**
 * Calculate total potential revenue from seat pricing
 */
export const calculateTotalRevenue = (seatPricing: SeatPricing): number => {
  if (!seatPricing) return 0;
  
  return Object.values(seatPricing).reduce((total, price) => {
    return total + (parseFloat(price.toString()) || 0);
  }, 0);
};

/**
 * Get seat by ID from layout configuration
 */
export const getSeatById = (layoutConfig: LayoutConfig, seatId: string): Seat | null => {
  const allSeats = getAllSeats(layoutConfig);
  return allSeats.find(seat => seat.id === seatId) || null;
};

/**
 * Get seats by type from layout configuration
 */
export const getSeatsByType = (layoutConfig: LayoutConfig, seatType: Seat['type']): Seat[] => {
  const allSeats = getAllSeats(layoutConfig);
  return allSeats.filter(seat => seat.type === seatType);
};

/**
 * Validate seat pricing object
 */
export const validateSeatPricing = (seatPricing: SeatPricing, layoutConfig: LayoutConfig): ValidationResult => {
  const bookableSeats = getBookableSeats(layoutConfig);
  const errors: string[] = [];
  
  // Check if all bookable seats have pricing
  bookableSeats.forEach(seat => {
    if (!seatPricing[seat.id] || seatPricing[seat.id] <= 0) {
      errors.push(`Price for seat ${seat.id} is missing or invalid`);
    }
  });

  // Check for unexpected seat IDs in pricing
  Object.keys(seatPricing).forEach(seatId => {
    const seat = getSeatById(layoutConfig, seatId);
    if (!seat || !seat.bookable) {
      errors.push(`Unexpected seat ID in pricing: ${seatId}`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Format seat layout for display purposes
 */
export const formatSeatLayoutForDisplay = (layoutConfig: LayoutConfig): LayoutConfig => {
  if (!layoutConfig || !layoutConfig.rows) return layoutConfig;

  return {
    ...layoutConfig,
    rows: layoutConfig.rows.map((row, rowIndex) => ({
      ...row,
      rowIndex,
      seats: row.seats.map(seat => ({
        ...seat,
        displayLabel: seat.label || seat.type,
        isDriverSeat: seat.type === 'driver',
        cssClass: getSeatCssClass(seat)
      }))
    }))
  };
};

/**
 * Get CSS class for seat based on its properties
 */
export const getSeatCssClass = (seat: Seat): string => {
  if (!seat.bookable) {
    return 'bg-gray-400 text-white cursor-not-allowed';
  }
  
  switch (seat.type) {
    case 'front':
      return 'bg-purple-100 text-purple-800 border-purple-300 hover:bg-purple-200';
    case 'window':
      return 'bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200';
    case 'middle':
      return 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200';
  }
};

/**
 * Get available seat count from layout
 */
export const getAvailableSeatCount = (layoutConfig: LayoutConfig): number => {
  return getBookableSeats(layoutConfig).length;
};

/**
 * Get seat type color for badges/indicators
 */
export const getSeatTypeColor = (seatType: Seat['type']): string => {
  switch (seatType) {
    case 'front': return 'bg-purple-100 text-purple-800';
    case 'window': return 'bg-blue-100 text-blue-800';
    case 'middle': return 'bg-green-100 text-green-800';
    case 'driver': return 'bg-gray-100 text-gray-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

/**
 * Check if a seat is available for booking
 */
export const isSeatAvailable = (seatId: string, bookedSeats: string[]): boolean => {
  return !bookedSeats.includes(seatId);
};

/**
 * Get pricing statistics for a layout
 */
export const getPricingStats = (seatPricing: SeatPricing) => {
  const prices = Object.values(seatPricing);
  if (prices.length === 0) return { min: 0, max: 0, average: 0, total: 0 };

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const total = prices.reduce((sum, price) => sum + price, 0);
  const average = total / prices.length;

  return { min, max, average, total };
};

/**
 * Custom hook for seat layout management
 */
export const useSeatLayout = (initialSeatCount: number = 5): SeatLayoutHookReturn => {
  const [seatCount, setSeatCount] = useState<number>(initialSeatCount);
  const [layoutConfig, setLayoutConfig] = useState<LayoutConfig | null>(null);
  const [vehicleType, setVehicleType] = useState<VehicleType | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadLayout = useCallback(async (seats: number) => {
    setLoading(true);
    setError(null);
    
    try {
      // First try to get from database
      const dbLayout = await fetchSeatLayoutBySeats(seats);
      if (dbLayout) {
        setVehicleType(dbLayout);
        setLayoutConfig(dbLayout.layout_config);
        setSeatCount(seats);
      } else {
        // Fallback to predefined layouts
        const predefinedLayouts = getPredefinedLayouts(seats);
        if (predefinedLayouts.length > 0) {
          setLayoutConfig(predefinedLayouts[0]); // Use first layout option
          setVehicleType(null);
          setSeatCount(seats);
        } else {
          setError(`No layout found for ${seats}-seater vehicle`);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLayout(seatCount);
  }, [seatCount, loadLayout]);

  const reloadLayout = useCallback(() => {
    loadLayout(seatCount);
  }, [seatCount, loadLayout]);

  return {
    seatCount,
    setSeatCount,
    layoutConfig,
    vehicleType,
    loading,
    error,
    reloadLayout
  };
};

// Export all functions and types
export type {
  Seat,
  SeatRow,
  LayoutConfig,
  VehicleType,
  SeatPricing,
  ValidationResult,
  SeatLayoutHookReturn
};