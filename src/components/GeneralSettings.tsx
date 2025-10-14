"use client";

import React, { useState } from "react";
import { 
  GlobeAltIcon,
  LanguageIcon,
  ClockIcon,
  CurrencyDollarIcon
} from "@heroicons/react/24/outline";

export default function GeneralSettings() {
  const [settings, setSettings] = useState({
    companyName: "AI Customer Care Inc.",
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
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
