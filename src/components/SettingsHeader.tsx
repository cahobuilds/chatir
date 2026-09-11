"use client";

import React, { useState } from "react";
import { 
  CogIcon,
  ShieldCheckIcon,
  BellIcon,
  CloudArrowUpIcon
} from "@heroicons/react/24/outline";

interface SettingsHeaderProps {
  onSave?: () => Promise<void>;
}

export default function SettingsHeader({ onSave }: SettingsHeaderProps) {
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!onSave) return;
    
    try {
      setSaving(true);
      await onSave();
    } catch (error) {
      console.error("Failed to save settings:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <CogIcon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              System Settings
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Configure system settings, security, and operational preferences
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <button className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
            <CloudArrowUpIcon className="w-4 h-4 mr-2" />
            Export Config
          </button>
          <button 
            onClick={handleSave}
            disabled={saving || !onSave}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CogIcon className="w-4 h-4 mr-2" />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <CogIcon className="w-8 h-8 text-gray-600 dark:text-gray-400" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Active Settings
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                24
              </p>
            </div>
          </div>
        </div>
        
        <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <ShieldCheckIcon className="w-8 h-8 text-gray-600 dark:text-gray-400" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Security Rules
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                12
              </p>
            </div>
          </div>
        </div>
        
        <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <BellIcon className="w-8 h-8 text-gray-600 dark:text-gray-400" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Notifications
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                8
              </p>
            </div>
          </div>
        </div>
        
        <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <CloudArrowUpIcon className="w-8 h-8 text-gray-600 dark:text-gray-400" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Last Backup
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                2h
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
