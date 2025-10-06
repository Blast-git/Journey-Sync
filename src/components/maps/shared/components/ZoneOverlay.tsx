// ===========================================
// Fixed: src/components/maps/shared/components/ZoneOverlay.tsx
// ===========================================

import React, { useEffect, useRef } from 'react';
import { CityZone } from '@/hooks/useZoneData';

export interface ZoneOverlayProps {
  zones: CityZone[];
  selectedZoneId?: string;
  onZoneClick?: (zone: CityZone) => void;
  mapInstance?: any; // Google Maps instance
  zoneType: 'pickup' | 'dropoff';
  showLabels?: boolean;
}

export const ZoneOverlay: React.FC<ZoneOverlayProps> = ({
  zones,
  selectedZoneId,
  onZoneClick,
  mapInstance,
  zoneType,
  showLabels = true
}) => {
  const overlaysRef = useRef<any[]>([]);
  const labelsRef = useRef<any[]>([]);

  // Colors for different zone types
  const getZoneStyle = (zone: CityZone, isSelected: boolean) => {
    const baseColor = zoneType === 'pickup' ? '#22c55e' : '#3b82f6'; // Green for pickup, blue for dropoff
    
    return {
      fillColor: baseColor,
      fillOpacity: isSelected ? 0.4 : 0.2,
      strokeColor: baseColor,
      strokeWeight: isSelected ? 3 : 2,
      strokeOpacity: isSelected ? 0.8 : 0.6
    };
  };

  useEffect(() => {
    if (!mapInstance || !window.google) return;

    // Clear existing overlays
    overlaysRef.current.forEach(overlay => overlay.setMap(null));
    labelsRef.current.forEach(label => label.setMap(null));
    overlaysRef.current = [];
    labelsRef.current = [];

    zones.forEach(zone => {
      const isSelected = zone.id === selectedZoneId;
      
      // Create circle overlay for each zone
      const circle = new window.google.maps.Circle({
        center: {
          lat: zone.center_latitude,
          lng: zone.center_longitude
        },
        radius: zone.radius_meters,
        map: mapInstance,
        ...getZoneStyle(zone, isSelected),
        clickable: true
      });

      // Add click handler
      if (onZoneClick) {
        circle.addListener('click', () => {
          console.log('Zone clicked:', zone.zone_name);
          onZoneClick(zone);
        });
      }

      overlaysRef.current.push(circle);

      // Add zone label if enabled
      if (showLabels) {
        const marker = new window.google.maps.Marker({
          position: {
            lat: zone.center_latitude,
            lng: zone.center_longitude
          },
          map: mapInstance,
          icon: {
            url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
              <svg width="120" height="40" xmlns="http://www.w3.org/2000/svg">
                <rect width="120" height="40" rx="20" fill="white" stroke="${getZoneStyle(zone, isSelected).strokeColor}" stroke-width="2" opacity="0.9"/>
                <text x="60" y="25" text-anchor="middle" font-family="Arial" font-size="12" font-weight="bold" fill="${getZoneStyle(zone, isSelected).strokeColor}">
                  ${zone.zone_name}
                </text>
              </svg>
            `)}`,
            scaledSize: new window.google.maps.Size(120, 40),
            anchor: new window.google.maps.Point(60, 20)
          },
          clickable: true
        });

        // Add click handler to marker too
        if (onZoneClick) {
          marker.addListener('click', () => {
            onZoneClick(zone);
          });
        }

        labelsRef.current.push(marker);
      }
    });

    // Cleanup function
    return () => {
      overlaysRef.current.forEach(overlay => overlay.setMap(null));
      labelsRef.current.forEach(label => label.setMap(null));
    };
  }, [zones, selectedZoneId, mapInstance, onZoneClick, zoneType, showLabels]);

  return null; // This component doesn't render anything directly
};