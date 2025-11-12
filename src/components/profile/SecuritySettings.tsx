"use client";

import React, { useState } from "react";
import Button from "../ui/button/Button";
import ComponentCard from "../common/ComponentCard";

interface SecuritySettingsProps {
  email: string;
  phone?: string | null;
}

export default function SecuritySettings({ email, phone }: SecuritySettingsProps) {
  const [passwordLastUpdated, setPasswordLastUpdated] = useState<string | null>("30 days ago");
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  const handleChangeEmail = () => {
    // TODO: Implement email change modal
    console.log("Change email clicked");
  };

  const handleChangePassword = () => {
    // TODO: Implement password change modal
    console.log("Change password clicked");
  };

  const handleToggleTwoFactor = () => {
    // TODO: Implement 2FA toggle
    setTwoFactorEnabled(!twoFactorEnabled);
  };

  return (
    <ComponentCard title="Security & Authentication">
      <div className="space-y-6">
        {/* Email Address */}
        <div className="flex items-center justify-between py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email Address
            </label>
            <p className="text-sm text-gray-600 dark:text-gray-400">{email}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleChangeEmail}
          >
            Change
          </Button>
        </div>

        {/* Phone Number */}
        <div className="flex items-center justify-between py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Phone Number
            </label>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {phone || "Not set"}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.href = "/profile/edit"}
          >
            Change
          </Button>
        </div>

        {/* Password */}
        <div className="flex items-center justify-between py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Password
            </label>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {passwordLastUpdated ? `Last updated ${passwordLastUpdated}` : "Not set"}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleChangePassword}
          >
            Change
          </Button>
        </div>

        {/* Two-Factor Authentication */}
        <div className="flex items-center justify-between py-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Two-Factor Authentication
            </label>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Add an extra layer of security
            </p>
          </div>
          <Button
            variant={twoFactorEnabled ? "outline" : "primary"}
            size="sm"
            onClick={handleToggleTwoFactor}
          >
            {twoFactorEnabled ? "Disable" : "Enable"}
          </Button>
        </div>
      </div>
    </ComponentCard>
  );
}

