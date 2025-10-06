import React, { useState, useEffect } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { isNative, isWeb, isIOS, isAndroid } from '@/components/maps/core/mapUtils';
import { DEFAULT_MAP_CONFIG } from '@/config/mapConfig';

// ===== TYPE DEFINITIONS =====

interface MapPlatformDetectorProps {
  children: (platform: MapPlatform) => React.ReactNode;
  fallback?: React.ReactNode;
  onPlatformDetected?: (platform: MapPlatform) => void;
  onError?: (error: PlatformError) => void;
}

interface MapPlatform {
  type: 'web' | 'ios' | 'android';
  isNative: boolean;
  capabilities: PlatformCapabilities;
  mapImplementation: 'google-maps-react' | 'capacitor-google-maps';
  apiKey: string;
}

interface PlatformCapabilities {
  supportsNativeNavigation: boolean;
  supportsBackgroundLocation: boolean;
  supportsVoiceGuidance: boolean;
  supportsPushNotifications: boolean;
  maxMarkers: number;
  maxPolylinePoints: number;
  gestureHandling: 'cooperative' | 'greedy';
  hasLocationServices: boolean;
}

interface PlatformError {
  code: 'API_KEY_MISSING' | 'PLATFORM_UNSUPPORTED' | 'PERMISSIONS_REQUIRED' | 'CAPABILITIES_CHECK_FAILED';
  message: string;
  platform?: string;
  details?: any;
}

// ===== PLATFORM CAPABILITIES DEFINITIONS =====

const WEB_CAPABILITIES: PlatformCapabilities = {
  supportsNativeNavigation: false,
  supportsBackgroundLocation: false,
  supportsVoiceGuidance: false,
  supportsPushNotifications: true,
  maxMarkers: 1000,
  maxPolylinePoints: 10000,
  gestureHandling: 'cooperative',
  hasLocationServices: true
};

const IOS_CAPABILITIES: PlatformCapabilities = {
  supportsNativeNavigation: true,
  supportsBackgroundLocation: true,
  supportsVoiceGuidance: true,
  supportsPushNotifications: true,
  maxMarkers: 500,
  maxPolylinePoints: 5000,
  gestureHandling: 'greedy',
  hasLocationServices: true
};

const ANDROID_CAPABILITIES: PlatformCapabilities = {
  supportsNativeNavigation: true,
  supportsBackgroundLocation: true,
  supportsVoiceGuidance: true,
  supportsPushNotifications: true,
  maxMarkers: 500,
  maxPolylinePoints: 5000,
  gestureHandling: 'greedy',
  hasLocationServices: true
};

// ===== PLATFORM DETECTION LOGIC =====

const detectPlatform = async (): Promise<MapPlatform> => {
  let platformType: 'web' | 'ios' | 'android';
  let capabilities: PlatformCapabilities;
  let mapImplementation: 'google-maps-react' | 'capacitor-google-maps';

  // Determine platform type
  if (isNative()) {
    if (isIOS()) {
      platformType = 'ios';
      capabilities = IOS_CAPABILITIES;
      mapImplementation = 'capacitor-google-maps';
    } else if (isAndroid()) {
      platformType = 'android';
      capabilities = ANDROID_CAPABILITIES;
      mapImplementation = 'capacitor-google-maps';
    } else {
      throw new Error('Unsupported native platform');
    }
  } else {
    platformType = 'web';
    capabilities = WEB_CAPABILITIES;
    mapImplementation = 'google-maps-react';
  }

  // Get appropriate API key
  const apiKey = getApiKeyForPlatform(platformType);
  if (!apiKey) {
    throw {
      code: 'API_KEY_MISSING',
      message: `Google Maps API key not found for platform: ${platformType}`,
      platform: platformType
    } as PlatformError;
  }

  // Validate capabilities
  await validatePlatformCapabilities(platformType, capabilities);

  return {
    type: platformType,
    isNative: isNative(),
    capabilities,
    mapImplementation,
    apiKey
  };
};

const getApiKeyForPlatform = (platform: 'web' | 'ios' | 'android'): string => {
  switch (platform) {
    case 'web':
      return import.meta.env.VITE_GOOGLE_MAPS_WEB_API_KEY || ''; // Fixed: was REACT_APP_
    case 'ios':
      return import.meta.env.VITE_GOOGLE_MAPS_IOS_API_KEY || '';   // Fixed: added VITE_
    case 'android':
      return import.meta.env.VITE_GOOGLE_MAPS_ANDROID_API_KEY || ''; // Fixed: added VITE_
    default:
      return '';
  }
};

const validatePlatformCapabilities = async (
  platform: string, 
  capabilities: PlatformCapabilities
): Promise<void> => {
  try {
    // Check if Google Maps script is available (web only)
    if (platform === 'web') {
      if (typeof window !== 'undefined' && !window.google && !document.querySelector('script[src*="maps.googleapis.com"]')) {
        // Google Maps script not loaded, but this is acceptable as it will be loaded by the map component
      }
    }

    // Check location services availability
    if (capabilities.hasLocationServices && typeof navigator !== 'undefined' && navigator.geolocation) {
      // Location services are available
    } else if (capabilities.hasLocationServices) {
      console.warn('Location services may not be available on this platform');
    }

    // For native platforms, check Capacitor availability
    if (platform !== 'web') {
      if (typeof window !== 'undefined' && !window.Capacitor) {
        throw {
          code: 'PLATFORM_UNSUPPORTED',
          message: 'Capacitor not available on native platform',
          platform
        } as PlatformError;
      }
    }
  } catch (error) {
    throw {
      code: 'CAPABILITIES_CHECK_FAILED',
      message: 'Failed to validate platform capabilities',
      platform,
      details: error
    } as PlatformError;
  }
};

// ===== MAIN COMPONENT =====

export const MapPlatformDetector: React.FC<MapPlatformDetectorProps> = ({
  children,
  fallback,
  onPlatformDetected,
  onError
}) => {
  const [platform, setPlatform] = useState<MapPlatform | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<PlatformError | null>(null);

  useEffect(() => {
    const initializePlatform = async () => {
      try {
        setLoading(true);
        setError(null);

        const detectedPlatform = await detectPlatform();
        setPlatform(detectedPlatform);
        onPlatformDetected?.(detectedPlatform);

        console.log(`Map platform detected: ${detectedPlatform.type}`, {
          implementation: detectedPlatform.mapImplementation,
          capabilities: detectedPlatform.capabilities,
          hasApiKey: !!detectedPlatform.apiKey
        });

      } catch (err) {
        const platformError = err as PlatformError;
        setError(platformError);
        onError?.(platformError);
        console.error('Platform detection failed:', platformError);
      } finally {
        setLoading(false);
      }
    };

    initializePlatform();
  }, [onPlatformDetected, onError]);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <div className="text-center">
            <p className="text-sm font-medium">Detecting platform...</p>
            <p className="text-xs text-muted-foreground">
              {isNative() ? 'Native platform detected' : 'Web platform detected'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">Platform Detection Failed</p>
              <p className="text-sm">{error.message}</p>
              {error.code === 'API_KEY_MISSING' && (
                <div className="text-xs mt-2 p-2 bg-muted rounded">
                  <p className="font-medium">Fix:</p>
                  <p>Add the appropriate Google Maps API key to your environment:</p>
                  <ul className="list-disc list-inside mt-1">
                    <li>Web: REACT_APP_GOOGLE_MAPS_WEB_API_KEY</li>
                    <li>iOS: GOOGLE_MAPS_IOS_API_KEY</li>
                    <li>Android: GOOGLE_MAPS_ANDROID_API_KEY</li>
                  </ul>
                </div>
              )}
              {error.code === 'PLATFORM_UNSUPPORTED' && (
                <div className="text-xs mt-2 p-2 bg-muted rounded">
                  <p className="font-medium">Fix:</p>
                  <p>Ensure Capacitor is properly configured for native platforms</p>
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
        {fallback}
      </div>
    );
  }

  // Success state - render children with platform info
  if (platform) {
    return <>{children(platform)}</>;
  }

  // Fallback
  return fallback || null;
};

// ===== HELPER HOOK =====

export const usePlatformInfo = () => {
  const [platformInfo, setPlatformInfo] = useState<{
    type: string;
    isNative: boolean;
    canUseLocation: boolean;
    canUseNavigation: boolean;
  } | null>(null);

  useEffect(() => {
    const info = {
      type: isNative() ? (isIOS() ? 'iOS' : isAndroid() ? 'Android' : 'Native') : 'Web',
      isNative: isNative(),
      canUseLocation: typeof navigator !== 'undefined' && !!navigator.geolocation,
      canUseNavigation: isNative() // Native apps can use turn-by-turn navigation
    };
    setPlatformInfo(info);
  }, []);

  return platformInfo;
};

// ===== EXPORT TYPES =====

export type { MapPlatform, PlatformCapabilities, PlatformError };

// ===== USAGE EXAMPLE =====

/*
Usage Example:

import { MapPlatformDetector } from '@/components/maps/core/MapPlatformDetector';

function App() {
  return (
    <MapPlatformDetector
      onPlatformDetected={(platform) => {
        console.log('Platform ready:', platform.type);
      }}
      onError={(error) => {
        console.error('Platform error:', error);
      }}
      fallback={<div>Maps not available</div>}
    >
      {(platform) => (
        <div>
          <h1>Maps for {platform.type}</h1>
          <p>Using: {platform.mapImplementation}</p>
          <p>Max markers: {platform.capabilities.maxMarkers}</p>
          {platform.capabilities.supportsNativeNavigation && (
            <p>Navigation available!</p>
          )}
        </div>
      )}
    </MapPlatformDetector>
  );
}
*/