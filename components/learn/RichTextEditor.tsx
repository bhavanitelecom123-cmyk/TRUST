"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";
import { FontFamily } from "@tiptap/extension-font-family";
import { Color } from "@tiptap/extension-color";
import { Highlight } from "@tiptap/extension-highlight";
import { TextAlign } from "@tiptap/extension-text-align";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { Link } from "@tiptap/extension-link";
import { Image } from "@tiptap/extension-image";
import { useCallback, useEffect, useRef, useState } from "react";

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  editable?: boolean;
}

// ─── Preset colour swatches ───────────────────────────────────────────────────

const TEXT_COLORS = [
  { label: "Default",  value: "inherit" },
  { label: "Black",    value: "#000000" },
  { label: "Gray",     value: "#6b7280" },
  { label: "Red",      value: "#ef4444" },
  { label: "Orange",   value: "#f97316" },
  { label: "Yellow",   value: "#eab308" },
  { label: "Green",    value: "#22c55e" },
  { label: "Teal",     value: "#14b8a6" },
  { label: "Blue",     value: "#3b82f6" },
  { label: "Indigo",   value: "#6366f1" },
  { label: "Purple",   value: "#a855f7" },
  { label: "Pink",     value: "#ec4899" },
  { label: "White",    value: "#ffffff" },
];

const HIGHLIGHT_COLORS = [
  { label: "None",          value: "none" },
  { label: "Yellow",        value: "#fef08a" },
  { label: "Green",         value: "#bbf7d0" },
  { label: "Blue",          value: "#bfdbfe" },
  { label: "Pink",          value: "#fbcfe8" },
  { label: "Orange",        value: "#fed7aa" },
  { label: "Purple",        value: "#e9d5ff" },
  { label: "Red",           value: "#fecaca" },
  { label: "Gray",          value: "#e5e7eb" },
];

// ─── ColorPicker dropdown ─────────────────────────────────────────────────────

function ColorPicker({
  colors,
  activeColor,
  onSelect,
  icon,
  title,
}: {
  colors: { label: string; value: string }[];
  activeColor: string;
  onSelect: (value: string) => void;
  icon: React.ReactNode;
  title: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        title={title}
        onClick={() => setOpen((o) => !o)}
        className="flex flex-col items-center p-1.5 rounded transition-colors bg-gray-100 text-gray-700 hover:bg-gray-200 gap-0.5"
      >
        {icon}
        {/* Active colour underline indicator */}
        <span
          className="w-4 h-1 rounded-sm"
          style={{
            background: activeColor === "inherit" || activeColor === "none"
              ? "transparent"
              : activeColor,
            border: activeColor === "inherit" || activeColor === "none"
              ? "1px solid #d1d5db"
              : "none",
          }}
        />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-2 w-48">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">
            {title}
          </p>
          <div className="grid grid-cols-6 gap-1">
            {colors.map((c) => (
              <button
                key={c.value}
                type="button"
                title={c.label}
                onClick={() => {
                  onSelect(c.value);
                  setOpen(false);
                }}
                className="w-6 h-6 rounded border border-gray-200 hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-blue-400"
                style={{
                  background: c.value === "none" || c.value === "inherit"
                    ? "white"
                    : c.value,
                }}
              >
                {(c.value === "none" || c.value === "inherit") && (
                  <span className="block w-full h-full relative">
                    {/* Diagonal strikethrough for "none/default" */}
                    <svg viewBox="0 0 24 24" className="w-full h-full text-red-400">
                      <line x1="2" y1="2" x2="22" y2="22" stroke="currentColor" strokeWidth="2" />
                    </svg>
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Custom colour input */}
          <div className="mt-2 pt-2 border-t border-gray-100">
            <p className="text-[10px] text-gray-400 mb-1 px-1">Custom</p>
            <input
              type="color"
              className="w-full h-7 rounded cursor-pointer border border-gray-200"
              onChange={(e) => onSelect(e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── RichTextEditor ───────────────────────────────────────────────────────────

const RichTextEditor = ({ content, onChange, editable = true }: RichTextEditorProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      TextStyle,
      FontFamily,
      // Text (foreground) color — requires TextStyle
      Color.configure({ types: ["textStyle"] }),
      // Background highlight — multicolor mode
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-blue-600 underline hover:text-blue-800",
        },
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    immediatelyRender: false,
  }, [onChange, editable]);

  // Sync content from outside
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("Enter URL:", previousUrl);
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  const addImage = useCallback(() => {
    if (!editor) return;
    const url = window.prompt("Enter image URL:");
    if (url) editor.chain().focus().setImage({ src: url }).run();
  }, [editor]);

  // Active colours for indicator underlines
  const activeTextColor   = editor?.getAttributes("textStyle").color ?? "inherit";
  const activeHighlight   = editor?.getAttributes("highlight").color ?? "none";

  if (!editor) return null;

  // ── Toolbar sub-components ──

  const ToolbarButton = ({
    onClick, active, title, children, disabled,
  }: {
    onClick: () => void;
    active?: boolean;
    title: string;
    children: React.ReactNode;
    disabled?: boolean;
  }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`p-2 rounded transition-colors ${
        active
          ? "bg-blue-600 text-white"
          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      {children}
    </button>
  );

  const ToolbarDivider = () => (
    <div className="w-px bg-gray-300 dark:bg-gray-600 mx-1 self-stretch" />
  );

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
      {/* ── Toolbar ── */}
      {editable && (
        <div className="bg-gray-50 p-2 flex flex-wrap gap-1 items-center border-b border-gray-300">

          {/* Text Style */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive("bold")}
            title="Bold"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h7.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.86-2.82-2.15-3.42zM10 6.5h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-3v-3zm3.5 9H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z" />
            </svg>
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive("italic")}
            title="Italic"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z" />
            </svg>
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline?.().run()}
            active={editor.isActive("underline")}
            title="Underline"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 17c3.31 0 6-2.69 6-6V3h-2.5v8c0 1.93-1.57 3.5-3.5 3.5S8.5 12.93 8.5 11V3H6v8c0 3.31 2.69 6 6 6zm-7 2v2h14v-2H5z" />
            </svg>
          </ToolbarButton>

          <ToolbarDivider />

          {/* ── Text colour ── */}
          <ColorPicker
            colors={TEXT_COLORS}
            activeColor={activeTextColor}
            title="Text color"
            onSelect={(value) => {
              if (value === "inherit") {
                editor.chain().focus().unsetColor().run();
              } else {
                editor.chain().focus().setColor(value).run();
              }
            }}
            icon={
              // "A" with colour bar
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11 3L5.5 17h2.25l1.12-3h6.25l1.12 3H18.5L13 3h-2zm-1.38 9L12 5.67 14.38 12H9.62z" />
              </svg>
            }
          />

          {/* ── Highlight / background colour ── */}
          <ColorPicker
            colors={HIGHLIGHT_COLORS}
            activeColor={activeHighlight}
            title="Highlight color"
            onSelect={(value) => {
              if (value === "none") {
                editor.chain().focus().unsetHighlight().run();
              } else {
                editor.chain().focus().setHighlight({ color: value }).run();
              }
            }}
            icon={
              // Marker / highlighter icon
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.5 1.15c-.53 0-1.04.19-1.43.58L8.29 10.51c-.37.37-.58.88-.58 1.41v3.54c0 .28.22.5.5.5h3.54c.53 0 1.04-.21 1.41-.58l8.78-8.78c.38-.38.57-.88.57-1.43 0-1.11-.89-2.02-2.01-2.02zM5 19c-1.1 0-2 .9-2 2h14l-3-3H5z" />
              </svg>
            }
          />

          <ToolbarDivider />

          {/* Headings */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            active={editor.isActive("heading", { level: 1 })}
            title="Heading 1"
          >
            <span className="text-xs font-bold">H1</span>
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor.isActive("heading", { level: 2 })}
            title="Heading 2"
          >
            <span className="text-xs font-bold">H2</span>
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            active={editor.isActive("heading", { level: 3 })}
            title="Heading 3"
          >
            <span className="text-xs font-bold">H3</span>
          </ToolbarButton>

          <ToolbarDivider />

          {/* Lists */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive("bulletList")}
            title="Bullet List"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12.17c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2z" />
            </svg>
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive("orderedList")}
            title="Numbered List"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M2 17h2v.5H3v1h1v.5H2v1h3v-4H2v1zm1-9h1V4H2v1h1v3zm-1 3h1.8L2 13.1v.9h3v-1H3.2L5 10.9V10H2v1zm5-6v2h14V5H7zm0 14h14v-2H7v2zm0-6h14v-2H7v2z" />
            </svg>
          </ToolbarButton>

          <ToolbarDivider />

          {/* Alignment */}
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
            active={editor.isActive({ textAlign: "left" })}
            title="Align Left"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M15 15H3v2h12v-2zm0-8H3v2h12V7zM3 13h18v-2H3v2zm0 8h18v-2H3v2zM3 3v2h18V3H3z" />
            </svg>
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
            active={editor.isActive({ textAlign: "center" })}
            title="Align Center"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M7 15v2h10v-2H7zm-4 6h18v-2H3v2zm0-8h18v-2H3v2zm4-6v2h10V7H7zM3 3v2h18V3H3z" />
            </svg>
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
            active={editor.isActive({ textAlign: "right" })}
            title="Align Right"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 21h18v-2H3v2zm6-4h12v-2H9v2zm-6-4h18v-2H3v2zm6-4h12V7H9v2zM3 3v2h18V3H3z" />
            </svg>
          </ToolbarButton>

          <ToolbarDivider />

          {/* Link */}
          <ToolbarButton
            onClick={setLink}
            active={editor.isActive("link")}
            title="Add Link"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z" />
            </svg>
          </ToolbarButton>

          {/* Image */}
          <ToolbarButton onClick={addImage} title="Add Image">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
            </svg>
          </ToolbarButton>

          <ToolbarDivider />

          {/* Table */}
          <ToolbarButton
            onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
            title="Insert Table"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20 3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 2v3H4V5h16zm0 5v3H4v-3h16zm0 5v3H4v-3h16zM8 5v3H4V5h4zm0 5v3H4v-3h4zm0 5v3H4v-3h4zm8-5v3h-4V5h4zm0 5v3h-4v-3h4zm0 5v3h-4v-3h4z" />
            </svg>
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().addColumnBefore().run()}
            disabled={!editor.can().addColumnBefore()}
            title="Add Column Before"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4 4h4v16H4V4zm6 0h4v16h-4V4z" />
            </svg>
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().addColumnAfter().run()}
            disabled={!editor.can().addColumnAfter()}
            title="Add Column After"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4 4h16v4H4V4zm0 6h16v4H4v-4zm0 6h16v4H4v-4z" />
            </svg>
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().deleteColumn().run()}
            disabled={!editor.can().deleteColumn()}
            title="Delete Column"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4 4h16v4H4V4zM7 11h10v2H7v-2zm4 5H7v-2h10v2z" />
            </svg>
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().addRowBefore().run()}
            disabled={!editor.can().addRowBefore()}
            title="Add Row Before"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4 4h16v16H4V4zm0 6h16v4H4v-4z" />
            </svg>
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().addRowAfter().run()}
            disabled={!editor.can().addRowAfter()}
            title="Add Row After"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4 4h16v16H4V4zm0 6h16v4H4v-4zM4 14h16v4H4v-4z" />
            </svg>
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().deleteRow().run()}
            disabled={!editor.can().deleteRow()}
            title="Delete Row"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4 4h16v16H4V4zm0 6h16v4H4v-4zm0 5h10v-2H4v2zm5-5h6v-2H9v2zM9 5v2h6V5H9z" />
            </svg>
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().deleteTable().run()}
            disabled={!editor.can().deleteTable()}
            title="Delete Table"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4 4h16v16H4V4zm0 6h16v2H4V10zm0 6h10v2H4v-2z" />
            </svg>
          </ToolbarButton>

        </div>
      )}

      {/* ── Editor Content ── */}
      <div className="p-4 min-h-[400px] max-h-[600px] overflow-y-auto bg-white">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};

export default RichTextEditor;