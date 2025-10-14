"use client";

import React, { useState } from "react";
import { 
  ShieldCheckIcon,
  KeyIcon,
  EyeIcon,
  EyeSlashIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from "@heroicons/react/24/outline";

export default function TenantSecurity() {
  const [showApiKey, setShowApiKey] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [securitySettings, setSecuritySettings] = useState({
    twoFactorAuth: true,
    sessionTimeout: 30,
    ipWhitelist: ["192.168.1.0/24", "10.0.0.0/8"],
    apiKey: "sk_live_51H...abc123",
    lastRotated: "2024-01-15",
    securityAlerts: [
      {
        id: 1,
        type: "login",
        message: "New login from IP 192.168.1.100",
        timestamp: "2024-01-20T10:30:00Z",
        severity: "info"
      },
      {
        id: 2,
        type: "api",
        message: "Unusual API usage pattern detected",
        timestamp: "2024-01-19T15:45:00Z",
        severity: "warning"
      },
      {
        id: 3,
        type: "access",
        message: "Failed login attempt from blocked IP",
        timestamp: "2024-01-18T09:15:00Z",
        severity: "error"
      }
    ],
    compliance: {
      gdpr: true,
      ccpa: true,
      hipaa: false,
      sox: false
    }
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "error": return "text-red-600 dark:text-red-400";
      case "warning": return "text-yellow-600 dark:text-yellow-400";
      case "info": return "text-blue-600 dark:text-blue-400";
      default: return "text-gray-600 dark:text-gray-400";
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "error": return <ExclamationTriangleIcon className="w-4 h-4 text-red-600 dark:text-red-400" />;
      case "warning": return <ExclamationTriangleIcon className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />;
      case "info": return <CheckCircleIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      default: return <CheckCircleIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <ShieldCheckIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Security & Compliance
          </h3>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Security Settings */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
            Security Settings
          </h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <ShieldCheckIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Two-Factor Authentication
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Add an extra layer of security to your account
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                  Enabled
                </span>
                <button className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">
                  Configure
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <KeyIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Session Timeout
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Automatically log out inactive users
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {securitySettings.sessionTimeout} minutes
                </span>
                <button className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">
                  Change
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* API Key Management */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
            API Key Management
          </h4>
          <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Primary API Key
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Last rotated: {new Date(securitySettings.lastRotated).toLocaleDateString()}
                </p>
              </div>
              <div className="flex space-x-2">
                <button className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">
                  Rotate
                </button>
                <button className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">
                  Revoke
                </button>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <code className="flex-1 text-sm font-mono text-gray-900 dark:text-white">
                {showApiKey ? securitySettings.apiKey : "sk_live_51H...abc123"}
              </code>
              <button
                onClick={() => setShowApiKey(!showApiKey)}
                className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                {showApiKey ? (
                  <EyeSlashIcon className="w-4 h-4" />
                ) : (
                  <EyeIcon className="w-4 h-4" />
                )}
              </button>
              <button className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                Copy
              </button>
            </div>
          </div>
        </div>

        {/* IP Whitelist */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
            IP Whitelist
          </h4>
          <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Restrict access to specific IP addresses or ranges
              </p>
              <button className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">
                Add IP
              </button>
            </div>
            
            <div className="space-y-2">
              {securitySettings.ipWhitelist.map((ip, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                  <span className="text-sm font-mono text-gray-900 dark:text-white">{ip}</span>
                  <button className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Compliance Status */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
            Compliance Status
          </h4>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(securitySettings.compliance).map(([standard, enabled]) => (
              <div key={standard} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${enabled ? 'bg-green-100 dark:bg-green-900/20' : 'bg-gray-100 dark:bg-gray-700'}`}>
                    <ShieldCheckIcon className={`w-5 h-5 ${enabled ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {standard.toUpperCase()}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {enabled ? 'Compliant' : 'Not configured'}
                    </p>
                  </div>
                </div>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  enabled 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                }`}>
                  {enabled ? 'Active' : 'Inactive'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Security Alerts */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
              Recent Security Alerts
            </h4>
            <button className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">
              View All
            </button>
          </div>
          
          <div className="space-y-3">
            {securitySettings.securityAlerts.map((alert) => (
              <div key={alert.id} className="flex items-start space-x-3 p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                <div className="mt-0.5">
                  {getSeverityIcon(alert.severity)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {alert.message}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(alert.timestamp).toLocaleString()}
                  </p>
                </div>
                <span className={`text-xs font-medium ${getSeverityColor(alert.severity)}`}>
                  {alert.severity}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
