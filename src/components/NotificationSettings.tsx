"use client";

import React, { useState } from "react";
import { 
  BellIcon,
  EnvelopeIcon,
  ChatBubbleLeftRightIcon,
  ExclamationTriangleIcon
} from "@heroicons/react/24/outline";

export default function NotificationSettings() {
  const [notifications, setNotifications] = useState({
    email: {
      enabled: true,
      systemAlerts: true,
      callAlerts: true,
      qualityReports: false,
      weeklyReports: true
    },
    sms: {
      enabled: false,
      criticalAlerts: true,
      systemDown: true
    },
    push: {
      enabled: true,
      newCalls: true,
      agentStatus: false,
      qualityIssues: true
    },
    webhook: {
      enabled: true,
      callEvents: true,
      agentEvents: false,
      systemEvents: true
    }
  });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <BellIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Notification Settings
          </h3>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Email Notifications */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <EnvelopeIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                Email Notifications
              </h4>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notifications.email.enabled}
                onChange={(e) => setNotifications({
                  ...notifications,
                  email: {...notifications.email, enabled: e.target.checked}
                })}
                className="sr-only peer"
              />
              <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-indigo-600 peer-checked:after:translate-x-full peer-checked:after:border-white dark:border-gray-600 dark:bg-gray-700"></div>
            </label>
          </div>
          
          {notifications.email.enabled && (
            <div className="space-y-3 ml-6">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300">System Alerts</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifications.email.systemAlerts}
                    onChange={(e) => setNotifications({
                      ...notifications,
                      email: {...notifications.email, systemAlerts: e.target.checked}
                    })}
                    className="sr-only peer"
                  />
                  <div className="peer h-4 w-7 rounded-full bg-gray-200 after:absolute after:top-[1px] after:left-[1px] after:h-3 after:w-3 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-indigo-600 peer-checked:after:translate-x-full peer-checked:after:border-white dark:border-gray-600 dark:bg-gray-700"></div>
                </label>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300">Call Alerts</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifications.email.callAlerts}
                    onChange={(e) => setNotifications({
                      ...notifications,
                      email: {...notifications.email, callAlerts: e.target.checked}
                    })}
                    className="sr-only peer"
                  />
                  <div className="peer h-4 w-7 rounded-full bg-gray-200 after:absolute after:top-[1px] after:left-[1px] after:h-3 after:w-3 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-indigo-600 peer-checked:after:translate-x-full peer-checked:after:border-white dark:border-gray-600 dark:bg-gray-700"></div>
                </label>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300">Quality Reports</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifications.email.qualityReports}
                    onChange={(e) => setNotifications({
                      ...notifications,
                      email: {...notifications.email, qualityReports: e.target.checked}
                    })}
                    className="sr-only peer"
                  />
                  <div className="peer h-4 w-7 rounded-full bg-gray-200 after:absolute after:top-[1px] after:left-[1px] after:h-3 after:w-3 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-indigo-600 peer-checked:after:translate-x-full peer-checked:after:border-white dark:border-gray-600 dark:bg-gray-700"></div>
                </label>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300">Weekly Reports</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifications.email.weeklyReports}
                    onChange={(e) => setNotifications({
                      ...notifications,
                      email: {...notifications.email, weeklyReports: e.target.checked}
                    })}
                    className="sr-only peer"
                  />
                  <div className="peer h-4 w-7 rounded-full bg-gray-200 after:absolute after:top-[1px] after:left-[1px] after:h-3 after:w-3 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-indigo-600 peer-checked:after:translate-x-full peer-checked:after:border-white dark:border-gray-600 dark:bg-gray-700"></div>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* SMS Notifications */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <ChatBubbleLeftRightIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                SMS Notifications
              </h4>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notifications.sms.enabled}
                onChange={(e) => setNotifications({
                  ...notifications,
                  sms: {...notifications.sms, enabled: e.target.checked}
                })}
                className="sr-only peer"
              />
              <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-indigo-600 peer-checked:after:translate-x-full peer-checked:after:border-white dark:border-gray-600 dark:bg-gray-700"></div>
            </label>
          </div>
          
          {notifications.sms.enabled && (
            <div className="space-y-3 ml-6">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300">Critical Alerts</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifications.sms.criticalAlerts}
                    onChange={(e) => setNotifications({
                      ...notifications,
                      sms: {...notifications.sms, criticalAlerts: e.target.checked}
                    })}
                    className="sr-only peer"
                  />
                  <div className="peer h-4 w-7 rounded-full bg-gray-200 after:absolute after:top-[1px] after:left-[1px] after:h-3 after:w-3 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-indigo-600 peer-checked:after:translate-x-full peer-checked:after:border-white dark:border-gray-600 dark:bg-gray-700"></div>
                </label>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300">System Down</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifications.sms.systemDown}
                    onChange={(e) => setNotifications({
                      ...notifications,
                      sms: {...notifications.sms, systemDown: e.target.checked}
                    })}
                    className="sr-only peer"
                  />
                  <div className="peer h-4 w-7 rounded-full bg-gray-200 after:absolute after:top-[1px] after:left-[1px] after:h-3 after:w-3 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-indigo-600 peer-checked:after:translate-x-full peer-checked:after:border-white dark:border-gray-600 dark:bg-gray-700"></div>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Push Notifications */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <BellIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                Push Notifications
              </h4>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notifications.push.enabled}
                onChange={(e) => setNotifications({
                  ...notifications,
                  push: {...notifications.push, enabled: e.target.checked}
                })}
                className="sr-only peer"
              />
              <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-indigo-600 peer-checked:after:translate-x-full peer-checked:after:border-white dark:border-gray-600 dark:bg-gray-700"></div>
            </label>
          </div>
          
          {notifications.push.enabled && (
            <div className="space-y-3 ml-6">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300">New Calls</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifications.push.newCalls}
                    onChange={(e) => setNotifications({
                      ...notifications,
                      push: {...notifications.push, newCalls: e.target.checked}
                    })}
                    className="sr-only peer"
                  />
                  <div className="peer h-4 w-7 rounded-full bg-gray-200 after:absolute after:top-[1px] after:left-[1px] after:h-3 after:w-3 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-indigo-600 peer-checked:after:translate-x-full peer-checked:after:border-white dark:border-gray-600 dark:bg-gray-700"></div>
                </label>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300">Agent Status</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifications.push.agentStatus}
                    onChange={(e) => setNotifications({
                      ...notifications,
                      push: {...notifications.push, agentStatus: e.target.checked}
                    })}
                    className="sr-only peer"
                  />
                  <div className="peer h-4 w-7 rounded-full bg-gray-200 after:absolute after:top-[1px] after:left-[1px] after:h-3 after:w-3 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-indigo-600 peer-checked:after:translate-x-full peer-checked:after:border-white dark:border-gray-600 dark:bg-gray-700"></div>
                </label>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300">Quality Issues</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifications.push.qualityIssues}
                    onChange={(e) => setNotifications({
                      ...notifications,
                      push: {...notifications.push, qualityIssues: e.target.checked}
                    })}
                    className="sr-only peer"
                  />
                  <div className="peer h-4 w-7 rounded-full bg-gray-200 after:absolute after:top-[1px] after:left-[1px] after:h-3 after:w-3 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-indigo-600 peer-checked:after:translate-x-full peer-checked:after:border-white dark:border-gray-600 dark:bg-gray-700"></div>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Webhook Notifications */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <ExclamationTriangleIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                Webhook Notifications
              </h4>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notifications.webhook.enabled}
                onChange={(e) => setNotifications({
                  ...notifications,
                  webhook: {...notifications.webhook, enabled: e.target.checked}
                })}
                className="sr-only peer"
              />
              <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-indigo-600 peer-checked:after:translate-x-full peer-checked:after:border-white dark:border-gray-600 dark:bg-gray-700"></div>
            </label>
          </div>
          
          {notifications.webhook.enabled && (
            <div className="space-y-3 ml-6">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300">Call Events</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifications.webhook.callEvents}
                    onChange={(e) => setNotifications({
                      ...notifications,
                      webhook: {...notifications.webhook, callEvents: e.target.checked}
                    })}
                    className="sr-only peer"
                  />
                  <div className="peer h-4 w-7 rounded-full bg-gray-200 after:absolute after:top-[1px] after:left-[1px] after:h-3 after:w-3 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-indigo-600 peer-checked:after:translate-x-full peer-checked:after:border-white dark:border-gray-600 dark:bg-gray-700"></div>
                </label>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300">Agent Events</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifications.webhook.agentEvents}
                    onChange={(e) => setNotifications({
                      ...notifications,
                      webhook: {...notifications.webhook, agentEvents: e.target.checked}
                    })}
                    className="sr-only peer"
                  />
                  <div className="peer h-4 w-7 rounded-full bg-gray-200 after:absolute after:top-[1px] after:left-[1px] after:h-3 after:w-3 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-indigo-600 peer-checked:after:translate-x-full peer-checked:after:border-white dark:border-gray-600 dark:bg-gray-700"></div>
                </label>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300">System Events</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifications.webhook.systemEvents}
                    onChange={(e) => setNotifications({
                      ...notifications,
                      webhook: {...notifications.webhook, systemEvents: e.target.checked}
                    })}
                    className="sr-only peer"
                  />
                  <div className="peer h-4 w-7 rounded-full bg-gray-200 after:absolute after:top-[1px] after:left-[1px] after:h-3 after:w-3 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-indigo-600 peer-checked:after:translate-x-full peer-checked:after:border-white dark:border-gray-600 dark:bg-gray-700"></div>
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
