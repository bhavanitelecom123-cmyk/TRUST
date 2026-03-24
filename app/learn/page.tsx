"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "@/components/theme/ThemeProvider";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import FileExplorer from "@/components/learn/FileExplorer";
import RichTextEditor from "@/components/learn/RichTextEditor";
import LearnPostViewer from "@/components/learn/LearnPostViewer";
import LearnPostForm from "@/components/learn/LearnPostForm";
import { LearnFolder, LearnPost } from "@prisma/client";

type ViewMode = "list" | "grid";

type FolderWithRelations = LearnFolder & {
  parent?: { id: string; name: string };
  createdByUser?: { id: string; email: string };
  _count?: { children: number; posts: number };
  children?: FolderWithRelations[];
  posts?: LearnPost[];
};

type PostWithRelations = LearnPost & {
  folder?: { id: string; name: string };
  createdByUser?: { id: string; email: string };
};

export default function LearnPage() {
  const { theme } = useTheme();
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  // State
  const [folders, setFolders] = useState<FolderWithRelations[]>([]);
  const [posts, setPosts] = useState<PostWithRelations[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | undefined>(
    searchParams.get("folderId") || undefined
  );
  const [selectedPostId, setSelectedPostId] = useState<string | undefined>(
    searchParams.get("postId") || undefined
  );
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isPostsLoading, setIsPostsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [showFolderForm, setShowFolderForm] = useState(false);
  const [showPostForm, setShowPostForm] = useState(false);
  const [editingFolder, setEditingFolder] = useState<FolderWithRelations | null>(null);
  const [editingPost, setEditingPost] = useState<PostWithRelations | null>(null);
  const [newPostDefaultFolderId, setNewPostDefaultFolderId] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAdmin = session?.user?.role === "ADMIN";

  // Fetch data
  const fetchFolders = useCallback(async () => {
    try {
      const res = await fetch("/api/learn/folders");
      const responseBody = await res.text();

      if (!res.ok) {
        let errorMsg = `Failed to fetch folders (status ${res.status})`;
        try {
          const errorData = JSON.parse(responseBody);
          errorMsg = errorData.error || errorMsg;
        } catch (e) {
          console.error("Failed to parse error response:", e, "Body:", responseBody);
          errorMsg = responseBody || errorMsg;
        }
        throw new Error(errorMsg);
      }

      if (responseBody) {
        try {
          const data = JSON.parse(responseBody);
          setFolders(data.folders);
        } catch (e) {
          console.error("Failed to parse folders response as JSON:", e, "Body:", responseBody);
          setError("Failed to parse folders data");
        }
      } else {
        setFolders([]);
      }
    } catch (err: any) {
      console.error("Error fetching folders:", err);
      setError(err.message || "Failed to load folders");
    }
  }, []);

  const fetchPosts = useCallback(async (folderId?: string) => {
    try {
      setIsPostsLoading(true);
      const url = folderId
        ? `/api/learn/posts?folderId=${folderId}`
        : "/api/learn/posts";
      const res = await fetch(url);
      const responseBody = await res.text();

      if (!res.ok) {
        let errorMsg = `Failed to fetch posts (status ${res.status})`;
        try {
          const errorData = JSON.parse(responseBody);
          errorMsg = errorData.error || errorMsg;
        } catch (e) {
          console.error("Failed to parse error response:", e, "Body:", responseBody);
          errorMsg = responseBody || errorMsg;
        }
        throw new Error(errorMsg);
      }

      if (responseBody) {
        try {
          const data = JSON.parse(responseBody);
          setPosts(data.posts);
        } catch (e) {
          console.error("Failed to parse posts response as JSON:", e, "Body:", responseBody);
          setError("Failed to parse posts data");
        }
      } else {
        setPosts([]);
      }
    } catch (err: any) {
      console.error("Error fetching posts:", err);
      setError(err.message || "Failed to load posts");
    } finally {
      setIsPostsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setError(null);
      await Promise.all([fetchFolders(), fetchPosts(selectedFolderId)]);
      setIsInitialLoading(false);
    };

    if (status === "authenticated") {
      loadData();
    }
  }, [status, fetchFolders, fetchPosts, selectedFolderId]);

  // Get current folder object
  const currentFolder = selectedFolderId
    ? folders.find(f => f.id === selectedFolderId) || null
    : null;

  // Get posts for current folder (or all posts if no folder selected)
  const currentPosts = selectedFolderId
    ? posts.filter(p => p.folderId === selectedFolderId)
    : posts;

  // Utility to strip HTML tags
  const stripHtml = (html: string): string => {
    return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  };

  // Build a map of all folders by id for quick lookup
  const folderMap = useMemo(() => {
    const map = new Map<string, FolderWithRelations>();
    folders.forEach(f => map.set(f.id, f));
    return map;
  }, [folders]);

  // Get full path of a folder as string (e.g., "A > B > Folder")
  const getFolderPath = useCallback((folderId: string): string => {
    const parts: string[] = [];
    let current = folderMap.get(folderId);
    while (current) {
      parts.unshift(current.name);
      current = folderMap.get(current.parentId || "");
    }
    return parts.join(" > ");
  }, [folderMap]);

  // Search across ALL folders and posts (root level)
  const searchAllResults = useMemo(() => {
    if (!searchQuery) return { folders: [], posts: [] };

    const lowerQuery = searchQuery.toLowerCase().trim();

    const matchingFolders = folders.filter(f =>
      f.name.toLowerCase().includes(lowerQuery) ||
      (f.description || "").toLowerCase().includes(lowerQuery)
    );

    const matchingPosts = posts.filter(p =>
      p.title.toLowerCase().includes(lowerQuery) ||
      stripHtml(p.content).toLowerCase().includes(lowerQuery)
    );

    // Sort: folders first alphabetically, then posts
    matchingFolders.sort((a, b) => a.name.localeCompare(b.name));
    matchingPosts.sort((a, b) => a.title.localeCompare(b.title));

    return { folders: matchingFolders, posts: matchingPosts };
  }, [searchQuery, folders, posts]);

  // Search within current folder's subtree
  const searchInCurrentFolder = useMemo(() => {
    if (!searchQuery || !selectedFolderId) return { folders: [], posts: [] };

    const lowerQuery = searchQuery.toLowerCase().trim();
    const matchingFolders: FolderWithRelations[] = [];
    const matchingPosts: PostWithRelations[] = [];

    // Recursive traversal starting from selected folder
    const traverse = (folder: FolderWithRelations) => {
      // Check current folder (include the root folder itself)
      if (folder.name.toLowerCase().includes(lowerQuery) ||
          (folder.description || "").toLowerCase().includes(lowerQuery)) {
        matchingFolders.push(folder);
      }

      // Check posts in this folder
      const folderPosts = posts.filter(p => p.folderId === folder.id);
      for (const post of folderPosts) {
        if (post.title.toLowerCase().includes(lowerQuery) ||
            stripHtml(post.content).toLowerCase().includes(lowerQuery)) {
          matchingPosts.push(post);
        }
      }

      // Recurse children
      (folder.children || []).forEach(child => traverse(child));
    };

    const root = folders.find(f => f.id === selectedFolderId);
    if (root) {
      traverse(root);
    }

    // Sort
    matchingFolders.sort((a, b) => a.name.localeCompare(b.name));
    matchingPosts.sort((a, b) => a.title.localeCompare(b.title));

    return { folders: matchingFolders, posts: matchingPosts };
  }, [searchQuery, selectedFolderId, folders, posts]);

  // Handle folder selection
  const handleFolderSelect = (folderId: string) => {
    setSelectedFolderId(folderId);
    setSelectedPostId(undefined);
    // Update URL
    router.push(`/learn?folderId=${encodeURIComponent(folderId)}`, { scroll: false });
  };

  // Handle post selection
  const handlePostSelect = (postId: string) => {
    setSelectedPostId(postId);
    // Update URL with both folderId and postId
    const params = selectedFolderId
      ? `?folderId=${encodeURIComponent(selectedFolderId)}&postId=${encodeURIComponent(postId)}`
      : `?postId=${encodeURIComponent(postId)}`;
    router.push(`/learn${params}`, { scroll: false });
  };

  // Handle back from folder view (to root)
  const handleBackToRoot = () => {
    setSelectedFolderId(undefined);
    setSelectedPostId(undefined);
    router.push("/learn", { scroll: false });
  };

  // Handle back from post view (to folder or root)
  const handleBackFromPost = () => {
    setSelectedPostId(undefined);
    // Keep folderId if exists
    if (selectedFolderId) {
      router.push(`/learn?folderId=${encodeURIComponent(selectedFolderId)}`, { scroll: false });
    } else {
      router.push("/learn", { scroll: false });
    }
  };

  // Create folder
  const handleCreateFolder = async (data: { name: string; description?: string; parentId?: string }) => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/learn/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create folder");
      }
      await fetchFolders();
      setShowFolderForm(false);
      setEditingFolder(null);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update folder
  const handleUpdateFolder = async (data: { name: string; description?: string; parentId?: string }) => {
    if (!editingFolder) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/learn/folders/${editingFolder.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update folder");
      }
      await fetchFolders();
      setEditingFolder(null);
      setShowFolderForm(false);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete folder
  const handleDeleteFolder = async (folderId: string) => {
    if (!confirm("Delete this folder and all its contents? This cannot be undone.")) {
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/learn/folders/${folderId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete folder");
      }
      await fetchFolders();
      if (selectedFolderId === folderId) {
        setSelectedFolderId(undefined);
        setSelectedPostId(undefined);
        router.push("/learn", { scroll: false });
      }
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete post
  const handleDeletePost = async (post: PostWithRelations) => {
    if (!confirm(`Delete "${post.title}"? This cannot be undone.`)) {
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/learn/posts/${post.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete post");
      }
      await fetchPosts(selectedFolderId);
      if (selectedPostId === post.id) {
        setSelectedPostId(undefined);
      }
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitPost = async (data: { title: string; content: string; folderId: string; order: number; isPublished: boolean }) => {
    setIsSubmitting(true);
    try {
      if (editingPost) {
        // Update existing post
        const res = await fetch(`/api/learn/posts/${editingPost.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || "Failed to update post");
        }
      } else {
        // Create new post
        const formData = new FormData();
        formData.append("title", data.title);
        formData.append("content", data.content);
        formData.append("folderId", data.folderId);
        formData.append("order", data.order.toString());
        formData.append("isPublished", data.isPublished.toString());

        const res = await fetch("/api/learn/posts", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Failed to create post");
        }
      }
      await fetchPosts(selectedFolderId);
      setShowPostForm(false);
      setEditingPost(null);
      setNewPostDefaultFolderId(undefined);
      // Clear draft
      if (editingPost) {
        localStorage.removeItem(`learn-post-draft-${editingPost.id}`);
      } else {
        localStorage.removeItem('learn-post-draft-new');
      }
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const cardClass = theme === "dark"
    ? "bg-gray-800 border border-gray-700"
    : "bg-white border border-gray-200";

  const textPrimary = theme === "dark" ? "text-white" : "text-gray-900";
  const textSecondary = theme === "dark" ? "text-gray-300" : "text-gray-600";

  if (status === "loading" || isInitialLoading) {
    return (
      <DashboardLayout activeItem="learn">
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
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
    <DashboardLayout activeItem="learn">
      <div className="flex flex-col min-h-0">
        {/* Header - Mobile Back Button */}
        <div className="flex items-center gap-4 mb-4">
          {selectedFolderId && !selectedPostId && (
            <button
              onClick={handleBackToRoot}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 touch-manipulation min-h-[44px]"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="font-medium text-sm">Back</span>
            </button>
          )}
          {selectedPostId && (
            <button
              onClick={handleBackFromPost}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 touch-manipulation min-h-[44px]"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="font-medium text-sm">Back</span>
            </button>
          )}
          <div className="flex-1">
            <h1 className={`text-2xl font-bold ${textPrimary}`}>
              {selectedPostId ? "View Post" : selectedFolderId ? currentFolder?.name || "Folder" : "Learn"}
            </h1>
            <p className={`text-sm ${textSecondary}`}>
              {selectedPostId
                ? "Reading mode"
                : selectedFolderId
                ? "Browse folder contents"
                : "Select a folder to browse"}
            </p>
          </div>
          {/* Admin Action Buttons */}
          {isAdmin && !selectedPostId && !showPostForm && !showFolderForm && (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setEditingFolder({
                    id: "",
                    name: "",
                    description: null,
                    parentId: selectedFolderId || null,
                    order: 0,
                    createdBy: null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    children: [],
                    posts: [],
                  } as FolderWithRelations);
                  setShowFolderForm(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg shadow-sm touch-manipulation min-h-[44px]"
                title="Create new folder"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <span className="hidden sm:inline text-sm font-medium">New Folder</span>
              </button>
              <button
                onClick={() => {
                  setEditingPost(null);
                  setNewPostDefaultFolderId(selectedFolderId || undefined);
                  setShowPostForm(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm touch-manipulation min-h-[44px]"
                title="Create new post"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="hidden sm:inline text-sm font-medium">New Post</span>
              </button>
            </div>
          )}
        </div>

        {/* Main Content Area */}
        <div className="flex-1">
          {/* Search Bar */}
          {!selectedPostId && (
            <div className="mb-4">
              <div className="relative max-w-2xl">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search folders and posts..."
                  className={`w-full pl-10 pr-${searchQuery ? '10' : '4'} py-2 ${cardClass} border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 touch-manipulation min-h-[44px]`}
                  aria-label="Search folders and posts"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    aria-label="Clear search"
                  >
                    <svg className="w-5 h-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Search Results */}
          {searchQuery && (
            <div className={`${cardClass} rounded-lg shadow-sm p-4 mb-4`}>
              <div className="mb-4">
                <h2 className={`text-xl font-bold ${textPrimary}`}>
                  Search Results
                </h2>
                <p className={`text-sm ${textSecondary}`}>
                  {(selectedFolderId ? searchInCurrentFolder : searchAllResults).folders.length +
                   (selectedFolderId ? searchInCurrentFolder : searchAllResults).posts.length} results for "{searchQuery}"
                  {selectedFolderId && " (in current folder)"}
                </p>
              </div>

              {(() => {
                const results = selectedFolderId ? searchInCurrentFolder : searchAllResults;
                const total = results.folders.length + results.posts.length;

                if (total === 0) {
                  return (
                    <div className={`text-center py-8 ${textSecondary}`}>
                      <p className="text-sm">No results found for "{searchQuery}"</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    {/* Folders */}
                    {results.folders.map((folder) => (
                      <div
                        key={`folder-${folder.id}`}
                        onClick={() => {
                          setSearchQuery("");
                          handleFolderSelect(folder.id);
                        }}
                        className={`p-4 rounded-lg border cursor-pointer transition-colors relative ${
                          selectedFolderId === folder.id
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                            : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0 pr-2">
                            <h3 className={`font-semibold ${textPrimary} mb-1 truncate`}>
                              <span className="text-lg mr-2">📁</span>{folder.name}
                            </h3>
                            <p className={`text-xs ${textSecondary}`}>
                              {selectedFolderId ? "In current folder" : `In: ${getFolderPath(folder.id)}`}
                              {folder.description && ` • ${folder.description.slice(0, 50)}${folder.description.length > 50 ? '...' : ''}`}
                            </p>
                          </div>
                          <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                        {isAdmin && (
                          <div className="absolute top-2 right-2 flex gap-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => {
                                setEditingFolder(folder);
                                setShowFolderForm(true);
                              }}
                              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded touch-manipulation"
                              title="Edit folder"
                            >
                              <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                              </svg>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Delete "${folder.name}" and all its contents?`)) {
                                  handleDeleteFolder(folder.id);
                                }
                              }}
                              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded touch-manipulation"
                              title="Delete folder"
                            >
                              <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M19 4h-3.5l-1-1h-5l-1 1H5v2h14M6 19a2 2 0 002 2h8a2 2 0 002-2V7H6v12z" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Posts */}
                    {results.posts.map((post) => (
                      <div
                        key={`post-${post.id}`}
                        onClick={() => {
                          setSearchQuery("");
                          handlePostSelect(post.id);
                        }}
                        className={`p-4 rounded-lg border cursor-pointer transition-colors relative ${
                          selectedPostId === post.id
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                            : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0 pr-2">
                            <h3 className={`font-semibold ${textPrimary} mb-1 truncate`}>
                              <span className="text-lg mr-2">📄</span>{post.title}
                            </h3>
                            <p className={`text-sm ${textSecondary} line-clamp-2`}>
                              {stripHtml(post.content).slice(0, 150)}
                              {post.content.length > 150 ? '...' : ''}
                            </p>
                            <p className={`text-xs mt-2 ${textSecondary}`}>
                              In: {post.folder?.name || "Unknown folder"} • {new Date(post.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        {isAdmin && (
                          <div className="absolute top-2 right-2 flex gap-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => {
                                setEditingPost(post);
                                setShowPostForm(true);
                              }}
                              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded touch-manipulation"
                              title="Edit post"
                            >
                              <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                              </svg>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Delete "${post.title}"?`)) {
                                  handleDeletePost(post);
                                }
                              }}
                              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded touch-manipulation"
                              title="Delete post"
                            >
                              <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M19 4h-3.5l-1-1h-5l-1 1H5v2h14M6 19a2 2 0 002 2h8a2 2 0 002-2V7H6v12z" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Post Form */}
          {!searchQuery && showPostForm && (
            <div className={`${cardClass} rounded-lg p-4 sm:p-6 shadow-sm mb-4`}>
              <h2 className={`text-xl font-bold ${textPrimary} mb-4`}>
                {editingPost ? "Edit Post" : "Create New Post"}
              </h2>
              <LearnPostForm
                key={editingPost?.id || 'new'}
                folders={folders}
                initialData={
                  editingPost
                    ? {
                        id: editingPost.id,
                        title: editingPost.title,
                        content: editingPost.content,
                        folderId: editingPost.folderId,
                        order: editingPost.order,
                        isPublished: editingPost.isPublished,
                      }
                    : undefined
                }
                defaultFolderId={!editingPost ? newPostDefaultFolderId : undefined}
                onSubmit={handleSubmitPost}
                onCancel={() => {
                  setShowPostForm(false);
                  setEditingPost(null);
                  setNewPostDefaultFolderId(undefined);
                }}
                isLoading={isSubmitting}
              />
            </div>
          )}

          {/* Post Viewer - Full screen on mobile */}
          {!searchQuery && selectedPostId && !showPostForm && (
            <div className={`${cardClass} rounded-lg shadow-sm h-full flex flex-col`}>
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div>
                  <h2 className={`text-lg font-bold ${textPrimary} truncate`}>
                    {posts.find(p => p.id === selectedPostId)?.title}
                  </h2>
                  <p className={`text-xs ${textSecondary}`}>
                    {currentFolder?.name || "Unknown folder"}
                  </p>
                </div>
                <button
                  onClick={handleBackFromPost}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg touch-manipulation"
                  aria-label="Close post"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {selectedPostId && (
                  <LearnPostViewer
                    post={posts.find(p => p.id === selectedPostId)!}
                    isAdmin={isAdmin}
                    onEdit={() => {
                      const post = posts.find(p => p.id === selectedPostId);
                      if (post) {
                        setEditingPost(post);
                        setShowPostForm(true);
                      }
                    }}
                    onDelete={() => {
                      const post = posts.find(p => p.id === selectedPostId);
                      if (post && confirm(`Delete "${post.title}"?`)) {
                        handleDeletePost(post);
                      }
                    }}
                    onBack={handleBackFromPost}
                  />
                )}
              </div>
            </div>
          )}

          {/* Folder Contents - Show when folder selected but no post */}
          {!searchQuery && selectedFolderId && !selectedPostId && !showPostForm && (
            <div className={`${cardClass} rounded-lg shadow-sm p-4`}>
              <div className="mb-4">
                <h2 className={`text-xl font-bold ${textPrimary} mb-1`}>
                  {currentFolder?.name}
                </h2>
                <p className={`text-sm ${textSecondary}`}>
                  {(currentFolder?._count?.children || 0)} subfolders, {currentPosts.length} {currentPosts.length === 1 ? 'post' : 'posts'}
                </p>
              </div>

              {isPostsLoading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
                  <p className={`mt-2 text-sm ${textSecondary}`}>Loading...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Subfolders */}
                  {(() => {
                    const subFolders = folders.filter(f => f.parentId === selectedFolderId);
                    if (subFolders.length > 0) {
                      return (
                        <div>
                          <h3 className={`text-sm font-semibold ${textSecondary} uppercase mb-2`}>Subfolders</h3>
                          <div className="space-y-2">
                            {subFolders.map((folder) => {
                              const subfolderPostsCount = folder._count?.posts || 0;
                              const subSubfoldersCount = folder._count?.children || 0;
                              return (
                                <div
                                  key={folder.id}
                                  onClick={() => handleFolderSelect(folder.id)}
                                  className={`p-4 rounded-lg border cursor-pointer transition-colors relative ${
                                    selectedFolderId === folder.id
                                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                                      : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                                  }`}
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0 pr-2">
                                      <h3 className={`font-semibold ${textPrimary} mb-1 truncate`}>
                                        📁 {folder.name}
                                      </h3>
                                      <p className={`text-xs ${textSecondary}`}>
                                        {subfolderPostsCount} {subfolderPostsCount === 1 ? 'post' : 'posts'}
                                        {subSubfoldersCount > 0 && ` • ${subSubfoldersCount} ${subSubfoldersCount === 1 ? 'subfolder' : 'subfolders'}`}
                                      </p>
                                    </div>
                                    <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                  </div>
                                  {isAdmin && (
                                    <div className="absolute top-2 right-2 flex gap-1" onClick={(e) => e.stopPropagation()}>
                                      <button
                                        onClick={() => {
                                          setEditingFolder(folder);
                                          setShowFolderForm(true);
                                        }}
                                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded touch-manipulation"
                                        title="Edit folder"
                                      >
                                        <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                                          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                                        </svg>
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (confirm(`Delete "${folder.name}" and all its contents?`)) {
                                            handleDeleteFolder(folder.id);
                                          }
                                        }}
                                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded touch-manipulation"
                                        title="Delete folder"
                                      >
                                        <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                                          <path d="M19 4h-3.5l-1-1h-5l-1 1H5v2h14M6 19a2 2 0 002 2h8a2 2 0 002-2V7H6v12z" />
                                        </svg>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* Posts */}
                  {currentPosts.length > 0 && (
                    <div>
                      <h3 className={`text-sm font-semibold ${textSecondary} uppercase mb-2`}>Posts</h3>
                      <div className="space-y-2">
                        {currentPosts.map((post) => (
                          <div
                            key={post.id}
                            onClick={() => handlePostSelect(post.id)}
                            className={`p-4 rounded-lg border cursor-pointer transition-colors relative ${
                              selectedPostId === post.id
                                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                                : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0 pr-2">
                                <h3 className={`font-semibold ${textPrimary} mb-1 truncate`}>
                                  📄 {post.title}
                                </h3>
                                <p className={`text-sm ${textSecondary} line-clamp-2`}>
                                  {post.content.replace(/<[^>]*>/g, "").slice(0, 150)}...
                                </p>
                                <p className={`text-xs mt-2 ${textSecondary}`}>
                                  {new Date(post.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            {isAdmin && (
                              <div className="absolute top-2 right-2 flex gap-1" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => {
                                    setEditingPost(post);
                                    setShowPostForm(true);
                                  }}
                                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded touch-manipulation"
                                  title="Edit post"
                                >
                                  <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm(`Delete "${post.title}"?`)) {
                                      handleDeletePost(post);
                                    }
                                  }}
                                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded touch-manipulation"
                                  title="Delete post"
                                >
                                  <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M19 4h-3.5l-1-1h-5l-1 1H5v2h14M6 19a2 2 0 002 2h8a2 2 0 002-2V7H6v12z" />
                                  </svg>
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Empty state */}
                  {(folders.filter(f => f.parentId === selectedFolderId).length === 0 && currentPosts.length === 0) && (
                    <div className={`text-center py-8 ${textSecondary}`}>
                      <p className="text-sm">This folder is empty.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Root View - Show folders only */}
          {!searchQuery && !selectedFolderId && !selectedPostId && !showPostForm && (
            <div className={`${cardClass} rounded-lg shadow-sm p-4`}>
              <div className="mb-4">
                <h2 className={`text-xl font-bold ${textPrimary} mb-1`}>
                  Folders
                </h2>
                <p className={`text-sm ${textSecondary}`}>
                  {folders.length} {folders.length === 1 ? 'folder' : 'folders'} total
                </p>
              </div>

              {folders.length === 0 ? (
                <div className={`text-center py-8 ${textSecondary}`}>
                  <p className="text-sm">No folders yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {folders.filter(f => !f.parentId).map((folder) => {
                    const folderPostsCount = folder._count?.posts || 0;
                    const subFoldersCount = folder._count?.children || 0;
                    return (
                      <div
                        key={folder.id}
                        onClick={() => handleFolderSelect(folder.id)}
                        className={`p-4 rounded-lg border transition-colors relative ${isAdmin ? 'pr-12' : ''} ${
                          selectedFolderId === folder.id
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                            : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <h3 className={`font-semibold ${textPrimary} mb-1 truncate`}>
                              <span className="text-lg mr-2">📁</span>{folder.name}
                            </h3>
                            <p className={`text-xs ${textSecondary}`}>
                              {folderPostsCount} {folderPostsCount === 1 ? 'post' : 'posts'}
                              {subFoldersCount > 0 && ` • ${subFoldersCount} ${subFoldersCount === 1 ? 'subfolder' : 'subfolders'}`}
                            </p>
                          </div>
                          <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                        {isAdmin && (
                          <div className="absolute top-2 right-2 flex gap-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => {
                                setEditingFolder(folder);
                                setShowFolderForm(true);
                              }}
                              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded touch-manipulation"
                              title="Edit folder"
                            >
                              <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteFolder(folder.id)}
                              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded touch-manipulation"
                              title="Delete folder"
                            >
                              <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M19 4h-3.5l-1-1h-5l-1 1H5v2h14M6 19a2 2 0 002 2h8a2 2 0 002-2V7H6v12z" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Folder Form Modal */}
        {showFolderForm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className={`${cardClass} rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto`}>
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-inherit z-10">
                <h2 className={`text-lg font-bold ${textPrimary}`}>
                  {editingFolder?.id ? "Edit Folder" : "New Folder"}
                </h2>
                <button
                  onClick={() => {
                    setShowFolderForm(false);
                    setEditingFolder(null);
                  }}
                  className={`p-2 rounded-lg ${theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className={`block text-sm font-semibold mb-2 ${textPrimary}`}>
                    Folder Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editingFolder?.name || ""}
                    onChange={(e) => setEditingFolder({ ...editingFolder!, name: e.target.value })}
                    className={`w-full px-4 py-3 rounded-lg border ${theme === "dark" ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300 text-gray-900"} focus:ring-2 focus:ring-blue-500 focus:border-transparent touch-manipulation min-h-[44px]`}
                    placeholder="Enter folder name"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-semibold mb-2 ${textPrimary}`}>
                    Description
                  </label>
                  <textarea
                    value={editingFolder?.description || ""}
                    onChange={(e) => setEditingFolder({ ...editingFolder!, description: e.target.value })}
                    rows={3}
                    className={`w-full px-4 py-3 rounded-lg border ${theme === "dark" ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300 text-gray-900"} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    placeholder="Enter description (optional)"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-semibold mb-2 ${textPrimary}`}>
                    Parent Folder
                  </label>
                  <select
                    value={editingFolder?.parentId || ""}
                    onChange={(e) => setEditingFolder({ ...editingFolder!, parentId: e.target.value || null })}
                    className={`w-full px-4 py-3 rounded-lg border ${theme === "dark" ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300 text-gray-900"} focus:ring-2 focus:ring-blue-500 focus:border-transparent touch-manipulation min-h-[44px]`}
                  >
                    <option value="">None (Top Level)</option>
                    {(() => {
                      const folderMap = new Map<string, FolderWithRelations>();
                      folders.forEach(f => folderMap.set(f.id, { ...f, children: [], posts: [] } as FolderWithRelations));
                      const roots: FolderWithRelations[] = [];
                      folders.forEach(f => {
                        const node = folderMap.get(f.id)!;
                        if (f.parentId && folderMap.has(f.parentId)) {
                          folderMap.get(f.parentId)!.children!.push(node);
                        } else {
                          roots.push(node);
                        }
                      });

                      const options: { id: string; name: string; level: number }[] = [];
                      const traverse = (folder: FolderWithRelations, level: number) => {
                        const exclude = editingFolder?.id;
                        if (folder.id !== exclude) {
                          options.push({ id: folder.id, name: folder.name, level });
                        }
                        if (folder.children) {
                          folder.children.forEach(child => traverse(child, level + 1));
                        }
                      };
                      roots.forEach(root => traverse(root, 0));

                      return options.map(opt => (
                        <option key={opt.id} value={opt.id}>
                          {"\u00A0".repeat(opt.level * 4)}{opt.name}
                        </option>
                      ));
                    })()}
                  </select>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      if (editingFolder?.name?.trim()) {
                        if (editingFolder.id) {
                          handleUpdateFolder({
                            name: editingFolder.name.trim(),
                            description: editingFolder.description?.trim(),
                            parentId: editingFolder.parentId || undefined,
                          });
                        } else {
                          handleCreateFolder({
                            name: editingFolder.name.trim(),
                            description: editingFolder.description?.trim(),
                            parentId: editingFolder.parentId || undefined,
                          });
                        }
                      } else {
                        alert("Folder name is required");
                      }
                    }}
                    disabled={isSubmitting || !editingFolder?.name?.trim()}
                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold disabled:opacity-50 touch-manipulation min-h-[44px]"
                  >
                    {isSubmitting ? "Saving..." : editingFolder?.id ? "Update" : "Create"}
                  </button>
                  <button
                    onClick={() => {
                      setShowFolderForm(false);
                      setEditingFolder(null);
                    }}
                    disabled={isSubmitting}
                    className={`flex-1 px-4 py-3 rounded-lg font-semibold border ${theme === "dark" ? "border-gray-600 hover:bg-gray-700" : "border-gray-300 hover:bg-gray-50"} touch-manipulation min-h-[44px]`}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
