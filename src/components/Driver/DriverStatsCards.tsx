import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Car,
  Calendar,
  IndianRupee,
  TrendingUp,
  Clock,
  CheckCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Stats {
  activeRides: number;
  upcomingRides: number;
  totalEarnings: number;
}

interface DriverStatsCardsProps {
  stats: Stats;
}

export const DriverStatsCards: React.FC<DriverStatsCardsProps> = ({ stats }) => {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <Card
        className="border-l-4 border-l-primary hover:shadow-lg transition-all duration-200 cursor-pointer group"
        onClick={() => navigate("/driver/post-rides")}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-primary group-hover:text-primary/80">
            Active Rides
          </CardTitle>
          <div className="p-2 bg-primary/10 rounded-full group-hover:bg-primary/20 transition-colors">
            <Car className="h-4 w-4 text-primary" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{stats.activeRides}</div>
          <p className="text-xs text-muted-foreground flex items-center mt-1">
            <TrendingUp className="h-3 w-3 mr-1" />
            Click to post rides
          </p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-blue-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-blue-600">
            Upcoming Rides
          </CardTitle>
          <div className="p-2 bg-blue-100 rounded-full">
            <Calendar className="h-4 w-4 text-blue-600" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{stats.upcomingRides}</div>
          <p className="text-xs text-muted-foreground flex items-center mt-1">
            <Clock className="h-3 w-3 mr-1" />
            This week
          </p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-green-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-green-600">
            Total Earnings
          </CardTitle>
          <div className="p-2 bg-green-100 rounded-full">
            <IndianRupee className="h-4 w-4 text-green-600" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">₹{stats.totalEarnings}</div>
          <p className="text-xs text-muted-foreground flex items-center mt-1">
            <CheckCircle className="h-3 w-3 mr-1" />
            All time
          </p>
        </CardContent>
      </Card>
    </div>
  );
};