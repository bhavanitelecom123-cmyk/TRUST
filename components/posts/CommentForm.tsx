"use client";

import { useState, useRef } from "react";
import { useSession } from "next-auth/react";

interface CommentFormProps {
  postId: string;
  onCommentAdded: () => void;
  parentId?: string | null;
  onCancelReply?: () => void;
}

export default function CommentForm({ postId, onCommentAdded, parentId = null, onCancelReply }: CommentFormProps) {
  const { data: session } = useSession();
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) {
      alert("Please log in to comment");
      return;
    }

    if (!content.trim()) {
      alert("Comment cannot be empty");
      return;
    }

    setSubmitting(true);
    try {
      const body = parentId
        ? JSON.stringify({ content: content.trim(), parentId })
        : JSON.stringify({ content: content.trim() });

      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to post comment");
        return;
      }

      setContent("");
      // parentId will be cleared by parent component
      onCommentAdded();
    } catch (error) {
      console.error("Error posting comment:", error);
      alert("Failed to post comment");
    } finally {
      setSubmitting(false);
    }
  };

  if (!session) {
    return (
      <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center">
        <p className="text-gray-600 dark:text-gray-400">
          Please log in to leave a comment.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your comment..."
            className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={3}
            maxLength={1000}
          />
          <div className="flex justify-between items-center mt-1">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {content.length}/1000 characters
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={submitting || !content.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Posting..." : "Post Comment"}
          </button>
          {parentId && onCancelReply && (
            <button
              type="button"
              onClick={onCancelReply}
              className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-white rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
            >
              Cancel Reply
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
