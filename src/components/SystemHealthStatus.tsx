"use client";

import React from "react";

interface SystemComponent {
  name: string;
  status: "healthy" | "warning" | "critical";
  uptime: string;
  responseTime: string;
  lastCheck: string;
}

const systemComponents: SystemComponent[] = [
  {
    name: "AI Voice Engine",
    status: "healthy",
    uptime: "99.9%",
    responseTime: "145ms",
    lastCheck: "2s ago"
  },
  {
    name: "Chat Processing",
    status: "healthy",
    uptime: "99.8%",
    responseTime: "89ms",
    lastCheck: "1s ago"
  },
  {
    name: "Call Routing",
    status: "warning",
    uptime: "98.2%",
    responseTime: "234ms",
    lastCheck: "3s ago"
  },
  {
    name: "Analytics Engine",
    status: "healthy",
    uptime: "99.5%",
    responseTime: "156ms",
    lastCheck: "2s ago"
  },
  {
    name: "Recording Service",
    status: "critical",
    uptime: "95.1%",
    responseTime: "1.2s",
    lastCheck: "5s ago"
  }
];

export default function SystemHealthStatus() {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy": return "bg-green-500";
      case "warning": return "bg-yellow-500";
      case "critical": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getStatusText = (status: string) => {
    switch (status) {
      case "healthy": return "Healthy";
      case "warning": return "Warning";
      case "critical": return "Critical";
      default: return "Unknown";
    }
  };

  const getOverallStatus = () => {
    const hasCritical = systemComponents.some(c => c.status === 'critical');
    const hasWarning = systemComponents.some(c => c.status === 'warning');
    
    if (hasCritical) return { status: 'critical', text: 'System Issues' };
    if (hasWarning) return { status: 'warning', text: 'Degraded Performance' };
    return { status: 'healthy', text: 'All Systems Operational' };
  };

  const overall = getOverallStatus();

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          System Health
        </h3>
        <div className="flex items-center space-x-2">
          <div className={`h-2 w-2 rounded-full ${getStatusColor(overall.status)}`}></div>
          <span className={`text-sm font-medium ${
            overall.status === 'healthy' ? 'text-green-600' :
            overall.status === 'warning' ? 'text-yellow-600' :
            'text-red-600'
          }`}>
            {overall.text}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {systemComponents.map((component, index) => (
          <div
            key={index}
            className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900"
          >
            <div className="flex items-center space-x-3">
              <div className={`h-2 w-2 rounded-full ${getStatusColor(component.status)}`}></div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {component.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {component.uptime} uptime
                </p>
              </div>
            </div>
            
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {component.responseTime}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {component.lastCheck}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* System Actions */}
      <div className="mt-6 flex justify-center space-x-2">
        <button className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600">
          View Logs
        </button>
        <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700">
          Health Check
        </button>
      </div>

      {/* Recent Alerts */}
      <div className="mt-4 rounded-lg bg-red-50 p-3 dark:bg-red-900/20">
        <div className="flex items-center space-x-2">
          <span className="text-red-600 dark:text-red-400">⚠️</span>
          <p className="text-sm text-red-700 dark:text-red-300">
            Recording Service experiencing high latency
          </p>
        </div>
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">
          Last alert: 2 minutes ago
        </p>
      </div>
    </div>
  );
}
