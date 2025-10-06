// src/components/maps/shared/components/RouteSelector.tsx
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Clock, 
  MapPin, 
  IndianRupee, 
  Fuel, 
  Zap, 
  Mountain, 
  Camera,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import type { RouteOption } from '@/types/mapTypes';

export interface RouteComparison {
  fastest: RouteOption;
  shortest: RouteOption;
  cheapest: RouteOption;
  timeDifference: number;
  distanceDifference: number;
  costDifference: number;
}

export interface RouteSelectorProps {
  routes: RouteOption[];
  selectedRouteId: string | null;
  onRouteSelect: (routeId: string) => void;
  comparison?: RouteComparison | null;
  isLoading?: boolean;
  className?: string;
  maxDisplayRoutes?: number;
  showComparison?: boolean;
}

const getRouteTypeIcon = (type: string) => {
  switch (type) {
    case 'fastest': return <Zap className="h-4 w-4" />;
    case 'shortest': return <MapPin className="h-4 w-4" />;
    case 'scenic': return <Camera className="h-4 w-4" />;
    case 'optimized': return <TrendingUp className="h-4 w-4" />;
    default: return <Mountain className="h-4 w-4" />;
  }
};

const getRouteTypeColor = (type: string) => {
  switch (type) {
    case 'fastest': return 'bg-blue-500';
    case 'shortest': return 'bg-green-500';
    case 'scenic': return 'bg-purple-500';
    case 'optimized': return 'bg-orange-500';
    default: return 'bg-gray-500';
  }
};

const getTrafficColor = (level: string) => {
  switch (level) {
    case 'low': return 'text-green-600 bg-green-50';
    case 'medium': return 'text-yellow-600 bg-yellow-50';
    case 'high': return 'text-red-600 bg-red-50';
    default: return 'text-gray-600 bg-gray-50';
  }
};

const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
};

const formatDistance = (km: number): string => {
  return `${km.toFixed(1)} km`;
};

const formatCost = (cost: number): string => {
  return `₹${Math.round(cost)}`;
};

const RouteCard: React.FC<{
  route: RouteOption;
  isSelected: boolean;
  onSelect: () => void;
  comparison?: RouteComparison | null;
  showComparison: boolean;
}> = ({ route, isSelected, onSelect, comparison, showComparison }) => {
  const totalCost = route.toll_cost + route.fuel_cost;
  
  // Determine if this route is best in any category
  const isFastest = comparison?.fastest.id === route.id;
  const isShortest = comparison?.shortest.id === route.id;
  const isCheapest = comparison?.cheapest.id === route.id;

  // Calculate differences from fastest route (for relative indicators)
  const timeDiff = comparison ? route.duration_minutes - comparison.fastest.duration_minutes : 0;
  const distanceDiff = comparison ? route.distance_km - comparison.shortest.distance_km : 0;
  const costDiff = comparison ? totalCost - (comparison.cheapest.toll_cost + comparison.cheapest.fuel_cost) : 0;

  return (
    <Card 
      className={`cursor-pointer transition-all duration-200 ${
        isSelected 
          ? 'ring-2 ring-primary shadow-md bg-primary/5' 
          : 'hover:shadow-md bg-white/95 backdrop-blur'
      }`}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${getRouteTypeColor(route.route_type)}`} />
            <span className="font-medium capitalize">{route.route_type}</span>
            {getRouteTypeIcon(route.route_type)}
          </div>
          <Badge className={getTrafficColor(route.traffic_level)}>
            {route.traffic_level} traffic
          </Badge>
        </div>

        {/* Main Stats */}
        <div className="grid grid-cols-3 gap-3 mb-3">
          {/* Duration */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              {isFastest && showComparison && (
                <Badge variant="secondary" className="text-xs px-1">
                  Fastest
                </Badge>
              )}
            </div>
            <div className="font-semibold">{formatDuration(route.duration_minutes)}</div>
            {showComparison && timeDiff > 0 && (
              <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <TrendingUp className="h-3 w-3" />
                +{formatDuration(timeDiff)}
              </div>
            )}
          </div>

          {/* Distance */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              {isShortest && showComparison && (
                <Badge variant="secondary" className="text-xs px-1">
                  Shortest
                </Badge>
              )}
            </div>
            <div className="font-semibold">{formatDistance(route.distance_km)}</div>
            {showComparison && distanceDiff > 0 && (
              <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <TrendingUp className="h-3 w-3" />
                +{formatDistance(distanceDiff)}
              </div>
            )}
          </div>

          {/* Cost */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <IndianRupee className="h-4 w-4 text-muted-foreground" />
              {isCheapest && showComparison && (
                <Badge variant="secondary" className="text-xs px-1">
                  Cheapest
                </Badge>
              )}
            </div>
            <div className="font-semibold">{formatCost(totalCost)}</div>
            {showComparison && costDiff > 0 && (
              <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <TrendingUp className="h-3 w-3" />
                +{formatCost(costDiff)}
              </div>
            )}
          </div>
        </div>

        {/* Cost Breakdown */}
        <div className="flex justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <IndianRupee className="h-3 w-3" />
            <span>{formatCost(route.toll_cost)} tolls</span>
          </div>
          <div className="flex items-center gap-1">
            <Fuel className="h-3 w-3" />
            <span>{formatCost(route.fuel_cost)} fuel</span>
          </div>
        </div>

        {/* Selection Indicator */}
        {isSelected && (
          <div className="mt-3 pt-2 border-t">
            <div className="text-xs text-center text-primary font-medium">
              Selected Route
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const RouteSelector: React.FC<RouteSelectorProps> = ({
  routes,
  selectedRouteId,
  onRouteSelect,
  comparison,
  isLoading = false,
  className = "",
  maxDisplayRoutes = 3,
  showComparison = true
}) => {
  const displayRoutes = routes.slice(0, maxDisplayRoutes);

  if (isLoading && routes.length === 0) {
    return (
      <Card className={`bg-white/95 backdrop-blur ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-center">
            <div className="text-sm text-muted-foreground">
              Calculating route options...
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (routes.length === 0) {
    return (
      <Card className={`bg-white/95 backdrop-blur ${className}`}>
        <CardContent className="p-4">
          <div className="text-center text-sm text-muted-foreground">
            No routes available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Comparison Summary */}
      {showComparison && comparison && routes.length > 1 && (
        <Card className="bg-white/95 backdrop-blur">
          <CardContent className="p-3">
            <div className="text-xs font-medium text-muted-foreground mb-2">
              Route Comparison
            </div>
            <div className="grid grid-cols-3 gap-4 text-xs">
              <div className="text-center">
                <div className="text-muted-foreground">Time Diff</div>
                <div className="font-medium">
                  {formatDuration(comparison.timeDifference)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-muted-foreground">Distance Diff</div>
                <div className="font-medium">
                  {formatDistance(comparison.distanceDifference)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-muted-foreground">Cost Diff</div>
                <div className="font-medium">
                  {formatCost(comparison.costDifference)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Route Options */}
      <div className="grid gap-3">
        {displayRoutes.map((route) => (
          <RouteCard
            key={route.id}
            route={route}
            isSelected={route.id === selectedRouteId}
            onSelect={() => onRouteSelect(route.id)}
            comparison={comparison}
            showComparison={showComparison && routes.length > 1}
          />
        ))}
      </div>

      {/* Show More Button */}
      {routes.length > maxDisplayRoutes && (
        <Card className="bg-white/95 backdrop-blur">
          <CardContent className="p-3">
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full text-xs"
              onClick={() => {
                // This could trigger showing more routes or a detailed view
                console.log('Show more routes requested');
              }}
            >
              Show {routes.length - maxDisplayRoutes} more route{routes.length - maxDisplayRoutes !== 1 ? 's' : ''}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <Card className="bg-white/95 backdrop-blur">
          <CardContent className="p-3">
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
              <span>Updating routes...</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RouteSelector;