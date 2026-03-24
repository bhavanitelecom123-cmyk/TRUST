"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import RichTextEditor from "./RichTextEditor";
import { LearnFolder } from "@prisma/client";

interface LearnPostFormProps {
  folders: LearnFolder[];
  initialData?: {
    id?: string;
    title: string;
    content: string;
    folderId: string;
    order: number;
    isPublished: boolean;
  };
  defaultFolderId?: string;
  onSubmit: (data: {
    title: string;
    content: string;
    folderId: string;
    order: number;
    isPublished: boolean;
  }) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const LearnPostForm = ({
  folders,
  initialData,
  defaultFolderId,
  onSubmit,
  onCancel,
  isLoading = false,
}: LearnPostFormProps) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [folderId, setFolderId] = useState("");
  const [order, setOrder] = useState(0);
  const [isPublished, setIsPublished] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const contentRef = useRef(content);

  // Update ref when content changes
  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  // Generate draft key based on post id (for edit) or 'new' for create
  const draftKey = initialData?.id ? `learn-post-draft-${initialData.id}` : 'learn-post-draft-new';

  // Load initial data
  useEffect(() => {
    if (initialData) {
      // Editing existing post - load from initialData first
      setTitle(initialData.title);
      setContent(initialData.content);
      setFolderId(initialData.folderId);
      setOrder(initialData.order);
      setIsPublished(initialData.isPublished);
      // Try to load any saved draft (more recent)
      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft) {
        try {
          const draft = JSON.parse(savedDraft);
          // Only use draft if it has content (user was typing)
          if (draft.content || draft.title) {
            setTitle(draft.title || initialData.title);
            setContent(draft.content || initialData.content);
            setFolderId(draft.folderId || initialData.folderId);
            setOrder(draft.order || initialData.order);
            setIsPublished(draft.isPublished ?? initialData.isPublished);
          }
        } catch (e) {
          console.error("Failed to parse draft:", e);
        }
      }
    } else {
      // Creating new post - try to load draft
      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft) {
        try {
          const draft = JSON.parse(savedDraft);
          setTitle(draft.title || "");
          setContent(draft.content || "");
          setFolderId(draft.folderId || "");
          setOrder(draft.order || 0);
          setIsPublished(draft.isPublished ?? true);
        } catch (e) {
          console.error("Failed to parse draft:", e);
        }
      } else {
        // Clear all fields for new post, but use defaultFolderId if provided
        setTitle("");
        setContent("");
        setFolderId(defaultFolderId || "");
        setOrder(0);
        setIsPublished(true);
      }
    }
  }, [initialData, defaultFolderId, draftKey]);

  // Autosave draft to localStorage for both create and edit
  useEffect(() => {
    const draft = {
      title,
      content,
      folderId,
      order,
      isPublished,
    };
    localStorage.setItem(draftKey, JSON.stringify(draft));
  }, [title, content, folderId, order, isPublished, draftKey]);

  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = "Title is required";
    }

    if (!folderId) {
      newErrors.folderId = "Please select a folder";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [title, folderId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    await onSubmit({
      title: title.trim(),
      content: contentRef.current,
      folderId,
      order,
      isPublished,
    });

    // Clear draft after successful submission
    localStorage.removeItem(draftKey);
  };

  const handleCancel = () => {
    onCancel();
    // Clear draft on cancel for new posts, keep for edit (user might want to resume)
    if (!initialData) {
      localStorage.removeItem(draftKey);
    }
  };

  // Filter top-level folders and subfolders
  const topLevelFolders = folders.filter((f) => !f.parentId);
  const getSubFolders = (parentId: string) =>
    folders.filter((f) => f.parentId === parentId);

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
      {/* Title */}
      <div>
        <label
          htmlFor="title"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-100 border-gray-200 text-gray-700 ${
            errors.title ? "border-red-500" : "border-gray-300"
          }`}
          placeholder="Enter post title"
          disabled={isLoading}
        />
        {errors.title && (
          <p className="mt-1 text-sm text-red-500">{errors.title}</p>
        )}
      </div>

      {/* Folder Selection */}
      <div>
        <label
          htmlFor="folder"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Folder <span className="text-red-500">*</span>
        </label>
        <select
          id="folder"
          value={folderId}
          onChange={(e) => setFolderId(e.target.value)}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-100 border-gray-200 text-gray-700 ${
            errors.folderId ? "border-red-500" : "border-gray-300"
          }`}
          disabled={isLoading}
        >
          <option value="">Select a folder</option>
          {topLevelFolders.map((folder) => (
            <optgroup key={folder.id} label={folder.name}>
              <option value={folder.id}>{folder.name}</option>
              {getSubFolders(folder.id).map((subFolder) => (
                <option key={subFolder.id} value={subFolder.id}>
                  └─ {subFolder.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        {errors.folderId && (
          <p className="mt-1 text-sm text-red-500">{errors.folderId}</p>
        )}
      </div>

      {/* Order */}
      <div>
        <label
          htmlFor="order"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Order
        </label>
        <input
          type="number"
          id="order"
          value={order}
          onChange={(e) => setOrder(parseInt(e.target.value) || 0)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-100 border-gray-200 text-gray-700"
          placeholder="Display order (lower numbers first)"
          disabled={isLoading}
        />
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Posts are sorted by this number (ascending) within the folder
        </p>
      </div>

      {/* Published Toggle */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isPublished"
          checked={isPublished}
          onChange={(e) => setIsPublished(e.target.checked)}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          disabled={isLoading}
        />
        <label
          htmlFor="isPublished"
          className="text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Published
        </label>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          (Unpublished posts are only visible to admins)
        </p>
      </div>

      {/* Content */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Content
        </label>
        <RichTextEditor
          content={content}
          onChange={setContent}
          editable={!isLoading}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={handleCancel}
          disabled={isLoading}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Saving...
            </span>
          ) : initialData?.id ? "Update Post" : "Create Post"}
        </button>
      </div>
    </form>
  );
};

export default LearnPostForm;
