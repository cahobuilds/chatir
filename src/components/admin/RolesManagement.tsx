"use client";

import React, { useState, useEffect } from "react";
import ComponentCard from "../common/ComponentCard";
import Button from "../ui/button/Button";
import Badge from "../ui/badge/Badge";
import { Modal } from "../ui/modal";
import Form from "../form/Form";
import Input from "../form/input/InputField";
import Label from "../form/Label";
import Select from "../form/Select";
import TextArea from "../form/input/TextArea";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import { getRoleCategoryColor, getRoleDisplayName } from "@/lib/roles-client";

interface Role {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  hierarchy_level: number;
  category: 'system' | 'platform' | 'organization' | 'team' | 'standard';
  is_system_role: boolean;
  is_active: boolean;
  permission_count?: number;
  user_count?: number;
  created_at: string;
}

interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
}

export default function RolesManagement() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [groupedPermissions, setGroupedPermissions] = useState<Record<string, Permission[]>>({});
  const [formData, setFormData] = useState({
    name: "",
    display_name: "",
    description: "",
    hierarchy_level: 50,
    category: "standard" as Role['category'],
    permissions: [] as string[],
  });

  useEffect(() => {
    fetchRoles();
    fetchPermissions();
  }, []);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/roles");
      const data = await response.json();
      
      if (response.ok) {
        setRoles(data.roles || []);
      } else {
        const errorMessage = data.error || data.message || 'Failed to fetch roles';
        console.error("Failed to fetch roles:", errorMessage, data);
        
        // Show user-friendly error
        if (data.code === 'MIGRATION_REQUIRED') {
          alert('Roles table not found. Please run the roles migration in Supabase Dashboard.');
        } else if (response.status === 403) {
          alert('You do not have permission to view roles. System admin or super admin access required.');
        } else {
          alert(`Failed to fetch roles: ${errorMessage}`);
        }
      }
    } catch (error: any) {
      console.error("Failed to fetch roles:", error);
      alert(`Failed to fetch roles: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissions = async () => {
    try {
      const response = await fetch("/api/permissions");
      if (response.ok) {
        const data = await response.json();
        setPermissions(data.permissions || []);
        setGroupedPermissions(data.grouped || {});
      }
    } catch (error) {
      console.error("Failed to fetch permissions:", error);
    }
  };

  const fetchRolePermissions = async (roleId: string) => {
    try {
      const response = await fetch(`/api/roles/${roleId}/permissions`);
      if (response.ok) {
        const data = await response.json();
        return data.permissions || [];
      }
    } catch (error) {
      console.error("Failed to fetch role permissions:", error);
    }
    return [];
  };

  const handleCreate = () => {
    setEditingRole(null);
    setFormData({
      name: "",
      display_name: "",
      description: "",
      hierarchy_level: 50,
      category: "standard",
      permissions: [],
    });
    setIsModalOpen(true);
  };

  const handleEdit = async (role: Role) => {
    try {
      setEditingRole(role);
      
      // Fetch role permissions, but don't block modal opening if it fails
      let rolePermissions: string[] = [];
      try {
        rolePermissions = await fetchRolePermissions(role.id);
      } catch (error) {
        console.error("Failed to fetch role permissions:", error);
        // Continue with empty permissions array
      }
      
      setFormData({
        name: role.name,
        display_name: role.display_name,
        description: role.description || "",
        hierarchy_level: role.hierarchy_level,
        category: role.category,
        permissions: rolePermissions,
      });
      setIsModalOpen(true);
    } catch (error) {
      console.error("Failed to edit role:", error);
      alert("Failed to load role data. Please try again.");
    }
  };

  const handleDelete = async (role: Role) => {
    if (role.is_system_role) {
      alert("Cannot delete system roles");
      return;
    }

    if (role.user_count && role.user_count > 0) {
      alert(`Cannot delete role: ${role.user_count} user(s) are assigned to this role`);
      return;
    }

    if (!confirm(`Are you sure you want to delete the role "${role.display_name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/roles/${role.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchRoles();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to delete role");
      }
    } catch (error) {
      console.error("Failed to delete role:", error);
      alert("Failed to delete role");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingRole
        ? `/api/roles/${editingRole.id}`
        : "/api/roles";
      const method = editingRole ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          permissions: formData.permissions,
        }),
      });

      if (response.ok) {
        setIsModalOpen(false);
        fetchRoles();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to save role");
      }
    } catch (error) {
      console.error("Failed to save role:", error);
      alert("Failed to save role");
    }
  };

  const togglePermission = (permissionId: string) => {
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter((id) => id !== permissionId)
        : [...prev.permissions, permissionId],
    }));
  };

  const toggleCategoryPermissions = (category: string, selectAll: boolean) => {
    const categoryPerms = groupedPermissions[category] || [];
    const categoryIds = categoryPerms.map((p) => p.id);

    setFormData((prev) => ({
      ...prev,
      permissions: selectAll
        ? [...new Set([...prev.permissions, ...categoryIds])]
        : prev.permissions.filter((id) => !categoryIds.includes(id)),
    }));
  };

  if (loading) {
    return (
      <ComponentCard title="Roles Management" desc="Manage system roles and their permissions">
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </ComponentCard>
    );
  }

  return (
    <>
      <ComponentCard title="Roles Management" desc="Manage system roles and their permissions">
        <div className="space-y-6">
          {/* Header Actions */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {roles.length} role{roles.length !== 1 ? 's' : ''} configured
              </p>
            </div>
            <Button variant="primary" size="sm" onClick={handleCreate}>
              Create Role
            </Button>
          </div>

          {/* Roles Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Role
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Category
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Level
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Users
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Permissions
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Status
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Actions
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {roles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="px-5 py-8 text-center text-gray-500 dark:text-gray-400">
                      No roles found. Create your first role to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  roles.map((role) => (
                    <TableRow key={role.id}>
                      <TableCell className="px-5 py-4 text-start">
                        <div>
                          <div className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                            {role.display_name}
                          </div>
                          <div className="text-gray-500 text-theme-xs dark:text-gray-400 mt-0.5">
                            {role.name}
                          </div>
                          {role.description && (
                            <div className="text-gray-500 text-theme-xs dark:text-gray-400 mt-1">
                              {role.description.substring(0, 60)}
                              {role.description.length > 60 ? '...' : ''}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-4 text-start">
                        <Badge
                          size="sm"
                          color={getRoleCategoryColor(role.category)}
                          variant="light"
                        >
                          {role.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-5 py-4 text-start text-gray-600 dark:text-gray-400">
                        {role.hierarchy_level}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-start text-gray-600 dark:text-gray-400">
                        {role.user_count || 0}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-start text-gray-600 dark:text-gray-400">
                        {role.permission_count || 0}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-start">
                        <Badge
                          size="sm"
                          color={role.is_active ? "success" : "error"}
                          variant="light"
                        >
                          {role.is_active ? "Active" : "Inactive"}
                        </Badge>
                        {role.is_system_role && (
                          <Badge
                            size="sm"
                            color="error"
                            variant="light"
                            className="ml-2"
                          >
                            System
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-start">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(role)}
                          >
                            Edit
                          </Button>
                          {!role.is_system_role && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(role)}
                              className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                            >
                              Delete
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedRole(role)}
                          >
                            View
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </ComponentCard>

      {/* Create/Edit Role Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingRole ? "Edit Role" : "Create Role"}
        >
          <Form onSubmit={handleSubmit}>
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <Label htmlFor="name">Role Name (ID)</Label>
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g., custom_manager"
                    required
                    disabled={!!editingRole}
                    className="bg-gray-50 dark:bg-gray-800"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Unique identifier (cannot be changed after creation)
                  </p>
                </div>

                <div>
                  <Label htmlFor="display_name">Display Name</Label>
                  <Input
                    id="display_name"
                    type="text"
                    value={formData.display_name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                      setFormData({ ...formData, display_name: e.target.value })
                    }
                    placeholder="e.g., Custom Manager"
                    required
                    className="bg-gray-50 dark:bg-gray-800"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <TextArea
                  id="description"
                  value={formData.description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Describe the role's responsibilities..."
                  rows={3}
                  className="bg-gray-50 dark:bg-gray-800"
                />
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <Label htmlFor="hierarchy_level">Hierarchy Level</Label>
                  <Input
                    id="hierarchy_level"
                    type="number"
                    value={formData.hierarchy_level}
                    onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                      setFormData({
                        ...formData,
                        hierarchy_level: parseInt(e.target.value) || 0,
                      })
                    }
                    min="0"
                    max="100"
                    required
                    className="bg-gray-50 dark:bg-gray-800"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Higher = more permissions (0-100)
                  </p>
                </div>

                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select
                    options={[
                      { value: 'system', label: 'System' },
                      { value: 'platform', label: 'Platform' },
                      { value: 'organization', label: 'Organization' },
                      { value: 'team', label: 'Team' },
                      { value: 'standard', label: 'Standard' },
                    ]}
                    defaultValue={formData.category}
                    onChange={(value) =>
                      setFormData({
                        ...formData,
                        category: value as Role['category'],
                      })
                    }
                    placeholder="Select category"
                  />
                </div>
              </div>

              {/* Permissions Selection */}
              <div>
                <Label>Permissions</Label>
                <div className="mt-2 max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-4 bg-gray-50 dark:bg-gray-800/50">
                  {Object.keys(groupedPermissions)
                    .sort()
                    .map((category) => {
                      const categoryPerms = groupedPermissions[category];
                      const selectedCount = categoryPerms.filter((p) =>
                        formData.permissions.includes(p.id)
                      ).length;
                      const allSelected = selectedCount === categoryPerms.length;
                      const someSelected = selectedCount > 0 && !allSelected;

                      return (
                        <div key={category} className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-0 last:pb-0">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                              {category} ({selectedCount}/{categoryPerms.length})
                            </h4>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                toggleCategoryPermissions(category, !allSelected)
                              }
                            >
                              {allSelected ? "Deselect All" : "Select All"}
                            </Button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {categoryPerms.map((permission) => (
                              <label
                                key={permission.id}
                                className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800 cursor-pointer transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  checked={formData.permissions.includes(
                                    permission.id
                                  )}
                                  onChange={() =>
                                    togglePermission(permission.id)
                                  }
                                  className="mt-0.5 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                                    {permission.name}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    {permission.description}
                                  </div>
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                </div>
                <div className="flex items-center justify-between mt-3">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-medium">{formData.permissions.length}</span> permission(s) selected
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  {editingRole ? "Update Role" : "Create Role"}
                </Button>
              </div>
            </div>
          </Form>
        </Modal>
      )}

      {/* View Permissions Modal */}
      {selectedRole && (
        <Modal
          isOpen={!!selectedRole}
          onClose={() => setSelectedRole(null)}
          title={`Permissions: ${selectedRole.display_name}`}
        >
          <RolePermissionsView roleId={selectedRole.id} />
        </Modal>
      )}
    </>
  );
}

// Component to view role permissions
function RolePermissionsView({ roleId }: { roleId: string }) {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [groupedPermissions, setGroupedPermissions] = useState<
    Record<string, Permission[]>
  >({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [permResponse, rolePermResponse] = await Promise.all([
          fetch("/api/permissions"),
          fetch(`/api/roles/${roleId}/permissions`),
        ]);

        if (permResponse.ok) {
          const permData = await permResponse.json();
          setAllPermissions(permData.permissions || []);
          setGroupedPermissions(permData.grouped || {});
        }

        if (rolePermResponse.ok) {
          const rolePermData = await rolePermResponse.json();
          setPermissions(rolePermData.permissions || []);
        }
      } catch (error) {
        console.error("Failed to fetch permissions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [roleId]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-h-96 overflow-y-auto">
      {Object.keys(groupedPermissions)
        .sort()
        .map((category) => {
          const categoryPerms = groupedPermissions[category];
          const hasPermissions = categoryPerms.some((p) =>
            permissions.includes(p.id)
          );

          if (!hasPermissions) return null;

          return (
            <div key={category} className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-0">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                {category}
              </h4>
              <div className="flex flex-wrap gap-2">
                {categoryPerms
                  .filter((p) => permissions.includes(p.id))
                  .map((permission) => (
                    <Badge
                      key={permission.id}
                      size="sm"
                      color="success"
                      variant="light"
                    >
                      {permission.name}
                    </Badge>
                  ))}
              </div>
            </div>
          );
        })}
      {permissions.length === 0 && (
        <p className="text-gray-500 dark:text-gray-400 text-center py-4">
          No permissions assigned
        </p>
      )}
    </div>
  );
}
