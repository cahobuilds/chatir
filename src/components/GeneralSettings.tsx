"use client";

import React, { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { 
  GlobeAltIcon,
  LanguageIcon,
  ClockIcon,
  CurrencyDollarIcon
} from "@heroicons/react/24/outline";
import { useOrganization } from "@/context/OrganizationContext";

interface GeneralSettingsHandle {
  save: () => Promise<void>;
}

const GeneralSettings = forwardRef<GeneralSettingsHandle>((props, ref) => {
  const { currentOrganization, refreshOrganizations } = useOrganization();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [settings, setSettings] = useState({
    companyName: "",
    timezone: "UTC-8",
    language: "en",
    currency: "USD",
    dateFormat: "MM/DD/YYYY",
    timeFormat: "12h",
    businessHours: {
      start: "09:00",
      end: "17:00",
      timezone: "UTC-8"
    }
  });

  // Load current organization data
  useEffect(() => {
    if (currentOrganization?.id) {
      fetchOrganizationData();
    }
  }, [currentOrganization?.id]);

  const fetchOrganizationData = async () => {
    if (!currentOrganization?.id) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/tenants/${currentOrganization.id}`);
      
      if (response.ok) {
        const data = await response.json();
        const tenant = data.tenant;
        
        setSettings(prev => ({
          ...prev,
          companyName: tenant.name || "",
          // Load other settings from tenant.settings if available
          ...(tenant.settings && typeof tenant.settings === 'object' ? tenant.settings : {})
        }));
      }
    } catch (err) {
      console.error("Failed to fetch organization data:", err);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!currentOrganization?.id) {
      setError("No organization selected");
      return;
    }

    if (!settings.companyName.trim()) {
      setError("Company name is required");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await fetch(`/api/tenants/${currentOrganization.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: settings.companyName.trim(),
          settings: {
            timezone: settings.timezone,
            language: settings.language,
            currency: settings.currency,
            dateFormat: settings.dateFormat,
            timeFormat: settings.timeFormat,
            businessHours: settings.businessHours,
          }
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save settings');
      }

      setSuccess("Settings saved successfully!");
      setTimeout(() => setSuccess(null), 3000);
      
      // Refresh organization context to update the name in the UI
      await refreshOrganizations();
    } catch (err: any) {
      console.error("Save error:", err);
      setError(err.message || "Failed to save settings");
      setTimeout(() => setError(null), 5000);
    } finally {
      setSaving(false);
    }
  };

  // Expose save function via ref
  useImperativeHandle(ref, () => ({
    save: saveSettings,
  }));

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <GlobeAltIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            General Settings
          </h3>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Error/Success Messages */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}
        {success && (
          <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-sm text-green-800 dark:text-green-200">{success}</p>
          </div>
        )}

        {/* Company Information */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Company Name
          </label>
          <input
            type="text"
            value={settings.companyName}
            onChange={(e) => setSettings({...settings, companyName: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
            disabled={saving}
          />
        </div>

        {/* Timezone */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <ClockIcon className="w-4 h-4 inline mr-1" />
            Timezone
          </label>
          <select
            value={settings.timezone}
            onChange={(e) => setSettings({...settings, timezone: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
            disabled={saving}
          >
            <option value="UTC-12">UTC-12 (Baker Island)</option>
            <option value="UTC-11">UTC-11 (American Samoa)</option>
            <option value="UTC-10">UTC-10 (Hawaii)</option>
            <option value="UTC-9">UTC-9 (Alaska)</option>
            <option value="UTC-8">UTC-8 (Pacific Time)</option>
            <option value="UTC-7">UTC-7 (Mountain Time)</option>
            <option value="UTC-6">UTC-6 (Central Time)</option>
            <option value="UTC-5">UTC-5 (Eastern Time)</option>
            <option value="UTC-4">UTC-4 (Atlantic Time)</option>
            <option value="UTC-3">UTC-3 (Brazil)</option>
            <option value="UTC-2">UTC-2 (Mid-Atlantic)</option>
            <option value="UTC-1">UTC-1 (Azores)</option>
            <option value="UTC+0">UTC+0 (Greenwich)</option>
            <option value="UTC+1">UTC+1 (Central European)</option>
            <option value="UTC+2">UTC+2 (Eastern European)</option>
            <option value="UTC+3">UTC+3 (Moscow)</option>
            <option value="UTC+4">UTC+4 (Gulf)</option>
            <option value="UTC+5">UTC+5 (Pakistan)</option>
            <option value="UTC+6">UTC+6 (Bangladesh)</option>
            <option value="UTC+7">UTC+7 (Indochina)</option>
            <option value="UTC+8">UTC+8 (China)</option>
            <option value="UTC+9">UTC+9 (Japan)</option>
            <option value="UTC+10">UTC+10 (Australia Eastern)</option>
            <option value="UTC+11">UTC+11 (Solomon Islands)</option>
            <option value="UTC+12">UTC+12 (New Zealand)</option>
          </select>
        </div>

        {/* Language */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <LanguageIcon className="w-4 h-4 inline mr-1" />
            Language
          </label>
          <select
            value={settings.language}
            onChange={(e) => setSettings({...settings, language: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
            disabled={saving}
          >
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
            <option value="it">Italian</option>
            <option value="pt">Portuguese</option>
            <option value="ru">Russian</option>
            <option value="zh">Chinese</option>
            <option value="ja">Japanese</option>
            <option value="ko">Korean</option>
          </select>
        </div>

        {/* Currency */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <CurrencyDollarIcon className="w-4 h-4 inline mr-1" />
            Currency
          </label>
          <select
            value={settings.currency}
            onChange={(e) => setSettings({...settings, currency: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
            disabled={saving}
          >
            <option value="USD">USD - US Dollar</option>
            <option value="EUR">EUR - Euro</option>
            <option value="GBP">GBP - British Pound</option>
            <option value="CAD">CAD - Canadian Dollar</option>
            <option value="AUD">AUD - Australian Dollar</option>
            <option value="JPY">JPY - Japanese Yen</option>
            <option value="CHF">CHF - Swiss Franc</option>
            <option value="CNY">CNY - Chinese Yuan</option>
            <option value="INR">INR - Indian Rupee</option>
            <option value="BRL">BRL - Brazilian Real</option>
          </select>
        </div>

        {/* Date & Time Format */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Date Format
            </label>
            <select
              value={settings.dateFormat}
              onChange={(e) => setSettings({...settings, dateFormat: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
              disabled={saving}
            >
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              <option value="DD-MM-YYYY">DD-MM-YYYY</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Time Format
            </label>
            <select
              value={settings.timeFormat}
              onChange={(e) => setSettings({...settings, timeFormat: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
              disabled={saving}
            >
              <option value="12h">12 Hour (AM/PM)</option>
              <option value="24h">24 Hour</option>
            </select>
          </div>
        </div>

        {/* Business Hours */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Business Hours
          </label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Start Time</label>
              <input
                type="time"
                value={settings.businessHours.start}
                onChange={(e) => setSettings({
                  ...settings, 
                  businessHours: {...settings.businessHours, start: e.target.value}
                })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                disabled={saving}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">End Time</label>
              <input
                type="time"
                value={settings.businessHours.end}
                onChange={(e) => setSettings({
                  ...settings, 
                  businessHours: {...settings.businessHours, end: e.target.value}
                })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                disabled={saving}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

GeneralSettings.displayName = "GeneralSettings";

export default GeneralSettings;
