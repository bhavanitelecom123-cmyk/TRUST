"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/theme/ThemeProvider";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import FamilyForm from "@/components/forms/FamilyForm";

interface FamilyData {
  id: string;
  // Head
  firstName: string;
  middleName?: string;
  lastName: string;
  fatherFirstName?: string;
  fatherMiddleName?: string;
  fatherLastName?: string;
  motherFirstName?: string;
  motherMiddleName?: string;
  motherLastName?: string;
  education?: string;
  occupationType?: string;
  occupationLocation?: string;
  gender: string;
  maritalStatus: string;
  spouse?: {
    id: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    fatherFirstName?: string;
    fatherMiddleName?: string;
    fatherLastName?: string;
    motherFirstName?: string;
    motherMiddleName?: string;
    motherLastName?: string;
    education?: string;
    occupationType?: string;
    occupationLocation?: string;
    gender: string;
    isDeceased?: boolean;
  };
  children: Array<{
    id: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    gender: string;
    education?: string;
  }>;
}

export default function FamilyPage() {
  const { data: session, status } = useSession();
  const { theme } = useTheme();
  const router = useRouter();
  const [family, setFamily] = useState<FamilyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated") {
      fetchFamily();
    }
  }, [status]);

  const fetchFamily = async () => {
    try {
      const response = await fetch("/api/family");
      if (response.ok) {
        const data = await response.json();
        setFamily(data.family);
      } else if (response.status !== 404) {
        setMessage("Failed to load family data");
      }
    } catch (err) {
      setMessage("Error loading family data");
    } finally {
      setLoading(false);
    }
  };

  const handleFamilySubmit = async (data: any) => {
    const method = family ? "PUT" : "POST";
    const response = await fetch("/api/family", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error("Failed to save family data");
    }

    await fetchFamily();
    setMessage(family ? "Family data updated successfully!" : "Family data saved successfully!");
    setTimeout(() => setMessage(""), 3000);
  };

  const cardClass = theme === "dark"
    ? "bg-gray-800 border border-gray-700 shadow-lg"
    : "bg-white border border-gray-200 shadow-lg";

  const textPrimary = theme === "dark" ? "text-white" : "text-gray-900";
  const textSecondary = theme === "dark" ? "text-gray-300" : "text-gray-600";

  if (status === "loading" || loading) {
    return (
      <DashboardLayout activeItem="family">
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent"></div>
            <p className={`mt-4 ${textSecondary}`}>Loading...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <DashboardLayout activeItem="family">
      <div className="space-y-4 sm:space-y-6 fade-in">
        {/* Welcome Message */}
        <div>
          <h1 className={`text-2xl sm:text-3xl font-bold ${textPrimary} mb-2`}>Family Record</h1>
          <p className={`text-sm sm:text-base ${textSecondary}`}>
            Welcome back, {session.user?.email}
          </p>
        </div>

        {/* Success Message */}
        {message && (
          <div className={`p-4 sm:p-5 rounded-lg border ${theme === "dark" ? "bg-green-900/30 text-green-300 border-green-800" : "bg-green-50 text-green-700 border-green-200"} flex items-center gap-3 fade-in`}>
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm sm:text-base">{message}</span>
          </div>
        )}

        {/* Family Info Card */}
        <div className={`${cardClass} rounded-xl p-4 sm:p-6`}>
          <div className="mb-4 sm:mb-6">
            <h2 className={`text-xl sm:text-2xl font-bold ${textPrimary} mb-2`}>
              {family ? "Edit Family Information" : "Create Family Record"}
            </h2>
            <p className={`text-sm ${textSecondary}`}>
              {family
                ? "Update your family details below. Changes will be saved immediately."
                : "Fill in your family details below. This information will be stored securely."}
            </p>
          </div>

          <FamilyForm initialData={family} onSubmit={handleFamilySubmit} />
        </div>

        {/* View Family Tree Button */}
        <div className={`${cardClass} rounded-xl p-4 sm:p-6`}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className={`text-xl sm:text-2xl font-bold ${textPrimary}`}>
                Visualize Your Family
              </h2>
              <p className={`text-sm ${textSecondary} mt-1`}>
                See your family tree with ancestors and descendants.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => router.push("/dashboard/family-tree")}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-semibold shadow-md hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                Family Tree
              </button>
            </div>
          </div>
        </div>

        {/* Current Family Preview */}
        {family && (
          <div className={`${cardClass} rounded-xl p-4 sm:p-6`}>
            <h2 className={`text-xl sm:text-2xl font-bold ${textPrimary} mb-4 sm:mb-6 flex items-center gap-3`}>
              <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex-shrink-0">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              Current Family Record
            </h2>

            <div className="space-y-4 sm:space-y-6">
              {/* Head of Family Card */}
              <div className={`p-4 sm:p-5 rounded-lg ${theme === "dark" ? "bg-gray-700/50 border border-gray-600" : "bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100"}`}>
                <h3 className={`font-bold text-base sm:text-lg mb-2 sm:mb-3 flex items-center gap-2 ${textPrimary}`}>
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Head of Family
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className={`font-semibold ${textPrimary}`}>
                      {[family.firstName, family.middleName, family.lastName].filter(Boolean).join(" ")}
                    </p>
                    {family.fatherFirstName && (
                      <p className={`text-sm mt-1 ${textSecondary}`}>Father: {[family.fatherFirstName, family.fatherMiddleName, family.fatherLastName].filter(Boolean).join(" ")}</p>
                    )}
                    {family.motherFirstName && (
                      <p className={`text-sm ${textSecondary}`}>Mother: {[family.motherFirstName, family.motherMiddleName, family.motherLastName].filter(Boolean).join(" ")}</p>
                    )}
                  </div>
                  <div>
                    {family.education && (
                      <p className={`text-sm ${textSecondary}`}>
                        <span className="font-semibold">Education:</span> {family.education}
                      </p>
                    )}
                    {family.occupationType && (
                      <p className={`text-sm mt-1 ${textSecondary}`}>
                        <span className="font-semibold">Occupation:</span> {family.occupationType}
                        {family.occupationLocation && ` at ${family.occupationLocation}`}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2 sm:gap-4 mt-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${theme === "dark" ? "bg-gray-600 text-gray-200" : "bg-blue-100 text-blue-800"}`}>
                        {family.gender}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${theme === "dark" ? "bg-gray-600 text-gray-200" : "bg-purple-100 text-purple-800"}`}>
                        {family.maritalStatus}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Spouse Card */}
              {family.spouse && (
                <div className={`p-4 sm:p-5 rounded-lg ${theme === "dark" ? "bg-gray-700/50 border border-gray-600" : "bg-gradient-to-r from-pink-50 to-rose-50 border border-pink-100"}`}>
                  <h3 className={`font-bold text-base sm:text-lg mb-2 sm:mb-3 flex items-center gap-2 ${textPrimary}`}>
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-pink-600 dark:text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    Spouse
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className={`font-semibold ${textPrimary}`}>
                        {[family.spouse.firstName, family.spouse.middleName, family.spouse.lastName].filter(Boolean).join(" ")}
                      </p>
                      {family.spouse.fatherFirstName && (
                        <p className={`text-sm mt-1 ${textSecondary}`}>Father: {[family.spouse.fatherFirstName, family.spouse.fatherMiddleName, family.spouse.fatherLastName].filter(Boolean).join(" ")}</p>
                      )}
                      {family.spouse.motherFirstName && (
                        <p className={`text-sm ${textSecondary}`}>Mother: {[family.spouse.motherFirstName, family.spouse.motherMiddleName, family.spouse.motherLastName].filter(Boolean).join(" ")}</p>
                      )}
                    </div>
                    <div>
                      {family.spouse.education && (
                        <p className={`text-sm ${textSecondary}`}>
                          <span className="font-semibold">Education:</span> {family.spouse.education}
                        </p>
                      )}
                      {family.spouse.occupationType && (
                        <p className={`text-sm mt-1 ${textSecondary}`}>
                          <span className="font-semibold">Occupation:</span> {family.spouse.occupationType}
                          {family.spouse.occupationLocation && ` at ${family.spouse.occupationLocation}`}
                        </p>
                      )}
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-2 ${theme === "dark" ? "bg-gray-600 text-gray-200" : "bg-pink-100 text-pink-800"}`}>
                        {family.spouse.gender}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Children Cards */}
              {family.children.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex-shrink-0">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                      </svg>
                    </div>
                    <h3 className={`font-bold text-xl ${textPrimary}`}>
                      Children ({family.children.length})
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {family.children.map((child) => (
                      <div
                        key={child.id}
                        className={`p-4 rounded-lg ${theme === "dark" ? "bg-gray-700/50 border border-gray-600" : "bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100"} transition-all hover:shadow-md`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <p className={`font-semibold ${textPrimary} text-sm sm:text-base`}>
                            {[child.firstName, child.middleName, child.lastName].filter(Boolean).join(" ")}
                          </p>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${theme === "dark" ? "bg-gray-600 text-gray-200" : "bg-emerald-100 text-emerald-800"}`}>
                            {child.gender}
                          </span>
                        </div>
                        {child.education && (
                          <p className={`text-sm ${textSecondary}`}>
                            <span className="font-semibold">Education:</span> {child.education}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
