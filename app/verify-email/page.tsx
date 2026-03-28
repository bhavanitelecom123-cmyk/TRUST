"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTheme } from "@/components/theme/ThemeProvider";

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme } = useTheme();
  const token = searchParams.get("token");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setError("Invalid or missing verification token.");
        setVerifying(false);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Verification failed");
          setVerifying(false);
          return;
        }

        setSuccess(true);
        setVerifying(false);

        // Auto-redirect to login after 3 seconds
        setTimeout(() => {
          router.push("/login?message=Email verified! You can now sign in.");
        }, 3000);
      } catch (err) {
        setError("Network error. Please try again.");
        setVerifying(false);
      } finally {
        setLoading(false);
      }
    };

    verifyEmail();
  }, [token, router]);

  if (verifying) {
    return (
      <div className="text-center py-12">
        <svg className="animate-spin h-12 w-12 mx-auto text-indigo-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="mt-4 text-gray-600 dark:text-gray-400">Verifying your email...</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center py-8">
        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-10 h-10 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Email Verified!</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Your email address has been successfully verified. You can now sign in to your account.
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Redirecting to login...
        </p>
        <Link
          href="/login"
          className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold shadow-md hover:from-blue-700 hover:to-indigo-700 transition-all"
        >
          Go to Login
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Verification Failed</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          We couldn&apos;t verify your email address
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm border border-red-200 dark:border-red-800 mb-6">
          {error}
        </div>
      )}

      <div className="space-y-4 text-center">
        <p className="text-gray-600 dark:text-gray-400">
          The verification link may be invalid or has expired. Please try one of the following:
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/login"
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold shadow-md hover:from-blue-700 hover:to-indigo-700 transition-all"
          >
            Go to Login
          </Link>
          <Link
            href="/forgot-password"
            className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
          >
            Reset Password
          </Link>
        </div>
      </div>
    </>
  );
}

export default function VerifyEmailPage() {
  const { theme } = useTheme();

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className={`w-full max-w-md ${theme === "dark" ? "bg-gray-800 border border-gray-700" : "bg-white"} rounded-2xl shadow-xl overflow-hidden fade-in`}>
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-8 text-center">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-10 h-10 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">
            Verify Email
          </h2>
          <p className="text-green-100">
            Confirm your email address
          </p>
        </div>

        {/* Content */}
        <div className="p-8">
          <Suspense fallback={<div>Loading...</div>}>
            <VerifyEmailForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
