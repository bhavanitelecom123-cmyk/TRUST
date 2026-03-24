"use client";

import { useState } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";

interface Family {
  id: string;
  // Head fields
  firstName: string;
  middleName?: string | null;
  lastName: string;
  fatherFirstName?: string | null;
  fatherMiddleName?: string | null;
  fatherLastName?: string | null;
  motherFirstName?: string | null;
  motherMiddleName?: string | null;
  motherLastName?: string | null;
  user: {
    email: string;
  };
  maritalStatus: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  createdAt: Date;
  spouse?: {
    firstName: string;
    middleName?: string | null;
    lastName: string;
    fatherFirstName?: string | null;
    fatherMiddleName?: string | null;
    fatherLastName?: string | null;
    motherFirstName?: string | null;
    motherMiddleName?: string | null;
    motherLastName?: string | null;
  } | null;
  children: Array<{ id: string }>;
}

interface Stats {
  total: number;
  pending: number;
  accepted: number;
  rejected: number;
}

interface AdminDashboardClientProps {
  initialFamilies: Family[];
  initialStats: Stats;
}

export default function AdminDashboardClient({ initialFamilies, initialStats }: AdminDashboardClientProps) {
  const { theme } = useTheme();
  const [families, setFamilies] = useState<Family[]>(initialFamilies);
  const [stats, setStats] = useState<Stats>(initialStats);
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({});

  const handleStatusChange = async (familyId: string, newStatus: "ACCEPTED" | "REJECTED") => {
    setLoading((prev) => ({ ...prev, [familyId]: true }));
    try {
      const response = await fetch("/api/admin/families", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ familyId, status: newStatus }),
      });

      if (response.ok) {
        setFamilies((prev) =>
          prev.map((family) =>
            family.id === familyId ? { ...family, status: newStatus } : family
          )
        );
        setStats((prev) => ({
          ...prev,
          pending: Math.max(0, prev.pending - 1),
          accepted: newStatus === "ACCEPTED" ? prev.accepted + 1 : prev.accepted,
        }));
      }
    } catch (error) {
      console.error(`Failed to ${newStatus.toLowerCase()} family:`, error);
    } finally {
      setLoading((prev) => ({ ...prev, [familyId]: false }));
    }
  };

  const cardClass = theme === "dark"
    ? "bg-gray-800 border border-gray-700 shadow-lg"
    : "bg-white border border-gray-200 shadow-lg";

  const textPrimary = theme === "dark" ? "text-white" : "text-gray-900";
  const textSecondary = theme === "dark" ? "text-gray-300" : "text-gray-600";

  return (
    <div className="space-y-6 fade-in">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-4 sm:p-6 rounded-2xl shadow-lg text-white">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-blue-100 text-xs sm:text-sm font-medium">Total Families</p>
              <p className="text-3xl sm:text-4xl font-bold mt-1 sm:mt-2">{stats.total}</p>
            </div>
            <div className="p-2 sm:p-3 bg-white/20 rounded-xl flex-shrink-0">
              <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-500 to-amber-600 p-4 sm:p-6 rounded-2xl shadow-lg text-white">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-yellow-100 text-xs sm:text-sm font-medium">Pending</p>
              <p className="text-3xl sm:text-4xl font-bold mt-1 sm:mt-2">{stats.pending}</p>
            </div>
            <div className="p-2 sm:p-3 bg-white/20 rounded-xl flex-shrink-0">
              <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-4 sm:p-6 rounded-2xl shadow-lg text-white">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-green-100 text-xs sm:text-sm font-medium">Accepted</p>
              <p className="text-3xl sm:text-4xl font-bold mt-1 sm:mt-2">{stats.accepted}</p>
            </div>
            <div className="p-2 sm:p-3 bg-white/20 rounded-xl flex-shrink-0">
              <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-rose-600 p-4 sm:p-6 rounded-2xl shadow-lg text-white">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-red-100 text-xs sm:text-sm font-medium">Rejected</p>
              <p className="text-3xl sm:text-4xl font-bold mt-1 sm:mt-2">{stats.rejected || 0}</p>
            </div>
            <div className="p-2 sm:p-3 bg-white/20 rounded-xl flex-shrink-0">
              <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Families Table */}
      <div className={`${cardClass} rounded-2xl shadow-lg overflow-hidden transition-colors`}>
        <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className={`text-lg sm:text-xl font-bold ${textPrimary}`}>
            Recent Family Registrations
          </h2>
          <p className={`text-xs sm:text-sm mt-1 ${textSecondary}`}>
            Manage registration requests and update status
          </p>
        </div>

        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className="w-full min-w-[640]">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                  Head of Family
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                  Email
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                  Marital Status
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                  Status
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                  Date
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
              {families.map((family) => (
                <tr key={family.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                  <td className="px-4 sm:px-6 py-3 sm:py-4">
                    <div className="flex items-center min-w-0">
                      <div className="flex-shrink-0 h-8 w-8 sm:h-10 sm:w-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-xs sm:text-sm">
                          {family.firstName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="ml-3 min-w-0">
                        <div className={`text-sm font-medium ${textPrimary} truncate`}>
                          {[family.firstName, family.middleName, family.lastName].filter(Boolean).join(" ")}
                        </div>
                        {family.spouse && (
                          <div className={`text-xs sm:text-sm ${textSecondary} truncate`}>
                            Spouse: {[family.spouse.firstName, family.spouse.middleName, family.spouse.lastName].filter(Boolean).join(" ")}
                          </div>
                        )}
                        {family.children.length > 0 && (
                          <div className={`text-xs sm:text-sm ${textSecondary}`}>
                            {family.children.length} child(ren)
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                    <div className={`text-sm ${textPrimary} truncate max-w-[120px]`}>
                      {family.user.email}
                    </div>
                  </td>
                  <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      {family.maritalStatus}
                    </span>
                  </td>
                  <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      family.status === "ACCEPTED"
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : family.status === "REJECTED"
                        ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                        : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                    }`}>
                      {family.status}
                    </span>
                  </td>
                  <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                    {new Date(family.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm">
                    {family.status === "PENDING" ? (
                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                        <button
                          onClick={() => handleStatusChange(family.id, "ACCEPTED")}
                          disabled={loading[family.id]}
                          className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 font-medium disabled:opacity-50 text-sm min-h-[32px] flex items-center touch-manipulation"
                        >
                          {loading[family.id] ? "Processing..." : "Accept"}
                        </button>
                        <button
                          onClick={() => handleStatusChange(family.id, "REJECTED")}
                          disabled={loading[family.id]}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 font-medium disabled:opacity-50 text-sm min-h-[32px] flex items-center touch-manipulation"
                        >
                          {loading[family.id] ? "Processing..." : "Reject"}
                        </button>
                      </div>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500 text-sm">No actions</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {families.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400 text-sm">No family registrations yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
