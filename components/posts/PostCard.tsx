"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { Post } from "@/types";
import CommentSection from "./CommentSection";
import PostForm from "./PostForm";

interface PostCardProps {
  post: Post;
  currentUserId: string | null;
  onUpdate: (post: Post) => void;
  onDelete: (postId: string) => void;
}

export default function PostCard({ post, currentUserId, onUpdate, onDelete }: PostCardProps) {
  const { data: session } = useSession();
  const [showComments, setShowComments] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likesCount || post._count?.likes || 0);
  const [isLiked, setIsLiked] = useState(
    post.likes?.some((like) => like.userId === currentUserId) || false
  );
  const [likesLoading, setLikesLoading] = useState(false);
  const [commentCount, setCommentCount] = useState(post.commentsCount || post._count?.comments || 0);

  const isAuthor = session?.user?.id === post.user.id;

  const handleLikeToggle = async () => {
    if (!session) {
      // Could redirect to login or show a message
      return;
    }

    if (likesLoading) return;
    setLikesLoading(true);

    try {
      const res = await fetch(`/api/posts/${post.id}/like`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to toggle like");

      const data = await res.json();
      setLikesCount(data.likesCount);
      setIsLiked(data.liked);
    } catch (error) {
      console.error("Error toggling like:", error);
    } finally {
      setLikesLoading(false);
    }
  };

  const handlePostSubmitted = async (updatedPost: Post) => {
    onUpdate(updatedPost);
    setShowEditModal(false);
  };

  const handlePostDeleted = async () => {
    if (window.confirm("Are you sure you want to delete this post?")) {
      try {
        const res = await fetch(`/api/posts/${post.id}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          const data = await res.json();
          alert(data.error || "Failed to delete post");
          return;
        }
        onDelete(post.id);
      } catch (error) {
        console.error("Error deleting post:", error);
        alert("Failed to delete post");
      }
    }
  };

  const cardClass = session?.user?.role === "ADMIN"
    ? "bg-white border border-gray-200 dark:bg-gray-800 dark:border-gray-700 shadow-lg rounded-xl overflow-hidden"
    : "bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 border border-blue-100 dark:border-gray-700 shadow-lg rounded-xl overflow-hidden";

  const truncateDescription = (desc?: string) => {
    if (!desc) return "";
    return desc.length > 200 ? desc.substring(0, 200) + "..." : desc;
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <>
      <div className={cardClass}>
      {/* Post Header */}
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold">
              {post.user.email[0]?.toUpperCase()}
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                {post.user.email.split("@")[0]}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {formatDate(post.createdAt)}
              </p>
            </div>
          </div>

          {isAuthor && (
            <div className="flex gap-2">
              <button
                onClick={() => setShowEditModal(true)}
                className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Edit"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </button>
              <button
                onClick={handlePostDeleted}
                className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Delete"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Post Title */}
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          {post.title}
        </h3>

        {/* Post Description */}
        {post.description && (
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            {truncateDescription(post.description)}
          </p>
        )}

        {/* Post Image */}
        {post.imageUrl && (
          <div className="mb-4 rounded-lg overflow-hidden">
            <Image
              src={post.imageUrl}
              alt={post.title}
              width={800}
              height={400}
              className="w-full h-auto object-cover"
            />
          </div>
        )}

        {/* Location */}
        {post.location && (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span>{post.location}</span>
          </div>
        )}

        {/* Post Actions */}
        <div className="flex items-center gap-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleLikeToggle}
            disabled={likesLoading || !session}
            className={`flex items-center gap-2 transition-colors ${
              isLiked
                ? "text-red-600 dark:text-red-500"
                : "text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-500"
            } ${!session ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <svg
              className="w-6 h-6"
              fill={isLiked ? "currentColor" : "none"}
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
            <span className="font-medium">{likesCount}</span>
          </button>

          <button
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <span className="font-medium">
              {commentCount}
            </span>
          </button>
        </div>
      </div>

      {/* Comment Section */}
      {showComments && (
        <div className="border-t border-gray-200 dark:border-gray-700">
          <CommentSection postId={post.id} currentUserId={currentUserId} onCommentCountChange={setCommentCount} />
        </div>
      )}
    </div>

    {/* Edit Post Modal */}
    {showEditModal && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-2xl rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Edit Post</h2>
            <button
              onClick={() => setShowEditModal(false)}
              className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            >
              <svg className="w-6 h-6 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <PostForm
              initialData={post}
              onSubmit={handlePostSubmitted}
              onCancel={() => setShowEditModal(false)}
            />
          </div>
        </div>
      </div>
    )}
  </>
  );
}
