"use client";

import React, { useRef } from "react";
import SettingsHeader from "@/components/SettingsHeader";
import GeneralSettings from "@/components/GeneralSettings";
import SystemConfiguration from "@/components/SystemConfiguration";
import SecuritySettings from "@/components/SecuritySettings";
import NotificationSettings from "@/components/NotificationSettings";
import BackupSettings from "@/components/BackupSettings";

export default function SettingsPage() {
  const generalSettingsRef = useRef<{ save: () => Promise<void> }>(null);

  const handleSave = async () => {
    if (generalSettingsRef.current) {
      await generalSettingsRef.current.save();
    }
  };

  return (
    <div className="space-y-6">
      <SettingsHeader onSave={handleSave} />

      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <div className="col-span-12 lg:col-span-6">
          <GeneralSettings ref={generalSettingsRef} />
        </div>
        <div className="col-span-12 lg:col-span-6">
          <SystemConfiguration />
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <div className="col-span-12 lg:col-span-8">
          <SecuritySettings />
        </div>
        <div className="col-span-12 lg:col-span-4">
          <NotificationSettings />
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <div className="col-span-12 lg:col-span-6">
          <BackupSettings />
        </div>
        <div className="col-span-12 lg:col-span-6">
          {/* Additional settings component can go here */}
        </div>
      </div>
    </div>
  );
}
