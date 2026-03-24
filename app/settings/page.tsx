"use client";

import { useTheme } from "@/components/theme/ThemeProvider";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { signOut } from "next-auth/react";

export default function SettingsPage() {
  const { theme } = useTheme();
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const cardClass = theme === "dark"
    ? "bg-gray-800 border border-gray-700"
    : "bg-white border border-gray-200";

  const textPrimary = theme === "dark" ? "text-white" : "text-gray-900";
  const textSecondary = theme === "dark" ? "text-gray-300" : "text-gray-600";

  return (
    <DashboardLayout activeItem="settings">
      <div className="space-y-6">
        <div className="mb-8">
          <h1 className={`text-3xl font-bold ${textPrimary} mb-2`}>Settings</h1>
          <p className={textSecondary}>
            Manage your account settings and preferences.
          </p>
        </div>

        {/* Profile Card */}
        <div className={`${cardClass} rounded-xl p-6 shadow-lg`}>
          <h2 className={`text-xl font-bold ${textPrimary} mb-4`}>Profile Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <p className="text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                {session.user?.email}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Role
              </label>
              <p className="text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 p-3 rounded-lg border border-gray-200 dark:border-gray-700 capitalize">
                {session.user?.role?.toLowerCase()}
              </p>
            </div>
          </div>
        </div>

        {/* Account Actions */}
        <div className={`${cardClass} rounded-xl p-6 shadow-lg`}>
          <h2 className={`text-xl font-bold ${textPrimary} mb-4`}>Account Actions</h2>
          <div className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Manage your account by changing your password or logging out.
            </p>

            <button
              onClick={() => {
                // This would typically go to NextAuth account page or password reset
                // For now, we'll just alert
                alert("Password change feature coming soon!");
              }}
              className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors text-left flex items-center justify-between"
            >
              <span>Change Password</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>

            <button
              onClick={() => {
                if (window.confirm("Are you sure you want to log out?")) {
                  signOut({ callbackUrl: "/" });
                }
              }}
              className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors text-left flex items-center justify-between"
            >
              <span>Logout</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>

        {/* Information */}
        <div className={`${cardClass} rounded-xl p-6 shadow-lg`}>
          <h2 className={`text-xl font-bold ${textPrimary} mb-4`}>Your Data</h2>
          <p className={`text-sm ${textSecondary} mb-4`}>
            We store your posts, comments, and family information to provide you with a seamless community experience.
          </p>
          <p className={`text-sm ${textSecondary}`}>
            Your data is securely stored and you can delete your account by contacting an administrator.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
