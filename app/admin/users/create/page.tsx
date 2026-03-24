"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/theme/ThemeProvider";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import CreateUserForm from "@/components/admin/CreateUserForm";

export default function CreateUserPage() {
  const { data: session, status } = useSession();
  const { theme } = useTheme();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated" && session?.user?.role !== "ADMIN") {
      router.push("/dashboard");
    }
  }, [status, session, router]);

  const cardClass = theme === "dark"
    ? "bg-gray-800 border border-gray-700 shadow-lg"
    : "bg-white border border-gray-200 shadow-lg";

  const textPrimary = theme === "dark" ? "text-white" : "text-gray-900";

  if (status === "loading") {
    return (
      <DashboardLayout activeItem="create-user">
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent"></div>
            <p className={`mt-4 ${textPrimary}`}>Loading...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!session || session.user.role !== "ADMIN") {
    return null;
  }

  return (
    <DashboardLayout activeItem="create-user">
      <div className="max-w-2xl">
        <CreateUserForm />
      </div>
    </DashboardLayout>
  );
}
