"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Post } from "@/types";
import PostForm from "./PostForm";

interface PostGridCardProps {
  post: Post;
  currentUserId: string | null;
  onPostUpdate?: (updatedPost: Post) => void;
}

export default function PostGridCard({ post, currentUserId, onPostUpdate }: PostGridCardProps) {
  const [likesCount, setLikesCount] = useState(post.likesCount || post._count?.likes || 0);
  const [isLiked, setIsLiked] = useState(
    post.likes?.some((like) => like.userId === currentUserId) || false
  );
  const [likesLoading, setLikesLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPost, setEditingPost] = useState<Post>(post);

  const isAuthor = currentUserId === post.user.id;

  // Reset editing post when post prop changes
  useEffect(() => {
    setEditingPost(post);
  }, [post]);

  const handleLikeToggle = async () => {
    if (!currentUserId) return;

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

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const cardClass = "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-md rounded-xl overflow-hidden hover:shadow-lg transition-shadow cursor-default";

  return (
    <>
      <div className={cardClass}>
      {/* Post Image */}
      {post.imageUrl ? (
        <div className="relative h-40 w-full bg-gray-100 dark:bg-gray-900">
          <Image
            src={post.imageUrl}
            alt={post.title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        </div>
      ) : (
        <div className="h-40 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center">
          <svg className="w-12 h-12 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        {/* Title */}
        <h3 className="font-bold text-gray-900 dark:text-white mb-2 line-clamp-2 text-sm leading-snug">
          {post.title}
        </h3>

        {/* Author & Date */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-semibold">
            {post.user.email[0]?.toUpperCase()}
          </div>
          <span className="text-xs text-gray-600 dark:text-gray-400 truncate">
            {post.user.email.split("@")[0]}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">•</span>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {formatDate(post.createdAt)}
          </span>
        </div>

        {/* Stats & Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleLikeToggle}
              disabled={likesLoading || !currentUserId}
              className={`flex items-center gap-1 text-sm ${isLiked ? "text-red-600 dark:text-red-500" : "text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-500"} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <svg className="w-4 h-4" fill={isLiked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span>{likesCount}</span>
            </button>
            <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span>{post.commentsCount || post._count?.comments || 0}</span>
            </div>
          </div>
          {isAuthor && (
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowEditModal(true);
                  setEditingPost(post);
                }}
                className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-gray-700 rounded transition-colors"
                title="Edit"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
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
              initialData={editingPost}
              onSubmit={(updatedPost) => {
                if (onPostUpdate) {
                  onPostUpdate(updatedPost);
                }
                setShowEditModal(false);
              }}
              onCancel={() => setShowEditModal(false)}
            />
          </div>
        </div>
      </div>
    )}
  </>
  );
}
