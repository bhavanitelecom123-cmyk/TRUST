"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import CommentForm from "./CommentForm";
import { Comment } from "@/types";

interface CommentSectionProps {
  postId: string;
  currentUserId: string | null;
  onCommentCountChange?: (count: number) => void;
}

interface CommentItemProps {
  comment: Comment;
  currentUserId: string | null;
  onUpdate: () => void;
  onReply: (commentId: string) => void;
  depth?: number;
}

function CommentItem({ comment, currentUserId, onUpdate, onReply, depth = 0 }: CommentItemProps) {
  const { data: session } = useSession();
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(comment.content);
  const maxDepth = 4; // Limit nesting depth

  const isAuthor = session?.user?.id === comment.user.id;

  const handleEdit = async () => {
    if (!content.trim()) return;

    try {
      const res = await fetch(`/api/comments/${comment.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to update comment");
        return;
      }

      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error("Error updating comment:", error);
      alert("Failed to update comment");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this comment and all replies?")) return;

    try {
      const res = await fetch(`/api/comments/${comment.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to delete comment");
        return;
      }

      onUpdate();
    } catch (error) {
      console.error("Error deleting comment:", error);
      alert("Failed to delete comment");
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const marginLeft = depth > 0 ? `ml-${Math.min(depth * 4, 16)}` : "";

  return (
    <div className={`${marginLeft} mb-4`}>
      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-500 to-teal-600 flex items-center justify-center text-white text-sm font-semibold">
            {comment.user.email[0]?.toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-sm text-gray-900 dark:text-white">
              {comment.user.email.split("@")[0]}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {formatDate(comment.createdAt)}
            </p>
          </div>
          <div className="ml-auto flex gap-1">
            {session && depth < 4 && (
              <button
                onClick={() => onReply(comment.id)}
                className="p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-gray-600 rounded"
                title="Reply"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l5 5m-5-5l5-5" />
                </svg>
              </button>
            )}
            {isAuthor && (
              <>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-gray-600 rounded"
                  title="Edit"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </button>
                <button
                  onClick={handleDelete}
                  className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-gray-600 rounded"
                  title="Delete"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>

        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              rows={3}
            />
            <div className="flex gap-2">
              <button
                onClick={handleEdit}
                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setContent(comment.content);
                }}
                className="px-3 py-1.5 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-white text-sm rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-wrap">
            {comment.content}
          </p>
        )}
      </div>

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && depth < maxDepth && (
        <div className="mt-2 space-y-2">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              currentUserId={currentUserId}
              onUpdate={onUpdate}
              onReply={onReply}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CommentSection({ postId, currentUserId, onCommentCountChange }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [totalComments, setTotalComments] = useState(0);

  const fetchComments = async () => {
    try {
      const res = await fetch(`/api/posts/${postId}/comments`);
      if (!res.ok) throw new Error("Failed to fetch comments");
      const data = await res.json();

      // Build nested tree from flat comments
      const commentMap = new Map<string, Comment & { replies: Comment[] }>();
      const roots: (Comment & { replies: Comment[] })[] = [];

      // Initialize map with empty replies
      data.comments.forEach((comment: Comment) => {
        commentMap.set(comment.id, { ...comment, replies: [] });
      });

      // Assign to parents or roots
      data.comments.forEach((comment: Comment) => {
        const commentWithReplies = commentMap.get(comment.id)!;
        if (comment.parentId && commentMap.has(comment.parentId)) {
          const parent = commentMap.get(comment.parentId)!;
          parent.replies.push(commentWithReplies);
        } else {
          roots.push(commentWithReplies);
        }
      });

      // Sort by createdAt ascending (assuming server returns in order, but just in case)
      roots.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      roots.forEach(c => c.replies.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));

      setComments(roots);

      // Calculate total comments count (including replies)
      const total = roots.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0);
      setTotalComments(total);
      if (onCommentCountChange) {
        onCommentCountChange(total);
      }
    } catch (error) {
      console.error("Error fetching comments:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (postId) {
      fetchComments();
    }
  }, [postId]);

  const handleCommentAdded = () => {
    fetchComments().then(() => {
      setReplyingTo(null); // Reset reply state after refresh
    });
  };

  return (
    <div className="p-6">
      <h4 className="font-bold text-lg text-gray-900 dark:text-white mb-4">
        Comments ({totalComments})
      </h4>

      <CommentForm
        postId={postId}
        onCommentAdded={handleCommentAdded}
        parentId={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
      />

      <div className="mt-6 space-y-4">
        {loading ? (
          <div className="text-center py-4">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading comments...</p>
          </div>
        ) : comments.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-400 py-4">
            No comments yet. Be the first to comment!
          </p>
        ) : (
          comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentUserId={currentUserId}
              onUpdate={fetchComments}
              onReply={(commentId) => setReplyingTo(commentId)}
            />
          ))
        )}
      </div>
    </div>
  );
}
