"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useTheme } from "@/components/theme/ThemeProvider";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Post {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  location?: string;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
  };
  likes: Array<{
    user: {
      id: string;
      email: string;
    };
  }>;
  _count: {
    likes: number;
    comments: number;
  };
}

interface SinglePostAdminViewProps {
  post: Post;
  prevPostId: string | null;
  nextPostId: string | null;
}

export default function SinglePostAdminView({ post, prevPostId, nextPostId }: SinglePostAdminViewProps) {
  const { data: session } = useSession();
  const { theme } = useTheme();
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const isAuthor = session?.user?.id === post.user.id;

  const handleDeletePost = async () => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/posts/${post.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to delete post");
        return;
      }

      // Navigate to posts list or previous/next
      if (prevPostId) {
        router.push(`/admin/posts/${prevPostId}`);
      } else if (nextPostId) {
        router.push(`/admin/posts/${nextPostId}`);
      } else {
        router.push("/admin/posts");
      }
    } catch (error) {
      console.error("Error deleting post:", error);
      alert("Failed to delete post");
      setDeleting(false);
    }
  };

  const cardClass = theme === "dark"
    ? "bg-gray-800 border border-gray-700 shadow-lg"
    : "bg-white border border-gray-200 shadow-lg";

  const textPrimary = theme === "dark" ? "text-white" : "text-gray-900";
  const textSecondary = theme === "dark" ? "text-gray-300" : "text-gray-600";

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6 fade-in">
      {/* Navigation */}
      <div className="flex justify-between items-center">
        <Link
          href="/admin/posts"
          className={`flex items-center gap-2 ${theme === "dark" ? "text-gray-300 hover:text-white" : "text-gray-600 hover:text-gray-900"} transition`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Posts
        </Link>
        <div className="flex gap-2">
          {prevPostId ? (
            <Link
              href={`/admin/posts/${prevPostId}`}
              className={`flex items-center gap-1 px-4 py-2 rounded-lg ${theme === "dark" ? "bg-gray-700 hover:bg-gray-600" : "bg-gray-200 hover:bg-gray-300"} transition-colors`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </Link>
          ) : (
            <div className="px-4 py-2 rounded-lg opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800">
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Previous
              </span>
            </div>
          )}
          {nextPostId ? (
            <Link
              href={`/admin/posts/${nextPostId}`}
              className={`flex items-center gap-1 px-4 py-2 rounded-lg ${theme === "dark" ? "bg-gray-700 hover:bg-gray-600" : "bg-gray-200 hover:bg-gray-300"} transition-colors`}
            >
              Next
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ) : (
            <div className="px-4 py-2 rounded-lg opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800">
              <span className="flex items-center gap-1">
                Next
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Post Card */}
      <div className={`${cardClass} rounded-xl overflow-hidden shadow-lg`}>
        {/* Image */}
        {post.imageUrl && (
          <div className="relative h-96 w-full">
            <Image
              src={post.imageUrl}
              alt={post.title}
              fill
              className="object-contain bg-gray-100 dark:bg-gray-900"
            />
          </div>
        )}

        {/* Content */}
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className={`text-2xl font-bold ${textPrimary} mb-2`}>
                {post.title}
              </h1>
              <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                <span>By {post.user.email.split("@")[0]}</span>
                <span>•</span>
                <span>{formatDate(post.createdAt)}</span>
                {post.location && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {post.location}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          {post.description && (
            <div className={`prose max-w-none mb-6 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
              <p className="whitespace-pre-wrap">{post.description}</p>
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center gap-6 mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span className={`text-lg font-semibold ${textPrimary}`}>
                {post._count?.likes || post.likesCount}
              </span>
              <span className={textSecondary}>Likes</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span className={`text-lg font-semibold ${textPrimary}`}>
                {post._count?.comments || post.commentsCount}
              </span>
              <span className={textSecondary}>Comments</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleDeletePost}
              disabled={deleting}
              className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {deleting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Deleting...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete Post
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
