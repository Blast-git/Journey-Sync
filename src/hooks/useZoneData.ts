// ===========================================
// Updated: src/hooks/useZoneData.ts - Route Corridor Version
// ===========================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CityZone {
  id: string;
  city_name: string;
  zone_name: string;
  zone_type: 'pickup' | 'dropoff' | 'both';
  center_latitude: number;
  center_longitude: number;
  radius_meters: number;
  polygon_coordinates?: any;
  description?: string;
  landmarks: string[];
  is_active: boolean;
}

export interface RouteCorridor {
  id: string;
  city_name: string;
  line_name: string;
  line_code: string;
  line_color: string;
  description?: string;
  is_active: boolean;
}

export interface RouteStop {
  id: string;
  line_id: string;
  zone_id: string;
  station_order: number;
  travel_time_to_next?: number;
  is_terminal: boolean;
  is_interchange: boolean;
  zone: CityZone;
  line: RouteCorridor;
}

// Hook for loading route corridors in a city
export const useCityRouteCorridors = (cityName: string) => {
  const [corridors, setCorridors] = useState<RouteCorridor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchCorridors = useCallback(async () => {
    if (!cityName) return;

    setIsLoading(true);
    setError(null);

    try {
      console.log('Fetching route corridors for city:', cityName);
      
      const { data, error: supabaseError } = await supabase
        .from('city_transit_lines')
        .select('*')
        .ilike('city_name', cityName)
        .eq('is_active', true)
        .order('line_name');

      if (supabaseError) throw supabaseError;

      console.log('Loaded route corridors:', data?.length || 0);
      setCorridors(data || []);
    } catch (err) {
      console.error('Failed to fetch route corridors:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch corridors'));
    } finally {
      setIsLoading(false);
    }
  }, [cityName]);

  useEffect(() => {
    fetchCorridors();
  }, [fetchCorridors]);

  return { corridors, isLoading, error, refetch: fetchCorridors };
};

// Hook for loading pickup points along a route corridor
export const useCorridorPickupPoints = (corridorId: string) => {
  const [pickupPoints, setPickupPoints] = useState<RouteStop[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchPickupPoints = useCallback(async () => {
    if (!corridorId) return;

    setIsLoading(true);
    setError(null);

    try {
      console.log('Fetching pickup points for corridor:', corridorId);
      
      const { data, error: supabaseError } = await supabase
        .from('line_stations')
        .select(`
          *,
          zone:city_zones!inner(*),
          line:city_transit_lines!inner(*)
        `)
        .eq('line_id', corridorId)
        .eq('zone.is_active', true)
        .order('station_order');

      if (supabaseError) throw supabaseError;

      const transformedData = data?.map(stop => ({
        ...stop,
        zone: stop.zone,
        line: stop.line
      })) || [];

      console.log('Loaded pickup points:', transformedData.length);
      setPickupPoints(transformedData);
    } catch (err) {
      console.error('Failed to fetch pickup points:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch pickup points'));
    } finally {
      setIsLoading(false);
    }
  }, [corridorId]);

  useEffect(() => {
    fetchPickupPoints();
  }, [fetchPickupPoints]);

  return { pickupPoints, isLoading, error, refetch: fetchPickupPoints };
};

// Hook for route corridor zone selection
export const useRouteCorridorSelection = () => {
  const [selectedPickupCorridor, setSelectedPickupCorridor] = useState<string>('');
  const [selectedDropoffCorridor, setSelectedDropoffCorridor] = useState<string>('');
  const [selectedPickupPoints, setSelectedPickupPoints] = useState<string[]>([]);
  const [selectedDropoffPoints, setSelectedDropoffPoints] = useState<string[]>([]);
  
  // For range selection (from point A to point B on same corridor)
  const [pickupRangeStart, setPickupRangeStart] = useState<number | null>(null);
  const [pickupRangeEnd, setPickupRangeEnd] = useState<number | null>(null);
  const [dropoffRangeStart, setDropoffRangeStart] = useState<number | null>(null);
  const [dropoffRangeEnd, setDropoffRangeEnd] = useState<number | null>(null);

  const selectPickupCorridor = useCallback((corridorId: string) => {
    console.log('Selected pickup corridor:', corridorId);
    setSelectedPickupCorridor(corridorId);
    setSelectedPickupPoints([]);
    setPickupRangeStart(null);
    setPickupRangeEnd(null);
  }, []);

  const selectDropoffCorridor = useCallback((corridorId: string) => {
    console.log('Selected dropoff corridor:', corridorId);
    setSelectedDropoffCorridor(corridorId);
    setSelectedDropoffPoints([]);
    setDropoffRangeStart(null);
    setDropoffRangeEnd(null);
  }, []);

  const selectPickupPointRange = useCallback((startOrder: number, endOrder: number) => {
    console.log('Selected pickup point range:', startOrder, 'to', endOrder);
    setPickupRangeStart(Math.min(startOrder, endOrder));
    setPickupRangeEnd(Math.max(startOrder, endOrder));
  }, []);

  const selectDropoffPointRange = useCallback((startOrder: number, endOrder: number) => {
    console.log('Selected dropoff point range:', startOrder, 'to', endOrder);
    setDropoffRangeStart(Math.min(startOrder, endOrder));
    setDropoffRangeEnd(Math.max(startOrder, endOrder));
  }, []);

  const addPickupPoint = useCallback((pointId: string) => {
    setSelectedPickupPoints(prev => 
      prev.includes(pointId) 
        ? prev.filter(id => id !== pointId)
        : [...prev, pointId]
    );
  }, []);

  const addDropoffPoint = useCallback((pointId: string) => {
    setSelectedDropoffPoints(prev => 
      prev.includes(pointId) 
        ? prev.filter(id => id !== pointId)
        : [...prev, pointId]
    );
  }, []);

  const validateSelection = useCallback(() => {
    const hasPickupSelection = selectedPickupPoints.length > 0 || 
      (pickupRangeStart !== null && pickupRangeEnd !== null);
    const hasDropoffSelection = selectedDropoffPoints.length > 0 || 
      (dropoffRangeStart !== null && dropoffRangeEnd !== null);
    
    return {
      isValid: hasPickupSelection && hasDropoffSelection,
      errors: {
        missingPickupSelection: !hasPickupSelection,
        missingDropoffSelection: !hasDropoffSelection,
        sameCorridorError: selectedPickupCorridor === selectedDropoffCorridor && 
                          selectedPickupCorridor !== '' // Allow if different cities
      }
    };
  }, [
    selectedPickupPoints, 
    selectedDropoffPoints,
    pickupRangeStart, 
    pickupRangeEnd,
    dropoffRangeStart, 
    dropoffRangeEnd,
    selectedPickupCorridor,
    selectedDropoffCorridor
  ]);

  const getSelectedPickupZones = useCallback((pickupPoints: RouteStop[]) => {
    if (pickupRangeStart !== null && pickupRangeEnd !== null) {
      return pickupPoints
        .filter(point => 
          point.station_order >= pickupRangeStart && 
          point.station_order <= pickupRangeEnd
        )
        .map(point => point.zone);
    }
    
    return pickupPoints
      .filter(point => selectedPickupPoints.includes(point.zone_id))
      .map(point => point.zone);
  }, [selectedPickupPoints, pickupRangeStart, pickupRangeEnd]);

  const getSelectedDropoffZones = useCallback((dropoffPoints: RouteStop[]) => {
    if (dropoffRangeStart !== null && dropoffRangeEnd !== null) {
      return dropoffPoints
        .filter(point => 
          point.station_order >= dropoffRangeStart && 
          point.station_order <= dropoffRangeEnd
        )
        .map(point => point.zone);
    }
    
    return dropoffPoints
      .filter(point => selectedDropoffPoints.includes(point.zone_id))
      .map(point => point.zone);
  }, [selectedDropoffPoints, dropoffRangeStart, dropoffRangeEnd]);

  const clearSelection = useCallback(() => {
    setSelectedPickupCorridor('');
    setSelectedDropoffCorridor('');
    setSelectedPickupPoints([]);
    setSelectedDropoffPoints([]);
    setPickupRangeStart(null);
    setPickupRangeEnd(null);
    setDropoffRangeStart(null);
    setDropoffRangeEnd(null);
  }, []);

  return {
    // Corridor selection
    selectedPickupCorridor,
    selectedDropoffCorridor,
    selectPickupCorridor,
    selectDropoffCorridor,
    
    // Pickup/Dropoff point selection
    selectedPickupPoints,
    selectedDropoffPoints,
    addPickupPoint,
    addDropoffPoint,
    
    // Range selection
    pickupRangeStart,
    pickupRangeEnd,
    dropoffRangeStart,
    dropoffRangeEnd,
    selectPickupPointRange,
    selectDropoffPointRange,
    
    // Utilities
    getSelectedPickupZones,
    getSelectedDropoffZones,
    validateSelection,
    clearSelection
  };
};

// Hook for saving ride zones (updated for multiple zones)
export const useRideZones = (rideId?: string) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const saveRideZones = useCallback(async (
    pickupZoneIds: string[], 
    dropoffZoneIds: string[]
  ) => {
    if (!rideId) {
      throw new Error('Ride ID is required to save zones');
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('Saving ride zones:', { 
        rideId, 
        pickupCount: pickupZoneIds.length, 
        dropoffCount: dropoffZoneIds.length 
      });

      // Delete existing zones for this ride
      await supabase
        .from('ride_zones')
        .delete()
        .eq('ride_id', rideId);

      // Insert new zones
      const zoneInserts = [
        ...pickupZoneIds.map(zoneId => ({
          ride_id: rideId,
          zone_id: zoneId,
          zone_type: 'pickup'
        })),
        ...dropoffZoneIds.map(zoneId => ({
          ride_id: rideId,
          zone_id: zoneId,
          zone_type: 'dropoff'
        }))
      ];

      if (zoneInserts.length > 0) {
        const { error: insertError } = await supabase
          .from('ride_zones')
          .insert(zoneInserts);

        if (insertError) throw insertError;
      }

      console.log('Ride zones saved successfully');
      return true;
    } catch (err) {
      console.error('Failed to save ride zones:', err);
      setError(err instanceof Error ? err : new Error('Failed to save zones'));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [rideId]);

  const getRideZones = useCallback(async (rideId: string) => {
    try {
      const { data, error } = await supabase
        .from('ride_zones')
        .select(`
          *,
          city_zones!inner(*)
        `)
        .eq('ride_id', rideId);

      if (error) throw error;

      const pickupZones = data
        ?.filter(rz => rz.zone_type === 'pickup')
        ?.map(rz => rz.city_zones) || [];
      const dropoffZones = data
        ?.filter(rz => rz.zone_type === 'dropoff')
        ?.map(rz => rz.city_zones) || [];

      return { pickupZones, dropoffZones };
    } catch (err) {
      console.error('Failed to get ride zones:', err);
      throw err;
    }
  }, []);

  return {
    saveRideZones,
    getRideZones,
    isLoading,
    error
  };
};