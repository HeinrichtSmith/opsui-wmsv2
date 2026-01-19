/**
 * User Roles Management page
 *
 * Admin page for managing user role assignments
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, Header, Button } from '@/components/shared';
import {
  UserGroupIcon,
  ArrowLeftIcon,
  UserIcon,
  KeyIcon,
  CheckIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { UserRole } from '@opsui/shared';
import { playSound } from '@/stores';
import { useUsers, useGrantRole, useRevokeRole, useAllRoleAssignments } from '@/services/api';

// ============================================================================
// MAIN PAGE
// ============================================================================

function UserRolesPage() {
  const navigate = useNavigate();
  const { data: users, isLoading: usersLoading } = useUsers();
  const { data: assignments, isLoading: assignmentsLoading } = useAllRoleAssignments();
  const grantRoleMutation = useGrantRole();
  const revokeRoleMutation = useRevokeRole();

  const [searchQuery, setSearchQuery] = useState('');

  // Available roles that can be granted (excluding ADMIN as it's a base role only)
  const grantableRoles = Object.values(UserRole).filter(role => role !== UserRole.ADMIN);

  // Filter users by search
  const filteredUsers =
    users?.filter(
      user =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.userId.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

  // Get granted roles for a specific user
  const getUserGrantedRoles = (userId: string) => {
    return assignments?.filter(a => a.userId === userId && a.active).map(a => a.role) || [];
  };

  // Check if a user has a specific role granted
  const userHasRole = (userId: string, role: UserRole) => {
    const grantedRoles = getUserGrantedRoles(userId);
    // Also check if it's their base role
    const user = users?.find(u => u.userId === userId);
    return grantedRoles.includes(role) || user?.role === role;
  };

  const handleGrantRole = async (userId: string, role: UserRole) => {
    try {
      await grantRoleMutation.mutateAsync({ userId, role });
      playSound('success');
    } catch (error) {
      console.error('Failed to grant role:', error);
    }
  };

  const handleRevokeRole = async (userId: string, role: UserRole) => {
    try {
      await revokeRoleMutation.mutateAsync({ userId, role });
      playSound('success');
    } catch (error) {
      console.error('Failed to revoke role:', error);
    }
  };

  if (usersLoading || assignmentsLoading) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card variant="glass">
            <CardContent className="p-8">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>

          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary-500/20 rounded-xl">
              <UserGroupIcon className="h-8 w-8 text-primary-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">
                User Roles Management
              </h1>
              <p className="mt-2 text-gray-400">Grant and revoke additional roles for users</p>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <Card variant="glass" className="mb-8 border-l-4 border-l-blue-500">
          <CardContent className="p-5">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <UserGroupIcon className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <h4 className="text-white font-semibold mb-2">How it works</h4>
                <ul className="text-sm text-gray-400 space-y-1">
                  <li>
                    • <strong className="text-gray-300">Base role</strong> is the user's primary
                    role (marked with key icon)
                  </li>
                  <li>
                    • <strong className="text-gray-300">Additional roles</strong> can be granted to
                    allow role switching
                  </li>
                  <li>
                    • Users can switch between their base role and any granted roles via the role
                    dropdown
                  </li>
                  <li>• ADMIN role cannot be granted as it's a base role only</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search */}
        <Card variant="glass" className="mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search users by name, email, or ID..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </CardContent>
        </Card>

        {/* Users List */}
        <div className="space-y-6">
          {filteredUsers.map(user => (
            <Card key={user.userId} variant="glass">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary-500/20 rounded-xl">
                      <UserIcon className="h-6 w-6 text-primary-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-white">{user.name}</h3>
                      <p className="text-sm text-gray-400">{user.email}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-gray-500">ID: {user.userId}</span>
                        <span className="badge badge-primary">{user.role}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-300">Additional Roles</h4>
                    <span className="text-xs text-gray-500">
                      {getUserGrantedRoles(user.userId).length} role
                      {getUserGrantedRoles(user.userId).length !== 1 ? 's' : ''} granted
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {grantableRoles.map(role => {
                      const hasRole = userHasRole(user.userId, role);
                      const isBaseRole = user.role === role;

                      return (
                        <button
                          key={role}
                          onClick={() => {
                            if (isBaseRole) return;
                            if (hasRole) {
                              handleRevokeRole(user.userId, role);
                            } else {
                              handleGrantRole(user.userId, role);
                            }
                          }}
                          disabled={isBaseRole}
                          className={`p-4 rounded-xl border transition-all duration-200 ${
                            isBaseRole
                              ? 'bg-primary-500/10 border-primary-500/30 cursor-not-allowed opacity-50'
                              : hasRole
                                ? 'bg-success-500/20 border-success-500/30 hover:bg-success-500/30'
                                : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                          }`}
                          title={
                            isBaseRole
                              ? "This is user's base role"
                              : hasRole
                                ? 'Click to revoke'
                                : 'Click to grant'
                          }
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-sm font-medium ${
                                isBaseRole
                                  ? 'text-primary-400'
                                  : hasRole
                                    ? 'text-success-400'
                                    : 'text-gray-400'
                              }`}
                            >
                              {role}
                            </span>
                            {hasRole && !isBaseRole && (
                              <CheckIcon className="h-5 w-5 text-success-400" />
                            )}
                            {isBaseRole && <KeyIcon className="h-5 w-5 text-primary-400" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <p className="text-sm text-gray-500 mt-3">
                    Click to toggle roles. Users can switch between their base role and any granted
                    roles via the role dropdown in the header.
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredUsers.length === 0 && (
            <Card variant="glass">
              <CardContent className="p-12 text-center">
                <UserIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-400 mb-2">No users found</h3>
                <p className="text-sm text-gray-500">Try adjusting your search query</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}

export default UserRolesPage;
