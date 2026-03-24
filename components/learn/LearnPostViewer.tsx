"use client";

import { LearnPost } from "@prisma/client";

interface LearnPostViewerProps {
  post: LearnPost & {
    folder?: {
      id: string;
      name: string;
    };
    createdByUser?: {
      id: string;
      email: string;
    };
  };
  isAdmin?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onBack?: () => void;
}

const LearnPostViewer = ({
  post,
  isAdmin = false,
  onEdit,
  onDelete,
  onBack,
}: LearnPostViewerProps) => {
  const formatDate = (date: Date | null) => {
    if (!date) return "";
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(date));
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
      {/* Header with actions */}
      {(isAdmin || onBack) && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                title="Back"
              >
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
            )}
            {post.folder && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {post.folder.name}
              </span>
            )}
          </div>

          {isAdmin && (
            <div className="flex gap-2">
              <button
                onClick={onEdit}
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                </svg>
                Edit
              </button>
              <button
                onClick={onDelete}
                className="flex items-center gap-2 px-3 py-2 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 rounded-lg text-sm text-red-700 dark:text-red-300"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 4h-3.5l-1-1h-5l-1 1H5v2h14M6 19a2 2 0 002 2h8a2 2 0 002-2V7H6v12z" />
                </svg>
                Delete
              </button>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
            {post.title}
          </h1>
          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            {post.createdByUser && (
              <span>{post.createdByUser.email}</span>
            )}
            {formatDate(post.createdAt) && (
              <>
                <span>•</span>
                <span>{formatDate(post.createdAt)}</span>
              </>
            )}
            {post.updatedAt > post.createdAt && (
              <>
                <span>•</span>
                <span>Updated {formatDate(post.updatedAt)}</span>
              </>
            )}
          </div>
        </div>

        {/* Post Content */}
        <div className="prose prose-gray dark:prose-invert max-w-none">
          <div
            className="learn-content"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        </div>
      </div>
    </div>
  );
};

export default LearnPostViewer;
