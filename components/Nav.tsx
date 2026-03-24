"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import ThemeToggle from "@/components/theme/ThemeToggle";
import { useTheme } from "@/components/theme/ThemeProvider";

export default function Nav() {
  const { data: session, status } = useSession();
  const { theme } = useTheme();

  return (
    <nav className={`${theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"} shadow-sm border-b transition-colors safe-area-inset-top`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14 sm:h-16">
          <div className="flex items-center">
            <Link href="/" className={`text-lg sm:text-xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"} hover:text-blue-600 transition`}>
              🏛️ Community Portal
            </Link>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            {status === "loading" ? (
              <span className={`${theme === "dark" ? "text-gray-400" : "text-gray-500"} text-sm`}>Loading...</span>
            ) : session ? (
              <>
                {session.user.role === "ADMIN" && (
                  <Link
                    href="/admin/dashboard"
                    className={`${theme === "dark" ? "text-gray-300 hover:text-white" : "text-gray-600 hover:text-gray-900"} transition font-semibold text-blue-600 dark:text-blue-400 text-sm sm:text-base`}
                  >
                    Admin
                  </Link>
                )}
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className={`${theme === "dark" ? "text-gray-300 hover:text-white" : "text-gray-600 hover:text-gray-900"} transition text-sm sm:text-base`}
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className={`${theme === "dark" ? "text-gray-300 hover:text-white" : "text-gray-600 hover:text-gray-900"} transition text-sm sm:text-base`}
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="px-3 sm:px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition shadow-md text-sm sm:text-base touch-manipulation min-h-[44px] flex items-center"
                >
                  Register
                </Link>
              </>
            )}
            <ThemeToggle />
          </div>
        </div>
      </div>
    </nav>
  );
}
