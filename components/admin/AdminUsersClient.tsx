"use client";

import { useState, Fragment } from "react";
import { useSession } from "next-auth/react";
import { useTheme } from "@/components/theme/ThemeProvider";
import FamilyTree from "@/components/family/FamilyTree";

interface User {
  id: string;
  email: string;
  role: "USER" | "VERIFIER" | "ADMIN";
  createdAt: Date;
  family: any | null; // Family object or null if no family record
}

interface AdminUsersClientProps {
  initialUsers: User[];
}

export default function AdminUsersClient({ initialUsers }: AdminUsersClientProps) {
  const { data: session, status } = useSession();
  const { theme } = useTheme();
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    role: "USER" as "USER" | "VERIFIER" | "ADMIN",
  });

  // Expander and modal state
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [showFamilyTreeModal, setShowFamilyTreeModal] = useState(false);
  const [selectedUserForTree, setSelectedUserForTree] = useState<User | null>(null);

  // Filter users based on search query
  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleToggleExpand = (userId: string) => {
    setExpandedUserId(expandedUserId === userId ? null : userId);
  };

  const handleShowFamilyTree = (user: User) => {
    setSelectedUserForTree(user);
    setShowFamilyTreeModal(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError("");
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.email || !formData.password) {
      setError("Email and password are required");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          role: formData.role,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to create user");
        return;
      }

      // Refetch user list from server
      const res = await fetch("/api/admin/users");
      const usersData = await res.json();
      setUsers(usersData.users);

      setSuccess(`User ${data.user.email} created successfully!`);
      setShowCreateModal(false);
      setFormData({
        email: "",
        password: "",
        confirmPassword: "",
        role: "USER",
      });

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const cardClass = theme === "dark"
    ? "bg-gray-800 border border-gray-700 shadow-lg"
    : "bg-white border border-gray-200 shadow-lg";

  const textPrimary = theme === "dark" ? "text-white" : "text-gray-900";
  const textSecondary = theme === "dark" ? "text-gray-300" : "text-gray-600";

  const handleDeleteClick = (user: User) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
    setError("");
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/users?userId=${userToDelete.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to delete user");
        setLoading(false);
        return;
      }

      // Refetch user list from server
      const res = await fetch("/api/admin/users");
      const usersData = await res.json();
      setUsers(usersData.users);

      setSuccess(`User ${userToDelete.email} deleted successfully`);
      setShowDeleteModal(false);
      setUserToDelete(null);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session || session.user.role !== "ADMIN") {
    return null;
  }

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className={`text-2xl sm:text-3xl font-bold ${textPrimary} mb-2`}>User Management</h1>
          <p className={`text-sm ${textSecondary}`}>
            Create and manage user accounts
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 sm:px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold shadow-md hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 touch-manipulation min-h-[44px] flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          <span className="hidden sm:inline">Create User</span>
        </button>
      </div>

      {/* Search Input */}
      <div className={`${cardClass} rounded-xl p-4`}>
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search users by email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 rounded-lg border ${theme === "dark" ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400" : "bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500"} focus:outline-none focus:ring-2 focus:ring-blue-500`}
          />
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <div className={`p-5 rounded-lg border ${theme === "dark" ? "bg-green-900/30 text-green-300 border-green-800" : "bg-green-50 text-green-700 border-green-200"} flex items-center gap-3 fade-in`}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {success}
        </div>
      )}

      {/* Users Table */}
      <div className={`${cardClass} rounded-2xl shadow-lg overflow-hidden`}>
        <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className={`text-lg sm:text-xl font-bold ${textPrimary}`}>
            All Users ({filteredUsers.length})
          </h2>
          <p className={`text-xs sm:text-sm mt-1 ${textSecondary}`}>
            Manage user accounts and their roles
          </p>
        </div>

        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className="w-full min-w-[480px]">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                  Email
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                  Role
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                  Family
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                  Created
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
              {filteredUsers.map((user) => (
                <Fragment key={user.id}>
                  <tr
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition cursor-pointer"
                    onClick={() => handleToggleExpand(user.id)}
                  >
                    <td className="px-4 sm:px-6 py-3 sm:py-4">
                      <div className={`text-sm font-medium ${textPrimary} truncate max-w-[200px]`}>
                        {user.email}
                      </div>
                      <div className={`text-xs ${textSecondary} mt-1 truncate`}>
                        ID: {user.id.substring(0, 8)}...
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.role === "ADMIN"
                          ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                          : user.role === "VERIFIER"
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                          : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm">
                      <span className={`font-medium ${user.family ? "text-green-600 dark:text-green-400" : textSecondary}`}>
                        {user.family ? "1" : "0"}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(user);
                        }}
                        disabled={session?.user?.id === user.id}
                        title={session?.user?.id === user.id ? "Cannot delete yourself" : "Delete user"}
                        className={`p-2 rounded-lg ${theme === "dark" ? "bg-red-900/30 text-red-400 hover:bg-red-900/50 border border-red-800" : "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"} transition-all ${session?.user?.id === user.id ? "opacity-50 cursor-not-allowed" : ""} touch-manipulation`}
                        aria-label={`Delete user ${user.email}`}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                  {expandedUserId === user.id && (
                    <tr key={`${user.id}-details`} className={`${theme === "dark" ? "bg-gray-900/50" : "bg-gray-50"}`}>
                      <td colSpan={5} className="px-4 sm:px-6 py-4">
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h4 className={`font-semibold mb-2 ${textPrimary}`}>User Information</h4>
                              <div className={`p-3 rounded-lg border ${theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
                                <p className={`font-medium ${textPrimary}`}>{user.email}</p>
                                <p className={`text-sm ${textSecondary} mt-1`}>Role: {user.role}</p>
                                <p className={`text-sm ${textSecondary} mt-1`}>
                                  Member since: {new Date(user.createdAt).toLocaleDateString()}
                                </p>
                                <p className={`text-sm ${textSecondary} mt-1`}>
                                  <span className="font-medium">Family Registered:</span> {user.family ? "Yes" : "No"}
                                </p>
                              </div>
                            </div>
                            {user.family && (
                              <div>
                                <h4 className={`font-semibold mb-2 ${textPrimary}`}>Family Details</h4>
                                <div className={`p-3 rounded-lg border ${theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
                                  <p className={`font-medium ${textPrimary}`}>
                                    Head: {[user.family.firstName, user.family.middleName, user.family.lastName].filter(Boolean).join(" ")}
                                  </p>
                                  {user.family.fatherFirstName && (
                                    <p className={`text-sm ${textSecondary} mt-1`}>
                                      Father: {[user.family.fatherFirstName, user.family.fatherMiddleName, user.family.fatherLastName].filter(Boolean).join(" ")}
                                    </p>
                                  )}
                                  {user.family.motherFirstName && (
                                    <p className={`text-sm ${textSecondary} mt-1`}>
                                      Mother: {[user.family.motherFirstName, user.family.motherMiddleName, user.family.motherLastName].filter(Boolean).join(" ")}
                                    </p>
                                  )}
                                  {user.family.spouse && (
                                    <p className={`text-sm ${textSecondary} mt-1`}>
                                      Spouse: {[user.family.spouse.firstName, user.family.spouse.middleName, user.family.spouse.lastName].filter(Boolean).join(" ")}
                                    </p>
                                  )}
                                  <p className={`text-sm ${textSecondary} mt-1`}>
                                    Children: {user.family.children?.length || 0}
                                  </p>
                                  <p className={`text-sm ${textSecondary} mt-1`}>
                                    Status: <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                      user.family.status === "ACCEPTED"
                                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                        : user.family.status === "REJECTED"
                                        ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                        : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                                    }`}>{user.family.status}</span>
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>

                          {user.family && user.family.headPersonId && (
                            <div className="flex justify-end pt-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleShowFamilyTree(user);
                                }}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm min-h-[36px] flex items-center gap-2"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                                Show Family Tree
                              </button>
                            </div>
                          )}

                          {user.family && !user.family.headPersonId && (
                            <div className={`p-3 rounded-lg ${theme === "dark" ? "bg-yellow-900/20 text-yellow-300 border border-yellow-800" : "bg-yellow-50 text-yellow-700 border border-yellow-200"}`}>
                              Cannot view family tree: head person ID is missing.
                            </div>
                          )}

                          {!user.family && (
                            <div className={`p-3 rounded-lg ${theme === "dark" ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-700"}`}>
                              This user has not registered a family yet.
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {searchQuery ? "No users match your search." : "No users found."}
            </p>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className={`${cardClass} rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto`}>
            <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-inherit z-10">
              <div className="flex justify-between items-center">
                <h2 className={`text-lg sm:text-xl font-bold ${textPrimary}`}>Create New User</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className={`p-2 rounded-lg ${theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-100"} transition touch-manipulation`}
                  aria-label="Close"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateUser} className="p-4 sm:p-6 space-y-4 sm:space-y-5">
              {error && (
                <div className={`p-3 sm:p-4 rounded-lg text-sm border ${theme === "dark" ? "bg-red-900/30 text-red-300 border-red-800" : "bg-red-50 text-red-700 border-red-200"}`}>
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="email" className={`block text-sm font-semibold mb-2 ${textPrimary}`}>
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 rounded-lg border touch-manipulation min-h-[44px] ${theme === "dark" ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500" : "bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-blue-500 focus:border-blue-500"}`}
                  placeholder="user@example.com"
                />
              </div>

              <div>
                <label htmlFor="password" className={`block text-sm font-semibold mb-2 ${textPrimary}`}>
                  Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 rounded-lg border touch-manipulation min-h-[44px] ${theme === "dark" ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500" : "bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-blue-500 focus:border-blue-500"}`}
                  placeholder="At least 6 characters"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className={`block text-sm font-semibold mb-2 ${textPrimary}`}>
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  required
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 rounded-lg border touch-manipulation min-h-[44px] ${theme === "dark" ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500" : "bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-blue-500 focus:border-blue-500"}`}
                  placeholder="Confirm password"
                />
              </div>

              <div>
                <label htmlFor="role" className={`block text-sm font-semibold mb-2 ${textPrimary}`}>
                  Role
                </label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 rounded-lg border touch-manipulation min-h-[44px] ${theme === "dark" ? "bg-gray-700 border-gray-600 text-white focus:ring-blue-500 focus:border-blue-500" : "bg-gray-50 border-gray-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500"}`}
                >
                  <option value="USER">User</option>
                  <option value="VERIFIER">Verifier</option>
                  <option value="ADMIN">Admin</option>
                </select>
                <p className={`text-xs mt-2 ${textSecondary}`}>
                  Admins have full access. Verifiers can create users and manage their family data.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className={`flex-1 px-4 py-3 rounded-lg font-semibold border touch-manipulation min-h-[44px] ${theme === "dark" ? "border-gray-600 text-gray-200 hover:bg-gray-700" : "border-gray-300 text-gray-700 hover:bg-gray-50"} transition-all`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold shadow-md hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transform transition-all duration-200 touch-manipulation min-h-[44px]"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating...
                    </span>
                  ) : (
                    "Create User"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && userToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className={`${cardClass} rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto`}>
            <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${theme === "dark" ? "bg-red-900/30" : "bg-red-100"}`}>
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className={`text-lg sm:text-xl font-bold ${textPrimary}`}>Delete User</h2>
              </div>
            </div>

            <div className="p-4 sm:p-6 space-y-4">
              <p className={`text-sm ${textSecondary}`}>
                Are you sure you want to delete the user <span className={`font-semibold ${textPrimary}`}>{userToDelete.email}</span>?
              </p>
              <div className={`p-4 rounded-lg text-sm ${theme === "dark" ? "bg-red-900/20 text-red-300 border border-red-800" : "bg-red-50 text-red-700 border border-red-200"}`}>
                <p className="font-semibold mb-2">This action will permanently delete:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>User account</li>
                  <li>Family record</li>
                  <li>Associated person records</li>
                  <li>Spouse and children records</li>
                  <li>Relationship data</li>
                </ul>
              </div>

              {error && (
                <div className={`p-3 rounded-lg text-sm ${theme === "dark" ? "bg-red-900/30 text-red-300 border border-red-800" : "bg-red-50 text-red-700 border-red-200"}`}>
                  {error}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setUserToDelete(null);
                    setError("");
                  }}
                  disabled={loading}
                  className={`flex-1 px-4 py-3 rounded-lg font-semibold border touch-manipulation min-h-[44px] ${theme === "dark" ? "border-gray-600 text-gray-200 hover:bg-gray-700" : "border-gray-300 text-gray-700 hover:bg-gray-50"} transition-all`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg font-semibold shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transform transition-all duration-200 touch-manipulation min-h-[44px] flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Deleting...
                    </>
                  ) : (
                    "Delete User"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Family Tree Modal */}
      {showFamilyTreeModal && selectedUserForTree && selectedUserForTree.family?.headPersonId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
          <div className={`${cardClass} rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col`}>
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h2 className={`text-lg sm:text-xl font-bold ${textPrimary}`}>Family Tree - {selectedUserForTree.email}</h2>
              <button
                onClick={() => setShowFamilyTreeModal(false)}
                className={`p-2 rounded-lg ${theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-100"} transition`}
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              <FamilyTree defaultPersonId={selectedUserForTree.family!.headPersonId} compact />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
