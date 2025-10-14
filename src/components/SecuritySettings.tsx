"use client";

import React, { useState } from "react";
import { 
  ShieldCheckIcon,
  KeyIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ComputerDesktopIcon
} from "@heroicons/react/24/outline";

interface SecurityPolicy {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  severity: "low" | "medium" | "high" | "critical";
  lastModified: string;
}

const mockPolicies: SecurityPolicy[] = [
  {
    id: "1",
    name: "Password Complexity",
    description: "Enforce strong password requirements",
    enabled: true,
    severity: "high",
    lastModified: "2024-12-19"
  },
  {
    id: "2",
    name: "Two-Factor Authentication",
    description: "Require 2FA for all admin accounts",
    enabled: true,
    severity: "critical",
    lastModified: "2024-12-19"
  },
  {
    id: "3",
    name: "Session Timeout",
    description: "Auto-logout after 30 minutes of inactivity",
    enabled: true,
    severity: "medium",
    lastModified: "2024-12-18"
  },
  {
    id: "4",
    name: "IP Whitelist",
    description: "Restrict access to specific IP addresses",
    enabled: false,
    severity: "high",
    lastModified: "2024-12-17"
  },
  {
    id: "5",
    name: "Failed Login Lockout",
    description: "Lock account after 5 failed login attempts",
    enabled: true,
    severity: "high",
    lastModified: "2024-12-19"
  },
  {
    id: "6",
    name: "API Rate Limiting",
    description: "Limit API requests per user per minute",
    enabled: true,
    severity: "medium",
    lastModified: "2024-12-16"
  }
];

const mockActiveSessions = [
  {
    id: "1",
    userId: "user-001",
    userName: "John Smith",
    ipAddress: "192.168.1.100",
    location: "San Francisco, CA",
    userAgent: "Chrome on macOS",
    lastActivity: "2 minutes ago",
    isCurrent: true
  },
  {
    id: "2",
    userId: "user-002",
    userName: "Sarah Johnson",
    ipAddress: "10.0.0.45",
    location: "New York, NY",
    userAgent: "Firefox on Windows",
    lastActivity: "15 minutes ago",
    isCurrent: false
  },
  {
    id: "3",
    userId: "user-003",
    userName: "Mike Chen",
    ipAddress: "172.16.0.12",
    location: "Austin, TX",
    userAgent: "Safari on macOS",
    lastActivity: "1 hour ago",
    isCurrent: false
  }
];

export default function SecuritySettings() {
  const [policies, setPolicies] = useState<SecurityPolicy[]>(mockPolicies);
  const [activeSessions, setActiveSessions] = useState(mockActiveSessions);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showApiKeyForm, setShowApiKeyForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      case "high":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300";
      case "medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "low":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const togglePolicy = (policyId: string) => {
    setPolicies(policies.map(policy => 
      policy.id === policyId 
        ? { ...policy, enabled: !policy.enabled }
        : policy
    ));
  };

  const terminateSession = (sessionId: string) => {
    setActiveSessions(activeSessions.filter(session => session.id !== sessionId));
  };

  const terminateAllSessions = () => {
    setActiveSessions(activeSessions.filter(session => session.isCurrent));
  };

  const generateApiKey = () => {
    const newKey = `ak_${Math.random().toString(36).substr(2, 9)}_${Date.now().toString(36)}`;
    alert(`New API Key Generated: ${newKey}\n\nPlease save this key securely. It will not be shown again.`);
    setShowApiKeyForm(false);
  };

  return (
    <div className="space-y-6">
      {/* Security Policies */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <ShieldCheckIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Security Policies
            </h3>
          </div>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {policies.map((policy) => (
              <div
                key={policy.id}
                className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                      {policy.name}
                    </h4>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(policy.severity)}`}>
                      {policy.severity}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    {policy.description}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    Last modified: {policy.lastModified}
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={policy.enabled}
                    onChange={() => togglePolicy(policy.id)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Password Management */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <LockClosedIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Password Management
              </h3>
            </div>
            <button
              onClick={() => setShowPasswordForm(!showPasswordForm)}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Change Password
            </button>
          </div>
        </div>
        <div className="p-6">
          {showPasswordForm && (
            <div className="space-y-4 mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                Change Password
              </h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(!showPasswords)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showPasswords ? (
                        <EyeSlashIcon className="h-4 w-4 text-gray-400" />
                      ) : (
                        <EyeIcon className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    New Password
                  </label>
                  <input
                    type={showPasswords ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type={showPasswords ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <div className="flex space-x-3">
                  <button className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                    Update Password
                  </button>
                  <button
                    onClick={() => setShowPasswordForm(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircleIcon className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  Password Strength
                </span>
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Strong (12+ characters, mixed case, numbers, symbols)
              </div>
            </div>
            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <ClockIcon className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  Last Changed
                </span>
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                30 days ago
              </div>
            </div>
            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <ExclamationTriangleIcon className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  Expires In
                </span>
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                60 days
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* API Key Management */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <KeyIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                API Key Management
              </h3>
            </div>
            <button
              onClick={() => setShowApiKeyForm(!showApiKeyForm)}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Generate New Key
            </button>
          </div>
        </div>
        <div className="p-6">
          {showApiKeyForm && (
            <div className="mb-6 p-4 border border-yellow-200 dark:border-yellow-800 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
              <div className="flex items-start space-x-2">
                <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    Generate New API Key
                  </h4>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    This will invalidate your current API key. Make sure to update any applications using the current key.
                  </p>
                  <button
                    onClick={generateApiKey}
                    className="mt-3 px-4 py-2 bg-yellow-600 text-white text-sm font-medium rounded-lg hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
                  >
                    Generate New Key
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  Current API Key
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Created: 2024-12-01
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <code className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-sm font-mono text-gray-800 dark:text-gray-200 rounded border">
                  ak_••••••••••••••••••••••••••••••••••••••••
                </code>
                <button className="px-3 py-2 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300">
                  Copy
                </button>
                <button className="px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300">
                  Revoke
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Sessions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ComputerDesktopIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Active Sessions
              </h3>
            </div>
            <button
              onClick={terminateAllSessions}
              className="px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
            >
              Terminate All Others
            </button>
          </div>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {activeSessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {session.userName}
                    </span>
                    {session.isCurrent && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                        Current
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                    <div>IP: {session.ipAddress} • {session.location}</div>
                    <div>{session.userAgent}</div>
                    <div>Last activity: {session.lastActivity}</div>
                  </div>
                </div>
                {!session.isCurrent && (
                  <button
                    onClick={() => terminateSession(session.id)}
                    className="px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                  >
                    Terminate
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
