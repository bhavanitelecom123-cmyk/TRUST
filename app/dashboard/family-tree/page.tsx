"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useTheme } from "@/components/theme/ThemeProvider";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import FamilyTree from "@/components/family/FamilyTree";

export default function FamilyTreePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme } = useTheme();
  const isPrint = searchParams.get("print") === "true";

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const cardClass = theme === "dark"
    ? "bg-gray-800 border border-gray-700 shadow-lg"
    : "bg-white border border-gray-200 shadow-lg";

  const textPrimary = theme === "dark" ? "text-white" : "text-gray-900";
  const textSecondary = theme === "dark" ? "text-gray-300" : "text-gray-600";

  if (status === "loading") {
    return (
      <DashboardLayout activeItem="family-tree">
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

  // Print mode: render without dashboard layout for clean PDF
  if (isPrint) {
    return (
      <div className="min-h-screen p-4 md:p-6">
        <FamilyTree
          defaultPersonId={searchParams.get("personId") || undefined}
          printMode={true}
        />
      </div>
    );
  }

  return (
    <DashboardLayout activeItem="family-tree">
      <div className="space-y-4 sm:space-y-6 fade-in">
        {/* <div>
          <h1 className={`text-2xl sm:text-3xl font-bold ${textPrimary} mb-2`}>
            Family Tree
          </h1>
          <p className={`text-sm sm:text-base ${textSecondary}`}>
            Visualize your family relationships across generations. Search any person to start.
          </p>
        </div> */}

        <div className={cardClass + " rounded-xl p-4 sm:p-6"}>
          <FamilyTree
            defaultPersonId={searchParams.get("personId") || undefined}
            printMode={false}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
