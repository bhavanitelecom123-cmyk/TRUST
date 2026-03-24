"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";
import FamilyForm from "@/components/forms/FamilyForm";

export default function FamilyFormPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { theme } = useTheme();

  useEffect(() => {
    if (status === "authenticated") {
      const checkExistingFamily = async () => {
        try {
          const response = await fetch("/api/family");
          if (response.ok) {
            // User already has a family record, redirect to dashboard
            router.push("/dashboard?message=You+already+have+a+family+record.+Use+the+dashboard+to+edit.");
          }
        } catch (error) {
          // Ignore errors - user might not have a family record
        }
      };
      checkExistingFamily();
    }
  }, [status, router]);

  const cardClass = theme === "dark"
    ? "bg-gray-800 border border-gray-700 shadow-lg"
    : "bg-white border border-gray-200 shadow-lg";

  const textPrimary = theme === "dark" ? "text-white" : "text-gray-900";
  const textSecondary = theme === "dark" ? "text-gray-300" : "text-gray-600";

  if (status === "loading") {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent"></div>
          <p className={`mt-4 ${textSecondary}`}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className={`text-center p-8 rounded-2xl ${cardClass}`}>
          <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className={`text-2xl font-bold ${textPrimary} mb-4`}>Access Denied</h1>
          <p className={textSecondary + " mb-6"}>
            Please login to access the family form.
          </p>
          <a
            href="/login"
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold shadow-md hover:from-blue-700 hover:to-indigo-700 transition-all"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            Login
          </a>
        </div>
      </div>
    );
  }

  const handleSubmit = async (data: any) => {
    const method = "POST";
    const response = await fetch("/api/family", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error("Failed to save family data");
    }

    router.push("/dashboard?message=Family form submitted successfully!");
  };

  return (
    <div className="space-y-6 fade-in">
      <div className={cardClass + " rounded-xl p-6"}>
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h1 className={`text-3xl font-bold ${textPrimary}`}>Family Form</h1>
          </div>
          <p className={textSecondary}>
            Fill in your family details below. Fields marked with <span className="text-red-500">*</span> are required.
          </p>
        </div>

        <FamilyForm onSubmit={handleSubmit} />
      </div>
    </div>
  );
}
