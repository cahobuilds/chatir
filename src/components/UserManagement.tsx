"use client";

import React, { useState, useEffect } from "react";
import { 
  UsersIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  UserPlusIcon,
  ShieldCheckIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  BuildingOfficeIcon
} from "@heroicons/react/24/outline";
import { getRoleDisplayName } from "@/lib/roles-client";
import { Modal } from "./ui/modal";
import Form from "./form/Form";
import Label from "./form/Label";
import Input from "./form/input/InputField";
import Alert from "./ui/alert/Alert";
import Button from "./ui/button/Button";
import { useOrganization } from "@/context/OrganizationContext";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "active" | "inactive" | "pending";
  lastLogin: string;
  createdAt: string;
  avatar?: string;
  department?: string;
  permissions: string[];
}

interface Organization {
  id: string;
  name: string;
}

interface Role {
  id: string;
  name: string;
  display_name: string;
}

interface UserManagementProps {
  onAddUserClick?: () => void;
  externalShowModal?: boolean;
  onModalClose?: () => void;
}

export default function UserManagement({ onAddUserClick, externalShowModal, onModalClose }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [showNewUser, setShowNewUser] = useState(false);
  
  // Sync with external modal state if provided
  useEffect(() => {
    if (externalShowModal !== undefined) {
      console.log('External modal state changed:', externalShowModal);
      setShowNewUser(externalShowModal);
    }
  }, [externalShowModal]);

  // Debug: Log when showNewUser changes
  useEffect(() => {
    console.log('showNewUser state changed:', showNewUser);
  }, [showNewUser]);
  const [filter, setFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  
  // User creation form state
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'viewer',
    organizationIds: [] as string[],
  });
  
  const { currentOrganization } = useOrganization();

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (showNewUser) {
      fetchOrganizations();
      fetchRoles();
    }
  }, [showNewUser, currentOrganization]);

  const fetchOrganizations = async () => {
    try {
      console.log('Fetching organizations from /api/tenants');
      const response = await fetch('/api/tenants', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store', // Prevent Next.js from caching
      });
      
      console.log('Tenants API response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Tenants API response data:', data);
        
        // Handle different response structures
        const tenantsList = data.tenants || [];
        const orgs: Organization[] = tenantsList
          .map((t: any) => {
            // Handle nested structure: { tenant_id, tenants: { id, name } }
            if (t.tenants) {
              return {
                id: t.tenant_id || (t.tenants as any)?.id,
                name: (t.tenants as any)?.name,
              };
            }
            // Handle flat structure: { id, name }
            return {
              id: t.id || t.tenant_id,
              name: t.name,
            };
          })
          .filter((o: Organization) => o.id && o.name); // Filter out invalid entries
        
        console.log('Parsed organizations:', orgs);
        setOrganizations(orgs);
        
        // Pre-select current organization if available and no orgs are selected yet
        if (currentOrganization && orgs.find((o: Organization) => o.id === currentOrganization.id)) {
          setFormData(prev => {
            // Only set if no organizations are currently selected
            if (prev.organizationIds.length === 0) {
              return {
                ...prev,
                organizationIds: [currentOrganization.id],
              };
            }
            return prev;
          });
        }
      } else {
        const errorText = await response.text();
        console.error('Failed to fetch organizations:', response.status, response.statusText, errorText);
        setCreateError(`Failed to load organizations: ${response.statusText}. Please refresh the page and try again.`);
        setOrganizations([]);
      }
    } catch (error: any) {
      console.error('Failed to fetch organizations:', error);
      setCreateError(`Error loading organizations: ${error.message}. Please check your connection and try again.`);
      setOrganizations([]);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await fetch('/api/roles?simple=true');
      if (response.ok) {
        const data = await response.json();
        setRoles(data.roles || []);
      }
    } catch (error) {
      console.error('Failed to fetch roles:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/users');
      
      if (!response.ok) {
        console.error('Failed to fetch users');
        return;
      }

      const data = await response.json();
      const usersList = data.users || [];

      // Transform API data to component format
      const transformedUsers: User[] = usersList.map((user: any) => {
        // Get primary role and status from first tenant relationship
        // If user has multiple tenants, use the first active one, or first one
        const activeTenant = user.tenants?.find((t: any) => t.status === 'active') || user.tenants?.[0];
        const role = activeTenant?.role || 'viewer';
        const status = activeTenant?.status || (user.email_confirmed ? 'active' : 'pending');
        
        // Format dates
        const createdAt = user.created_at 
          ? new Date(user.created_at).toISOString().split('T')[0]
          : 'Unknown';
        
        // Get last login from API response
        const lastLogin = user.last_login 
          ? new Date(user.last_login).toLocaleString()
          : 'Never';

        return {
          id: user.id,
          name: user.name || user.email,
          email: user.email,
          role: getRoleDisplayName(role),
          status: status as "active" | "inactive" | "pending",
          lastLogin,
          createdAt,
          permissions: [], // Permissions would come from role system
        };
      });

      setUsers(transformedUsers);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
      case "inactive":
        return <XCircleIcon className="w-4 h-4 text-red-500" />;
      case "pending":
        return <ClockIcon className="w-4 h-4 text-yellow-500" />;
      default:
        return <ClockIcon className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "inactive":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "Admin":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      case "Manager":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "Agent":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "Analyst":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
      case "Viewer":
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesFilter = filter === "all" || user.status === filter;
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.role.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const deleteUser = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user?.role === "Admin") {
      alert("Cannot delete admin users");
      return;
    }
    setUsers(users.filter(user => user.id !== userId));
  };

  const toggleUserStatus = (userId: string) => {
    setUsers(users.map(user => 
      user.id === userId 
        ? { ...user, status: user.status === "active" ? "inactive" : "active" }
        : user
    ));
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreateSuccess(null);

    // Validation
    if (!formData.name.trim() || !formData.email.trim() || !formData.password) {
      setCreateError('Name, email, and password are required');
      return;
    }

    if (formData.password.length < 8) {
      setCreateError('Password must be at least 8 characters');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setCreateError('Passwords do not match');
      return;
    }

    if (formData.organizationIds.length === 0) {
      setCreateError('Please select at least one organization');
      return;
    }

    setIsCreating(true);

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          tenant_ids: formData.organizationIds,
          role: formData.role,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create user');
      }

      const data = await response.json();
      setCreateSuccess(`User "${data.user.name}" created successfully and added to ${data.user.tenants.length} organization(s)!`);
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'viewer',
        organizationIds: currentOrganization ? [currentOrganization.id] : [],
      });

      // Refresh users list
      await fetchUsers();

      // Close modal after a short delay
      setTimeout(() => {
        setShowNewUser(false);
        onModalClose?.();
        setCreateSuccess(null);
      }, 2000);
    } catch (error: any) {
      setCreateError(error.message || 'Failed to create user');
    } finally {
      setIsCreating(false);
    }
  };

  const toggleOrganization = (orgId: string) => {
    setFormData(prev => {
      const isSelected = prev.organizationIds.includes(orgId);
      return {
        ...prev,
        organizationIds: isSelected
          ? prev.organizationIds.filter(id => id !== orgId)
          : [...prev.organizationIds, orgId],
      };
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <UsersIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              User Management
            </h3>
          </div>
          <button 
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('Add User button clicked in UserManagement');
              setShowNewUser(true);
              if (onAddUserClick) {
                onAddUserClick();
              }
            }}
            className="inline-flex items-center px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 cursor-pointer"
          >
            <UserPlusIcon className="w-4 h-4 mr-1" />
            Add User
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="all">All Users</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="pending">Pending</option>
          </select>
        </div>

        {/* Users List */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
              <p>Loading users...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p>No users found</p>
            </div>
          ) : (
            filteredUsers.map((user) => (
            <div
              key={user.id}
              className={`p-4 border rounded-lg transition-all duration-200 ${
                selectedUser === user.id
                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
              }`}
            >
              <div className="flex items-start space-x-4">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                      {getInitials(user.name)}
                    </span>
                  </div>
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                      {user.name}
                    </h4>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                      {user.role}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(user.status)}`}>
                      {user.status}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {user.email}
                  </p>
                  
                  <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center space-x-1">
                      <ClockIcon className="w-3 h-3" />
                      <span>Last login: {user.lastLogin}</span>
                    </div>
                    <span>Created: {user.createdAt}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setSelectedUser(selectedUser === user.id ? null : user.id)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    title="View details"
                  >
                    <EyeIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => toggleUserStatus(user.id)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                    title={user.status === "active" ? "Deactivate user" : "Activate user"}
                  >
                    {user.status === "active" ? (
                      <XCircleIcon className="w-4 h-4" />
                    ) : (
                      <CheckCircleIcon className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                    title="Edit user"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteUser(user.id)}
                    disabled={user.role === "Admin"}
                    className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={user.role === "Admin" ? "Cannot delete admin users" : "Delete user"}
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* User Details */}
              {selectedUser === user.id && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                    Permissions
                  </h5>
                  <div className="flex flex-wrap gap-2">
                    {user.permissions.map((permission, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
                      >
                        {permission}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
          )}
        </div>

        {/* Create User Modal */}
        <Modal
          isOpen={showNewUser}
          onClose={() => {
            console.log('Modal onClose called');
            setShowNewUser(false);
            onModalClose?.();
            setFormData({
              name: '',
              email: '',
              password: '',
              confirmPassword: '',
              role: 'viewer',
              organizationIds: currentOrganization ? [currentOrganization.id] : [],
            });
            setCreateError(null);
            setCreateSuccess(null);
          }}
          className="max-w-2xl mx-4 my-4"
          title="Create New User"
        >
            <div className="px-6 py-4">
              {createError && (
                <div className="mb-6">
                  <Alert
                    variant="error"
                    title="Error"
                    message={createError}
                  />
                </div>
              )}

              {createSuccess && (
                <div className="mb-6">
                  <Alert
                    variant="success"
                    title="Success"
                    message={createSuccess}
                  />
                </div>
              )}

              <Form onSubmit={handleCreateUser}>
                <div className="space-y-6">
                  {/* Basic Information */}
                  <div>
                    <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                      Basic Information
                    </h3>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <div>
                        <Label htmlFor="user-name">
                          Full Name <span className="text-error-500">*</span>
                        </Label>
                        <Input
                          id="user-name"
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="John Doe"
                        />
                      </div>
                      <div>
                        <Label htmlFor="user-email">
                          Email Address <span className="text-error-500">*</span>
                        </Label>
                        <Input
                          id="user-email"
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="john@example.com"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                      Password
                    </h3>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <div>
                        <Label htmlFor="user-password">
                          Password <span className="text-error-500">*</span>
                        </Label>
                        <Input
                          id="user-password"
                          type="password"
                          required
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          placeholder="Minimum 8 characters"
                          hint="Password must be at least 8 characters"
                        />
                      </div>
                      <div>
                        <Label htmlFor="user-confirm-password">
                          Confirm Password <span className="text-error-500">*</span>
                        </Label>
                        <Input
                          id="user-confirm-password"
                          type="password"
                          required
                          value={formData.confirmPassword}
                          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                          placeholder="Re-enter password"
                          error={formData.confirmPassword !== '' && formData.password !== formData.confirmPassword}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Organization Selection */}
                  <div>
                    <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                      Organizations <span className="text-error-500">*</span>
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Select one or more organizations to associate this user with:
                    </p>
                    <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-900/50">
                      {organizations.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                          {showNewUser ? 'Loading organizations...' : 'No organizations available'}
                        </p>
                      ) : (
                        organizations.map((org) => (
                          <label
                            key={org.id}
                            className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={formData.organizationIds.includes(org.id)}
                              onChange={() => toggleOrganization(org.id)}
                              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer flex-shrink-0"
                            />
                            <BuildingOfficeIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                            <span className="flex-1 text-sm font-medium text-gray-900 dark:text-white">
                              {org.name}
                            </span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Role Selection */}
                  <div>
                    <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                      Role
                    </h3>
                    <div>
                      <Label htmlFor="user-role">Role</Label>
                      <div className="relative">
                        <select
                          id="user-role"
                          value={formData.role}
                          onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                          className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 pr-11 text-sm shadow-theme-xs text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
                        >
                          {roles.length === 0 ? (
                            <option value="viewer">Viewer</option>
                          ) : (
                            roles.map((role) => (
                              <option key={role.id} value={role.name}>
                                {role.display_name || role.name}
                              </option>
                            ))
                          )}
                        </select>
                        <span className="absolute text-gray-500 -translate-y-1/2 pointer-events-none right-3 top-1/2 dark:text-gray-400">
                          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <Button
                      type="button"
                      onClick={() => {
                        setShowNewUser(false);
                        onModalClose?.();
                        setFormData({
                          name: '',
                          email: '',
                          password: '',
                          confirmPassword: '',
                          role: 'viewer',
                          organizationIds: currentOrganization ? [currentOrganization.id] : [],
                        });
                        setCreateError(null);
                        setCreateSuccess(null);
                      }}
                      variant="outline"
                      disabled={isCreating}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isCreating || !formData.name.trim() || !formData.email.trim() || !formData.password || formData.organizationIds.length === 0}
                      variant="primary"
                    >
                      {isCreating ? 'Creating...' : 'Create User'}
                    </Button>
                  </div>
              </div>
              </Form>
            </div>
        </Modal>

        {/* Summary Stats */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                {users.length}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Total Users</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {users.filter(u => u.status === "active").length}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Active</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {users.filter(u => u.status === "pending").length}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Pending</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {users.filter(u => u.status === "inactive").length}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Inactive</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}// Cache bust: 1763372151
