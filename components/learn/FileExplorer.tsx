"use client";

import { useState } from "react";
import { LearnFolder, LearnPost } from "@prisma/client";

interface FileExplorerProps {
  folders: LearnFolder[];
  posts: LearnPost[];
  selectedFolderId?: string;
  selectedPostId?: string;
  onFolderSelect: (folderId: string) => void;
  onPostSelect: (postId: string) => void;
  isAdmin?: boolean;
  onCreateFolder?: () => void;
  onCreatePost?: (folderId?: string) => void;
  onEditFolder?: (folder: LearnFolder) => void;
  onDeleteFolder?: (folder: LearnFolder) => void;
  onEditPost?: (post: LearnPost) => void;
  onDeletePost?: (post: LearnPost) => void;
}

interface FolderTreeNode {
  id: string;
  name: string;
  description: string | null;
  parentId: string | null;
  order: number;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  children: FolderTreeNode[];
  posts: LearnPost[];
}

const FolderTreeItem = ({
  folder,
  level,
  selectedFolderId,
  selectedPostId,
  onFolderSelect,
  onPostSelect,
  isAdmin,
  onEditFolder,
  onDeleteFolder,
  onEditPost,
  onDeletePost,
}: {
  folder: FolderTreeNode;
  level: number;
  selectedFolderId?: string;
  selectedPostId?: string;
  onFolderSelect: (folderId: string) => void;
  onPostSelect: (postId: string) => void;
  isAdmin?: boolean;
  onEditFolder?: (folder: LearnFolder) => void;
  onDeleteFolder?: (folder: LearnFolder) => void;
  onEditPost?: (post: LearnPost) => void;
  onDeletePost?: (post: LearnPost) => void;
}) => {
  const [isExpanded, setIsExpanded] = useState(level < 1);
  const hasChildren = folder.children && folder.children.length > 0;
  const hasPosts = folder.posts && folder.posts.length > 0;

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const handleFolderClick = () => {
    onFolderSelect(folder.id);
    setIsExpanded(!isExpanded);
  };

  return (
    <div>
      {/* Folder Item */}
      <div
        className={`flex items-center gap-3 py-3 px-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors touch-manipulation min-h-[44px] ${
          selectedFolderId === folder.id
            ? "bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-600"
            : ""
        }`}
        style={{ paddingLeft: `${level * 16 + 12}px` }}
        onClick={handleFolderClick}
      >
        {/* Expand/Collapse Icon */}
        <button
          onClick={toggleExpand}
          className={`p-1 transition-transform flex-shrink-0 ${hasChildren || hasPosts ? "" : "invisible"}`}
          aria-label={isExpanded ? "Collapse" : "Expand"}
        >
          <svg
            className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? "rotate-90" : ""}`}
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
          </svg>
        </button>

        {/* Folder Icon */}
        <span className="text-lg flex-shrink-0">
          {isExpanded ? "📂" : "📁"}
        </span>

        {/* Folder Name */}
        <span className="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
          {folder.name}
        </span>

        {/* Admin Actions */}
        {isAdmin && (
          <div className="flex gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => onEditFolder?.({ ...folder } as LearnFolder)}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded touch-manipulation"
              title="Edit folder"
              aria-label="Edit folder"
            >
              <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
              </svg>
            </button>
            <button
              onClick={() => onDeleteFolder?.({ ...folder } as LearnFolder)}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded touch-manipulation"
              title="Delete folder"
              aria-label="Delete folder"
            >
              <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 4h-3.5l-1-1h-5l-1 1H5v2h14M6 19a2 2 0 002 2h8a2 2 0 002-2V7H6v12z" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Children and Posts */}
      {isExpanded && (
        <div>
          {/* Subfolders */}
          {hasChildren &&
            folder.children.map((child) => (
              <FolderTreeItem
                key={child.id}
                folder={child}
                level={level + 1}
                selectedFolderId={selectedFolderId}
                selectedPostId={selectedPostId}
                onFolderSelect={onFolderSelect}
                onPostSelect={onPostSelect}
                isAdmin={isAdmin}
                onEditFolder={onEditFolder}
                onDeleteFolder={onDeleteFolder}
                onEditPost={onEditPost}
                onDeletePost={onDeletePost}
              />
            ))}

          {/* Posts in this folder */}
          {hasPosts &&
            folder.posts.map((post) => (
              <div
                key={post.id}
                className={`flex items-center gap-3 py-3 px-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors touch-manipulation min-h-[44px] ${
                  selectedPostId === post.id
                    ? "bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-600"
                    : ""
                }`}
                style={{ paddingLeft: `${(level + 1) * 16 + 12}px` }}
                onClick={() => onPostSelect(post.id)}
              >
                <span className="w-4 flex-shrink-0" />
                <span className="text-lg flex-shrink-0">📄</span>
                <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate">
                  {post.title}
                </span>

                {/* Admin Actions for Posts */}
                {isAdmin && (
                  <div className="flex gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onEditPost?.(post)}
                      className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded touch-manipulation"
                      title="Edit post"
                      aria-label="Edit post"
                    >
                      <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => onDeletePost?.(post)}
                      className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded touch-manipulation"
                      title="Delete post"
                      aria-label="Delete post"
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
      )}
    </div>
  );
};

const FileExplorer = ({
  folders,
  posts,
  selectedFolderId,
  selectedPostId,
  onFolderSelect,
  onPostSelect,
  isAdmin = false,
  onCreateFolder,
  onCreatePost,
  onEditFolder,
  onDeleteFolder,
  onEditPost,
  onDeletePost,
}: FileExplorerProps) => {
  // Build folder tree from flat list
  const buildFolderTree = (folderList: LearnFolder[]): FolderTreeNode[] => {
    const folderMap = new Map<string, FolderTreeNode>();

    // Initialize map with all folders
    folderList.forEach((folder) => {
      folderMap.set(folder.id, {
        ...folder,
        children: [],
        posts: [],
      });
    });

    // Build tree
    const roots: FolderTreeNode[] = [];
    folderList.forEach((folder) => {
      const node = folderMap.get(folder.id)!;
      if (folder.parentId && folderMap.has(folder.parentId)) {
        folderMap.get(folder.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    });

    // Attach posts to their folders
    posts.forEach((post) => {
      if (folderMap.has(post.folderId)) {
        folderMap.get(post.folderId)!.posts.push(post);
      }
    });

    // Sort by order
    const sortByOrder = (arr: FolderTreeNode[]) => {
      arr.sort((a, b) => (a.order || 0) - (b.order || 0));
      arr.forEach((item) => {
        if (item.children.length > 0) sortByOrder(item.children);
      });
    };

    sortByOrder(roots);

    return roots;
  };

  const folderTree = buildFolderTree(folders);

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          File Explorer
        </h2>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto p-2">
        {folderTree.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            <p>No folders yet</p>
            {isAdmin && (
              <button
                onClick={onCreateFolder}
                className="mt-2 text-blue-600 hover:underline"
              >
                Create your first folder
              </button>
            )}
          </div>
        ) : (
          folderTree.map((folder) => (
            <FolderTreeItem
              key={folder.id}
              folder={folder}
              level={0}
              selectedFolderId={selectedFolderId}
              selectedPostId={selectedPostId}
              onFolderSelect={onFolderSelect}
              onPostSelect={onPostSelect}
              isAdmin={isAdmin}
              onEditFolder={onEditFolder}
              onDeleteFolder={onDeleteFolder}
              onEditPost={onEditPost}
              onDeletePost={onDeletePost}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default FileExplorer;
