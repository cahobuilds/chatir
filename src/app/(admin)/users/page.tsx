"use client";

import React, { useState } from "react";
import UsersHeader from "@/components/UsersHeader";
import UserManagement from "@/components/UserManagement";
import RoleManagement from "@/components/RoleManagement";
import UserActivity from "@/components/UserActivity";
import SecuritySettings from "@/components/SecuritySettings";

export default function UserManagementPage() {
  const [showAddUserModal, setShowAddUserModal] = useState(false);

  const handleAddUser = () => {
    console.log('handleAddUser called, setting showAddUserModal to true');
    setShowAddUserModal(true);
  };

  const handleModalClose = () => {
    console.log('handleModalClose called, setting showAddUserModal to false');
    setShowAddUserModal(false);
  };

  return (
    <div className="space-y-6">
      <UsersHeader onAddUser={handleAddUser} />
      
      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <div className="col-span-12 lg:col-span-6">
          <UserManagement 
            externalShowModal={showAddUserModal}
            onModalClose={handleModalClose}
          />
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
