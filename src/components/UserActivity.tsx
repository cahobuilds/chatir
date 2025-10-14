"use client";

import React, { useState } from "react";
import { 
  ClockIcon,
  ComputerDesktopIcon,
  MapPinIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from "@heroicons/react/24/outline";

interface Activity {
  id: string;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  timestamp: string;
  ipAddress: string;
  userAgent: string;
  location: string;
  status: "success" | "warning" | "error";
  details?: string;
}

const mockActivities: Activity[] = [
  {
    id: "1",
    userId: "user-001",
    userName: "John Smith",
    action: "Login",
    resource: "Dashboard",
    timestamp: "2024-12-19 14:30:25",
    ipAddress: "192.168.1.100",
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    location: "San Francisco, CA",
    status: "success"
  },
  {
    id: "2",
    userId: "user-002",
    userName: "Sarah Johnson",
    action: "Created",
    resource: "Voice Agent: SupportBot",
    timestamp: "2024-12-19 14:28:15",
    ipAddress: "10.0.0.45",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    location: "New York, NY",
    status: "success"
  },
  {
    id: "3",
    userId: "user-003",
    userName: "Mike Chen",
    action: "Failed Login",
    resource: "Authentication",
    timestamp: "2024-12-19 14:25:10",
    ipAddress: "203.0.113.42",
    userAgent: "Mozilla/5.0 (X11; Linux x86_64)",
    location: "Unknown",
    status: "error",
    details: "Invalid credentials"
  },
  {
    id: "4",
    userId: "user-001",
    userName: "John Smith",
    action: "Updated",
    resource: "Role: Manager",
    timestamp: "2024-12-19 14:20:30",
    ipAddress: "192.168.1.100",
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    location: "San Francisco, CA",
    status: "success"
  },
  {
    id: "5",
    userId: "user-004",
    userName: "Emily Davis",
    action: "Deleted",
    resource: "Webhook: CRM Sync",
    timestamp: "2024-12-19 14:15:45",
    ipAddress: "172.16.0.12",
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    location: "Austin, TX",
    status: "warning"
  },
  {
    id: "6",
    userId: "user-002",
    userName: "Sarah Johnson",
    action: "Accessed",
    resource: "Call History",
    timestamp: "2024-12-19 14:10:20",
    ipAddress: "10.0.0.45",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    location: "New York, NY",
    status: "success"
  },
  {
    id: "7",
    userId: "user-005",
    userName: "David Wilson",
    action: "Permission Denied",
    resource: "System Settings",
    timestamp: "2024-12-19 14:05:15",
    ipAddress: "198.51.100.25",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    location: "Chicago, IL",
    status: "error",
    details: "Insufficient permissions"
  },
  {
    id: "8",
    userId: "user-001",
    userName: "John Smith",
    action: "Exported",
    resource: "Analytics Report",
    timestamp: "2024-12-19 14:00:00",
    ipAddress: "192.168.1.100",
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    location: "San Francisco, CA",
    status: "success"
  }
];

export default function UserActivity() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [activities, setActivities] = useState<Activity[]>(mockActivities);
  const [filter, setFilter] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<string>("24h");

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
      case "warning":
        return <ExclamationTriangleIcon className="w-4 h-4 text-yellow-500" />;
      case "error":
        return <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />;
      default:
        return <ClockIcon className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "warning":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "error":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const filteredActivities = activities.filter(activity => {
    if (filter === "all") return true;
    return activity.status === filter;
  });

  const getBrowserInfo = (userAgent: string) => {
    if (userAgent.includes("Chrome")) return "Chrome";
    if (userAgent.includes("Firefox")) return "Firefox";
    if (userAgent.includes("Safari")) return "Safari";
    if (userAgent.includes("Edge")) return "Edge";
    return "Unknown";
  };

  const getOSInfo = (userAgent: string) => {
    if (userAgent.includes("Mac OS X")) return "macOS";
    if (userAgent.includes("Windows NT")) return "Windows";
    if (userAgent.includes("Linux")) return "Linux";
    return "Unknown";
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ClockIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              User Activity Log
            </h3>
          </div>
          <div className="flex items-center space-x-3">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Activities</option>
              <option value="success">Success</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
            </select>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="space-y-4">
          {filteredActivities.map((activity) => (
            <div
              key={activity.id}
              className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-1">
                  {getStatusIcon(activity.status)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {activity.userName}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {activity.action}
                      </span>
                      <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                        {activity.resource}
                      </span>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(activity.status)}`}>
                      {activity.status}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400 mb-2">
                    <div className="flex items-center space-x-1">
                      <ClockIcon className="w-3 h-3" />
                      <span>{activity.timestamp}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <MapPinIcon className="w-3 h-3" />
                      <span>{activity.location}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <ComputerDesktopIcon className="w-3 h-3" />
                      <span>{getOSInfo(activity.userAgent)}</span>
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    <span className="font-medium">IP:</span> {activity.ipAddress} • 
                    <span className="font-medium ml-1">Browser:</span> {getBrowserInfo(activity.userAgent)}
                  </div>
                  
                  {activity.details && (
                    <div className="mt-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">
                      {activity.details}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Activity Summary */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {activities.filter(a => a.status === "success").length}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Successful</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {activities.filter(a => a.status === "warning").length}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Warnings</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {activities.filter(a => a.status === "error").length}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Errors</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                {new Set(activities.map(a => a.userId)).size}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Active Users</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
