"use client";

import React, { useState, useEffect } from "react";
import { 
  BellIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  XMarkIcon,
  ClockIcon
} from "@heroicons/react/24/outline";

interface Alert {
  id: string;
  type: "error" | "warning" | "info" | "success";
  title: string;
  message: string;
  timestamp: string;
  severity: "high" | "medium" | "low";
  source: string;
  acknowledged: boolean;
}

const mockAlerts: Alert[] = [
  {
    id: "1",
    type: "error",
    title: "Agent Offline",
    message: "AI Agent Delta has gone offline unexpectedly",
    timestamp: "2 minutes ago",
    severity: "high",
    source: "System Monitor",
    acknowledged: false
  },
  {
    id: "2",
    type: "warning",
    title: "High Call Volume",
    message: "Call queue has exceeded 20 customers",
    timestamp: "5 minutes ago",
    severity: "medium",
    source: "Queue Manager",
    acknowledged: false
  },
  {
    id: "3",
    type: "info",
    title: "System Update",
    message: "Scheduled maintenance completed successfully",
    timestamp: "15 minutes ago",
    severity: "low",
    source: "System Admin",
    acknowledged: true
  },
  {
    id: "4",
    type: "warning",
    title: "Low Satisfaction Score",
    message: "Customer satisfaction dropped below 4.0",
    timestamp: "20 minutes ago",
    severity: "medium",
    source: "Analytics",
    acknowledged: false
  },
  {
    id: "5",
    type: "success",
    title: "New Agent Deployed",
    message: "AI Agent Epsilon is now online and ready",
    timestamp: "1 hour ago",
    severity: "low",
    source: "Deployment",
    acknowledged: true
  }
];

export default function RealTimeAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>(mockAlerts);
  const [filter, setFilter] = useState<"all" | "unacknowledged" | "high">("all");

  // Simulate real-time alerts
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate new alerts occasionally
      if (Math.random() < 0.1) { // 10% chance every 5 seconds
        const newAlert: Alert = {
          id: Date.now().toString(),
          type: "warning",
          title: "System Alert",
          message: "New alert generated for testing",
          timestamp: "Just now",
          severity: "medium",
          source: "Test System",
          acknowledged: false
        };
        setAlerts(prev => [newAlert, ...prev]);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "error":
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400" />;
      case "warning":
        return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />;
      case "info":
        return <InformationCircleIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
      case "success":
        return <CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400" />;
      default:
        return <InformationCircleIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      case "medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "low":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const acknowledgeAlert = (alertId: string) => {
    setAlerts(alerts.map(alert => 
      alert.id === alertId 
        ? { ...alert, acknowledged: true }
        : alert
    ));
  };

  const dismissAlert = (alertId: string) => {
    setAlerts(alerts.filter(alert => alert.id !== alertId));
  };

  const filteredAlerts = alerts.filter(alert => {
    if (filter === "unacknowledged") return !alert.acknowledged;
    if (filter === "high") return alert.severity === "high";
    return true;
  });

  const unacknowledgedCount = alerts.filter(alert => !alert.acknowledged).length;
  const highSeverityCount = alerts.filter(alert => alert.severity === "high").length;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BellIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Real-time Alerts
            </h3>
            {unacknowledgedCount > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
                {unacknowledgedCount}
              </span>
            )}
          </div>
          <div className="flex space-x-1">
            <button
              onClick={() => setFilter("all")}
              className={`px-2 py-1 text-xs font-medium rounded ${
                filter === "all"
                  ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter("unacknowledged")}
              className={`px-2 py-1 text-xs font-medium rounded ${
                filter === "unacknowledged"
                  ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300"
              }`}
            >
              Unread
            </button>
            <button
              onClick={() => setFilter("high")}
              className={`px-2 py-1 text-xs font-medium rounded ${
                filter === "high"
                  ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300"
              }`}
            >
              High
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="space-y-3">
          {filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-3 border rounded-lg transition-all duration-200 ${
                alert.acknowledged
                  ? "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50"
                  : "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20"
              }`}
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-0.5">
                  {getAlertIcon(alert.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                      {alert.title}
                    </h4>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(alert.severity)}`}>
                      {alert.severity}
                    </span>
                    {!alert.acknowledged && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
                        New
                      </span>
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {alert.message}
                  </p>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center space-x-2">
                      <ClockIcon className="w-3 h-3" />
                      <span>{alert.timestamp}</span>
                    </div>
                    <span>Source: {alert.source}</span>
                  </div>
                </div>
                
                <div className="flex flex-col space-y-1">
                  {!alert.acknowledged && (
                    <button
                      onClick={() => acknowledgeAlert(alert.id)}
                      className="p-1.5 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                      title="Acknowledge"
                    >
                      <CheckCircleIcon className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => dismissAlert(alert.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                    title="Dismiss"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredAlerts.length === 0 && (
          <div className="text-center py-8">
            <BellIcon className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              No alerts found for the selected filter.
            </p>
          </div>
        )}

        {/* Alert Summary */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {highSeverityCount}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">High Priority</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {unacknowledgedCount}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Unread</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {alerts.length}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Total</div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-4 flex space-x-2">
          <button className="flex-1 px-3 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
            Acknowledge All
          </button>
          <button className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
            Clear All
          </button>
        </div>
      </div>
    </div>
  );
}
