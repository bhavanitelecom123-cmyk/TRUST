"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/theme/ThemeProvider";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import PostForm from "@/components/posts/PostForm";

export default function NewPostPage() {
  const { data: session, status } = useSession();
  const { theme } = useTheme();
  const router = useRouter();
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
  }, [status, router]);

  const handleSubmit = async (post: any) => {
    setMessage("Post created/updated successfully!");
    setTimeout(() => {
      router.push("/dashboard");
    }, 1500);
  };

  const cardClass = theme === "dark"
    ? "bg-gray-800 border border-gray-700 shadow-lg"
    : "bg-white border border-gray-200 shadow-lg";

  const textPrimary = theme === "dark" ? "text-white" : "text-gray-900";
  const textSecondary = theme === "dark" ? "text-gray-300" : "text-gray-600";

  if (status === "loading") {
    return (
      <DashboardLayout activeItem="new-post">
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
    <DashboardLayout activeItem="new-post">
      <div className="space-y-4 sm:space-y-6 fade-in">
        <div>
          <h1 className={`text-2xl sm:text-3xl font-bold ${textPrimary} mb-2`}>Create New Post</h1>
          <p className={`text-sm sm:text-base ${textSecondary}`}>
            Share your thoughts, updates, or news with the community.
          </p>
        </div>

        {message && (
          <div className={`p-4 sm:p-5 rounded-lg border ${theme === "dark" ? "bg-green-900/30 text-green-300 border-green-800" : "bg-green-50 text-green-700 border-green-200"} flex items-center gap-3 fade-in`}>
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm sm:text-base">{message}</span>
          </div>
        )}

        <div className={`${cardClass} rounded-xl p-4 sm:p-6`}>
          <PostForm onSubmit={handleSubmit} />
        </div>
      </div>
    </DashboardLayout>
  );
}
