"use client";

import { useState, Fragment, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useTheme } from "@/components/theme/ThemeProvider";
import FamilyForm from "@/components/forms/FamilyForm";
import { FamilyFormData } from "@/types";

interface User {
  id: string;
  email: string;
  role: "USER" | "VERIFIER" | "ADMIN";
  createdAt: Date;
  family: any | null;
}

interface VerifierUsersClientProps {
  initialUsers: User[];
}

export default function VerifierUsersClient({ initialUsers }: VerifierUsersClientProps) {
  const { data: session, status } = useSession();
  const { theme } = useTheme();
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [showFamilyModal, setShowFamilyModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editingFamily, setEditingFamily] = useState<any | null>(null);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [userFormData, setUserFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });

  const cardClass = theme === "dark"
    ? "bg-gray-800 border border-gray-700 shadow-lg"
    : "bg-white border border-gray-200 shadow-lg";

  const textPrimary = theme === "dark" ? "text-white" : "text-gray-900";
  const textSecondary = theme === "dark" ? "text-gray-300" : "text-gray-600";

  const handleAddFamilyClick = (user: User) => {
    setSelectedUser(user);
    setEditingFamily(null);
    setShowFamilyModal(true);
    setError("");
  };

  const handleEditFamilyClick = async (user: User) => {
    if (!user.family) return;
    setError("");
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/verifier/families/${user.family.id}`);
      if (!res.ok) {
        throw new Error("Failed to fetch family details");
      }
      const data = await res.json();
      setSelectedUser(user);
      setEditingFamily(data.family);
      setShowFamilyModal(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setShowFamilyModal(false);
    setSelectedUser(null);
    setEditingFamily(null);
    setError("");
  };

  const handleFormSubmit = async (data: FamilyFormData) => {
    if (!selectedUser) return;

    setIsSubmitting(true);
    setError("");

    try {
      let response;
      if (editingFamily) {
        // Update existing family
        response = await fetch(`/api/verifier/families/${editingFamily.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data }),
        });
      } else {
        // Create new family for the selected user
        response = await fetch("/api/verifier/families", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: selectedUser.id,
            familyData: data,
          }),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save family data");
      }

      setSuccess(editingFamily ? "Family updated successfully!" : "Family created successfully! (pending approval)");
      handleCloseModal();

      // Refetch user list to update family status
      const res = await fetch("/api/verifier/users");
      const responseData = await res.json();
      setUsers(responseData.users);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUserInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUserFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError("");
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!userFormData.email || !userFormData.password) {
      setError("Email and password are required");
      return;
    }

    if (userFormData.password !== userFormData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (userFormData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/verifier/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userFormData.email,
          password: userFormData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to create user");
        return;
      }

      // Refetch user list
      const res = await fetch("/api/verifier/users");
      const usersData = await res.json();
      setUsers(usersData.users);

      setSuccess(`User ${data.user.email} created successfully!`);
      setShowCreateUserModal(false);
      setUserFormData({
        email: "",
        password: "",
        confirmPassword: "",
      });

      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session || session.user.role !== "VERIFIER") {
    return null;
  }

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className={`text-2xl sm:text-3xl font-bold ${textPrimary} mb-2`}>My Users</h1>
          <p className={`text-sm ${textSecondary}`}>
            Users you've created. Manage their family data.
          </p>
        </div>
        <button
          onClick={() => setShowCreateUserModal(true)}
          className="px-4 sm:px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold shadow-md hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 touch-manipulation min-h-[44px] flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          <span className="hidden sm:inline">Create User</span>
        </button>
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
            All Users ({users.length})
          </h2>
          <p className={`text-xs sm:text-sm mt-1 ${textSecondary}`}>
            Create users and add their family information
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
                  Family
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                  Status
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
              {users.map((user) => (
                <Fragment key={user.id}>
                  <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                    <td className="px-4 sm:px-6 py-3 sm:py-4">
                      <div className={`text-sm font-medium ${textPrimary} truncate max-w-[200px]`}>
                        {user.email}
                      </div>
                      <div className={`text-xs ${textSecondary} mt-1 truncate`}>
                        ID: {user.id.substring(0, 8)}...
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm">
                      <span className={`font-medium ${user.family ? "text-green-600 dark:text-green-400" : textSecondary}`}>
                        {user.family ? "Registered" : "Not Registered"}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                      {user.family ? (
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.family.status === "ACCEPTED"
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : user.family.status === "REJECTED"
                            ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                            : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                        }`}>
                          {user.family.status}
                        </span>
                      ) : (
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${theme === "dark" ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-800"}`}>
                          N/A
                        </span>
                      )}
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                      {user.family ? (
                        <button
                          onClick={() => handleEditFamilyClick(user)}
                          disabled={user.family.status !== "PENDING"}
                          title={user.family.status === "PENDING" ? "Edit family" : "Only pending families can be edited"}
                          className={
                            user.family.status === "PENDING"
                              ? `p-2 rounded-lg ${theme === "dark" ? "bg-amber-900/30 text-amber-400 hover:bg-amber-900/50 border border-amber-800" : "bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200"} transition-all`
                              : `p-2 rounded-lg ${theme === "dark" ? "bg-gray-800 text-gray-500 cursor-not-allowed" : "bg-gray-100 text-gray-400 cursor-not-allowed"} border border-gray-300`
                          }
                          aria-label={
                            user.family.status === "PENDING"
                              ? `Edit family for ${user.email}`
                              : `Cannot edit family for ${user.email} - status is ${user.family.status}`
                          }
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAddFamilyClick(user)}
                          className={
                            theme === "dark"
                              ? "p-2 rounded-lg bg-blue-900/30 text-blue-400 hover:bg-blue-900/50 border border-blue-800 transition-all"
                              : "p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 transition-all"
                          }
                          aria-label={`Add family for ${user.email}`}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                          </svg>
                        </button>
                      )}
                    </td>
                  </tr>
                  {user.family && (
                    <tr className={`${theme === "dark" ? "bg-gray-900/50" : "bg-gray-50"}`}>
                      <td colSpan={5} className="px-4 sm:px-6 py-4">
                        <div className={`p-3 rounded-lg ${theme === "dark" ? "bg-gray-800" : "bg-white"} border ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                          <h4 className={`font-semibold mb-2 ${textPrimary}`}>Family Details</h4>
                          <p className={`text-sm ${textSecondary}`}>
                            <span className="font-medium">Head:</span> {[user.family.firstName, user.family.middleName, user.family.lastName].filter(Boolean).join(" ")}
                          </p>
                          {user.family.fatherFirstName && (
                            <p className={`text-sm ${textSecondary} mt-1`}>
                              <span className="font-medium">Father:</span> {[user.family.fatherFirstName, user.family.fatherMiddleName, user.family.fatherLastName].filter(Boolean).join(" ")}
                            </p>
                          )}
                          {user.family.motherFirstName && (
                            <p className={`text-sm ${textSecondary} mt-1`}>
                              <span className="font-medium">Mother:</span> {[user.family.motherFirstName, user.family.motherMiddleName, user.family.motherLastName].filter(Boolean).join(" ")}
                            </p>
                          )}
                          {user.family.spouse && (
                            <p className={`text-sm ${textSecondary} mt-1`}>
                              <span className="font-medium">Spouse:</span> {[user.family.spouse.firstName, user.family.spouse.middleName, user.family.spouse.lastName].filter(Boolean).join(" ")}
                            </p>
                          )}
                          <p className={`text-sm ${textSecondary} mt-1`}>
                            <span className="font-medium">Children:</span> {user.family.children?.length || 0}
                          </p>
                          <p className={`text-sm ${textSecondary} mt-1`}>
                            <span className="font-medium">Gender:</span> {user.family.gender}
                          </p>
                          {user.family.education && (
                            <p className={`text-sm ${textSecondary} mt-1`}>
                              <span className="font-medium">Education:</span> {user.family.education}
                            </p>
                          )}
                          {user.family.occupationType && (
                            <p className={`text-sm ${textSecondary} mt-1`}>
                              <span className="font-medium">Occupation:</span> {user.family.occupationType} {user.family.occupationLocation && `(${user.family.occupationLocation})`}
                            </p>
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

        {users.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              No users found. Create a user first to add family data.
            </p>
          </div>
        )}
      </div>

      {/* Family Modal */}
      {showFamilyModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
          <div className={`${cardClass} rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col`}>
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h2 className={`text-lg sm:text-xl font-bold ${textPrimary}`}>
                {editingFamily ? "Edit Family" : "Add Family"} for {selectedUser.email}
              </h2>
              <button
                onClick={handleCloseModal}
                className={`p-2 rounded-lg ${theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-100"} transition`}
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 sm:p-6">
              {error && (
                <div className={`p-3 mb-4 rounded-lg text-sm ${theme === "dark" ? "bg-red-900/30 text-red-300 border border-red-800" : "bg-red-50 text-red-700 border border-red-200"}`}>
                  {error}
                </div>
              )}
              <FamilyForm
                initialData={editingFamily ? {
                  firstName: editingFamily.firstName,
                  middleName: editingFamily.middleName || "",
                  lastName: editingFamily.lastName,
                  dateOfBirth: editingFamily.headPerson?.dateOfBirth || undefined,
                  headPersonId: editingFamily.headPersonId || undefined,
                  fatherFirstName: editingFamily.fatherFirstName || "",
                  fatherMiddleName: editingFamily.fatherMiddleName || "",
                  fatherLastName: editingFamily.fatherLastName || "",
                  fatherDateOfBirth: editingFamily.fatherPerson?.dateOfBirth || "",
                  fatherId: editingFamily.fatherId || undefined,
                  motherFirstName: editingFamily.motherFirstName || "",
                  motherMiddleName: editingFamily.motherMiddleName || "",
                  motherLastName: editingFamily.motherLastName || "",
                  motherDateOfBirth: editingFamily.motherPerson?.dateOfBirth || "",
                  motherId: editingFamily.motherId || undefined,
                  education: editingFamily.education || "",
                  occupationType: (editingFamily.occupationType as "Job" | "Business" | "Unoccupied") || "Job",
                  occupationLocation: editingFamily.occupationLocation || "",
                  gender: "Male",
                  maritalStatus: editingFamily.maritalStatus as "Single" | "Married" | "Widowed" | "Divorced",
                  spouse: editingFamily.spouse
                    ? {
                        firstName: editingFamily.spouse.firstName,
                        middleName: editingFamily.spouse.middleName || "",
                        lastName: editingFamily.spouse.lastName,
                        dateOfBirth: editingFamily.spouse.person?.dateOfBirth || undefined,
                        personId: editingFamily.spouse.personId || undefined,
                        fatherFirstName: editingFamily.spouse.fatherFirstName || "",
                        fatherMiddleName: editingFamily.spouse.fatherMiddleName || "",
                        fatherLastName: editingFamily.spouse.fatherLastName || "",
                        motherFirstName: editingFamily.spouse.motherFirstName || "",
                        motherMiddleName: editingFamily.spouse.motherMiddleName || "",
                        motherLastName: editingFamily.spouse.motherLastName || "",
                        isDeceased: false,
                        education: editingFamily.spouse.education || "",
                        occupationType: (editingFamily.spouse.occupationType as "Job" | "Business" | "Unoccupied" | "House Wife") || "Job",
                        occupationLocation: editingFamily.spouse.occupationLocation || "",
                        gender: "Female",
                      }
                    : undefined,
                  children: editingFamily.children.map((child: any) => ({
                    firstName: child.firstName,
                    middleName: child.middleName || "",
                    lastName: child.lastName,
                    dateOfBirth: child.person?.dateOfBirth || "",
                    personId: child.personId || undefined,
                    gender: child.gender as "Male" | "Female" | "Other",
                    education: child.education || "",
                  })),
                } : undefined}
                onSubmit={handleFormSubmit}
              />
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateUserModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className={`${cardClass} rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto`}>
            <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-inherit z-10">
              <div className="flex justify-between items-center">
                <h2 className={`text-lg sm:text-xl font-bold ${textPrimary}`}>Create New User</h2>
                <button
                  onClick={() => {
                    setShowCreateUserModal(false);
                    setError("");
                    setUserFormData({ email: "", password: "", confirmPassword: "" });
                  }}
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
                  value={userFormData.email}
                  onChange={handleUserInputChange}
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
                  value={userFormData.password}
                  onChange={handleUserInputChange}
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
                  value={userFormData.confirmPassword}
                  onChange={handleUserInputChange}
                  className={`w-full px-4 py-3 rounded-lg border touch-manipulation min-h-[44px] ${theme === "dark" ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500" : "bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-blue-500 focus:border-blue-500"}`}
                  placeholder="Confirm password"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateUserModal(false);
                    setError("");
                    setUserFormData({ email: "", password: "", confirmPassword: "" });
                  }}
                  className={`flex-1 px-4 py-3 rounded-lg font-semibold border touch-manipulation min-h-[44px] ${theme === "dark" ? "border-gray-600 text-gray-200 hover:bg-gray-700" : "border-gray-300 text-gray-700 hover:bg-gray-50"} transition-all`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold shadow-md hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transform transition-all duration-200 touch-manipulation min-h-[44px]"
                >
                  {isSubmitting ? (
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
    </div>
  );
}
