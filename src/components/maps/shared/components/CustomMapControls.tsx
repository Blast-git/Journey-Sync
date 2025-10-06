// src/components/maps/shared/components/CustomMapControls.tsx
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Navigation, 
  Layers, 
  MapPin,
  RefreshCw,
  Maximize2,
  Minimize2
} from 'lucide-react';

export interface CustomMapControlsProps {
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onCenter?: () => void;
  onRefresh?: () => void;
  onToggleFullscreen?: () => void;
  onToggleLayers?: () => void;
  onResetView?: () => void;
  onMyLocation?: () => void;
  isLoading?: boolean;
  isFullscreen?: boolean;
  showLayerControl?: boolean;
  showLocationControl?: boolean;
  showRefreshControl?: boolean;
  showFullscreenControl?: boolean;
  className?: string;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  orientation?: 'vertical' | 'horizontal';
}

export const CustomMapControls: React.FC<CustomMapControlsProps> = ({
  onZoomIn,
  onZoomOut,
  onCenter,
  onRefresh,
  onToggleFullscreen,
  onToggleLayers,
  onResetView,
  onMyLocation,
  isLoading = false,
  isFullscreen = false,
  showLayerControl = true,
  showLocationControl = true,
  showRefreshControl = true,
  showFullscreenControl = true,
  className = "",
  position = "top-left",
  orientation = "vertical"
}) => {
  const isVertical = orientation === 'vertical';

  const controlButtons = [
    // Zoom controls
    {
      icon: ZoomIn,
      onClick: onZoomIn,
      tooltip: "Zoom in",
      disabled: false,
      show: true
    },
    {
      icon: ZoomOut,
      onClick: onZoomOut,
      tooltip: "Zoom out",
      disabled: false,
      show: true
    },
    // Separator
    { separator: true, show: true },
    // Navigation controls
    {
      icon: Navigation,
      onClick: onCenter,
      tooltip: "Center map",
      disabled: false,
      show: true
    },
    {
      icon: MapPin,
      onClick: onMyLocation,
      tooltip: "My location",
      disabled: false,
      show: showLocationControl
    },
    {
      icon: RotateCcw,
      onClick: onResetView,
      tooltip: "Reset view",
      disabled: false,
      show: true
    },
    // Separator
    { separator: true, show: showLayerControl || showRefreshControl || showFullscreenControl },
    // Utility controls
    {
      icon: Layers,
      onClick: onToggleLayers,
      tooltip: "Toggle layers",
      disabled: false,
      show: showLayerControl
    },
    {
      icon: RefreshCw,
      onClick: onRefresh,
      tooltip: "Refresh",
      disabled: isLoading,
      show: showRefreshControl,
      loading: isLoading
    },
    {
      icon: isFullscreen ? Minimize2 : Maximize2,
      onClick: onToggleFullscreen,
      tooltip: isFullscreen ? "Exit fullscreen" : "Fullscreen",
      disabled: false,
      show: showFullscreenControl
    }
  ].filter(control => control.show);

  return (
    <Card className={`bg-white/95 backdrop-blur shadow-lg ${className}`}>
      <div className={`p-2 ${isVertical ? 'space-y-1' : 'flex space-x-1'}`}>
        {controlButtons.map((control, index) => {
          // Render separator
          if (control.separator) {
            return (
              <Separator 
                key={`separator-${index}`}
                orientation={isVertical ? 'horizontal' : 'vertical'}
                className="my-1"
              />
            );
          }

          const Icon = control.icon;
          if (!Icon) return null;

          return (
            <Button
              key={`control-${index}`}
              variant="ghost"
              size="sm"
              onClick={control.onClick}
              disabled={control.disabled}
              className={`
                h-8 w-8 p-0 hover:bg-primary/10 
                ${control.disabled ? 'opacity-50 cursor-not-allowed' : ''}
                ${control.loading ? 'animate-pulse' : ''}
              `}
              title={control.tooltip}
            >
              <Icon 
                className={`h-4 w-4 ${control.loading ? 'animate-spin' : ''}`} 
              />
            </Button>
          );
        })}
      </div>
    </Card>
  );
};

// Preset configurations for common use cases
export const ZoomControls: React.FC<{
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  className?: string;
}> = ({ onZoomIn, onZoomOut, className = "" }) => (
  <CustomMapControls
    onZoomIn={onZoomIn}
    onZoomOut={onZoomOut}
    showLayerControl={false}
    showLocationControl={false}
    showRefreshControl={false}
    showFullscreenControl={false}
    className={className}
  />
);

export const NavigationControls: React.FC<{
  onCenter?: () => void;
  onMyLocation?: () => void;
  onResetView?: () => void;
  className?: string;
}> = ({ onCenter, onMyLocation, onResetView, className = "" }) => (
  <CustomMapControls
    onCenter={onCenter}
    onMyLocation={onMyLocation}
    onResetView={onResetView}
    showLayerControl={false}
    showRefreshControl={false}
    showFullscreenControl={false}
    className={className}
  />
);

export const LayerControls: React.FC<{
  onToggleLayers?: () => void;
  onRefresh?: () => void;
  isLoading?: boolean;
  className?: string;
}> = ({ onToggleLayers, onRefresh, isLoading, className = "" }) => (
  <CustomMapControls
    onToggleLayers={onToggleLayers}
    onRefresh={onRefresh}
    isLoading={isLoading}
    showLocationControl={false}
    showFullscreenControl={false}
    orientation="horizontal"
    className={className}
  />
);

export const FullMapControls: React.FC<CustomMapControlsProps> = (props) => (
  <CustomMapControls {...props} />
);

export default CustomMapControls;