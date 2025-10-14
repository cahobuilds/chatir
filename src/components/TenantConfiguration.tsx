"use client";

import React, { useState } from "react";
import { 
  CogIcon,
  ShieldCheckIcon,
  PaintBrushIcon,
  GlobeAltIcon
} from "@heroicons/react/24/outline";

export default function TenantConfiguration() {
  const [config, setConfig] = useState({
    branding: {
      logo: "",
      primaryColor: "#4F46E5",
      secondaryColor: "#06B6D4",
      favicon: "",
      customDomain: "",
      customCSS: ""
    },
    features: {
      voiceAgents: true,
      chatAgents: true,
      callRecording: true,
      analytics: true,
      integrations: true,
      customWorkflows: false,
      whiteLabel: false
    },
    limits: {
      maxAgents: 50,
      maxConcurrentCalls: 100,
      maxSubtenants: 10,
      storageLimit: "100GB",
      apiRateLimit: 1000
    },
    security: {
      ssoEnabled: false,
      mfaRequired: true,
      sessionTimeout: 480,
      ipWhitelist: "",
      auditLogging: true
    }
  });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <CogIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Tenant Configuration
          </h3>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Branding Settings */}
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <PaintBrushIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
              Branding & Customization
            </h4>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Primary Color
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={config.branding.primaryColor}
                    onChange={(e) => setConfig({
                      ...config,
                      branding: {...config.branding, primaryColor: e.target.value}
                    })}
                    className="w-10 h-10 border border-gray-300 dark:border-gray-600 rounded-lg"
                  />
                  <input
                    type="text"
                    value={config.branding.primaryColor}
                    onChange={(e) => setConfig({
                      ...config,
                      branding: {...config.branding, primaryColor: e.target.value}
                    })}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Secondary Color
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={config.branding.secondaryColor}
                    onChange={(e) => setConfig({
                      ...config,
                      branding: {...config.branding, secondaryColor: e.target.value}
                    })}
                    className="w-10 h-10 border border-gray-300 dark:border-gray-600 rounded-lg"
                  />
                  <input
                    type="text"
                    value={config.branding.secondaryColor}
                    onChange={(e) => setConfig({
                      ...config,
                      branding: {...config.branding, secondaryColor: e.target.value}
                    })}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white text-sm"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Custom Domain
              </label>
              <input
                type="text"
                value={config.branding.customDomain}
                onChange={(e) => setConfig({
                  ...config,
                  branding: {...config.branding, customDomain: e.target.value}
                })}
                placeholder="tenant.example.com"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Custom CSS
              </label>
              <textarea
                value={config.branding.customCSS}
                onChange={(e) => setConfig({
                  ...config,
                  branding: {...config.branding, customCSS: e.target.value}
                })}
                rows={4}
                placeholder="/* Custom CSS styles */"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white font-mono text-sm"
              />
            </div>
          </div>
        </div>

        {/* Feature Toggles */}
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <GlobeAltIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
              Feature Configuration
            </h4>
          </div>
          
          <div className="space-y-4">
            {Object.entries(config.features).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {getFeatureDescription(key)}
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={(e) => setConfig({
                      ...config,
                      features: {...config.features, [key]: e.target.checked}
                    })}
                    className="sr-only peer"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-indigo-600 peer-checked:after:translate-x-full peer-checked:after:border-white dark:border-gray-600 dark:bg-gray-700"></div>
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Resource Limits */}
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <ShieldCheckIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
              Resource Limits
            </h4>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Max Agents
              </label>
              <input
                type="number"
                value={config.limits.maxAgents}
                onChange={(e) => setConfig({
                  ...config,
                  limits: {...config.limits, maxAgents: parseInt(e.target.value)}
                })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Max Concurrent Calls
              </label>
              <input
                type="number"
                value={config.limits.maxConcurrentCalls}
                onChange={(e) => setConfig({
                  ...config,
                  limits: {...config.limits, maxConcurrentCalls: parseInt(e.target.value)}
                })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Max Subtenants
              </label>
              <input
                type="number"
                value={config.limits.maxSubtenants}
                onChange={(e) => setConfig({
                  ...config,
                  limits: {...config.limits, maxSubtenants: parseInt(e.target.value)}
                })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                API Rate Limit (per hour)
              </label>
              <input
                type="number"
                value={config.limits.apiRateLimit}
                onChange={(e) => setConfig({
                  ...config,
                  limits: {...config.limits, apiRateLimit: parseInt(e.target.value)}
                })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <ShieldCheckIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
              Security Settings
            </h4>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  SSO Integration
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Enable single sign-on authentication
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.security.ssoEnabled}
                  onChange={(e) => setConfig({
                    ...config,
                    security: {...config.security, ssoEnabled: e.target.checked}
                  })}
                  className="sr-only peer"
                />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-indigo-600 peer-checked:after:translate-x-full peer-checked:after:border-white dark:border-gray-600 dark:bg-gray-700"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  MFA Required
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Require multi-factor authentication
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.security.mfaRequired}
                  onChange={(e) => setConfig({
                    ...config,
                    security: {...config.security, mfaRequired: e.target.checked}
                  })}
                  className="sr-only peer"
                />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-indigo-600 peer-checked:after:translate-x-full peer-checked:after:border-white dark:border-gray-600 dark:bg-gray-700"></div>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Session Timeout (minutes)
              </label>
              <input
                type="number"
                value={config.security.sessionTimeout}
                onChange={(e) => setConfig({
                  ...config,
                  security: {...config.security, sessionTimeout: parseInt(e.target.value)}
                })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <button className="w-full inline-flex items-center justify-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
            <CogIcon className="w-4 h-4 mr-2" />
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
}

function getFeatureDescription(key: string): string {
  const descriptions: Record<string, string> = {
    voiceAgents: "Enable AI voice agents for phone calls",
    chatAgents: "Enable AI chat agents for messaging",
    callRecording: "Record and store call conversations",
    analytics: "Access to analytics and reporting",
    integrations: "Connect with external services",
    customWorkflows: "Create custom call flow workflows",
    whiteLabel: "Remove branding and customize appearance"
  };
  return descriptions[key] || "Feature description";
}
