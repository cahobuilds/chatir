import type { Metadata } from "next";
import React from "react";
import UsersHeader from "@/components/UsersHeader";
import UserManagement from "@/components/UserManagement";
import RoleManagement from "@/components/RoleManagement";
import UserActivity from "@/components/UserActivity";
import SecuritySettings from "@/components/SecuritySettings";

export const metadata: Metadata = {
  title:
    "User & Role Management | TinAdmin - AI Customer Care Dashboard",
  description: "Manage users, roles, and permissions for AI customer care operations with comprehensive access control.",
};

export default function UserManagementPage() {
  return (
    <div className="space-y-6">
      <UsersHeader />
      
      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <div className="col-span-12 lg:col-span-6">
          <UserManagement />
        </div>
        <div className="col-span-12 lg:col-span-6">
          <RoleManagement />
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <div className="col-span-12 lg:col-span-8">
          <UserActivity />
        </div>
        <div className="col-span-12 lg:col-span-4">
          <SecuritySettings />
        </div>
      </div>
    </div>
  );
}
